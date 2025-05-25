import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation.jsx';
import ConfigForm from './components/ConfigForm.jsx';
import RepoSearch from './components/RepoSearch.jsx';
import { getConfig } from './db/indexedDB';

function App() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const savedConfig = await getConfig();
      setConfig(savedConfig);
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigUpdate = (newConfig) => {
    setConfig(newConfig);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner-lg mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const isConfigured = config && 
    config.llmToken && 
    config.bitbucketUsername && 
    config.bitbucketAppPassword;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation isConfigured={isConfigured} />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route 
            path="/" 
            element={
              <Navigate 
                to={isConfigured ? "/search" : "/config"} 
                replace 
              />
            } 
          />
          <Route 
            path="/config" 
            element={
              <ConfigForm 
                initialConfig={config} 
                onConfigUpdate={handleConfigUpdate} 
              />
            } 
          />
          <Route 
            path="/search" 
            element={
              isConfigured ? (
                <RepoSearch config={config} />
              ) : (
                <Navigate to="/config" replace />
              )
            } 
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;