import React from 'react'
import { Link, useLocation } from 'react-router-dom'

const Navigation = ({ isConfigured }) => {
  const location = useLocation()

  const navItems = [
    {
      name: 'Configuration',
      path: '/config',
      icon: '⚙️',
      description: 'Setup API credentials and review prompt'
    },
    {
      name: 'Repository Search',
      path: '/search',
      icon: '🔍',
      description: 'Search repositories and review PRs',
      requiresConfig: true
    }
  ]

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl">🤖</span>
              <span className="font-bold text-xl text-gray-900">
                Bitbucket AI Review
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              const isDisabled = item.requiresConfig && !isConfigured
              
              return (
                <Link
                  key={item.path}
                  to={isDisabled ? '#' : item.path}
                  className={`
                    flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200
                    ${isActive 
                      ? 'bg-blue-100 text-blue-700' 
                      : isDisabled
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }
                  `}
                  onClick={isDisabled ? (e) => e.preventDefault() : undefined}
                  title={isDisabled ? 'Please configure credentials first' : item.description}
                >
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                  {isDisabled && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Setup Required
                    </span>
                  )}
                </Link>
              )
            })}
          </div>

          {/* Status Indicator */}
          <div className="flex items-center">
            <div className={`
              flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium
              ${isConfigured 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
              }
            `}>
              <div className={`
                w-2 h-2 rounded-full
                ${isConfigured ? 'bg-green-500' : 'bg-yellow-500'}
              `}></div>
              <span>
                {isConfigured ? 'Configured' : 'Setup Required'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
