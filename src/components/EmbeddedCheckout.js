import React, { useCallback, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { createCheckoutSession } from '../services/stripeService';
import './EmbeddedCheckout.css';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

function EmbeddedCheckoutComponent({ priceId, modelId, selectedImageId, planType, onSuccess, onCancel }) {
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams();

  // Check for successful payment redirect
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId && onSuccess) {
      // Payment was successful, call onSuccess
      onSuccess();
    }
  }, [searchParams, onSuccess]);

  const fetchClientSecret = useCallback(async () => {
    try {
      console.log('Creating checkout session with:', { priceId, modelId, selectedImageId, planType });
      const clientSecret = await createCheckoutSession(priceId, modelId, selectedImageId, planType);
      console.log('Checkout session created successfully');
      return clientSecret;
    } catch (err) {
      console.error('Error creating checkout session:', err);
      setError(err.message || 'Failed to create checkout session');
      throw err;
    }
  }, [priceId, modelId, selectedImageId, planType]);

  if (error) {
    return (
      <div className="checkout-error">
        <h3>Error</h3>
        <p>{error}</p>
        <button className="btn-secondary" onClick={onCancel}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="embedded-checkout-container">
      <div className="checkout-header">
        <h2>Complete Your Payment</h2>
        <p className="section-subtitle">Secure payment powered by Stripe</p>
        <button className="checkout-cancel-btn" onClick={onCancel}>
          ← Back to Plans
        </button>
      </div>
      <div className="checkout-wrapper">
        <EmbeddedCheckoutProvider
          stripe={stripePromise}
          options={{ fetchClientSecret }}
        >
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    </div>
  );
}

export default EmbeddedCheckoutComponent;
