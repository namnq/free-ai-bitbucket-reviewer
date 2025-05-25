import { openDB } from 'idb';

const DB_NAME = 'bitbucket_ai_review';
const DB_VERSION = 1;

// Initialize IndexedDB
export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Config store - single configuration object
      if (!db.objectStoreNames.contains('config')) {
        db.createObjectStore('config', { keyPath: 'singleton' });
      }

      // Reviewed PRs store
      if (!db.objectStoreNames.contains('reviewed_prs')) {
        db.createObjectStore('reviewed_prs', { keyPath: 'prKey' });
      }

      // Optional: Store review content
      if (!db.objectStoreNames.contains('reviews')) {
        db.createObjectStore('reviews', { keyPath: 'prKey' });
      }
    },
  });
};

// Configuration functions
export const getConfig = async () => {
  const db = await initDB();
  const config = await db.get('config', 'singleton');
  return config || {
    llmToken: '',
    bitbucketUsername: '',
    bitbucketAppPassword: '',
    reviewPrompt: `You are an expert code reviewer tasked with reviewing a pull request.

Below is the description of the PR and the code changes:

## Pull Request Description
{pr_description}

## Code Changes
{code_changes}

Please provide a thorough code review with the following (suggest fix if needed):
1. Identify any bugs, logic errors, or potential issues
2. Suggest improvements in readability, performance, or maintainability
3. Comment on code structure and organization
4. Check for proper error handling and edge cases
5. Assess if the implementation meets the requirements
6. If a modified block is not an issue or low severity, do **not** add a comment for it.

IMPORTANT: You MUST format your response as a valid JSON object with the following structure:
\`\`\`json
{{
    "summary": "short Title of the changes",
    "comments": [
        {{
            "file": "path/to/file.ext",
            "line": 42,
            "comment": "Severity: Your short comment about this code"
        }},
        ...more comments...
    ]
}}
\`\`\`

Do not include any text before or after the JSON. The entire response should be a valid JSON object that can be parsed directly. `
  };
};

export const saveConfig = async (configData) => {
  const db = await initDB();
  await db.put('config', { singleton: 'singleton', ...configData });
};

// PR Review tracking functions
export const isPRReviewed = async (prKey) => {
  const db = await initDB();
  const reviewedPR = await db.get('reviewed_prs', prKey);
  return !!reviewedPR;
};

export const markPRReviewed = async (prKey, repoFullName, prId) => {
  const db = await initDB();
  await db.put('reviewed_prs', {
    prKey,
    repoFullName,
    prId,
    reviewedAt: new Date().toISOString()
  });
};

export const getReviewedPRs = async () => {
  const db = await initDB();
  return await db.getAll('reviewed_prs');
};

// Review content functions (optional)
export const saveReviewContent = async (prKey, reviewContent, metadata = {}) => {
  const db = await initDB();
  await db.put('reviews', {
    prKey,
    reviewContent,
    metadata,
    createdAt: new Date().toISOString()
  });
};

export const getReviewContent = async (prKey) => {
  const db = await initDB();
  return await db.get('reviews', prKey);
};

export const getAllReviews = async () => {
  const db = await initDB();
  return await db.getAll('reviews');
};