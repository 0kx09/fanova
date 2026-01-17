import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getUserModels, getUserProfile, deleteModel } from '../services/supabaseService';
import { getPlanDetails } from '../services/pricingService';
// import CreditRecharge from '../components/CreditRecharge'; // Disabled - credit purchasing
import Settings from './Settings';
import './DashboardNew.css';

function DashboardNew() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('models');
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ show: false, model: null });
  const [deleting, setDeleting] = useState(false);
  // const [showRecharge, setShowRecharge] = useState(false); // Disabled - credit purchasing

  const loadModels = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate('/login');
        return;
      }

      const userModels = await getUserModels();
      setModels(userModels || []);

      // Load user profile with credits and subscription
      try {
        const profile = await getUserProfile();
        setCredits(profile.credits);
        setSubscriptionPlan(profile.subscription_plan || null); // null for no plan
      } catch (error) {
        console.error('Error loading profile:', error);
        setCredits(0); // Default fallback - zero credits
        setSubscriptionPlan(null); // No plan
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading models:', error);
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // Separate effect to refresh profile if no plan (for webhook delays)
  useEffect(() => {
    if (!subscriptionPlan) {
      const refreshInterval = setInterval(async () => {
        try {
          const profile = await getUserProfile();
          setCredits(profile.credits); // Always update credits
          if (profile.subscription_plan) {
            setSubscriptionPlan(profile.subscription_plan);
            clearInterval(refreshInterval); // Stop refreshing once plan is set
          }
        } catch (error) {
          console.error('Error refreshing profile:', error);
        }
      }, 3000);

      return () => clearInterval(refreshInterval);
    }
  }, [subscriptionPlan]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleModelClick = (model) => {
    navigate(`/model/${model.id}`);
  };

  const handleCreateNew = () => {
    localStorage.removeItem('currentModelId');
    localStorage.removeItem('modelInfo');
    localStorage.removeItem('modelAttributes');
    localStorage.removeItem('facialFeatures');
    navigate('/model-info');
  };

  const handleKebabClick = (model, e) => {
    e.stopPropagation();
    setDeleteModal({ show: true, model: { id: model.id, name: model.name } });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.model) return;
    setDeleting(true);
    try {
      await deleteModel(deleteModal.model.id);
      setDeleteModal({ show: false, model: null });
      loadModels();
    } catch (err) {
      console.error('Error deleting model:', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ show: false, model: null });
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <div className="dashboard-sidebar">
        <div className="sidebar-header">
          <h2>Dashboard</h2>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`sidebar-item ${activeTab === 'models' ? 'active' : ''}`}
            onClick={() => setActiveTab('models')}
          >
            <span className="sidebar-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </span>
            <span>My Models</span>
          </button>

          <button
            className={`sidebar-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <span className="sidebar-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </span>
            <span>Settings</span>
          </button>

          <button
            className="sidebar-item"
            onClick={() => navigate('/subscription')}
          >
            <span className="sidebar-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            </span>
            <span>Subscription</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="credits-widget">
            <div className="credits-gem">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z"/></svg>
            </div>
            <div className="credits-info">
              <span className="credits-label">Credits</span>
              <span className="credits-value">{credits !== null ? credits : '...'}</span>
              <span className="credits-plan">
                {subscriptionPlan ? (getPlanDetails(subscriptionPlan)?.name || subscriptionPlan) : 'No Plan'}
              </span>
            </div>
            <button
              className="credits-recharge-btn"
              onClick={() => navigate('/subscription')}
              title="Get more credits"
            >
              +
            </button>
          </div>
          <button className="sidebar-item logout" onClick={handleLogout}>
            <span className="sidebar-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </span>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-main">
        {activeTab === 'models' && (
          <div className="models-view">
            <div className="view-header">
              <h1>My Models</h1>
              <button className="btn-primary" onClick={handleCreateNew}>
                + Create New Model
              </button>
            </div>

            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading your models...</p>
              </div>
            ) : models.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📸</div>
                <h3>Create your first model</h3>
                <p>Get started by creating your first AI model</p>
                <button className="btn-primary" onClick={handleCreateNew}>
                  Create Your First Model
                </button>
              </div>
            ) : (
              <div className="models-grid">
                {models.map((model) => {
                  // Find selected image, or fall back to first generated image
                  const selectedImage = model.generated_images?.find(img => img.is_selected);
                  const displayImage = selectedImage || (model.generated_images && model.generated_images.length > 0 ? model.generated_images[0] : null);

                  return (
                    <div
                      key={model.id}
                      className="model-card"
                      onClick={() => handleModelClick(model)}
                    >
                      <button
                        className="model-card-kebab"
                        onClick={(e) => handleKebabClick(model, e)}
                        title="Options"
                        aria-label="Model options"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="6" r="1.5" />
                          <circle cx="12" cy="12" r="1.5" />
                          <circle cx="12" cy="18" r="1.5" />
                        </svg>
                      </button>
                      {displayImage ? (
                        <div className="model-image">
                          <img src={displayImage.image_url} alt={model.name} />
                        </div>
                      ) : (
                        <div className="model-image placeholder">
                          <div className="placeholder-content">
                            <div className="placeholder-icon">
                              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round"/>
                                <circle cx="12" cy="13" r="4" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                            <span className="placeholder-text">Add Photo</span>
                          </div>
                        </div>
                      )}

                      <div className="model-info">
                        <h3>{model.name}</h3>
                        <div className="model-meta">
                          {model.age && <span>{model.age} years</span>}
                          {model.attributes?.gender && <span>• {model.attributes.gender}</span>}
                        </div>
                        <div className="model-stats">
                          <span>{model.generated_images?.length || 0} images</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-view">
            <Settings />
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteModal.show && deleteModal.model && (
        <div className="delete-modal-overlay" onClick={handleDeleteCancel}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete model?</h3>
            <p>Are you sure you want to delete &quot;{deleteModal.model.name}&quot;? This will remove the model and all its generated images. This action cannot be undone.</p>
            <div className="delete-modal-actions">
              <button className="btn-cancel" onClick={handleDeleteCancel}>Cancel</button>
              <button className="btn-delete" onClick={handleDeleteConfirm} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardNew;
