import React, { useState, useEffect } from 'react'
import { getPRDiff, postReviewComments } from '../services/bitbucketApi.js'
import { reviewCode } from '../services/geminiFlashApi.js'
import { isPRReviewed, markPRReviewed, saveReviewContent, getReviewContent } from '../db/indexedDB.js'
import { formatDate, generatePRKey, parseRepoFullName } from '../utils/auth.js'
import { 
  parseDiff, 
  analyzeChanges, 
  extractChangedCodeWithContext,
  getChangesSummary 
} from '../utils/diffParser.js'

const PRListItem = ({ pr, repo, config, onReviewComplete }) => {
  const [reviewedByAI, setReviewedByAI] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [reviewResult, setReviewResult] = useState(null)
  const [error, setError] = useState(null)
  const [showReview, setShowReview] = useState(false)
  const [diffStats, setDiffStats] = useState(null)
  const [loadingPreviousReview, setLoadingPreviousReview] = useState(false)
  const [postingComments, setPostingComments] = useState(false)
  const [postResults, setPostResults] = useState(null)

  useEffect(() => {
    checkReviewStatus()
  }, [pr.id, repo.full_name])

  const checkReviewStatus = async () => {
    try {
      const { workspace, repoSlug } = parseRepoFullName(repo.full_name)
      const prKey = generatePRKey(workspace, repoSlug, pr.id)
      const isReviewed = await isPRReviewed(prKey)
      setReviewedByAI(isReviewed)
    } catch (err) {
      console.error('Error checking review status:', err)
    }
  }

  const handleReview = async () => {
    try {
      setReviewing(true)
      setError(null)
      setReviewResult(null)
      setPostResults(null) // Reset post results for new review

      const { workspace, repoSlug } = parseRepoFullName(repo.full_name)
      
      // Step 1: Get PR diff
      const diffText = await getPRDiff(
        config.bitbucketUsername,
        config.bitbucketAppPassword,
        workspace,
        repoSlug,
        pr.id
      )

      if (!diffText || diffText.trim().length === 0) {
        throw new Error('No changes found in this pull request')
      }

      // Step 2: Parse and analyze the diff using enhanced parser
      console.log('🔍 Parsing diff with enhanced parser...')
      const parsedChanges = parseDiff(diffText)
      const diffAnalysis = analyzeChanges(parsedChanges)
      const changesSummary = getChangesSummary(parsedChanges)
      
      // Extract code blocks with context for better AI understanding
      const codeBlocks = extractChangedCodeWithContext(parsedChanges, 4) // 4 lines of context
      
      console.log('📊 Diff Analysis:', {
        filesChanged: diffAnalysis.totalFiles,
        linesAdded: diffAnalysis.totalAdded,
        linesRemoved: diffAnalysis.totalRemoved,
        codeBlocks: codeBlocks.length
      })

      // Set enhanced diff stats
      setDiffStats({
        additions: diffAnalysis.totalAdded,
        deletions: diffAnalysis.totalRemoved,
        total: diffAnalysis.totalAdded + diffAnalysis.totalRemoved,
        files: diffAnalysis.totalFiles,
        codeBlocks: codeBlocks.length
      })

      // Step 3: Create enhanced context for Gemini 2.5 Flash
      const enhancedContext = {
        pr_title: pr.title,
        pr_description: pr.description || 'No description provided',
        pr_author: pr.author?.display_name || pr.author?.username || 'Unknown',
        branch_info: {
          source: pr.source?.branch?.name || 'unknown',
          destination: pr.destination?.branch?.name || 'unknown'
        },
        diff_summary: {
          files_changed: changesSummary.filesChanged,
          lines_added: changesSummary.linesAdded,
          lines_removed: changesSummary.linesRemoved,
          total_changes: changesSummary.linesAdded + changesSummary.linesRemoved
        },
        files_overview: changesSummary.files.map(file => ({
          path: file.path,
          added: file.added,
          removed: file.removed,
          is_new: file.isNew,
          is_deleted: file.isDeleted,
          is_binary: file.isBinary
        })),
        code_changes: codeBlocks.map((block, index) => ({
          block_id: index + 1,
          file_path: block.filePath,
          start_line: block.startLine,
          end_line: block.endLine,
          total_lines: block.code.length,
          changed_lines: block.code.filter(line => line.isChange).length,
          context_lines: block.code.filter(line => !line.isChange).length,
          code_preview: block.code.map(line => ({
            line_number: line.lineNumber,
            content: line.content,
            is_change: line.isChange,
            // Truncate very long lines for context
            preview: line.content.length > 100 ? 
              line.content.substring(0, 100) + '...' : line.content
          }))
        }))
      }

      // Create structured prompt with enhanced context
      const structuredPrompt = `${config.reviewPrompt}

## Pull Request Context
**Title:** ${enhancedContext.pr_title}
**Author:** ${enhancedContext.pr_author}
**Branch:** ${enhancedContext.branch_info.source} → ${enhancedContext.branch_info.destination}
**Description:** ${enhancedContext.pr_description}

## Changes Summary
- **Files Changed:** ${enhancedContext.diff_summary.files_changed}
- **Lines Added:** ${enhancedContext.diff_summary.lines_added}
- **Lines Removed:** ${enhancedContext.diff_summary.lines_removed}
- **Total Changes:** ${enhancedContext.diff_summary.total_changes}

## Files Modified
${enhancedContext.files_overview.map(file => 
  `- **${file.path}**: +${file.added} -${file.removed}${file.is_new ? ' (NEW FILE)' : ''}${file.is_deleted ? ' (DELETED)' : ''}${file.is_binary ? ' (BINARY)' : ''}`
).join('\n')}

## Code Changes Analysis
${enhancedContext.code_changes.map(block => `
### Block ${block.block_id}: ${block.file_path}
**Lines:** ${block.start_line}-${block.end_line} (${block.changed_lines} changes, ${block.context_lines} context)

\`\`\`
${block.code_preview.map(line => 
  `${line.is_change ? '> ' : '  '}${line.line_number}: ${line.preview}`
).join('\n')}
\`\`\``).join('\n')}

## Raw Diff for Reference
\`\`\`diff
${diffText}
\`\`\`

Please provide a thorough code review focusing on the structured changes above.

**IMPORTANT: Please respond in JSON format with the following structure:**
{
  "summary": "Brief overall summary of the review",
  "comments": [
    {
      "file": "path/to/file.js",
      "line": 123,
      "comment": "Specific feedback for this line"
    }
  ]
}

If you cannot provide JSON format, please provide your review as plain text and it will be processed accordingly.`

      console.log('🤖 Sending enhanced context to Gemini 2.5 Flash...')

      // Step 4: Get AI review with enhanced context
      const review = await reviewCode(
        structuredPrompt, // Pass the structured prompt as diffText parameter
        '', // Empty prompt since we're using structured prompt above
        config.llmToken,
        enhancedContext
      )

      // Parse the AI response (handle both JSON and plain text)
      let parsedReview;
      try {
        const reviewText = typeof review.reviewResult === 'string' 
          ? review.reviewResult 
          : JSON.stringify(review.reviewResult);
          
        // Try to parse as JSON first
        try {
          parsedReview = JSON.parse(reviewText);
        } catch (jsonError) {
          console.log('AI returned plain text instead of JSON, converting...');
          
          // If JSON parsing fails, convert plain text to structured format
          parsedReview = {
            summary: reviewText.length > 500 ? 
              reviewText.substring(0, 500) + '...' : reviewText,
            comments: [], // No inline comments for plain text responses
            overall_assessment: reviewText,
            diff_analysis: {
              files_changed: diffAnalysis.totalFiles,
              lines_added: diffAnalysis.totalAdded,
              lines_removed: diffAnalysis.totalRemoved,
              code_blocks_analyzed: codeBlocks.length
            }
          };
          
          console.log('Converted plain text to structured format');
        }
        
        // Ensure we have the required structure
        if (!parsedReview.summary && !parsedReview.overall_assessment && !parsedReview.comments) {
          parsedReview = {
            summary: typeof parsedReview === 'string' ? parsedReview : 'AI review completed',
            comments: [],
            overall_assessment: typeof parsedReview === 'string' ? parsedReview : JSON.stringify(parsedReview)
          };
        }
          
        // Validate and fix line numbers using parsed changes
        if (parsedReview.comments && Array.isArray(parsedReview.comments)) {
          parsedReview.comments = parsedReview.comments.map(comment => {
            // Find the file in parsed changes to validate line numbers
            const fileChange = parsedChanges.find(change => 
              change.filePath === comment.file || 
              change.filePath.endsWith(comment.file) ||
              comment.file.endsWith(change.filePath)
            );
            
            let validatedLine = Math.max(1, parseInt(comment.line) || 1);
            
            if (fileChange) {
              // Check if the line exists in the actual changes
              const availableLines = [];
              fileChange.hunks.forEach(hunk => {
                hunk.lines.forEach(line => {
                  if (line.newLineNumber !== null) {
                    availableLines.push(line.newLineNumber);
                  }
                });
              });
              
              if (availableLines.length > 0 && !availableLines.includes(validatedLine)) {
                // Find closest available line
                const closest = availableLines.reduce((prev, curr) => 
                  Math.abs(curr - validatedLine) < Math.abs(prev - validatedLine) ? curr : prev
                );
                console.log(`🔧 Adjusted comment line ${validatedLine} to ${closest} for ${comment.file}`);
                validatedLine = closest;
              }
            }
            
            return {
              ...comment,
              line: validatedLine,
              originalLine: parseInt(comment.line) || 1
            };
          });
        }

        // Add analysis metadata to review
        parsedReview.diff_analysis = {
          files_changed: diffAnalysis.totalFiles,
          lines_added: diffAnalysis.totalAdded,
          lines_removed: diffAnalysis.totalRemoved,
          code_blocks_analyzed: codeBlocks.length
        };

      } catch (parseError) {
        console.error('Failed to process AI response:', parseError);
        
        // Create a fallback review structure
        parsedReview = {
          summary: 'AI review completed, but response format was unexpected.',
          comments: [],
          overall_assessment: typeof review.reviewResult === 'string' ? 
            review.reviewResult : 'Review completed with parsing issues.',
          diff_analysis: {
            files_changed: diffAnalysis.totalFiles,
            lines_added: diffAnalysis.totalAdded,
            lines_removed: diffAnalysis.totalRemoved,
            code_blocks_analyzed: codeBlocks.length
          },
          parsing_error: true
        };
        
        console.log('Created fallback review structure');
      }

      console.log('✅ AI Review completed:', {
        summary: parsedReview.summary ? 'Yes' : 'No',
        comments: parsedReview.comments?.length || 0,
        analysis: parsedReview.diff_analysis
      });

      // Step 5: Save review result with enhanced metadata
      const prKey = generatePRKey(workspace, repoSlug, pr.id)
      await markPRReviewed(prKey, repo.full_name, pr.id)
      await saveReviewContent(prKey, parsedReview, {
        prTitle: pr.title,
        prAuthor: pr.author?.display_name || pr.author?.username,
        reviewedAt: new Date().toISOString(),
        model: review.model,
        usage: review.usage,
        diffAnalysis: diffAnalysis,
        enhancedContext: true // Flag to indicate this review used enhanced parsing
      })

      setReviewResult(parsedReview)
      setReviewedByAI(true)
      setShowReview(true)
      
      // Step 6: Automatically post comments to Bitbucket with enhanced positioning
      if (pr.state === 'OPEN' && parsedReview.comments && parsedReview.comments.length > 0) {
        setPostingComments(true);
        try {
          const postResults = await postReviewComments(
            config.bitbucketUsername,
            config.bitbucketAppPassword,
            workspace,
            repoSlug,
            pr.id,
            parsedReview
          );
          
          setPostResults(postResults);
          
          // Show success/failure summary
          const totalComments = (postResults.success?.length || 0) + (postResults.failed?.length || 0);
          const successCount = postResults.success?.length || 0;
          
          if (successCount === totalComments) {
            console.log(`✅ Successfully posted all ${successCount} comments to Bitbucket`);
          } else if (successCount > 0) {
            console.warn(`⚠️ Posted ${successCount} of ${totalComments} comments. ${postResults.failed?.length} failed.`);
          } else {
            console.error('❌ Failed to post any comments to Bitbucket');
          }
        } catch (error) {
          console.error('Error posting comments to Bitbucket:', error);
          // Don't throw - we still want to show the review even if posting failed
        } finally {
          setPostingComments(false);
        }
      }
      
      if (onReviewComplete) {
        onReviewComplete()
      }

    } catch (err) {
      console.error('Review error:', err)
      setError(err.message)
    } finally {
      setReviewing(false)
    }
  }

  const getStatusBadge = (state) => {
    const badges = {
      OPEN: { class: 'badge-primary', icon: '🟢', text: 'Open' },
      MERGED: { class: 'badge-success', icon: '🟣', text: 'Merged' },
      DECLINED: { class: 'badge-danger', icon: '🔴', text: 'Declined' },
      SUPERSEDED: { class: 'badge-secondary', icon: '⚪', text: 'Superseded' }
    }
    return badges[state] || { class: 'badge-secondary', icon: '❓', text: state }
  }

  const statusBadge = getStatusBadge(pr.state)

  return (
    <div className="border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow">
      <div className="p-4">
        {/* PR Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                #{pr.id} {pr.title}
              </h3>
              
              <span className={`badge ${statusBadge.class}`}>
                {statusBadge.icon} {statusBadge.text}
              </span>

              {reviewedByAI && (
                <span className="badge badge-success">
                  🤖 AI Reviewed
                </span>
              )}
            </div>

            {/* PR Metadata */}
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <span>👤</span>
                <span>{pr.author?.display_name || pr.author?.username || 'Unknown'}</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <span>📅</span>
                <span>Created {formatDate(pr.created_on)}</span>
              </div>

              {pr.updated_on && pr.updated_on !== pr.created_on && (
                <div className="flex items-center space-x-1">
                  <span>🔄</span>
                  <span>Updated {formatDate(pr.updated_on)}</span>
                </div>
              )}

              {/* Branch Info */}
              {pr.source?.branch?.name && pr.destination?.branch?.name && (
                <div className="flex items-center space-x-1">
                  <span>🌿</span>
                  <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                    {pr.source.branch.name} → {pr.destination.branch.name}
                  </span>
                </div>
              )}
            </div>

            {/* PR Description */}
            {pr.description && (
              <div className="mt-2 text-gray-700 text-sm">
                <p className="line-clamp-2">
                  {pr.description.length > 150 
                    ? pr.description.substring(0, 150) + '...' 
                    : pr.description
                  }
                </p>
              </div>
            )}

            {/* Enhanced Diff Stats */}
            {diffStats && (
              <div className="mt-2 flex items-center space-x-4 text-xs">
                <span className="text-green-600">+{diffStats.additions} additions</span>
                <span className="text-red-600">-{diffStats.deletions} deletions</span>
                {diffStats.files && (
                  <span className="text-blue-600">{diffStats.files} files</span>
                )}
                {diffStats.codeBlocks && (
                  <span className="text-purple-600">{diffStats.codeBlocks} blocks</span>
                )}
                <span className="text-gray-500">{diffStats.total} total changes</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 ml-4">
            {pr.links?.html?.href && (
              <a
                href={pr.links.html.href}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-secondary"
                title="View PR on Bitbucket"
              >
                🔗 View
              </a>
            )}

            {!reviewedByAI && pr.state === 'OPEN' && (
              <button
                onClick={handleReview}
                disabled={reviewing}
                className="btn btn-sm btn-primary"
              >
                {reviewing ? (
                  <>
                    <span className="spinner-sm mr-2"></span>
                    Reviewing...
                  </>
                ) : (
                  '🤖 Review'
                )}
              </button>
            )}

            {reviewedByAI && pr.state === 'OPEN' && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={async () => {
                    if (!showReview && !reviewResult) {
                      // Load previous review if not already loaded
                      setLoadingPreviousReview(true);
                      try {
                        const { workspace, repoSlug } = parseRepoFullName(repo.full_name);
                        const prKey = generatePRKey(workspace, repoSlug, pr.id);
                        const savedReview = await getReviewContent(prKey);
                        if (savedReview) {
                          setReviewResult(savedReview.reviewContent);
                          // Clear any previous post results when loading old review
                          setPostResults(null);
                        }
                      } catch (err) {
                        console.error('Error loading previous review:', err);
                      } finally {
                        setLoadingPreviousReview(false);
                      }
                    }
                    setShowReview(!showReview);
                  }}
                  disabled={loadingPreviousReview}
                  className="btn btn-sm btn-success"
                >
                  {loadingPreviousReview ? (
                    <>
                      <span className="spinner-sm mr-2"></span>
                      Loading...
                    </>
                  ) : (
                    showReview ? '👁️ Hide Review' : '👁️ Show Review'
                  )}
                </button>
                
                <button
                  onClick={handleReview}
                  disabled={reviewing}
                  className="btn btn-sm btn-secondary"
                  title="Run AI review again"
                >
                  {reviewing ? (
                    <>
                      <span className="spinner-sm mr-2"></span>
                      Reviewing...
                    </>
                  ) : (
                    '🔄 Review Again'
                  )}
                </button>
              </div>
            )}

            {/* Show review button for closed/merged PRs that were reviewed */}
            {reviewedByAI && pr.state !== 'OPEN' && (
              <button
                onClick={async () => {
                  if (!showReview && !reviewResult) {
                    // Load previous review if not already loaded
                    setLoadingPreviousReview(true);
                    try {
                      const { workspace, repoSlug } = parseRepoFullName(repo.full_name);
                      const prKey = generatePRKey(workspace, repoSlug, pr.id);
                      const savedReview = await getReviewContent(prKey);
                      if (savedReview) {
                        setReviewResult(savedReview.reviewContent);
                        // Clear any previous post results when loading old review
                        setPostResults(null);
                      }
                    } catch (err) {
                      console.error('Error loading previous review:', err);
                    } finally {
                      setLoadingPreviousReview(false);
                    }
                  }
                  setShowReview(!showReview);
                }}
                disabled={loadingPreviousReview}
                className="btn btn-sm btn-success"
              >
                {loadingPreviousReview ? (
                  <>
                    <span className="spinner-sm mr-2"></span>
                    Loading...
                  </>
                  ) : (
                  showReview ? '👁️ Hide Review' : '👁️ Show Review'
                )}
              </button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="alert-error">
            <p className="font-medium">Review Failed</p>
            <p className="text-sm mt-1">{error}</p>
            <button
              onClick={handleReview}
              className="btn btn-sm btn-secondary mt-2"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Enhanced Review Progress */}
        {reviewing && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-3">
              <div className="spinner-md"></div>
              <div>
                <p className="font-medium text-blue-900">🤖 AI Review in Progress</p>
                <p className="text-sm text-blue-700">
                  Parsing diff structure → Extracting code context → Generating intelligent review...
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  ✨ Using enhanced diff analysis for better AI understanding
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Review Result */}
        {(showReview && reviewResult) && (
          <div className="mt-4 border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">🤖 AI Code Review</h4>
              <button
                onClick={() => setShowReview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            {/* Posting Status */}
            {postingComments && (
              <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center space-x-2">
                  <div className="spinner-sm"></div>
                  <p className="text-sm text-yellow-800">
                    Posting comments to Bitbucket...
                  </p>
                </div>
              </div>
            )}
            
            {/* Post Results */}
            {postResults && (
              <div className={`mb-4 p-3 rounded-lg border ${
                postResults.failed?.length === 0 
                  ? 'bg-green-50 border-green-200' 
                  : postResults.success?.length > 0
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-red-50 border-red-200'
              }`}>
                <div className="text-sm">
                  {postResults.failed?.length === 0 ? (
                    <>
                      <p className="text-green-800">
                        ✅ Successfully posted {postResults.success?.length || 0} comment{(postResults.success?.length || 0) !== 1 ? 's' : ''} to Bitbucket
                      </p>
                      {postResults.success?.some(s => s.type === 'inline') && (
                        <p className="text-green-700 text-xs mt-1">
                          📍 Inline comments posted directly on the code lines
                        </p>
                      )}
                      {postResults.success?.some(s => s.type === 'contextual') && (
                        <p className="text-green-700 text-xs mt-1">
                          💬 Some comments posted with file/line references (fallback mode)
                        </p>
                      )}
                    </>
                  ) : postResults.success?.length > 0 ? (
                    <>
                      <p className="text-yellow-800 font-medium">
                        ⚠️ Partially posted: {postResults.success.length} succeeded, {postResults.failed.length} failed
                      </p>
                      {postResults.failed.map((fail, idx) => (
                        <p key={idx} className="text-yellow-700 text-xs mt-1">
                          • {fail.file}:{fail.line} - {fail.error}
                        </p>
                      ))}
                    </>
                  ) : (
                    <p className="text-red-800">
                      ❌ Failed to post comments to Bitbucket
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {/* Enhanced Review Summary */}
            {(reviewResult.summary || reviewResult.overall_assessment) && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <h5 className="font-medium text-blue-900 mb-1">📋 Summary</h5>
                <div className="text-sm text-blue-800 whitespace-pre-wrap">
                  {reviewResult.summary || reviewResult.overall_assessment}
                </div>
                {reviewResult.diff_analysis && (
                  <div className="mt-2 text-xs text-blue-600">
                    ✨ Enhanced Analysis: {reviewResult.diff_analysis.files_changed} files, 
                    {reviewResult.diff_analysis.code_blocks_analyzed} code blocks analyzed
                  </div>
                )}
                {reviewResult.parsing_error && (
                  <div className="mt-2 text-xs text-orange-600">
                    ⚠️ Note: AI returned plain text format instead of structured JSON
                  </div>
                )}
              </div>
            )}

            {/* Line-by-line Comments */}
            {reviewResult.comments && reviewResult.comments.length > 0 ? (
              <div className="space-y-3">
                <h5 className="font-medium text-gray-900">
                  Code Comments ({reviewResult.comments.length})
                </h5>
                {reviewResult.comments.map((comment, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                          {comment.file}
                        </span>
                        <span className="text-xs text-gray-600">
                          Line {comment.line}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-800">
                      {comment.comment}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-green-50 p-4 rounded-lg text-green-800">
                <p className="text-sm">
                  ✅ No issues found. The code looks good!
                </p>
              </div>
            )}

            {/* Enhanced Review Actions */}
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                <div>Generated by Gemini 2.5 Flash • {formatDate(new Date().toISOString())}</div>
                {reviewResult.diff_analysis && (
                  <div className="text-green-600 mt-1">
                    ✨ Enhanced with structured diff analysis
                  </div>
                )}
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    const reviewText = JSON.stringify(reviewResult, null, 2);
                    navigator.clipboard?.writeText(reviewText);
                  }}
                  className="btn btn-sm btn-secondary"
                  title="Copy review to clipboard"
                >
                  📋 Copy JSON
                </button>
                
                {/* Manual post option if auto-post failed or for re-posting */}
                {pr.state === 'OPEN' && reviewResult.comments && reviewResult.comments.length > 0 && 
                 (!postResults || postResults.failed?.length > 0) && (
                  <button
                    onClick={async () => {
                      setPostingComments(true);
                      setPostResults(null);
                      try {
                        const { workspace, repoSlug } = parseRepoFullName(repo.full_name);
                        const results = await postReviewComments(
                          config.bitbucketUsername,
                          config.bitbucketAppPassword,
                          workspace,
                          repoSlug,
                          pr.id,
                          reviewResult
                        );
                        setPostResults(results);
                      } catch (error) {
                        console.error('Error posting comments:', error);
                        setError('Failed to post comments to Bitbucket');
                      } finally {
                        setPostingComments(false);
                      }
                    }}
                    disabled={postingComments}
                    className="btn btn-sm btn-primary"
                    title="Post comments to PR"
                  >
                    {postingComments ? (
                      <>
                        <span className="spinner-sm mr-2"></span>
                        Posting...
                      </>
                    ) : (
                      <>💬 {postResults?.failed?.length > 0 ? 'Retry Failed Comments' : 'Post Comments'}</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PR Statistics */}
        {pr.participants && pr.participants.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span>👥 {pr.participants.length} participant{pr.participants.length !== 1 ? 's' : ''}</span>
              
              {pr.comment_count && (
                <span>💬 {pr.comment_count} comment{pr.comment_count !== 1 ? 's' : ''}</span>
              )}
              
              {pr.task_count && (
                <span>✅ {pr.task_count} task{pr.task_count !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PRListItem