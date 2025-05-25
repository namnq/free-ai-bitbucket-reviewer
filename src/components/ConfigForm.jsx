import React, { useState, useEffect } from 'react'
import { saveConfig } from '../db/indexedDB'
import { validateConfig, validateBitbucketCredentials, validateGeminiApiKey } from '../utils/auth'
import { testApiKey } from '../services/geminiFlashApi'
import { getCurrentUser } from '../services/bitbucketApi'

const ConfigForm = ({ initialConfig, onConfigUpdate }) => {
  const [config, setConfig] = useState({
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
  })

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [testResults, setTestResults] = useState({})

  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig)
    }
  }, [initialConfig])

  const handleInputChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }))

    // Clear specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }

    // Clear success message when user makes changes
    if (success) {
      setSuccess(false)
    }
  }

  const testBitbucketCredentials = async () => {
    const validation = validateBitbucketCredentials(config.bitbucketUsername, config.bitbucketAppPassword)
    if (!validation.isValid) {
      setTestResults(prev => ({
        ...prev,
        bitbucket: { success: false, message: validation.error }
      }))
      return
    }

    try {
      setTestResults(prev => ({ ...prev, bitbucket: { testing: true } }))

      const user = await getCurrentUser(config.bitbucketUsername, config.bitbucketAppPassword)
      setTestResults(prev => ({
        ...prev,
        bitbucket: {
          success: true,
          message: `Connected successfully as ${user.display_name || user.username}`,
          userData: user
        }
      }))
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        bitbucket: { success: false, message: error.message }
      }))
    }
  }

  const testGeminiCredentials = async () => {
    const validation = validateGeminiApiKey(config.llmToken)
    if (!validation.isValid) {
      setTestResults(prev => ({
        ...prev,
        gemini: { success: false, message: validation.error }
      }))
      return
    }

    try {
      setTestResults(prev => ({ ...prev, gemini: { testing: true } }))

      const isValid = await testApiKey(config.llmToken)
      if (isValid) {
        setTestResults(prev => ({
          ...prev,
          gemini: { success: true, message: 'API key is valid and working' }
        }))
      } else {
        setTestResults(prev => ({
          ...prev,
          gemini: { success: false, message: 'Invalid API key or connection failed' }
        }))
      }
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        gemini: { success: false, message: error.message }
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const validation = validateConfig(config)
    if (!validation.isValid) {
      const errorObj = {}
      validation.errors.forEach(error => {
        if (error.includes('Token')) errorObj.llmToken = error
        if (error.includes('Username')) errorObj.bitbucketUsername = error
        if (error.includes('Password')) errorObj.bitbucketAppPassword = error
        if (error.includes('Prompt')) errorObj.reviewPrompt = error
      })
      setErrors(errorObj)
      return
    }

    try {
      setLoading(true)
      setErrors({})

      await saveConfig(config)
      onConfigUpdate(config)
      setSuccess(true)

      // Clear test results after successful save
      setTestResults({})

    } catch (error) {
      console.error('Error saving configuration:', error)
      setErrors({ general: 'Failed to save configuration. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setConfig({
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
    })
    setErrors({})
    setSuccess(false)
    setTestResults({})
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Privacy & Security Notice */}
      <div className="card bg-gradient-to-r from-green-50 to-blue-50 border-l-4 border-green-500">
        <div className="card-body">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                🔒
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                🛡️ Privacy & Security Information
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="font-medium text-gray-700">100% Local Storage</span>
                  </div>
                  <p className="text-gray-600 ml-4">
                    All configurations are stored locally in your browser using IndexedDB. 
                    No data is sent to external servers.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span className="font-medium text-gray-700">Your Data, Your Control</span>
                  </div>
                  <p className="text-gray-600 ml-4">
                    API keys and credentials never leave your browser. 
                    You can clear all data anytime via browser settings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Configuration Card */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              ⚙️
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Configuration</h1>
              <p className="text-gray-600 mt-1">
                Configure your API credentials and review settings to start using the AI code reviewer.
              </p>
            </div>
          </div>
        </div>

        <div className="card-body">
          {success && (
            <div className="alert-success mb-6">
              <h3 className="font-semibold">✅ Configuration Saved Successfully!</h3>
              <p>Your settings have been saved locally. You can now use the repository search to review pull requests.</p>
            </div>
          )}

          {errors.general && (
            <div className="alert-error mb-6">
              <p>{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Gemini API Configuration */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3 pb-3 border-b">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  🤖
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Gemini Flash API Configuration
                </h2>
              </div>

              <div className="form-group">
                <label htmlFor="llmToken" className="form-label">
                  Gemini API Token *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="password"
                    id="llmToken"
                    value={config.llmToken}
                    onChange={(e) => handleInputChange('llmToken', e.target.value)}
                    className={`form-input flex-1 ${errors.llmToken ? 'border-red-500' : ''}`}
                    placeholder="Enter your Gemini API key (starts with AIza...)"
                  />
                  <button
                    type="button"
                    onClick={testGeminiCredentials}
                    disabled={!config.llmToken || testResults.gemini?.testing}
                    className="btn-secondary whitespace-nowrap"
                  >
                    {testResults.gemini?.testing ? (
                      <>
                        <span className="spinner-sm mr-2"></span>
                        Testing...
                      </>
                    ) : (
                      'Test API Key'
                    )}
                  </button>
                </div>

                {errors.llmToken && (
                  <p className="form-error">{errors.llmToken}</p>
                )}

                {testResults.gemini && !testResults.gemini.testing && (
                  <div className={`mt-2 p-3 rounded-md ${
                    testResults.gemini.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                  }`}>
                    <p className="text-sm">{testResults.gemini.message}</p>
                  </div>
                )}

                <p className="form-help">
                  Get your API key from{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Google AI Studio
                  </a>
                </p>
              </div>
            </div>

            {/* Bitbucket API Configuration */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3 pb-3 border-b">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  🪣
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Bitbucket API Configuration
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label htmlFor="bitbucketUsername" className="form-label">
                    Bitbucket Username *
                  </label>
                  <input
                    type="text"
                    id="bitbucketUsername"
                    value={config.bitbucketUsername}
                    onChange={(e) => handleInputChange('bitbucketUsername', e.target.value)}
                    className={`form-input ${errors.bitbucketUsername ? 'border-red-500' : ''}`}
                    placeholder="your-bitbucket-username"
                  />
                  {errors.bitbucketUsername && (
                    <p className="form-error">{errors.bitbucketUsername}</p>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="bitbucketAppPassword" className="form-label">
                    Bitbucket App Password *
                  </label>
                  <input
                    type="password"
                    id="bitbucketAppPassword"
                    value={config.bitbucketAppPassword}
                    onChange={(e) => handleInputChange('bitbucketAppPassword', e.target.value)}
                    className={`form-input ${errors.bitbucketAppPassword ? 'border-red-500' : ''}`}
                    placeholder="Enter your app password"
                  />
                  {errors.bitbucketAppPassword && (
                    <p className="form-error">{errors.bitbucketAppPassword}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={testBitbucketCredentials}
                  disabled={!config.bitbucketUsername || !config.bitbucketAppPassword || testResults.bitbucket?.testing}
                  className="btn-secondary"
                >
                  {testResults.bitbucket?.testing ? (
                    <>
                      <span className="spinner-sm mr-2"></span>
                      Testing Connection...
                    </>
                  ) : (
                    'Test Bitbucket Connection'
                  )}
                </button>
              </div>

              {testResults.bitbucket && !testResults.bitbucket.testing && (
                <div className={`p-3 rounded-md ${
                  testResults.bitbucket.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}>
                  <p className="text-sm">{testResults.bitbucket.message}</p>
                </div>
              )}

              <div className="bg-blue-50 p-4 rounded-md">
                <h4 className="font-medium text-blue-900 mb-2">📝 How to create a Bitbucket App Password:</h4>
                <ol className="text-sm text-blue-800 space-y-1 ml-4 list-decimal">
                  <li>Go to Bitbucket Settings → App passwords</li>
                  <li>Click "Create app password"</li>
                  <li>Give it a name and select these permissions:</li>
                  <ul className="ml-4 mt-1 space-y-1 list-disc">
                    <li>Account: Read</li>
                    <li>Repositories: Read</li>
                    <li>Pull requests: Read (and Write if you want to post comments)</li>
                  </ul>
                  <li>Copy the generated password and paste it above</li>
                </ol>
              </div>
            </div>

            {/* Review Prompt Configuration */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3 pb-3 border-b">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  💬
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  AI Review Prompt Template
                </h2>
              </div>

              <div className="form-group">
                <label htmlFor="reviewPrompt" className="form-label">
                  Review Prompt Template *
                </label>
                <textarea
                  id="reviewPrompt"
                  rows={8}
                  value={config.reviewPrompt}
                  onChange={(e) => handleInputChange('reviewPrompt', e.target.value)}
                  className={`form-textarea ${errors.reviewPrompt ? 'border-red-500' : ''}`}
                  placeholder="Enter the prompt template for AI code reviews..."
                />
                {errors.reviewPrompt && (
                  <p className="form-error">{errors.reviewPrompt}</p>
                )}
                <p className="form-help">
                  This prompt will be sent to the AI along with the code diff.
                  Customize it to get the type of feedback you want.
                </p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-between pt-6 border-t">
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary"
              >
                🔄 Reset Form
              </button>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? (
                    <>
                      <span className="spinner-sm mr-2"></span>
                      Saving Locally...
                    </>
                  ) : (
                    '💾 Save Configuration'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Data Storage Information */}
      <div className="card bg-gray-50 border-dashed border-2 border-gray-200">
        <div className="card-body">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              💾
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Local Data Storage Details
              </h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-600">
                <div className="space-y-2">
                  <div className="font-medium text-gray-800">🗂️ Storage Technology</div>
                  <p>IndexedDB (Browser Database)</p>
                </div>
                <div className="space-y-2">
                  <div className="font-medium text-gray-800">🌐 Data Location</div>
                  <p>Your Computer Only</p>
                </div>
                <div className="space-y-2">
                  <div className="font-medium text-gray-800">🔐 Access Control</div>
                  <p>Only This Browser Tab</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border text-left">
              <h4 className="font-medium text-gray-900 mb-2">🗑️ To Clear All Configuration Data:</h4>
              <p className="text-sm text-gray-600">
                Open browser Developer Tools → Application → Storage → IndexedDB → 
                Delete "AI-Code-Reviewer" database, or use browser's "Clear browsing data" option.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfigForm