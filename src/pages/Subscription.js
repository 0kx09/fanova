import React, { useState, useEffect } from 'react';
import { getUserProfile, updateSubscriptionPlan } from '../services/supabaseService';
import { SUBSCRIPTION_PLANS, formatPrice, getCreditsPerPound, getBestValuePlan } from '../services/pricingService';
import { getStripePriceIds } from '../services/stripeService';
import EmbeddedCheckout from '../components/EmbeddedCheckout';
import './Subscription.css';

function Subscription() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [priceIds, setPriceIds] = useState({});
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  useEffect(() => {
    loadProfile();
    loadPriceIds();
  }, []);

  const loadProfile = async () => {
    try {
      const userProfile = await getUserProfile();
      setProfile(userProfile);
    } catch (error) {
      console.error('Error loading profile:', error);
      setError('Failed to load subscription information');
    } finally {
      setLoading(false);
    }
  };

  const loadPriceIds = async () => {
    try {
      const prices = await getStripePriceIds();
      setPriceIds(prices);
    } catch (error) {
      console.error('Error loading price IDs:', error);
    }
  };

  const handlePlanChange = async (newPlan) => {
    if (updating) return;

    const currentPlan = profile?.subscription_plan || null;
    if (newPlan === currentPlan) {
      return;
    }

    // Skip base plan - don't need Stripe checkout for free plan
    if (newPlan === 'base') {
      const action = !currentPlan ? 'subscribe' : 'change';
      const confirmMessage = !currentPlan
        ? `Subscribe to ${SUBSCRIPTION_PLANS[newPlan].name}?`
        : `Change your subscription to ${SUBSCRIPTION_PLANS[newPlan].name}?`;

      if (!window.confirm(confirmMessage)) {
        return;
      }

      setUpdating(true);
      setError(null);
      setSuccess(null);

      try {
        await updateSubscriptionPlan(newPlan, action);
        await loadProfile();
        setSuccess(`Successfully ${action === 'subscribe' ? 'subscribed' : 'changed'} to ${SUBSCRIPTION_PLANS[newPlan].name}`);
      } catch (error) {
        console.error('Error updating subscription:', error);
        setError(error.message || 'Failed to update subscription');
      } finally {
        setUpdating(false);
      }
      return;
    }

    // For paid plans, show Stripe checkout
    setSelectedPlan(newPlan);
    setShowCheckout(true);
    setError(null);
    setSuccess(null);
  };

  const handleCheckoutSuccess = async () => {
    setShowCheckout(false);
    setSelectedPlan(null);
    await loadProfile();
    setSuccess('Successfully updated your subscription!');
  };

  const handleCheckoutCancel = () => {
    setShowCheckout(false);
    setSelectedPlan(null);
  };

  if (loading) {
    return (
      <div className="subscription-container">
        <div className="subscription-loading">Loading subscription information...</div>
      </div>
    );
  }

  const currentPlan = profile?.subscription_plan || null;
  const bestValuePlan = getBestValuePlan();
  const hasUsedTrial = profile?.has_used_trial || false;

  // If showing checkout, render the checkout component
  if (showCheckout && selectedPlan && priceIds[selectedPlan]) {
    return (
      <EmbeddedCheckout
        priceId={priceIds[selectedPlan]}
        planType={selectedPlan}
        onSuccess={handleCheckoutSuccess}
        onCancel={handleCheckoutCancel}
      />
    );
  }

  return (
    <div className="subscription-container">
      <div className="subscription-header">
        <h1>Subscription Plans</h1>
        <p className="subscription-subtitle">
          {currentPlan ? 'Manage your subscription' : 'Choose a plan to get started'}
        </p>
      </div>

      {error && (
        <div className="subscription-error">
          {error}
        </div>
      )}

      {success && (
        <div className="subscription-success">
          {success}
        </div>
      )}

      {!currentPlan && (
        <div className="subscription-notice">
          You currently have no active subscription. Subscribe to a plan to get monthly credits.
        </div>
      )}

      <div className="subscription-plans-grid">
        {Object.entries(SUBSCRIPTION_PLANS).map(([planKey, plan]) => {
          const isCurrent = currentPlan === planKey;
          const isBestValue = bestValuePlan === planKey;
          const creditsPerPound = getCreditsPerPound(planKey);

          return (
            <div
              key={planKey}
              className={`subscription-plan-card ${isCurrent ? 'current' : ''} ${isBestValue ? 'best-value' : ''}`}
            >
              {isBestValue && <div className="best-value-badge">Best Value</div>}
              {isCurrent && <div className="current-badge">Current Plan</div>}

              <div className="plan-header">
                <h2>{plan.name}</h2>
                {plan.trialDays && !hasUsedTrial && (
                  <div className="trial-badge-inline">
                    <span className="trial-text-inline">{plan.trialDays} Day Free Trial</span>
                  </div>
                )}
                <div className="plan-price">
                  <span className="price-amount">{formatPrice(plan.price)}</span>
                  <span className="price-period">/month</span>
                </div>
                {plan.trialDays && !hasUsedTrial && (
                  <div className="price-after-trial-inline">
                    <span>Then {formatPrice(plan.price)}/month</span>
                  </div>
                )}
              </div>

              <div className="plan-credits">
                <div className="credits-amount">{plan.monthlyCredits}</div>
                <div className="credits-label">credits/month</div>
                {plan.price > 0 && (
                  <div className="credits-per-pound">{creditsPerPound} credits/£</div>
                )}
              </div>

              <ul className="plan-features">
                {plan.features
                  .filter(feature => {
                    // Hide trial feature if user has already used trial
                    if (hasUsedTrial && feature.toLowerCase().includes('trial')) {
                      return false;
                    }
                    return true;
                  })
                  .map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
              </ul>

              <div className="plan-actions">
                {isCurrent ? (
                  <button className="plan-button current-button" disabled>
                    Current Plan
                  </button>
                ) : (
                  <button
                    className="plan-button upgrade-button"
                    onClick={() => handlePlanChange(planKey)}
                    disabled={updating}
                  >
                    {currentPlan ? 'Change Plan' : 'Subscribe'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="subscription-info">
        <h3>How Credits Work</h3>
        <ul>
          <li><strong>Standard Images (SFW):</strong> 10 credits per image</li>
          <li><strong>NSFW Images:</strong> 30 credits (Essential) or 15 credits (Ultimate)</li>
          <li><strong>Model Creation:</strong> 50 credits (one-time)</li>
          <li><strong>Model Retraining:</strong> 25 credits</li>
          <li><strong>Batch Generation (3 images):</strong> 25 credits total</li>
        </ul>
        <p className="subscription-note">
          Credits are allocated monthly based on your plan. You can purchase additional credits anytime without changing your plan.
        </p>
      </div>
    </div>
  );
}

export default Subscription;
