import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getSessionStatus } from '../services/stripeService';
import { getUserProfile } from '../services/supabaseService';
import './PaymentSuccess.css';

function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const sessionId = searchParams.get('session_id');
  const modelId = searchParams.get('modelId');

  useEffect(() => {
    if (sessionId) {
      checkSessionStatus();
    } else {
      setError('No session ID found');
      setStatus('error');
    }
  }, [sessionId]);

  const checkSessionStatus = async () => {
    try {
      const data = await getSessionStatus(sessionId);
      console.log('Session status:', data);
      setStatus(data.status);

      if (data.status === 'complete') {
        // Payment successful - wait a moment for webhook to process, then refresh profile
        console.log('Payment complete, waiting for webhook processing...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Try to refresh user profile to get updated subscription
        try {
          const profile = await getUserProfile();
          console.log('Updated profile after payment:', profile);
        } catch (profileError) {
          console.error('Error refreshing profile:', profileError);
        }
        
        // Redirect to dashboard
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      } else if (data.status === 'open') {
        // Session still open, redirect back
        navigate('/generate-results');
      }
    } catch (err) {
      console.error('Error checking session status:', err);
      setError(err.message);
      setStatus('error');
    }
  };

  if (status === 'loading') {
    return (
      <div className="payment-success-container">
        <div className="payment-status">
          <div className="loading-spinner"></div>
          <h2>Processing your payment...</h2>
          <p>Please wait while we confirm your subscription.</p>
        </div>
      </div>
    );
  }

  if (status === 'error' || error) {
    return (
      <div className="payment-success-container">
        <div className="payment-status error">
          <div className="status-icon">✕</div>
          <h2>Payment Error</h2>
          <p>{error || 'Something went wrong with your payment.'}</p>
          <button className="btn-primary" onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </button>
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
          <p>Your subscription has been activated. Redirecting to dashboard...</p>
          <div className="success-details">
            <p>Your model is now ready to use.</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default PaymentSuccess;
