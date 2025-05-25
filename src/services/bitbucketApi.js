import axios from 'axios';
import { parseUnifiedDiff, findBestLineForComment } from '../utils/diffParser';

const BITBUCKET_API_BASE = 'https://api.bitbucket.org/2.0';

// Create axios instance with default config
const createApiClient = (username, appPassword) => {
  const auth = btoa(`${username}:${appPassword}`);
  return axios.create({
    baseURL: BITBUCKET_API_BASE,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });
};

// Search repositories
export const searchRepositories = async (username, appPassword, searchTerm, page = 1) => {
  try {
    const api = createApiClient(username, appPassword);
    const response = await api.get(`/repositories`, {
      params: {
        q: `name~"${searchTerm}"`,
        pagelen: 10,
        page: page,
        role: 'member',
      },
    });

    return {
      repositories: response.data.values || [],
      pagination: {
        page: response.data.page || 1,
        pagelen: response.data.pagelen || 10,
        size: response.data.size || 0,
        totalPages: Math.ceil((response.data.size || 0) / (response.data.pagelen || 10))
      }
    };
  } catch (error) {
    console.error('Error searching repositories:', error);
    throw new Error(
      error.response?.status === 401
        ? 'Invalid Bitbucket credentials'
        : error.response?.status === 404
        ? 'User not found'
        : 'Failed to search repositories'
    );
  }
};

// Get pull requests for a repository
export const getPullRequests = async (username, appPassword, workspace, repoSlug, state = 'OPEN', page = 1) => {
  try {
    const api = createApiClient(username, appPassword);
    const response = await api.get(`/repositories/${workspace}/${repoSlug}/pullrequests`, {
      params: {
        state: state,
        pagelen: 50,
        page: page,
        sort: '-created_on'
      },
    });

    return {
      pullRequests: response.data.values || [],
      pagination: {
        page: response.data.page || 1,
        pagelen: response.data.pagelen || 50,
        size: response.data.size || 0,
        totalPages: Math.ceil((response.data.size || 0) / (response.data.pagelen || 50))
      }
    };
  } catch (error) {
    console.error('Error fetching pull requests:', error);
    throw new Error(
      error.response?.status === 404
        ? 'Repository not found'
        : 'Failed to fetch pull requests'
    );
  }
};

// Get pull request details including file changes
export const getPRDetails = async (username, appPassword, workspace, repoSlug, prId) => {
  try {
    const api = createApiClient(username, appPassword);
    const response = await api.get(`/repositories/${workspace}/${repoSlug}/pullrequests/${prId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching PR details:', error);
    throw new Error('Failed to fetch pull request details');
  }
};

// Get pull request diff
export const getPRDiff = async (username, appPassword, workspace, repoSlug, prId) => {
  try {
    const api = createApiClient(username, appPassword);
    const response = await api.get(`/repositories/${workspace}/${repoSlug}/pullrequests/${prId}/diff`, {
      headers: {
        'Accept': 'text/plain',
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching PR diff:', error);
    throw new Error(
      error.response?.status === 404
        ? 'Pull request not found or has no diff'
        : 'Failed to fetch pull request diff'
    );
  }
};

// Get pull request diffstat for file information
export const getPRDiffstat = async (username, appPassword, workspace, repoSlug, prId) => {
  try {
    const api = createApiClient(username, appPassword);
    const response = await api.get(`/repositories/${workspace}/${repoSlug}/pullrequests/${prId}/diffstat`);
    return response.data;
  } catch (error) {
    console.error('Error fetching PR diffstat:', error);
    throw new Error('Failed to fetch pull request diffstat');
  }
};

// Get current user info (for validation)
export const getCurrentUser = async (username, appPassword) => {
  try {
    const api = createApiClient(username, appPassword);
    const response = await api.get('/user');
    return response.data;
  } catch (error) {
    console.error('Error fetching current user:', error);
    throw new Error('Invalid credentials or unable to fetch user info');
  }
};

// Add comment to PR (optional feature)
export const addPRComment = async (username, appPassword, workspace, repoSlug, prId, comment) => {
  try {
    const api = createApiClient(username, appPassword);
    const response = await api.post(`/repositories/${workspace}/${repoSlug}/pullrequests/${prId}/comments`, {
      content: {
        raw: comment
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error adding PR comment:', error);
    throw new Error('Failed to add comment to pull request');
  }
};

// Add inline comment to PR on specific file and line
export const addPRInlineComment = async (username, appPassword, workspace, repoSlug, prId, file, line, comment) => {
  try {
    const api = createApiClient(username, appPassword);
    
    // First, try to get the PR details to ensure we have the latest commit
    const prDetails = await getPRDetails(username, appPassword, workspace, repoSlug, prId);
    const destinationCommit = prDetails.destination?.commit?.hash;
    
    // Post as an inline comment on the specific file and line
    const response = await api.post(`/repositories/${workspace}/${repoSlug}/pullrequests/${prId}/comments`, {
      content: {
        raw: comment
      },
      inline: {
        path: file,
        to: parseInt(line),  // Ensure line is a number
        // from: null - not specifying 'from' for single-line comments
      }
    });
    
    return response.data;
    
  } catch (error) {
    console.error('Error adding inline comment:', error.response?.data || error);
    
    // If inline comment fails with specific errors, try different approaches
    if (error.response?.status === 400) {
      const errorMessage = error.response?.data?.error?.message || '';
      
      // If the error is about the line not being in the diff, try with 'from' parameter
      if (errorMessage.includes('line') || errorMessage.includes('diff')) {
        console.log('Trying inline comment with from parameter');
        try {
          const retryResponse = await api.post(`/repositories/${workspace}/${repoSlug}/pullrequests/${prId}/comments`, {
            content: {
              raw: comment
            },
            inline: {
              path: file,
              from: parseInt(line),
              to: parseInt(line)
            }
          });
          return retryResponse.data;
        } catch (retryError) {
          console.log('Inline comment with from/to failed, falling back to contextual comment');
        }
      }
    }
    
    // If inline comment fails, try posting as a general comment with context
    console.log('All inline attempts failed, falling back to general comment with context');
    try {
      const contextualComment = `**📍 File:** \`${file}\`\n**📍 Line:** ${line}\n\n${comment}`;
      const fallbackResponse = await api.post(`/repositories/${workspace}/${repoSlug}/pullrequests/${prId}/comments`, {
        content: {
          raw: contextualComment
        }
      });
      return { ...fallbackResponse.data, contextual: true };
    } catch (fallbackError) {
      throw new Error(`Failed to add comment for ${file}:${line} - ${fallbackError.response?.data?.error?.message || fallbackError.message}`);
    }
  }
};

