/**
 * Advanced JavaScript diff parser inspired by Python unidiff functionality
 * Provides comprehensive parsing and analysis of git diff text
 */

/**
 * Parse a git diff text and extract file changes with detailed analysis
 * @param {string} diffText - The git diff text
 * @returns {Array} List of file changes with hunks and line information
 */
export const parseDiff = (diffText) => {
  try {
    // Sanitize the diff text to remove problematic characters
    const sanitizedDiff = diffText.replace(/\r/g, '');

    const changes = [];
    const lines = sanitizedDiff.split('\n');
    let currentFile = null;
    let currentHunk = null;
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Parse diff header
      if (line.startsWith('diff --git')) {
        const match = line.match(/^diff --git a\/(.*?) b\/(.*?)$/);
        if (match) {
          currentFile = {
            filePath: match[2].trim(),
            oldFilePath: match[1].trim(),
            isDeleted: false,
            isNew: false,
            isRenamed: false,
            isBinary: false,
            hunks: []
          };
          changes.push(currentFile);
        }
      }

      // Check for file status
      else if (line.startsWith('new file mode')) {
        if (currentFile) currentFile.isNew = true;
      }
      else if (line.startsWith('deleted file mode')) {
        if (currentFile) currentFile.isDeleted = true;
      }
      else if (line.startsWith('similarity index') || line.startsWith('rename from') || line.startsWith('rename to')) {
        if (currentFile) currentFile.isRenamed = true;
      }
      else if (line.match(/^Binary files? .* differ$/)) {
        if (currentFile) {
          currentFile.isBinary = true;
          console.info(`Skipping binary file: ${currentFile.filePath}`);
        }
      }

      // Parse file paths from --- and +++ lines
      else if (line.startsWith('---')) {
        const match = line.match(/^--- (?:a\/)?(.*)$/);
        if (match && currentFile && match[1] !== '/dev/null') {
          currentFile.oldFilePath = match[1].trim();
        }
      }
      else if (line.startsWith('+++')) {
        const match = line.match(/^\+\+\+ (?:b\/)?(.*)$/);
        if (match && currentFile && match[1] !== '/dev/null') {
          currentFile.filePath = match[1].trim();
        }
      }

      // Parse hunk header (@@ -old_start,old_length +new_start,new_length @@)
      else if (line.startsWith('@@') && currentFile && !currentFile.isBinary) {
        const match = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/);
        if (match) {
          currentHunk = {
            oldStart: parseInt(match[1]),
            oldLength: parseInt(match[2] || '1'),
            newStart: parseInt(match[3]),
            newLength: parseInt(match[4] || '1'),
            context: match[5] ? match[5].trim() : '',
            lines: []
          };
          currentFile.hunks.push(currentHunk);
        }
      }

      // Parse hunk content (context, additions, deletions)
      else if (currentHunk && (line.startsWith(' ') || line.startsWith('+') || line.startsWith('-'))) {
        const lineType = getLineType(line);
        const content = line.substring(1);

        const lineData = {
          content: content,
          lineType: lineType,
          oldLineNumber: null,
          newLineNumber: null
        };

        // Calculate line numbers based on position in hunk
        const hunkLines = currentHunk.lines;
        let oldLineCount = 0;
        let newLineCount = 0;

        for (const hunkLine of hunkLines) {
          if (hunkLine.lineType === 'context' || hunkLine.lineType === 'removed') {
            oldLineCount++;
          }
          if (hunkLine.lineType === 'context' || hunkLine.lineType === 'added') {
            newLineCount++;
          }
        }

        if (lineType === 'context' || lineType === 'removed') {
          lineData.oldLineNumber = currentHunk.oldStart + oldLineCount;
        }
        if (lineType === 'context' || lineType === 'added') {
          lineData.newLineNumber = currentHunk.newStart + newLineCount;
        }

        currentHunk.lines.push(lineData);
      }

      i++;
    }

    return changes;

  } catch (error) {
    console.error('Error parsing diff:', error);
    return [];
  }
};

