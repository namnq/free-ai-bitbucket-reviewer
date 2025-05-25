import axios from 'axios';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Create axios instance for Gemini API
const createGeminiClient = (apiKey) => {
  return axios.create({
    baseURL: GEMINI_API_BASE,
    timeout: 60000, // Longer timeout for AI processing
  });
};

// Review code using Gemini Flash
export const reviewCode = async (diffText, prompt, apiKey, metadata = {}) => {
  try {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    if (!diffText || diffText.trim().length === 0) {
      throw new Error('No diff content to review');
    }

    const api = createGeminiClient(apiKey);

    // Create the full prompt - handle both old and new calling patterns
    let fullPrompt;
    
    if (diffText.includes('## Pull Request Context') || diffText.includes('## Changes Summary')) {
      // New enhanced format - diffText already contains the full structured prompt
      fullPrompt = diffText;
    } else {
      // Old format - combine prompt and diffText
      fullPrompt = prompt
        .replace('{pr_description}', metadata.pr_description || 'No description provided')
        .replace('{pr_title}', metadata.pr_title || 'No title provided')
        .replace('{code_changes}', diffText);
    }

    console.log('📤 Sending to Gemini:', {
      promptLength: fullPrompt.length,
      hasStructuredFormat: fullPrompt.includes('## Pull Request Context'),
      preview: fullPrompt.substring(0, 200) + '...'
    });

    // Make request to Gemini Flash
    const response = await api.post(`/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`, {
      contents: [
        {
          parts: [
            {
              text: fullPrompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8096, // Increased for JSON output
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    });

    console.log('📥 Gemini response received:', {
      candidates: response.data?.candidates?.length || 0,
      contentLength: response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.length || 0
    });

    // Extract the generated text
    const candidates = response.data?.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error('No response generated from Gemini API');
    }

    const content = candidates[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error('Empty response from Gemini API');
    }

    // Try to extract JSON from the response
    let cleanedContent = content.trim();

    // Remove markdown code blocks if present
    if (cleanedContent.includes('```json')) {
      const jsonMatch = cleanedContent.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        cleanedContent = jsonMatch[1];
      }
    } else if (cleanedContent.includes('```')) {
      const codeMatch = cleanedContent.match(/```\s*([\s\S]*?)\s*```/);
      if (codeMatch) {
        cleanedContent = codeMatch[1];
      }
    }

    return {
      reviewResult: cleanedContent,
      usage: response.data.usageMetadata || {},
      model: 'gemini-2.5-flash-preview-05-20'
    };

  } catch (error) {
    console.error('Error calling Gemini API:', error);

    if (error.response?.status === 401) {
      throw new Error('Invalid Gemini API key');
    } else if (error.response?.status === 403) {
      throw new Error('Gemini API access forbidden - check your API key permissions');
    } else if (error.response?.status === 429) {
      throw new Error('Gemini API rate limit exceeded - please try again later');
    } else if (error.response?.status === 400) {
      const errorMessage = error.response?.data?.error?.message || 'Invalid request to Gemini API';
      throw new Error(`Gemini API error: ${errorMessage}`);
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Gemini API request timed out - the diff might be too large');
    } else {
      throw new Error(error.message || 'Failed to get AI review');
    }
  }
};

// Test API key validity
export const testApiKey = async (apiKey) => {
  try {
    const api = createGeminiClient(apiKey);
    const response = await api.post(`/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`, {
      contents: [
        {
          parts: [
            {
              text: "Hello, please respond with 'API key is valid'"
            }
          ]
        }
      ]
    });

    return response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.includes('API key is valid');
  } catch (error) {
    return false;
  }
};

// Get available models (optional)
export const getAvailableModels = async (apiKey) => {
  try {
    const api = createGeminiClient(apiKey);
    const response = await api.get(`/models?key=${apiKey}`);
    return response.data.models || [];
  } catch (error) {
    console.error('Error fetching available models:', error);
    return [];
  }
};