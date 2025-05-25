# Enhanced Diff Parser for Bitbucket AI Code Review

This document explains the enhanced diff parser functionality that has been integrated into the Bitbucket AI Code Review WebApp. The diff parser is based on the powerful Python `unidiff` library logic but implemented in JavaScript for browser compatibility.

## 🚀 Features

### Core Parsing Capabilities
- **Comprehensive Git Diff Parsing**: Parse standard git diff output with full support for:
  - File additions, deletions, and modifications
  - File renames and moves
  - Binary file detection
  - Multiple hunks per file
  - Context lines around changes

### Advanced Analysis
- **Statistical Analysis**: Get detailed statistics about changes including:
  - Total files changed
  - Lines added/removed per file and overall
  - File-by-file breakdown
  - Change type detection (new, deleted, modified, renamed)

- **Code Block Extraction**: Extract changed code with surrounding context:
  - Configurable context lines (default: 3)
  - Smart block boundaries
  - Preservation of line numbers
  - Change highlighting

### Comment Integration
- **Smart Comment Positioning**: Find the best line numbers for inline comments:
  - Exact line matching when available
  - Closest line fallback for unavailable lines
  - Commentable line validation
  - Integration with Bitbucket's commenting API

## 📚 API Reference

### Core Functions

#### `parseDiff(diffText)`
Parses a git diff text and returns structured data.

```javascript
import { parseDiff } from '../utils/diffParser';

const diffText = `diff --git a/file.js b/file.js
index 1234567..abcdefg 100644
--- a/file.js
+++ b/file.js
@@ -1,3 +1,4 @@
 const hello = 'world';
+const newLine = 'added';
 console.log(hello);`;

const changes = parseDiff(diffText);
// Returns: Array of file change objects
```

**Returns:**
```javascript
[
  {
    filePath: "file.js",
    oldFilePath: "file.js", 
    isDeleted: false,
    isNew: false,
    isRenamed: false,
    isBinary: false,
    hunks: [
      {
        oldStart: 1,
        oldLength: 3,
        newStart: 1,
        newLength: 4,
        context: "",
        lines: [
          {
            content: "const hello = 'world';",
            lineType: "context",
            oldLineNumber: 1,
            newLineNumber: 1
          },
          {
            content: "const newLine = 'added';",
            lineType: "added",
            oldLineNumber: null,
            newLineNumber: 2
          }
          // ... more lines
        ]
      }
    ]
  }
]
```

#### `analyzeChanges(changes)`
Analyzes parsed changes to extract statistics.

```javascript
import { analyzeChanges } from '../utils/diffParser';

const analysis = analyzeChanges(changes);
console.log(analysis);
// {
//   totalFiles: 1,
//   totalAdded: 5,
//   totalRemoved: 2,
//   fileStats: [
//     {
//       filePath: "file.js",
//       added: 5,
//       removed: 2,
//       isNew: false,
//       isDeleted: false,
//       isBinary: false
//     }
//   ]
// }
```

#### `extractChangedCodeWithContext(changes, contextLines = 3)`
Extracts code blocks containing changes with surrounding context.

```javascript
import { extractChangedCodeWithContext } from '../utils/diffParser';

const codeBlocks = extractChangedCodeWithContext(changes, 3);
console.log(codeBlocks);
// [
//   {
//     filePath: "file.js",
//     startLine: 1,
//     endLine: 5,
//     hasChanges: true,
//     code: [
//       {
//         content: "const hello = 'world';",
//         lineNumber: 1,
//         isChange: false
//       },
//       {
//         content: "const newLine = 'added';",
//         lineNumber: 2,
//         isChange: true
//       }
//       // ... more lines
//     ]
//   }
// ]
```

### Comment Helper Functions

#### `findBestLineForComment(fileInfo, targetLine)`
Finds the best line number for placing a comment in a diff.

```javascript
import { findBestLineForComment } from '../utils/diffParser';

const result = findBestLineForComment(fileInfo, 25);
console.log(result);
// {
//   line: 23,           // Best available line
//   originalLine: 25,   // Original requested line
//   exists: true,       // Line exists in diff
//   type: "added",      // Line type
//   inDiff: true,       // Line is part of diff
//   adjusted: true      // Line was adjusted from original
// }
```

#### `getModifiedLines(fileInfo)`
Gets all line numbers that were added or modified.

```javascript
import { getModifiedLines } from '../utils/diffParser';

const modifiedLines = getModifiedLines(fileInfo);
console.log(modifiedLines); // [2, 5, 8, 12, 15]
```

#### `isLineCommentable(fileInfo, lineNumber)`
Checks if a line can have inline comments.

```javascript
import { isLineCommentable } from '../utils/diffParser';

const canComment = isLineCommentable(fileInfo, 12);
console.log(canComment); // true/false
```

### Utility Functions

#### `getChangesSummary(changes)`
Gets a summary of all changes for display purposes.

```javascript
import { getChangesSummary } from '../utils/diffParser';

const summary = getChangesSummary(changes);
// {
//   filesChanged: 3,
//   linesAdded: 25,
//   linesRemoved: 10,
//   files: [
//     {
//       path: "file1.js",
//       added: 15,
//       removed: 5,
//       isNew: false,
//       isDeleted: false,
//       isBinary: false
//     }
//     // ... more files
//   ]
// }
```

#### `formatChangesForDisplay(changes)`
Formats changes as a human-readable string.

```javascript
import { formatChangesForDisplay } from '../utils/diffParser';

const formatted = formatChangesForDisplay(changes);
console.log(formatted);
// Summary: 2 files changed, 15 insertions(+), 5 deletions(-)
// 
// Modified: src/components/Button.jsx
//   @@ -10,12 +10,15 @@ import React from 'react';
//   +  // Enhanced variant classes with better styling
//   +  const variantClasses = {
//   ...
```