// Post all review comments to PR
export const postReviewComments = async (username, appPassword, workspace, repoSlug, prId, reviewResult) => {
  const results = {
    success: [],
    failed: []
  };

  try {
    // First, get the diff to understand the file changes
    const diffText = await getPRDiff(username, appPassword, workspace, repoSlug, prId);
    const parsedFiles = parseUnifiedDiff(diffText);
    
    // Create a map of file paths to their parsed information
    const fileMap = new Map();
    parsedFiles.forEach(file => {
      // Use the new path as the primary key
      fileMap.set(file.newPath, file);
      // Also map the old path if it's different (for renamed files)
      if (file.oldPath && file.oldPath !== file.newPath) {
        fileMap.set(file.oldPath, file);
      }
    });

    // Post summary as a general PR comment if it exists
    if (reviewResult.summary) {
      try {
        await addPRComment(
          username, 
          appPassword, 
          workspace, 
          repoSlug, 
          prId, 
          `## 🤖 AI Code Review Summary\n\n${reviewResult.summary}`
        );
        results.success.push({ type: 'summary', message: 'Summary posted successfully' });
      } catch (error) {
        results.failed.push({ type: 'summary', error: error.message });
      }
    }

    // Post inline comments
    if (reviewResult.comments && reviewResult.comments.length > 0) {
      for (const comment of reviewResult.comments) {
        try {
          // Find the file in our parsed diff
          const fileInfo = fileMap.get(comment.file);
          
          if (!fileInfo) {
            console.warn(`File ${comment.file} not found in diff, will try posting anyway`);
          }
          
          // Find the best line for the comment
          let targetLine = parseInt(comment.line);
          let lineMetadata = null;
          
          if (fileInfo) {
            lineMetadata = findBestLineForComment(fileInfo, targetLine);
            if (lineMetadata.adjusted) {
              console.log(`Adjusted line ${targetLine} to ${lineMetadata.line} for ${comment.file}`);
              targetLine = lineMetadata.line;
            }
          }
          
          const result = await addPRInlineComment(
            username,
            appPassword,
            workspace,
            repoSlug,
            prId,
            comment.file,
            targetLine,
            `**🤖 AI Review:** ${comment.comment}`
          );
          
          results.success.push({ 
            type: result.contextual ? 'contextual' : 'inline', 
            file: comment.file, 
            line: targetLine,
            originalLine: comment.line,
            message: result.contextual ? 'Comment posted with file/line context' : 'Inline comment posted successfully',
            contextual: result.contextual || false,
            adjusted: lineMetadata?.adjusted || false
          });
        } catch (error) {
          results.failed.push({ 
            type: 'inline', 
            file: comment.file, 
            line: comment.line,
            error: error.message 
          });
        }
      }
    }

    return results;
  } catch (error) {
    console.error('Error posting review comments:', error);
    throw new Error('Failed to post review comments to Bitbucket');
  }
};