import React, { useState, useEffect } from 'react';
import { 
  parseDiff, 
  analyzeChanges, 
  extractChangedCodeWithContext,
  getChangesSummary,
  formatChangesForDisplay 
} from '../utils/diffParser';

/**
 * DiffViewer component - Demonstrates enhanced diff parser capabilities
 * This component can be used to display and analyze git diffs with rich formatting
 */
const DiffViewer = ({ 
  diffText, 
  showStats = true, 
  showCodeBlocks = true, 
  contextLines = 3,
  onAnalysisComplete 
}) => {
  const [analysis, setAnalysis] = useState(null);
  const [codeBlocks, setCodeBlocks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (diffText && diffText.trim()) {
      analyzeDiff();
    } else {
      resetState();
    }
  }, [diffText, contextLines]);

  const resetState = () => {
    setAnalysis(null);
    setCodeBlocks([]);
    setSummary(null);
    setError(null);
  };

  const analyzeDiff = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Parse the diff
      const changes = parseDiff(diffText);
      
      if (changes.length === 0) {
        setError('No valid changes found in diff');
        return;
      }

      // Analyze changes
      const analysisResult = analyzeChanges(changes);
      setAnalysis(analysisResult);

      // Extract code blocks if requested
      if (showCodeBlocks) {
        const blocks = extractChangedCodeWithContext(changes, contextLines);
        setCodeBlocks(blocks);
      }

      // Get summary
      const summaryResult = getChangesSummary(changes);
      setSummary(summaryResult);

      // Notify parent component
      if (onAnalysisComplete) {
        onAnalysisComplete({
          changes,
          analysis: analysisResult,
          codeBlocks: showCodeBlocks ? blocks : [],
          summary: summaryResult
        });
      }

    } catch (err) {
      console.error('Diff analysis failed:', err);
      setError(`Failed to analyze diff: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getFileTypeIcon = (filePath) => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const iconMap = {
      'js': '📄',
      'jsx': '⚛️',
      'ts': '📘',
      'tsx': '⚛️',
      'html': '🌐',
      'css': '🎨',
      'scss': '🎨',
      'json': '📋',
      'md': '📝',
      'py': '🐍',
      'java': '☕',
      'cpp': '⚙️',
      'c': '⚙️',
      'go': '🐹',
      'rust': '🦀',
      'php': '🐘'
    };
    return iconMap[ext] || '📄';
  };

  const getChangeTypeColor = (lineType) => {
    switch (lineType) {
      case 'added': return 'text-green-600 bg-green-50';
      case 'removed': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="spinner-md mr-3"></div>
        <span>Analyzing diff...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert-error">
        <p className="font-medium">Diff Analysis Error</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No diff data to display</p>
        <p className="text-sm mt-1">Provide a git diff to see analysis</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      {showStats && summary && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Diff Summary</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{summary.filesChanged}</div>
              <div className="text-sm text-gray-600">Files Changed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">+{summary.linesAdded}</div>
              <div className="text-sm text-gray-600">Lines Added</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">-{summary.linesRemoved}</div>
              <div className="text-sm text-gray-600">Lines Removed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{summary.linesAdded + summary.linesRemoved}</div>
              <div className="text-sm text-gray-600">Total Changes</div>
            </div>
          </div>

          {/* File List */}
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Files Modified:</h4>
            {summary.files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  <span>{getFileTypeIcon(file.path)}</span>
                  <span className="font-mono text-sm">{file.path}</span>
                  {file.isNew && <span className="badge badge-success text-xs">NEW</span>}
                  {file.isDeleted && <span className="badge badge-danger text-xs">DELETED</span>}
                  {file.isBinary && <span className="badge badge-secondary text-xs">BINARY</span>}
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  {file.added > 0 && (
                    <span className="text-green-600">+{file.added}</span>
                  )}
                  {file.removed > 0 && (
                    <span className="text-red-600">-{file.removed}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Code Blocks */}
      {showCodeBlocks && codeBlocks.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">🧩 Code Changes</h3>
          
          <div className="space-y-4">
            {codeBlocks.map((block, blockIndex) => (
              <div key={blockIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Block Header */}
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span>{getFileTypeIcon(block.filePath)}</span>
                      <span className="font-mono text-sm font-medium">{block.filePath}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Lines {block.startLine}-{block.endLine}
                    </div>
                  </div>
                </div>

                {/* Code Lines */}
                <div className="font-mono text-sm">
                  {block.code.map((line, lineIndex) => (
                    <div
                      key={lineIndex}
                      className={`flex ${getChangeTypeColor(line.isChange ? 'added' : 'context')}`}
                    >
                      <div className="w-12 text-right px-2 py-1 text-gray-500 bg-gray-100 select-none border-r border-gray-200">
                        {line.lineNumber}
                      </div>
                      <div className="flex-1 px-3 py-1 whitespace-pre-wrap break-all">
                        {line.isChange && (
                          <span className="text-green-600 mr-1">+</span>
                        )}
                        {line.content || ' '}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw Analysis Data (for debugging) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="bg-gray-50 rounded-lg p-4">
          <summary className="cursor-pointer font-medium text-gray-700 mb-2">
            🔍 Debug Information
          </summary>
          <div className="space-y-2 text-sm">
            <div>
              <strong>Total Files:</strong> {analysis.totalFiles}
            </div>
            <div>
              <strong>Total Added:</strong> {analysis.totalAdded}
            </div>
            <div>
              <strong>Total Removed:</strong> {analysis.totalRemoved}
            </div>
            <div>
              <strong>Code Blocks Extracted:</strong> {codeBlocks.length}
            </div>
            <div>
              <strong>Context Lines:</strong> {contextLines}
            </div>
          </div>
        </details>
      )}
    </div>
  );
};

export default DiffViewer;