/**
 * Get line type from diff line prefix
 * @param {string} line - The diff line
 * @returns {string} Line type ('added', 'removed', 'context')
 */
const getLineType = (line) => {
  if (line.startsWith('+')) return 'added';
  if (line.startsWith('-')) return 'removed';
  return 'context';
};

/**
 * Analyze changes to extract statistics and summaries
 * @param {Array} changes - List of changes from parseDiff
 * @returns {Object} Analysis results with statistics
 */
export const analyzeChanges = (changes) => {
  if (!changes || changes.length === 0) {
    return {
      totalFiles: 0,
      totalAdded: 0,
      totalRemoved: 0,
      fileStats: []
    };
  }

  const totalFiles = changes.length;
  let totalAdded = 0;
  let totalRemoved = 0;
  const fileStats = [];

  for (const change of changes) {
    try {
      let fileAdded = 0;
      let fileRemoved = 0;

      const hunks = change.hunks || [];
      for (const hunk of hunks) {
        for (const line of hunk.lines || []) {
          const lineType = line.lineType || '';
          if (lineType === 'added') {
            totalAdded++;
            fileAdded++;
          } else if (lineType === 'removed') {
            totalRemoved++;
            fileRemoved++;
          }
        }
      }

      fileStats.push({
        filePath: change.filePath || 'unknown_file',
        added: fileAdded,
        removed: fileRemoved,
        isNew: change.isNew || false,
        isDeleted: change.isDeleted || false,
        isBinary: change.isBinary || false
      });
    } catch (error) {
      console.warn('Error analyzing change:', error);
      continue;
    }
  }

  return {
    totalFiles,
    totalAdded,
    totalRemoved,
    fileStats
  };
};

/**
 * Extract changed code with surrounding context
 * @param {Array} changes - List of changes from parseDiff
 * @param {number} contextLines - Number of context lines to include (default: 3)
 * @returns {Array} List of code blocks with changes and context
 */
