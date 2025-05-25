/**
 * Demo/test utility to showcase the enhanced diff parser capabilities
 * This file demonstrates how to use the advanced features of the diff parser
 */

import { 
  parseDiff, 
  analyzeChanges, 
  extractChangedCodeWithContext, 
  formatChangesForDisplay,
  getChangesSummary,
  findBestLineForComment,
  getModifiedLines,
  isLineCommentable
} from './diffParser';

/**
 * Sample git diff for testing purposes
 */
const SAMPLE_DIFF = `diff --git a/src/components/Button.jsx b/src/components/Button.jsx
index 1234567..abcdefg 100644
--- a/src/components/Button.jsx
+++ b/src/components/Button.jsx
@@ -10,12 +10,15 @@ import React from 'react';
 const Button = ({ children, onClick, variant = 'primary', disabled = false }) => {
   const baseClasses = 'px-4 py-2 rounded font-medium focus:outline-none transition-colors';
   
-  const variantClasses = {
-    primary: 'bg-blue-500 text-white hover:bg-blue-600',
-    secondary: 'bg-gray-300 text-gray-700 hover:bg-gray-400'
-  };
+  // Enhanced variant classes with better styling
+  const variantClasses = {
+    primary: 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-2 focus:ring-blue-300',
+    secondary: 'bg-gray-300 text-gray-700 hover:bg-gray-400 focus:ring-2 focus:ring-gray-300',
+    success: 'bg-green-500 text-white hover:bg-green-600 focus:ring-2 focus:ring-green-300',
+    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-2 focus:ring-red-300'
+  };
   
-  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';
+  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '';
   
   return (
     <button`;

// Export for use in browser console or testing
if (typeof window !== 'undefined') {
  window.diffParserDemo = {
    parseDiff,
    analyzeChanges,
    extractChangedCodeWithContext,
    formatChangesForDisplay,
    getChangesSummary
  };
}