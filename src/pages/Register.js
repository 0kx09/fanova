import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './Register.css';

function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    referralCode: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check for referral code in URL
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setFormData(prev => ({
        ...prev,
        referralCode: refCode
      }));
    }
  }, [searchParams]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // Sign up with Supabase, including referral code in metadata
      const signUpOptions = {
        emailRedirectTo: `${window.location.origin}/dashboard`
      };

      // Add referral code to metadata if provided
      if (formData.referralCode && formData.referralCode.trim()) {
        signUpOptions.data = {
          referral_code: formData.referralCode.trim().toUpperCase()
        };
      }

      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: signUpOptions
      });

      if (error) throw error;

      if (data.user) {
        // Registration successful
        console.log('User registered:', data.user);

        // Note: Referral is processed by database trigger automatically
        // The trigger reads the referral_code from user metadata and processes it
        // We don't need to call the API endpoint here as the trigger handles it
        // However, we can verify it worked after a delay
        if (formData.referralCode && formData.referralCode.trim()) {
          // Wait a bit for the trigger to process, then verify
          setTimeout(async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session) {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('credits, referred_by')
                  .eq('id', data.user.id)
                  .single();
                
                if (profile) {
                  console.log('Profile after registration:', {
                    credits: profile.credits,
                    referredBy: profile.referred_by,
                    expectedCredits: 70 // 50 base + 20 referral
                  });
                  
                  // If referral wasn't processed by trigger, try API as fallback
                  if (profile.credits === 50 && !profile.referred_by) {
                    console.log('Referral not processed by trigger, trying API fallback...');
                    const { processReferral } = await import('../services/referralService');
                    const result = await processReferral(data.user.id, formData.referralCode.trim().toUpperCase());
                    console.log('Referral processed via API:', result);
                  }
                }
              }
            } catch (refError) {
              console.error('Error verifying referral:', refError);
              // Don't block registration if referral verification fails
            }
          }, 2000);
        }

        // Navigate to dashboard
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h1 className="logo">Fanova</h1>
        <p className="subtitle">Create Your AI Model</p>

        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={loading}
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={loading}
              placeholder="Create a password (min 6 characters)"
              minLength="6"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              disabled={loading}
              placeholder="Confirm your password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="referralCode">Referral Code (Optional)</label>
            <input
              type="text"
              id="referralCode"
              name="referralCode"
              value={formData.referralCode}
              onChange={handleChange}
              disabled={loading}
              placeholder="Enter referral code to get 20 free credits"
              style={{ textTransform: 'uppercase' }}
            />
            {formData.referralCode && (
              <p className="referral-note">You'll receive 20 credits when you sign up with this code!</p>
            )}
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="login-link">
          Already have an account? <a href="/login">Sign in</a>
        </p>
      </div>
    </div>
  );
}

export default Register;