export const extractChangedCodeWithContext = (changes, contextLines = 3) => {
  if (!changes || changes.length === 0) {
    return [];
  }

  const codeBlocks = [];

  for (const change of changes) {
    try {
      const filePath = change.filePath || '';
      if (!filePath) {
        console.warn('Skipping change with missing file path');
        continue;
      }

      // Skip deleted files and binary files
      if (change.isDeleted || change.isBinary) {
        continue;
      }

      for (const hunk of change.hunks || []) {
        const lines = hunk.lines || [];
        if (lines.length === 0) continue;

        let inChangeBlock = false;
        let currentBlock = {
          filePath: filePath,
          startLine: null,
          endLine: null,
          code: [],
          hasChanges: false
        };

        const contextBuffer = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const lineContent = (line.content || '').replace(/\n$/, '');
          const lineType = line.lineType || 'context';
          const lineNumber = line.newLineNumber;

          // Skip lines that don't exist in the new file
          if (lineNumber === null || lineNumber === undefined) {
            continue;
          }

          // Start a new block if we find a change
          if ((lineType === 'added' || lineType === 'removed') && !inChangeBlock) {
            inChangeBlock = true;
            currentBlock.startLine = Math.max(1, lineNumber - contextLines);
            currentBlock.hasChanges = true;

            // Add preceding context from buffer
            for (const contextLine of contextBuffer) {
              if (contextLine.content !== undefined && contextLine.lineNumber !== undefined) {
                currentBlock.code.push({
                  content: contextLine.content,
                  lineNumber: contextLine.lineNumber,
                  isChange: false
                });
              }
            }

            contextBuffer.length = 0; // Clear buffer
          }

          // Add the current line to the block if we're inside a change block
          if (inChangeBlock) {
            currentBlock.code.push({
              content: lineContent,
              lineNumber: lineNumber,
              isChange: lineType === 'added' || lineType === 'removed'
            });
            currentBlock.endLine = lineNumber;
          } else {
            // Add to context buffer
            contextBuffer.push({
              content: lineContent,
              lineNumber: lineNumber
            });

            // Maintain buffer size
            if (contextBuffer.length > contextLines) {
              contextBuffer.shift();
            }
          }

          // Check if we should end the current block
          if (lineType === 'context' && inChangeBlock) {
            // Check if we've seen enough context lines after a change
            let contextCount = 0;
            for (let j = currentBlock.code.length - 1; j >= 0; j--) {
              if (!currentBlock.code[j].isChange) {
                contextCount++;
              } else {
                break;
              }

              if (contextCount >= contextLines) {
                // Trim the block to include only necessary context
                const trimIndex = Math.max(0, currentBlock.code.length - contextCount + contextLines);
                if (trimIndex < currentBlock.code.length) {
                  currentBlock.code = currentBlock.code.slice(0, trimIndex);
                  if (currentBlock.code.length > 0) {
                    currentBlock.endLine = currentBlock.code[currentBlock.code.length - 1].lineNumber;
                  }
                }

                // Add the block to results
                if (currentBlock.hasChanges && currentBlock.code.length > 0) {
                  codeBlocks.push(currentBlock);
                }

                // Reset for next block
                inChangeBlock = false;
                currentBlock = {
                  filePath: filePath,
                  startLine: null,
                  endLine: null,
                  code: [],
                  hasChanges: false
                };

                // Start filling context buffer again
                contextBuffer.length = 0;
                break;
              }
            }
          }
        }

        // Add the last block if it has changes
        if (inChangeBlock && currentBlock.hasChanges && currentBlock.code.length > 0) {
          codeBlocks.push(currentBlock);
        }
      }
    } catch (error) {
      console.warn('Error extracting code changes:', error);
      continue;
    }
  }

  return codeBlocks;
};

/**
 * Find the best line number for a comment in the diff
 * @param {Object} fileInfo - Parsed file information from parseDiff
 * @param {number} targetLine - The line number to comment on
 * @returns {Object} Object with adjusted line number and metadata
 */
export const findBestLineForComment = (fileInfo, targetLine) => {
  if (!fileInfo || !fileInfo.hunks) {
    return {
      line: targetLine,
      exists: false,
      type: null,
      inDiff: false
    };
  }

  // Create a map of all available lines
  const lineMap = new Map();
  for (const hunk of fileInfo.hunks) {
    for (const line of hunk.lines || []) {
      if (line.newLineNumber !== null && line.newLineNumber !== undefined) {
        lineMap.set(line.newLineNumber, {
          type: line.lineType,
          content: line.content,
          hunk: hunk
        });
      }
    }
  }

  // First, check if the exact line exists in our map
  if (lineMap.has(targetLine)) {
    const lineInfo = lineMap.get(targetLine);
    return {
      line: targetLine,
      exists: true,
      type: lineInfo.type,
      inDiff: true
    };
  }

  // If not, find the closest line that exists in the diff
  const availableLines = Array.from(lineMap.keys()).sort((a, b) => a - b);
  if (availableLines.length === 0) {
    return {
      line: targetLine,
      exists: false,
      type: null,
      inDiff: false
    };
  }

  // Find the closest line
  let closestLine = availableLines[0];
  let minDistance = Math.abs(targetLine - closestLine);

  for (const line of availableLines) {
    const distance = Math.abs(targetLine - line);
    if (distance < minDistance) {
      minDistance = distance;
      closestLine = line;
    }
  }

  const lineInfo = lineMap.get(closestLine);
  return {
    line: closestLine,
    originalLine: targetLine,
    exists: true,
    type: lineInfo.type,
    inDiff: true,
    adjusted: true
  };
};

/**
 * Get all modified lines for a file
 * @param {Object} fileInfo - Parsed file information
 * @returns {Array} Array of line numbers that were added or modified
 */
