import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getUserModels, getUserProfile } from '../services/supabaseService';
import { getPlanDetails } from '../services/pricingService';
import CreditRecharge from '../components/CreditRecharge';
import Settings from './Settings';
import './DashboardNew.css';

function DashboardNew() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('models');
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState(null);
  const [showRecharge, setShowRecharge] = useState(false);

  useEffect(() => {
    loadModels();
  }, []);

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

  const loadModels = async () => {
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
  };

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

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <div className="dashboard-sidebar">
        <div className="sidebar-header">
          <h2>Dashboard</h2>
        </div>

        <div className="credits-widget">
          <div className="credits-gem">💎</div>
          <div className="credits-info">
            <span className="credits-label">Credits</span>
            <span className="credits-value">{credits !== null ? credits : '...'}</span>
            <span className="credits-plan">
              {subscriptionPlan ? (getPlanDetails(subscriptionPlan)?.name || subscriptionPlan) : 'No Plan'}
            </span>
          </div>
          <button 
            className="credits-recharge-btn"
            onClick={() => setShowRecharge(true)}
            title="Purchase more credits"
          >
            +
          </button>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`sidebar-item ${activeTab === 'models' ? 'active' : ''}`}
            onClick={() => setActiveTab('models')}
          >
            <span className="sidebar-icon">🎨</span>
            <span>My Models</span>
          </button>

          <button
            className={`sidebar-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <span className="sidebar-icon">⚙️</span>
            <span>Settings</span>
          </button>

          <button
            className="sidebar-item"
            onClick={() => navigate('/subscription')}
          >
            <span className="sidebar-icon">💳</span>
            <span>Subscription</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-item logout" onClick={handleLogout}>
            <span className="sidebar-icon">🚪</span>
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
                  const selectedImage = model.generated_images?.find(img => img.is_selected);

                  return (
                    <div
                      key={model.id}
                      className="model-card"
                      onClick={() => handleModelClick(model)}
                    >
                      {selectedImage ? (
                        <div className="model-image">
                          <img src={selectedImage.image_url} alt={model.name} />
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

      {showRecharge && (
        <CreditRecharge
          currentCredits={credits}
          onClose={() => setShowRecharge(false)}
          onCreditsRecharged={async (newCredits) => {
            setCredits(newCredits);
            // Reload profile to get updated subscription info
            try {
              const profile = await getUserProfile();
              setCredits(profile.credits);
              setSubscriptionPlan(profile.subscription_plan);
            } catch (error) {
              console.error('Error reloading profile:', error);
            }
          }}
        />
      )}
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
    </div>
  );
}

export default DashboardNew;
