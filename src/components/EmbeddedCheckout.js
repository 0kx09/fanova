import React, { useCallback, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { createCheckoutSession } from '../services/stripeService';
import './EmbeddedCheckout.css';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

function EmbeddedCheckoutComponent({ priceId, modelId, selectedImageId, planType, onSuccess, onCancel }) {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
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
    setLoading(true);
    setError(null);

    try {
      // Profile existence is handled by Supabase trigger
      // ensureProfile() not called since it's not deployed to production yet
      console.log('Creating checkout session with:', { priceId, modelId, selectedImageId, planType });

      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out. Please try again.')), 30000)
      );

      const clientSecret = await Promise.race([
        createCheckoutSession(priceId, modelId, selectedImageId, planType),
        timeoutPromise
      ]);

      console.log('Checkout session created successfully');
      setLoading(false);
      return clientSecret;
    } catch (err) {
      console.error('Error creating checkout session:', err);
      const errorMessage = err.message || 'Failed to create checkout session';
      setError(errorMessage);
      setLoading(false);
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
      {loading && (
        <div className="checkout-loading">
          <div className="loading-spinner"></div>
          <p>Setting up secure payment...</p>
        </div>
      )}
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
