import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { getSelectedModel, getUserCredits } from '../services/supabaseService';
import { supabase } from '../lib/supabase';

function Dashboard() {
  const navigate = useNavigate();
  const [modelData, setModelData] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState(null);

  useEffect(() => {
    const loadModelData = async () => {
      try {
        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          // Not logged in, redirect to login
          navigate('/login');
          return;
        }

        // Fetch the most recent model with a selected image from Supabase
        const model = await getSelectedModel();

        if (!model) {
          // No model found, redirect to create
          navigate('/model-info');
          return;
        }

        // Find the selected image
        const selectedImg = model.generated_images?.find(img => img.is_selected);

        if (!selectedImg) {
          // No selected image, redirect to create
          navigate('/model-info');
          return;
        }

        setModelData(model);
        setSelectedImage(selectedImg);
        
        // Load user credits
        try {
          const userCredits = await getUserCredits();
          setCredits(userCredits);
        } catch (error) {
          console.error('Error loading credits:', error);
          setCredits(10); // Default fallback
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        // On error, redirect to model creation
        navigate('/model-info');
      }
    };

    loadModelData();
  }, [navigate]);

  const handleCreateNewModel = () => {
    // Clear localStorage
    localStorage.removeItem('modelInfo');
    localStorage.removeItem('modelAttributes');
    localStorage.removeItem('generationMethod');
    localStorage.removeItem('facialFeatures');
    localStorage.removeItem('currentModelId');
    localStorage.removeItem('selectedModelImage');
    navigate('/model-info');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading || !modelData || !selectedImage) {
    return (
      <div className="dashboard-container">
        <div className="loading-section">
          <div className="spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="header-left">
          <h1>Welcome to Your Dashboard</h1>
          <p className="subtitle">Manage your AI model and create more content</p>
        </div>
        <div className="header-right">
          <div className="credits-display">
            <div className="credits-icon">💎</div>
            <div className="credits-info">
              <span className="credits-label">Credits</span>
              <span className="credits-value">{credits !== null ? credits : '...'}</span>
            </div>
          </div>
          <button className="btn-secondary logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Model Profile Card */}
        <div className="model-profile-card">
          <div className="profile-image-section">
            <img src={selectedImage.image_url} alt="Your Model" />
            <div className="image-badge">Selected Model</div>
          </div>

          <div className="profile-info-section">
            <h2>{modelData.name}</h2>

            <div className="info-grid">
              <div className="info-item">
                <span className="label">Age</span>
                <span className="value">{modelData.age || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="label">Height</span>
                <span className="value">{modelData.height || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="label">Nationality</span>
                <span className="value">{modelData.nationality || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="label">Occupation</span>
                <span className="value">{modelData.occupation || 'N/A'}</span>
              </div>
            </div>

            {modelData.attributes?.hairColor && (
              <div className="attributes-section">
                <h3>Attributes</h3>
                <div className="attributes-list">
                  <span className="attribute-tag">{modelData.attributes.hairLength} {modelData.attributes.hairStyle} {modelData.attributes.hairColor} hair</span>
                  {modelData.attributes.eyeColor && <span className="attribute-tag">{modelData.attributes.eyeColor} eyes</span>}
                  {modelData.attributes.skinTone && <span className="attribute-tag">{modelData.attributes.skinTone} skin</span>}
                  {modelData.attributes.bodyType && <span className="attribute-tag">{modelData.attributes.bodyType} build</span>}
                  {modelData.attributes.style && <span className="attribute-tag">{modelData.attributes.style} style</span>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions Section */}
        <div className="dashboard-actions">
          <div className="action-card coming-soon">
            <div className="icon">🎨</div>
            <h3>Generate More Images</h3>
            <p>Create additional photorealistic images of your model</p>
            <span className="coming-soon-badge">Coming Soon</span>
          </div>

          <div className="action-card coming-soon">
            <div className="icon">✨</div>
            <h3>Edit Attributes</h3>
            <p>Modify your model's features and appearance</p>
            <span className="coming-soon-badge">Coming Soon</span>
          </div>

          <div className="action-card coming-soon">
            <div className="icon">📸</div>
            <h3>Custom Poses</h3>
            <p>Generate images with specific poses and scenes</p>
            <span className="coming-soon-badge">Coming Soon</span>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="bottom-actions">
          <button className="btn-secondary" onClick={handleCreateNewModel}>
            Create New Model
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