## 🛠️ Integration Examples

### Basic Usage in Components

```javascript
// In a React component
import { parseDiff, analyzeChanges } from '../utils/diffParser';

const PRReviewComponent = ({ diffText }) => {
  const [analysis, setAnalysis] = useState(null);
  
  useEffect(() => {
    if (diffText) {
      const changes = parseDiff(diffText);
      const stats = analyzeChanges(changes);
      setAnalysis(stats);
    }
  }, [diffText]);
  
  return (
    <div>
      {analysis && (
        <div>
          <p>Files changed: {analysis.totalFiles}</p>
          <p>Lines added: {analysis.totalAdded}</p>
          <p>Lines removed: {analysis.totalRemoved}</p>
        </div>
      )}
    </div>
  );
};
```

### Integration with AI Code Review

```javascript
// Enhanced AI review with better context
import { parseDiff, extractChangedCodeWithContext } from '../utils/diffParser';

const performAIReview = async (diffText, prompt, llmToken) => {
  // Parse the diff
  const changes = parseDiff(diffText);
  
  // Extract code blocks with context
  const codeBlocks = extractChangedCodeWithContext(changes, 5);
  
  // Create enhanced prompt with structured code context
  const enhancedPrompt = `
${prompt}

Files changed: ${changes.length}
Code blocks to review:

${codeBlocks.map((block, index) => `
Block ${index + 1}: ${block.filePath} (lines ${block.startLine}-${block.endLine})
${block.code.map(line => 
  `${line.isChange ? '>' : ' '} ${line.lineNumber}: ${line.content}`
).join('\n')}
`).join('\n---\n')}
  `;
  
  // Send to AI service
  const review = await reviewCode(enhancedPrompt, llmToken);
  return review;
};
```

### Smart Comment Positioning

```javascript
// Automatically adjust comment positions for Bitbucket API
import { findBestLineForComment, isLineCommentable } from '../utils/diffParser';

const postReviewComments = async (comments, fileChanges) => {
  const adjustedComments = [];
  
  for (const comment of comments) {
    const fileInfo = fileChanges.find(f => f.filePath === comment.file);
    
    if (fileInfo) {
      const lineInfo = findBestLineForComment(fileInfo, comment.line);
      
      if (lineInfo.exists && isLineCommentable(fileInfo, lineInfo.line)) {
        adjustedComments.push({
          ...comment,
          line: lineInfo.line,
          adjusted: lineInfo.adjusted,
          originalLine: lineInfo.originalLine
        });
      } else {
        // Fall back to general comment with context
        adjustedComments.push({
          ...comment,
          type: 'general',
          context: `Original line ${comment.line} in ${comment.file}`
        });
      }
    }
  }
  
  return adjustedComments;
};
```

## 🧪 Testing and Validation

### Running Tests

You can test the diff parser functionality using the demo utilities:

```javascript
// In browser console or test environment
import { testDiffParser, runDiffParserDemo } from '../utils/diffParserDemo';

// Run comprehensive tests
const testResults = testDiffParser();

// Run interactive demo
const demoResults = runDiffParserDemo();

// Benchmark performance
const benchmarkResults = benchmarkDiffParser();
```

### Common Edge Cases Handled

1. **Empty Diffs**: Returns empty arrays gracefully
2. **Binary Files**: Detected and skipped appropriately
3. **Renamed Files**: Properly tracks old and new paths
4. **Large Diffs**: Optimized for performance
5. **Malformed Diffs**: Error handling with fallbacks
6. **Missing Context**: Handles diffs without surrounding context
7. **Single Line Changes**: Proper handling of minimal diffs

## 🔧 Configuration Options

### Context Lines
Control how many context lines to include around changes:

```javascript
// Default: 3 lines of context
const codeBlocks = extractChangedCodeWithContext(changes, 3);

// More context for complex reviews
const detailedBlocks = extractChangedCodeWithContext(changes, 10);

// Minimal context for performance
const minimalBlocks = extractChangedCodeWithContext(changes, 1);
```

### Error Handling
The parser includes comprehensive error handling:

```javascript
try {
  const changes = parseDiff(diffText);
  // Process changes
} catch (error) {
  console.error('Diff parsing failed:', error);
  // Fallback to basic processing
}
```

## 🚀 Performance Considerations

- **Optimized Parsing**: Efficient line-by-line processing
- **Memory Management**: Minimal object creation
- **Large File Support**: Handles diffs with hundreds of files
- **Stream Processing**: Can process diffs incrementally
- **Caching**: Results can be cached for repeated access

## 🔗 Integration Points

The enhanced diff parser integrates with several parts of the application:

1. **Bitbucket API Service** (`src/services/bitbucketApi.js`)
   - Used in `postReviewComments()` for comment positioning
   - Provides diff parsing for PR analysis

2. **PR List Item Component** (`src/components/PRListItem.jsx`)
   - Can be enhanced to show diff statistics
   - Better comment positioning for AI reviews

3. **AI Review Service** (`src/services/geminiFlashApi.js`)
   - Can be enhanced with structured code context
   - Better prompts with file and line information

## 📈 Future Enhancements

Potential areas for future improvement:

1. **Syntax Highlighting**: Add language-specific parsing
2. **Conflict Detection**: Identify merge conflicts in diffs
3. **Review Templates**: Pre-defined review patterns
4. **Performance Metrics**: Track parsing performance
5. **Visual Diff Display**: Rich UI components for diff visualization

This enhanced diff parser provides a solid foundation for intelligent code review functionality while maintaining compatibility with the existing Bitbucket integration.
