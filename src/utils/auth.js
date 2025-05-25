// Validation utilities for authentication and configuration

export const validateConfig = (config) => {
  const errors = [];
  
  if (!config.llmToken || config.llmToken.trim().length === 0) {
    errors.push('Gemini API Token is required');
  }
  
  if (!config.bitbucketUsername || config.bitbucketUsername.trim().length === 0) {
    errors.push('Bitbucket Username is required');
  }
  
  if (!config.bitbucketAppPassword || config.bitbucketAppPassword.trim().length === 0) {
    errors.push('Bitbucket App Password is required');
  }
  
  if (!config.reviewPrompt || config.reviewPrompt.trim().length === 0) {
    errors.push('Review Prompt is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateBitbucketCredentials = (username, appPassword) => {
  if (!username || username.trim().length === 0) {
    return { isValid: false, error: 'Username is required' };
  }
  
  if (!appPassword || appPassword.trim().length === 0) {
    return { isValid: false, error: 'App Password is required' };
  }
  
  // Basic format validation
  if (username.includes(' ') || username.includes('@')) {
    return { isValid: false, error: 'Username should not contain spaces or @ symbol' };
  }
  
  return { isValid: true };
};

export const validateGeminiApiKey = (apiKey) => {
  if (!apiKey || apiKey.trim().length === 0) {
    return { isValid: false, error: 'API Key is required' };
  }
  
  // Basic format check for Google API keys
  if (!apiKey.startsWith('AIza') || apiKey.length < 35) {
    return { isValid: false, error: 'Invalid API Key format' };
  }
  
  return { isValid: true };
};

// Format repository full name
export const formatRepoFullName = (workspace, repoSlug) => {
  return `${workspace}/${repoSlug}`;
};

// Parse repository full name
export const parseRepoFullName = (fullName) => {
  const parts = fullName.split('/');
  if (parts.length !== 2) {
    throw new Error('Invalid repository full name format');
  }
  return {
    workspace: parts[0],
    repoSlug: parts[1]
  };
};

// Generate PR key for IndexedDB
export const generatePRKey = (workspace, repoSlug, prId) => {
  return `${workspace}/${repoSlug}#${prId}`;
};

// Parse PR key
export const parsePRKey = (prKey) => {
  const parts = prKey.split('#');
  if (parts.length !== 2) {
    throw new Error('Invalid PR key format');
  }
  
  const repoFullName = parts[0];
  const prId = parseInt(parts[1]);
  const { workspace, repoSlug } = parseRepoFullName(repoFullName);
  
  return {
    workspace,
    repoSlug,
    repoFullName,
    prId
  };
};

// Format date for display
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Truncate text for display
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
};

// Generate random color for avatars/badges
export const generateColor = (text) => {
  const colors = [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-gray-500'
  ];
  
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// Check if configuration is complete
export const isConfigurationComplete = (config) => {
  return !!(
    config.llmToken && 
    config.bitbucketUsername && 
    config.bitbucketAppPassword &&
    config.reviewPrompt
  );
};