export const getModifiedLines = (fileInfo) => {
  if (!fileInfo || !fileInfo.hunks) {
    return [];
  }

  const modifiedLines = [];

  for (const hunk of fileInfo.hunks) {
    for (const line of hunk.lines || []) {
      if (line.lineType === 'added' && line.newLineNumber !== null) {
        modifiedLines.push(line.newLineNumber);
      }
    }
  }

  return modifiedLines.sort((a, b) => a - b);
};

/**
 * Validate if a line number is commentable in the diff
 * @param {Object} fileInfo - Parsed file information
 * @param {number} lineNumber - The line number to check
 * @returns {boolean} Whether the line can be commented on
 */
export const isLineCommentable = (fileInfo, lineNumber) => {
  if (!fileInfo || !fileInfo.hunks) {
    return false;
  }

  for (const hunk of fileInfo.hunks) {
    for (const line of hunk.lines || []) {
      if (line.newLineNumber === lineNumber) {
        // Can comment on added lines or context lines
        return line.lineType === 'added' || line.lineType === 'context';
      }
    }
  }

  return false;
};

/**
 * Format changes for display or analysis
 * @param {Array} changes - List of changes from parseDiff
 * @returns {string} Formatted text representation of changes
 */
export const formatChangesForDisplay = (changes) => {
  if (!changes || changes.length === 0) {
    return 'No changes found.';
  }

  let output = '';
  const analysis = analyzeChanges(changes);

  output += `Summary: ${analysis.totalFiles} files changed, `;
  output += `${analysis.totalAdded} insertions(+), ${analysis.totalRemoved} deletions(-)\n\n`;

  for (const change of changes) {
    if (change.isBinary) {
      output += `Binary file: ${change.filePath}\n`;
      continue;
    }

    if (change.isDeleted) {
      output += `Deleted: ${change.filePath}\n`;
      continue;
    }

    if (change.isNew) {
      output += `New file: ${change.filePath}\n`;
    } else if (change.isRenamed) {
      output += `Renamed: ${change.oldFilePath} → ${change.filePath}\n`;
    } else {
      output += `Modified: ${change.filePath}\n`;
    }

    for (const hunk of change.hunks || []) {
      output += `  @@ -${hunk.oldStart},${hunk.oldLength} +${hunk.newStart},${hunk.newLength} @@`;
      if (hunk.context) {
        output += ` ${hunk.context}`;
      }
      output += '\n';

      for (const line of hunk.lines || []) {
        const prefix = line.lineType === 'added' ? '+' :
                     line.lineType === 'removed' ? '-' : ' ';
        output += `  ${prefix}${line.content}\n`;
      }
    }

    output += '\n';
  }

  return output;
};

// Legacy compatibility - keep the old parseUnifiedDiff function name
export const parseUnifiedDiff = parseDiff;

// Additional utility functions for extracting information
export const extractFilePath = (header) => {
  const patterns = [
    /diff --git a\/.* b\/(.*)/,
    /\+\+\+ b\/(.*)/,
    /--- a\/(.*)/
  ];

  for (const pattern of patterns) {
    const match = header.match(pattern);
    if (match && match[1] && match[1] !== '/dev/null') {
      return match[1];
    }
  }

  return null;
};

/**
 * Get summary statistics from parsed changes
 * @param {Array} changes - Parsed changes array
 * @returns {Object} Summary statistics
 */
export const getChangesSummary = (changes) => {
  const analysis = analyzeChanges(changes);

  return {
    filesChanged: analysis.totalFiles,
    linesAdded: analysis.totalAdded,
    linesRemoved: analysis.totalRemoved,
    files: analysis.fileStats.map(stat => ({
      path: stat.filePath,
      added: stat.added,
      removed: stat.removed,
      isNew: stat.isNew,
      isDeleted: stat.isDeleted,
      isBinary: stat.isBinary
    }))
  };
};