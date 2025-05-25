import React from 'react'
import { formatDate, truncateText, generateColor } from '../utils/auth'

const RepoListItem = ({ repo, onSelect, isSelected }) => {
  const handleClick = () => {
    onSelect(repo)
  }

  const getLanguageColor = (language) => {
    const colors = {
      JavaScript: 'bg-yellow-500',
      TypeScript: 'bg-blue-500',
      Python: 'bg-green-500',
      Java: 'bg-red-500',
      'C#': 'bg-purple-500',
      PHP: 'bg-indigo-500',
      Ruby: 'bg-red-600',
      Go: 'bg-cyan-500',
      Rust: 'bg-orange-600',
      Swift: 'bg-orange-500',
      Kotlin: 'bg-purple-600',
      Dart: 'bg-blue-600',
      CSS: 'bg-blue-400',
      HTML: 'bg-red-400',
      Vue: 'bg-green-400',
      React: 'bg-blue-400'
    }
    return colors[language] || 'bg-gray-500'
  }

  return (
    <div
      className={`
        p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md
        ${isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-md' 
          : 'border-gray-200 bg-white hover:border-gray-300'
        }
      `}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Repository Name and Status */}
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {repo.name}
            </h3>
            
            <div className="flex items-center space-x-2">
              {/* Privacy Badge */}
              <span className={`
                badge text-xs
                ${repo.is_private 
                  ? 'badge-warning' 
                  : 'badge-success'
                }
              `}>
                {repo.is_private ? '🔒 Private' : '🌐 Public'}
              </span>

              {/* Language Badge */}
              {repo.language && (
                <span className={`
                  inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white
                  ${getLanguageColor(repo.language)}
                `}>
                  {repo.language}
                </span>
              )}
            </div>
          </div>

          {/* Full Name */}
          <p className="text-sm text-gray-600 mb-2 font-mono">
            {repo.full_name}
          </p>

          {/* Description */}
          {repo.description && (
            <p className="text-gray-700 mb-3">
              {truncateText(repo.description, 150)}
            </p>
          )}

          {/* Repository Stats */}
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            {repo.size !== undefined && (
              <div className="flex items-center space-x-1">
                <span>📦</span>
                <span>{Math.round(repo.size / 1024)} KB</span>
              </div>
            )}

            {repo.created_on && (
              <div className="flex items-center space-x-1">
                <span>📅</span>
                <span>Created {formatDate(repo.created_on)}</span>
              </div>
            )}

            {repo.updated_on && (
              <div className="flex items-center space-x-1">
                <span>🔄</span>
                <span>Updated {formatDate(repo.updated_on)}</span>
              </div>
            )}
          </div>

          {/* Additional Info */}
          {repo.has_issues !== undefined && (
            <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
              <span className={repo.has_issues ? 'text-green-600' : 'text-gray-400'}>
                {repo.has_issues ? '✅ Issues enabled' : '❌ Issues disabled'}
              </span>
              
              {repo.has_wiki !== undefined && (
                <span className={repo.has_wiki ? 'text-green-600' : 'text-gray-400'}>
                  {repo.has_wiki ? '📚 Wiki enabled' : '📚 Wiki disabled'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="ml-4 flex-shrink-0">
          <button
            className={`
              btn btn-sm transition-colors
              ${isSelected 
                ? 'btn-primary' 
                : 'btn-secondary hover:btn-primary'
              }
            `}
            onClick={(e) => {
              e.stopPropagation()
              handleClick()
            }}
          >
            {isSelected ? '✅ Selected' : '👁️ View PRs'}
          </button>
        </div>
      </div>

      {/* Repository URL for reference */}
      {repo.links?.html?.href && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <a
            href={repo.links.html.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            🔗 View on Bitbucket
          </a>
        </div>
      )}

      {/* Selection Indicator */}
      {isSelected && (
        <div className="mt-3 pt-3 border-t border-blue-200">
          <p className="text-sm text-blue-700 font-medium">
            📋 Loading pull requests for this repository...
          </p>
        </div>
      )}
    </div>
  )
}

export default RepoListItem
