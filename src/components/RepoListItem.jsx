import React from 'react'
import clsx from 'clsx'
import { formatDate, truncateText } from '../utils/auth'

// Language color mapping
const LANGUAGE_COLORS = {
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

// Sub-components
const PrivacyBadge = ({ isPrivate }) => (
  <span className={clsx('badge text-xs', isPrivate ? 'badge-warning' : 'badge-success')}>
    {isPrivate ? '🔒 Private' : '🌐 Public'}
  </span>
)

const LanguageBadge = ({ language }) => {
  if (!language) return null
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white',
      LANGUAGE_COLORS[language] || 'bg-gray-500'
    )}>
      {language}
    </span>
  )
}

const RepoStats = ({ repo }) => (
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
)

const FeatureStatus = ({ hasIssues, hasWiki }) => {
  if (hasIssues === undefined && hasWiki === undefined) return null

  return (
    <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
      {hasIssues !== undefined && (
        <span className={clsx(hasIssues ? 'text-green-600' : 'text-gray-400')}>
          {hasIssues ? '✅ Issues enabled' : '❌ Issues disabled'}
        </span>
      )}
      {hasWiki !== undefined && (
        <span className={clsx(hasWiki ? 'text-green-600' : 'text-gray-400')}>
          {hasWiki ? '📚 Wiki enabled' : '📚 Wiki disabled'}
        </span>
      )}
    </div>
  )
}

const ActionButton = ({ isSelected, onClick }) => (
  <button
    className={clsx(
      'btn btn-sm transition-colors',
      isSelected ? 'btn-primary' : 'btn-secondary hover:btn-primary'
    )}
    onClick={onClick}
  >
    {isSelected ? '✅ Selected' : '👁️ View PRs'}
  </button>
)

const ExternalLink = ({ url, onClick }) => {
  if (!url) return null

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-600 hover:underline"
        onClick={onClick}
      >
        🔗 View on Bitbucket
      </a>
    </div>
  )
}

const SelectionIndicator = ({ isSelected }) => {
  if (!isSelected) return null

  return (
    <div className="mt-3 pt-3 border-t border-blue-200">
      <p className="text-sm text-blue-700 font-medium">
        📋 Loading pull requests for this repository...
      </p>
    </div>
  )
}

// Main component
const RepoListItem = ({ repo, onSelect, isSelected }) => {
  const handleClick = () => onSelect(repo)

  const handleButtonClick = (e) => {
    e.stopPropagation()
    handleClick()
  }

  const handleLinkClick = (e) => e.stopPropagation()

  return (
    <div
      className={clsx(
        'p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md',
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300'
      )}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Header Section */}
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {repo.name}
            </h3>
            <div className="flex items-center space-x-2">
              <PrivacyBadge isPrivate={repo.is_private} />
              <LanguageBadge language={repo.language} />
            </div>
          </div>

          {/* Repository Details */}
          <p className="text-sm text-gray-600 mb-2 font-mono">{repo.full_name}</p>

          {repo.description && (
            <p className="text-gray-700 mb-3">
              {truncateText(repo.description, 150)}
            </p>
          )}

          <RepoStats repo={repo} />
          <FeatureStatus hasIssues={repo.has_issues} hasWiki={repo.has_wiki} />
        </div>

        {/* Action Section */}
        <div className="ml-4 flex-shrink-0">
          <ActionButton isSelected={isSelected} onClick={handleButtonClick} />
        </div>
      </div>

      <ExternalLink url={repo.links?.html?.href} onClick={handleLinkClick} />
      <SelectionIndicator isSelected={isSelected} />
    </div>
  )
}

export default RepoListItem