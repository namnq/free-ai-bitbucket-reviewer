import React, { useState, useEffect } from 'react'
import { getPullRequests } from '../services/bitbucketApi'
import { parseRepoFullName } from '../utils/auth'
import PRListItem from './PRListItem.jsx'

const PRList = ({ repo, config }) => {
  const [pullRequests, setPullRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 0,
    size: 0
  })
  const [selectedState, setSelectedState] = useState('OPEN')

  const prStates = [
    { value: 'OPEN', label: 'Open PRs', icon: '🟢' },
    { value: 'MERGED', label: 'Merged PRs', icon: '🟣' },
    { value: 'DECLINED', label: 'Declined PRs', icon: '🔴' }
  ]

  useEffect(() => {
    if (repo) {
      fetchPullRequests(1, selectedState)
    }
  }, [repo, selectedState])

  const fetchPullRequests = async (page = 1, state = selectedState) => {
    if (!repo) return

    try {
      setLoading(true)
      setError(null)

      const { workspace, repoSlug } = parseRepoFullName(repo.full_name)
      
      const result = await getPullRequests(
        config.bitbucketUsername,
        config.bitbucketAppPassword,
        workspace,
        repoSlug,
        state,
        page
      )

      setPullRequests(result.pullRequests)
      setPagination(result.pagination)

    } catch (err) {
      console.error('Error fetching pull requests:', err)
      setError(err.message)
      setPullRequests([])
      setPagination({ page: 1, totalPages: 0, size: 0 })
    } finally {
      setLoading(false)
    }
  }

  const handleStateChange = (newState) => {
    setSelectedState(newState)
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchPullRequests(newPage, selectedState)
    }
  }

  const refreshPRs = () => {
    fetchPullRequests(pagination.page, selectedState)
  }

  if (!repo) return null

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Pull Requests - {repo.name}
            </h2>
            <p className="text-sm text-gray-600 font-mono">
              {repo.full_name}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={refreshPRs}
              disabled={loading}
              className="btn-secondary btn-sm"
              title="Refresh pull requests"
            >
              {loading ? (
                <span className="spinner-sm"></span>
              ) : (
                '🔄'
              )}
            </button>
          </div>
        </div>

        {/* State Filter Tabs */}
        <div className="mt-4 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {prStates.map((state) => (
              <button
                key={state.value}
                onClick={() => handleStateChange(state.value)}
                className={`
                  py-2 px-1 border-b-2 font-medium text-sm transition-colors
                  ${selectedState === state.value
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <span className="mr-2">{state.icon}</span>
                {state.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="card-body">
        {error && (
          <div className="alert-error mb-4">
            <p>{error}</p>
            <button 
              onClick={refreshPRs}
              className="btn-sm btn-secondary mt-2"
            >
              Try Again
            </button>
          </div>
        )}

        {loading && pullRequests.length === 0 ? (
          <div className="text-center py-8">
            <div className="spinner-lg mb-4"></div>
            <p className="text-gray-600">Loading pull requests...</p>
          </div>
        ) : pullRequests.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-4">
              {selectedState === 'OPEN' ? '📝' : selectedState === 'MERGED' ? '✅' : '❌'}
            </div>
            <p className="text-gray-500 text-lg">
              No {selectedState.toLowerCase()} pull requests found
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {selectedState === 'OPEN' 
                ? 'This repository has no open pull requests'
                : `This repository has no ${selectedState.toLowerCase()} pull requests`
              }
            </p>
          </div>
        ) : (
          <>
            {/* PR Statistics */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {pagination.size}
                  </div>
                  <div className="text-sm text-gray-600">
                    {selectedState.charAt(0) + selectedState.slice(1).toLowerCase()} PRs
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {pullRequests.filter(pr => pr.reviewedByAI).length}
                  </div>
                  <div className="text-sm text-gray-600">
                    Reviewed by AI
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {pullRequests.filter(pr => !pr.reviewedByAI).length}
                  </div>
                  <div className="text-sm text-gray-600">
                    Pending Review
                  </div>
                </div>
              </div>
            </div>

            {/* Pull Request List */}
            <div className="space-y-4">
              {pullRequests.map((pr) => (
                <PRListItem
                  key={pr.id}
                  pr={pr}
                  repo={repo}
                  config={config}
                  onReviewComplete={refreshPRs}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 mt-6 pt-4 border-t">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1 || loading}
                  className="btn-secondary btn-sm"
                >
                  ← Previous
                </button>
                
                <div className="flex items-center space-x-1">
                  {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                    const pageNum = Math.max(1, pagination.page - 2) + i
                    const isCurrentPage = pageNum === pagination.page
                    
                    if (pageNum > pagination.totalPages) return null
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        disabled={loading}
                        className={`
                          px-3 py-1 text-sm rounded-md font-medium transition-colors
                          ${isCurrentPage 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }
                        `}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages || loading}
                  className="btn-secondary btn-sm"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default PRList