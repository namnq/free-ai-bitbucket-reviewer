import React, { useState, useEffect, useRef } from 'react'
import { searchRepositories } from '../services/bitbucketApi'
import RepoListItem from './RepoListItem.jsx'
import PRList from './PRList.jsx'

const RepoSearch = ({ config }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [repositories, setRepositories] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 0,
    size: 0
  })
  const [selectedRepo, setSelectedRepo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)

  // Ref for PR section
  const prSectionRef = useRef(null)

  const handleSearch = async (page = 1) => {
    if (!searchTerm.trim()) {
      setError('Please enter a search term')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      if (page === 1) {
        setSelectedRepo(null) // Clear selected repo when starting new search
      }

      const result = await searchRepositories(
        config.bitbucketUsername,
        config.bitbucketAppPassword,
        searchTerm,
        page
      )

      setRepositories(result.repositories)
      setPagination(result.pagination)
      setHasSearched(true)

    } catch (err) {
      console.error('Search error:', err)
      setError(err.message)
      setRepositories([])
      setPagination({ page: 1, totalPages: 0, size: 0 })
    } finally {
      setLoading(false)
    }
  }

  const scrollToPRSection = () => {
    if (prSectionRef.current) {
      prSectionRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    }
  }

  const handleRepoSelect = (repo) => {
    setSelectedRepo(repo)
  }

  // Scroll to PR section when repo is selected
  useEffect(() => {
    if (selectedRepo && prSectionRef.current) {
      // Longer delay to ensure PRList component is fully rendered and data is loading
      const scrollTimer = setTimeout(() => {
        scrollToPRSection()
      }, 500)

      return () => clearTimeout(scrollTimer)
    }
  }, [selectedRepo])

  // Callback for when PRList is ready
  const handlePRListReady = () => {
    // Additional scroll when PR data is loaded
    setTimeout(() => {
      scrollToPRSection()
    }, 100)
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      handleSearch(newPage)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch(1)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Search Header */}
      <div className="card">
        <div className="card-header">
          <h1 className="text-2xl font-bold text-gray-900">Repository Search</h1>
          <p className="text-gray-600 mt-1">
            Search for repositories to review their pull requests with AI.
          </p>
        </div>

        <div className="card-body">
          <div className="flex space-x-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search repositories by name..."
                className="form-input"
                disabled={loading}
              />
            </div>
            <button
              onClick={() => handleSearch(1)}
              disabled={loading || !searchTerm.trim()}
              className="btn-primary whitespace-nowrap"
            >
              {loading ? (
                <>
                  <span className="spinner-sm mr-2"></span>
                  Searching...
                </>
              ) : (
                '🔍 Search'
              )}
            </button>
          </div>

          {error && (
            <div className="alert-error mt-4">
              <p>{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Search Results */}
      {hasSearched && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Search Results
                {pagination.size > 0 && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({pagination.size} repositories found)
                  </span>
                )}
              </h2>
              
              {/* Pagination Info */}
              {pagination.totalPages > 1 && (
                <div className="text-sm text-gray-500">
                  Page {pagination.page} of {pagination.totalPages}
                </div>
              )}
            </div>
          </div>

          <div className="card-body">
            {repositories.length === 0 && !loading ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">📂</div>
                <p className="text-gray-500">
                  No repositories found matching "{searchTerm}"
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Try a different search term or check your spelling
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {repositories.map((repo) => (
                  <RepoListItem
                    key={repo.full_name}
                    repo={repo}
                    onSelect={handleRepoSelect}
                    isSelected={selectedRepo?.full_name === repo.full_name}
                  />
                ))}
              </div>
            )}

            {/* Pagination Controls */}
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
          </div>
        </div>
      )}

      {/* Pull Requests Section */}
      {selectedRepo && (
        <div ref={prSectionRef}>
          <PRList 
            repo={selectedRepo}
            config={config}
            onReady={handlePRListReady}
          />
        </div>
      )}
    </div>
  )
}

export default RepoSearch