import React, { useState, useEffect } from 'react';
import { SUBSCRIPTION_PLANS, formatPrice, getBestValuePlan } from '../services/pricingService';
import { getStripePriceIds } from '../services/stripeService';
import EmbeddedCheckout from './EmbeddedCheckout';
import './PlanSelection.css';

function PlanSelection({ modelId, selectedImageId, onPaymentComplete, onClose }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [priceIds, setPriceIds] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const bestValuePlan = getBestValuePlan();

  useEffect(() => {
    loadPriceIds();
  }, []);

  const loadPriceIds = async () => {
    try {
      const ids = await getStripePriceIds();
      setPriceIds(ids);
    } catch (error) {
      console.error('Error loading price IDs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = (planType) => {
    setSelectedPlan(planType);
  };

  const handleContinue = () => {
    if (!selectedPlan) {
      alert('Please select a plan');
      return;
    }
    setShowCheckout(true);
  };

  if (loading) {
    return (
      <div className="plan-selection-loading">
        <div className="loading-spinner"></div>
        <p>Loading plans...</p>
      </div>
    );
  }

  if (showCheckout && selectedPlan && priceIds[selectedPlan]) {
    return (
      <EmbeddedCheckout
        priceId={priceIds[selectedPlan]}
        modelId={modelId}
        selectedImageId={selectedImageId}
        planType={selectedPlan}
        onSuccess={onPaymentComplete}
        onCancel={() => setShowCheckout(false)}
      />
    );
  }

  return (
    <div className="plan-selection-modal-overlay">
      <div className="plan-selection-modal" onClick={(e) => e.stopPropagation()}>
        {onClose && (
          <button 
            className="plan-selection-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        )}
        <div className="plan-selection-container">
          <div className="plan-selection-header">
            <h2>Choose Your Subscription Plan</h2>
            <p className="section-subtitle">Select a plan to continue and unlock your AI model</p>
          </div>

          <div className="plans-grid">
            {Object.entries(SUBSCRIPTION_PLANS).map(([planType, plan]) => (
              <div
                key={planType}
                className={`plan-card ${selectedPlan === planType ? 'selected' : ''} ${planType === bestValuePlan ? 'best-value' : ''}`}
                onClick={() => handlePlanSelect(planType)}
              >
                {planType === bestValuePlan && (
                  <div className="best-value-badge">Best Value</div>
                )}
                {plan.trialDays && (
                  <div className="trial-badge">1 Day Free Trial</div>
                )}
                <div className="plan-card-content">
                  <div className="plan-header">
                    <h3>{plan.name}</h3>
                    {plan.trialDays && (
                      <div className="trial-notice">
                        <span className="trial-text">Start with {plan.trialDays} day free trial</span>
                      </div>
                    )}
                    <div className="plan-price">
                      <span className="price-amount">{formatPrice(plan.price, plan.currency)}</span>
                      <span className="price-period">/month</span>
                    </div>
                    {plan.trialDays && (
                      <div className="price-after-trial">
                        <span className="after-trial-text">Then {formatPrice(plan.price, plan.currency)}/month</span>
                      </div>
                    )}
                  </div>
                  <div className="plan-credits">
                    <span className="credits-amount">{plan.monthlyCredits}</span>
                    <span className="credits-label">Credits/month</span>
                  </div>
                  <ul className="plan-features">
                    {plan.features.map((feature, index) => (
                      <li key={index}>
                        <span className="feature-icon">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    className={`plan-select-btn ${selectedPlan === planType ? 'selected' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlanSelect(planType);
                    }}
                  >
                    {selectedPlan === planType ? '✓ Selected' : 'Select Plan'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="plan-selection-actions">
            <button
              className="btn-primary"
              onClick={handleContinue}
              disabled={!selectedPlan}
            >
              Continue to Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlanSelection;
