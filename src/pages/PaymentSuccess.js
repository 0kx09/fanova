import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getSessionStatus, processPaymentCompletion } from '../services/stripeService';
import { getUserProfile } from '../services/supabaseService';
import './PaymentSuccess.css';

function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const sessionId = searchParams.get('session_id');
  const modelId = searchParams.get('modelId');

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds

  useEffect(() => {
    if (sessionId) {
      processPayment();
    } else {
      setError('No session ID found');
      setStatus('error');
      setProcessing(false);
    }
  }, [sessionId]);

  const processPayment = async () => {
    try {
      console.log('🔄 Starting payment processing for session:', sessionId);
      
      // Get session status
      const sessionData = await getSessionStatus(sessionId);
      console.log('📋 Session status:', sessionData);
      
      setStatus(sessionData.status);

      if (sessionData.status !== 'complete') {
        if (sessionData.status === 'open') {
          // Session still open, redirect back
          navigate('/generate-results');
          return;
        }
        setError(`Payment session is ${sessionData.status}. Please try again.`);
        setProcessing(false);
        return;
      }

      console.log('✅ Payment session is complete');
      console.log('📊 Subscription:', sessionData.subscription);
      console.log('📝 Metadata:', sessionData.metadata);

      // Process payment immediately (don't wait for webhook)
      await processPaymentWithRetry(sessionData);

    } catch (err) {
      console.error('❌ Error processing payment:', err);
      setError(err.message || 'Failed to process payment. Please contact support.');
      setProcessing(false);
    }
  };

  const processPaymentWithRetry = async (sessionData, attempt = 0) => {
    try {
      console.log(`🔄 Processing payment (attempt ${attempt + 1}/${MAX_RETRIES + 1})...`);

      // Try manual processing first
      const result = await processPaymentCompletion(sessionId);
      console.log('✅ Manual processing result:', result);

      // Wait a moment for database to update
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify the profile was updated
      const profile = await getUserProfile();
      console.log('👤 Profile after processing:', profile);

      // Check if payment was processed successfully
      if (profile.subscription_plan && profile.credits > 0) {
        console.log('✅ Payment processed successfully!');
        console.log('📊 Final profile:', {
          plan: profile.subscription_plan,
          credits: profile.credits,
          monthly_credits: profile.monthly_credits_allocated
        });
        setProcessing(false);
        
        // Redirect to dashboard after short delay
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
        return;
      }

      // If we get here, payment wasn't processed yet
      if (attempt < MAX_RETRIES) {
        console.log(`⚠️ Payment not processed yet, retrying in ${RETRY_DELAY}ms...`);
        setRetryCount(attempt + 1);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return processPaymentWithRetry(sessionData, attempt + 1);
      } else {
        // Max retries reached
        console.error('❌ Payment processing failed after max retries');
        setError('Payment was successful but we couldn\'t activate your subscription. Please contact support with your session ID: ' + sessionId);
        setProcessing(false);
      }
    } catch (err) {
      console.error(`❌ Error on attempt ${attempt + 1}:`, err);
      
      if (attempt < MAX_RETRIES) {
        console.log(`🔄 Retrying in ${RETRY_DELAY}ms...`);
        setRetryCount(attempt + 1);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return processPaymentWithRetry(sessionData, attempt + 1);
      } else {
        setError(err.message || 'Failed to process payment after multiple attempts. Please contact support.');
        setProcessing(false);
      }
    }
  };

  if (status === 'loading' || processing) {
    return (
      <div className="payment-success-container">
        <div className="payment-status">
          <div className="loading-spinner"></div>
          <h2>Processing your payment...</h2>
          <p>Please wait while we activate your subscription.</p>
          {retryCount > 0 && (
            <p className="retry-notice">Retrying... ({retryCount}/{MAX_RETRIES})</p>
          )}
        </div>
      </div>
    );
  }

  if (status === 'error' || error) {
    return (
      <div className="payment-success-container">
        <div className="payment-status error">
          <div className="status-icon">✕</div>
          <h2>Payment Processing Error</h2>
          <p>{error || 'Something went wrong with your payment.'}</p>
          <div className="error-actions">
            <button className="btn-primary" onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </button>
            <button className="btn-secondary" onClick={() => window.location.reload()}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'complete') {
    return (
      <div className="payment-success-container">
        <div className="payment-status success">
          <div className="status-icon">✓</div>
          <h2>Payment Successful!</h2>
          <p>Your subscription has been activated successfully.</p>
          <div className="success-details">
            <p>Redirecting to dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default PaymentSuccess;
