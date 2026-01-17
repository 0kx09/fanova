import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserModels } from '../services/supabaseService';
import './ModelsV2.css';

function Models() {
  const navigate = useNavigate();
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const loadModels = useCallback(async () => {
    try {
      setLoading(true);
      const userModels = await getUserModels();
      setModels(userModels || []);
    } catch (error) {
      console.error('Error loading models:', error);
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const handleModelClick = (modelId) => {
    navigate(`/model/${modelId}`);
  };

  const handleCreateNew = () => {
    // Clear localStorage for fresh model creation
    localStorage.removeItem('currentModelId');
    localStorage.removeItem('modelInfo');
    localStorage.removeItem('modelAttributes');
    localStorage.removeItem('facialFeatures');
    navigate('/model-info');
  };

  // Filter and sort models
  const filteredAndSortedModels = React.useMemo(() => {
    let filtered = models;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(model => 
        model.name?.toLowerCase().includes(query) ||
        model.nationality?.toLowerCase().includes(query) ||
        model.occupation?.toLowerCase().includes(query)
      );
    }

    // Sort models
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'most-images':
          return (b.generated_images?.length || 0) - (a.generated_images?.length || 0);
        default:
          return 0;
      }
    });

    return sorted;
  }, [models, searchQuery, sortBy]);

  if (loading) {
    return (
      <div className="models-page">
        <div className="models-empty-state">
          <div className="models-empty-content">
            <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid #e5e5e5', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
            <p style={{ color: '#666' }}>Loading models...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="models-page">
      <div className="models-header">
        <div className="models-header-top">
          <div className="models-header-left">
            <h1 className="models-title">Models</h1>
            <p className="models-subheader">Manage your AI models and generated content.</p>
          </div>
          <button className="models-create-btn" onClick={handleCreateNew}>
            + Create Model
          </button>
        </div>
        <div className="models-controls">
          <div className="models-search">
            <input
              type="text"
              placeholder="Search models..."
              className="models-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="models-sort">
            <select 
              className="models-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Sort by: Newest</option>
              <option value="oldest">Sort by: Oldest</option>
              <option value="name">Sort by: Name</option>
              <option value="most-images">Sort by: Most Images</option>
            </select>
          </div>
        </div>
      </div>
      {filteredAndSortedModels.length === 0 ? (
        <div className="models-empty-state">
          <div className="models-empty-content">
            <h2 className="models-empty-title">No models yet</h2>
            <p className="models-empty-message">Make a new model to get started</p>
            <button className="models-empty-create-btn" onClick={handleCreateNew}>
              + Create Model
            </button>
          </div>
        </div>
      ) : (
        <div className="models-grid">
          {filteredAndSortedModels.map((model) => {
            // Find selected image or first generated image
            const selectedImage = model.generated_images?.find(img => img.is_selected);
            const displayImage = selectedImage || (model.generated_images && model.generated_images.length > 0 ? model.generated_images[0] : null);
            const imageCount = model.generated_images?.length || 0;

            return (
              <div
                key={model.id}
                className="model-card"
                onClick={() => handleModelClick(model.id)}
                style={{ cursor: 'pointer' }}
              >
                <div className="model-image">
                  {displayImage ? (
                    <img 
                      src={displayImage.image_url} 
                      alt={model.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="model-image-placeholder">
                      <span>Image</span>
                    </div>
                  )}
                  {imageCount > 0 && (
                    <div className="model-image-badge">
                      {imageCount} gens
                    </div>
                  )}
                </div>
                <div className="model-info">
                  <div className="model-header">
                    <h2 className="model-name">{model.name}</h2>
                    <div className="model-header-right">
                      <span className="model-status-label ready">
                        Ready
                      </span>
                    </div>
                  </div>
                  <div className="model-details">
                    <div className="model-meta">
                      {model.age && `${model.age} years`}
                      {model.age && model.nationality && ' • '}
                      {model.nationality}
                    </div>
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

export default Models;
