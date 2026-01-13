import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getUserProfile } from '../services/supabaseService';
import { getPlanDetails } from '../services/pricingService';
import { createCustomerPortalSession } from '../services/stripeService';
import { getMyReferralLink, getReferralStats } from '../services/referralService';
import './Settings.css';

function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Profile data
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    fullName: ''
  });

  // Subscription data
  const [subscriptionPlan, setSubscriptionPlan] = useState(null);
  const [subscriptionDetails, setSubscriptionDetails] = useState(null);

  // Referral data
  const [referralLink, setReferralLink] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referralStats, setReferralStats] = useState(null);
  const [loadingReferrals, setLoadingReferrals] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (activeTab === 'referrals') {
      loadReferralData();
    }
  }, [activeTab]);

  const loadReferralData = async () => {
    try {
      setLoadingReferrals(true);
      const linkData = await getMyReferralLink();
      setReferralLink(linkData.referralLink);
      setReferralCode(linkData.referralCode);

      const stats = await getReferralStats();
      setReferralStats(stats);
    } catch (error) {
      console.error('Error loading referral data:', error);
      setError('Failed to load referral information');
    } finally {
      setLoadingReferrals(false);
    }
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setSuccess('Referral link copied to clipboard!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Get auth user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser);
        setFormData({
          email: authUser.email || '',
          fullName: authUser.user_metadata?.full_name || ''
        });
      }

      // Get profile with subscription info
      const userProfile = await getUserProfile();
      setProfile(userProfile);
      setSubscriptionPlan(userProfile.subscription_plan);
      
      if (userProfile.subscription_plan) {
        const planDetails = getPlanDetails(userProfile.subscription_plan);
        setSubscriptionDetails({
          plan: planDetails,
          startDate: userProfile.subscription_start_date,
          renewalDate: userProfile.subscription_renewal_date,
          credits: userProfile.credits
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Update email in Supabase Auth
      if (formData.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email
        });
        if (emailError) throw emailError;
      }

      // Update user metadata (full name)
      if (formData.fullName !== (user.user_metadata?.full_name || '')) {
        const { error: metadataError } = await supabase.auth.updateUser({
          data: { full_name: formData.fullName }
        });
        if (metadataError) throw metadataError;
      }

      // Update email in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ email: formData.email })
        .eq('id', user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        // Don't throw - email update in auth is more important
      }

      setSuccess('Profile updated successfully!');
      await loadUserData(); // Reload to get updated data
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      setLoading(true);
      const portalUrl = await createCustomerPortalSession();
      if (portalUrl) {
        window.location.href = portalUrl;
      }
    } catch (error) {
      console.error('Error creating customer portal session:', error);
      setError('Failed to open billing portal. Please try again.');
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscriptionPlan) {
      setError('No active subscription to cancel');
      return;
    }

    const confirmCancel = window.confirm(
      `Are you sure you want to cancel your ${subscriptionDetails?.plan?.name || subscriptionPlan} subscription? ` +
      `You will lose access to premium features and your subscription will not renew.`
    );

    if (!confirmCancel) return;

    try {
      setLoading(true);
      // Open Stripe Customer Portal for cancellation
      const portalUrl = await createCustomerPortalSession();
      if (portalUrl) {
        window.location.href = portalUrl;
      }
    } catch (error) {
      console.error('Error opening cancellation portal:', error);
      setError('Failed to open cancellation page. Please try again.');
      setLoading(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="settings-container">
        <div className="settings-loading">
          <div className="spinner"></div>
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h2>Settings</h2>
        <p className="settings-subtitle">Manage your account, billing, and preferences</p>
      </div>

      <div className="settings-tabs">
        <button
          className={`settings-tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </button>
          <button
            className={`settings-tab ${activeTab === 'billing' ? 'active' : ''}`}
            onClick={() => setActiveTab('billing')}
          >
            Billing & Subscription
          </button>
          <button
            className={`settings-tab ${activeTab === 'referrals' ? 'active' : ''}`}
            onClick={() => setActiveTab('referrals')}
          >
            Referrals
          </button>
      </div>

      {error && (
        <div className="settings-alert error">
          <span>⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {success && (
        <div className="settings-alert success">
          <span>✓</span>
          <span>{success}</span>
          <button onClick={() => setSuccess(null)}>×</button>
        </div>
      )}

      <div className="settings-content-wrapper">
        {activeTab === 'profile' && (
          <div className="settings-section">
            <h2>Contact Information</h2>
            <p className="section-description">Update your email address and name</p>

            <form onSubmit={handleUpdateProfile} className="settings-form">
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="your.email@example.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="fullName">Full Name (Optional)</label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="Your full name"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="settings-section">
            <h2>Subscription & Billing</h2>
            <p className="section-description">Manage your subscription and payment methods</p>

            {subscriptionPlan ? (
              <div className="subscription-info">
                <div className="subscription-card">
                  <div className="subscription-header">
                    <h3>{subscriptionDetails?.plan?.name || subscriptionPlan}</h3>
                    <span className="subscription-status active">Active</span>
                  </div>
                  
                  <div className="subscription-details">
                    <div className="detail-row">
                      <span className="detail-label">Monthly Credits</span>
                      <span className="detail-value">{subscriptionDetails?.plan?.monthlyCredits || 'N/A'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Current Credits</span>
                      <span className="detail-value">{profile?.credits || 0}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Price</span>
                      <span className="detail-value">
                        {subscriptionDetails?.plan?.price 
                          ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(subscriptionDetails.plan.price)
                          : 'N/A'}
                        /month
                      </span>
                    </div>
                    {subscriptionDetails?.startDate && (
                      <div className="detail-row">
                        <span className="detail-label">Started</span>
                        <span className="detail-value">
                          {new Date(subscriptionDetails.startDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {subscriptionDetails?.renewalDate && (
                      <div className="detail-row">
                        <span className="detail-label">Next Billing Date</span>
                        <span className="detail-value">
                          {new Date(subscriptionDetails.renewalDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="subscription-actions">
                    <button
                      className="btn-secondary"
                      onClick={handleManageBilling}
                      disabled={loading}
                    >
                      {loading ? 'Loading...' : 'Manage Billing'}
                    </button>
                    <button
                      className="btn-danger"
                      onClick={handleCancelSubscription}
                      disabled={loading}
                    >
                      Cancel Subscription
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-subscription">
                <div className="no-subscription-icon">💳</div>
                <h3>No Active Subscription</h3>
                <p>You don't have an active subscription plan.</p>
                <button
                  className="btn-primary"
                  onClick={() => window.location.href = '/subscription'}
                >
                  View Plans
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'referrals' && (
          <div className="settings-section">
            <h2>Referral Program</h2>
            <p className="section-description">Share your referral link and earn 20 credits for each person you refer!</p>

            {loadingReferrals ? (
              <div className="loading-state">Loading referral information...</div>
            ) : (
              <>
                <div className="referral-card">
                  <h3>Your Referral Link</h3>
                  <div className="referral-link-container">
                    <input
                      type="text"
                      readOnly
                      value={referralLink}
                      className="referral-link-input"
                    />
                    <button onClick={copyReferralLink} className="btn-secondary">
                      Copy Link
                    </button>
                  </div>
                  <p className="referral-code-display">Your Code: <strong>{referralCode}</strong></p>
                </div>

                {referralStats && (
                  <div className="referral-stats">
                    <h3>Your Referral Stats</h3>
                    <div className="stats-grid">
                      <div className="stat-card">
                        <div className="stat-value">{referralStats.totalReferrals || 0}</div>
                        <div className="stat-label">Total Referrals</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value">{referralStats.totalCreditsEarned || 0}</div>
                        <div className="stat-label">Credits Earned</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="referral-info">
                  <h4>How it works:</h4>
                  <ul>
                    <li>Share your referral link with friends</li>
                    <li>When they sign up using your link, you both get 20 credits</li>
                    <li>There's no limit to how many people you can refer!</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Settings;
