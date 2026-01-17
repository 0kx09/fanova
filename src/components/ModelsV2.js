import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserModels } from '../services/supabaseService';
import './ModelsV2.css';

function ModelsV2() {
  const navigate = useNavigate();
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [refreshing, setRefreshing] = useState(false);

  // Load models from Supabase
  const loadModels = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      const userModels = await getUserModels();
      setModels(userModels || []);
    } catch (err) {
      console.error('Error loading models:', err);
      setError(err.message || 'Failed to load models');
      setModels([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // Filter and sort models
  const filteredAndSortedModels = useMemo(() => {
    let filtered = [...models];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(model => {
        const nameMatch = model.name?.toLowerCase().includes(query);
        const nationalityMatch = model.nationality?.toLowerCase().includes(query);
        const occupationMatch = model.occupation?.toLowerCase().includes(query);
        return nameMatch || nationalityMatch || occupationMatch;
      });
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        case 'oldest':
          return new Date(a.created_at || 0) - new Date(b.created_at || 0);
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'name-desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'most-images':
          return (b.generated_images?.length || 0) - (a.generated_images?.length || 0);
        case 'least-images':
          return (a.generated_images?.length || 0) - (b.generated_images?.length || 0);
        default:
          return 0;
      }
    });

    return sorted;
  }, [models, searchQuery, sortBy]);

  // Handle model click
  const handleModelClick = useCallback((modelId) => {
    navigate(`/model/${modelId}`);
  }, [navigate]);

  // Handle create new model
  const handleCreateNew = useCallback(() => {
    // Clear any stored model data
    localStorage.removeItem('currentModelId');
    localStorage.removeItem('modelInfo');
    localStorage.removeItem('modelAttributes');
    localStorage.removeItem('facialFeatures');
    navigate('/model-info');
  }, [navigate]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    loadModels(true);
  }, [loadModels]);

  // Get display image for a model
  const getDisplayImage = useCallback((model) => {
    if (!model.generated_images || model.generated_images.length === 0) {
      return null;
    }
    
    // Try to find selected image first
    const selectedImage = model.generated_images.find(img => img.is_selected);
    if (selectedImage) {
      return selectedImage;
    }
    
    // Otherwise use the first image
    return model.generated_images[0];
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="models-page">
        <div className="models-empty-state">
          <div className="models-empty-content">
            <div className="models-spinner"></div>
            <p className="models-loading-text">Loading models...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && models.length === 0) {
    return (
      <div className="models-page">
        <div className="models-empty-state">
          <div className="models-empty-content">
            <h2 className="models-empty-title">Error loading models</h2>
            <p className="models-empty-message">{error}</p>
            <button className="models-empty-create-btn" onClick={handleRefresh}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="models-page">
      {/* Header */}
      <div className="models-header">
        <div className="models-header-top">
          <div className="models-header-left">
            <h1 className="models-title">Models</h1>
            <p className="models-subheader">Manage your AI models and generated content.</p>
          </div>
          <div className="models-header-actions">
            <button 
              className="models-refresh-btn" 
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
            </button>
            <button className="models-create-btn" onClick={handleCreateNew}>
              + Create Model
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="models-controls">
          <div className="models-search">
            <svg className="models-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search models..."
              className="models-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                className="models-search-clear"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>
          <div className="models-sort">
            <select 
              className="models-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Sort by: Newest</option>
              <option value="oldest">Sort by: Oldest</option>
              <option value="name">Sort by: Name (A-Z)</option>
              <option value="name-desc">Sort by: Name (Z-A)</option>
              <option value="most-images">Sort by: Most Images</option>
              <option value="least-images">Sort by: Least Images</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results count */}
      {filteredAndSortedModels.length > 0 && (
        <div className="models-results-count">
          {filteredAndSortedModels.length} {filteredAndSortedModels.length === 1 ? 'model' : 'models'}
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
      )}

      {/* Models grid */}
      {filteredAndSortedModels.length === 0 ? (
        <div className="models-empty-state">
          <div className="models-empty-content">
            <h2 className="models-empty-title">
              {searchQuery ? 'No models found' : 'No models yet'}
            </h2>
            <p className="models-empty-message">
              {searchQuery 
                ? `No models match "${searchQuery}". Try a different search term.`
                : 'Make a new model to get started'
              }
            </p>
            {!searchQuery && (
              <button className="models-empty-create-btn" onClick={handleCreateNew}>
                + Create Model
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="models-grid">
          {filteredAndSortedModels.map((model) => {
            const displayImage = getDisplayImage(model);
            const imageCount = model.generated_images?.length || 0;

            return (
              <div
                key={model.id}
                className="model-card"
                onClick={() => handleModelClick(model.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleModelClick(model.id);
                  }
                }}
              >
                <div className="model-image">
                  {displayImage ? (
                    <img 
                      src={displayImage.image_url} 
                      alt={model.name || 'Model'}
                      loading="lazy"
                    />
                  ) : (
                    <div className="model-image-placeholder">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <path d="M21 15l-5-5L5 21"/>
                      </svg>
                      <span>No Image</span>
                    </div>
                  )}
                  {imageCount > 0 && (
                    <div className="model-image-badge">
                      {imageCount} {imageCount === 1 ? 'gen' : 'gens'}
                    </div>
                  )}
                  <div className="model-status-indicator ready">
                    <span>READY</span>
                  </div>
                </div>
                <div className="model-info">
                  <h2 className="model-name" title={model.name}>
                    {model.name || 'Unnamed Model'}
                  </h2>
                  <div className="model-meta">
                    {model.age && `${model.age} years`}
                    {model.age && model.nationality && ' • '}
                    {model.nationality || ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ModelsV2;
