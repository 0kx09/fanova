import React, { useState, useEffect } from 'react';
import { getUserProfile, addCredits } from '../services/supabaseService';
import { CREDIT_RECHARGES, formatPrice } from '../services/pricingService';
import './CreditRecharge.css';

function CreditRecharge({ currentCredits, onClose, onCreditsRecharged, onCreditsUpdated }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const userProfile = await getUserProfile();
      setProfile(userProfile);
    } catch (error) {
      console.error('Error loading profile:', error);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (recharge) => {
    if (processing) return;

    // In production, this would integrate with a payment processor (Stripe, Paddle, etc.)
    // For now, we'll simulate the purchase
    if (!window.confirm(`Purchase ${recharge.credits} credits for ${formatPrice(recharge.price)}?`)) {
      return;
    }

    setProcessing(recharge.id);
    setError(null);

    try {
      // TODO: Integrate with payment processor
      // For now, simulate successful purchase
      await addCredits(
        recharge.credits,
        'recharge',
        `Credit recharge: ${recharge.credits} credits`,
        { rechargeId: recharge.id, price: recharge.price }
      );

      const updatedProfile = await getUserProfile();
      const newCredits = updatedProfile.credits;
      
      // Call the appropriate callback
      if (onCreditsRecharged) {
        onCreditsRecharged(newCredits);
      } else if (onCreditsUpdated) {
        onCreditsUpdated();
      }

      alert(`Successfully purchased ${recharge.credits} credits!`);
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error purchasing credits:', error);
      setError(error.message || 'Failed to purchase credits');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="credit-recharge-overlay" onClick={onClose}>
        <div className="credit-recharge-modal" onClick={(e) => e.stopPropagation()}>
          <div className="credit-recharge-loading">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="credit-recharge-overlay" onClick={onClose}>
      <div className="credit-recharge-modal" onClick={(e) => e.stopPropagation()}>
        <div className="credit-recharge-header">
          <h2>Purchase Credits</h2>
          <button className="credit-recharge-close" onClick={onClose}>×</button>
        </div>

        <div className="credit-recharge-current">
          <div className="current-credits-label">Current Credits</div>
          <div className="current-credits-amount">{profile?.credits || 0}</div>
        </div>

        {error && (
          <div className="credit-recharge-error">
            {error}
          </div>
        )}

        <div className="credit-recharge-options">
          {CREDIT_RECHARGES.map((recharge) => (
            <div
              key={recharge.id}
              className={`credit-recharge-option ${processing === recharge.id ? 'processing' : ''}`}
            >
              <div className="recharge-credits">{recharge.credits} Credits</div>
              <div className="recharge-price">{formatPrice(recharge.price)}</div>
              <div className="recharge-value">
                {Math.round((recharge.credits / recharge.price) * 100) / 100} credits/£
              </div>
              <button
                className="recharge-button"
                onClick={() => handlePurchase(recharge)}
                disabled={processing !== null}
              >
                {processing === recharge.id ? 'Processing...' : 'Purchase'}
              </button>
            </div>
          ))}
        </div>

        <div className="credit-recharge-note">
          <p>💡 Credits never expire and can be used for any image generation.</p>
          <p>💳 Payment processing will be integrated with Stripe/Paddle.</p>
        </div>
      </div>
    </div>
  );
}

export default CreditRecharge;
