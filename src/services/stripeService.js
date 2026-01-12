import { supabase } from '../lib/supabase';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Get Stripe price IDs for all plans
 */
export const getStripePriceIds = async () => {
  try {
    const { data, error } = await supabase
      .from('stripe_price_mapping')
      .select('plan_type, price_id');

    if (error) throw error;

    const priceIds = {};
    data.forEach(item => {
      priceIds[item.plan_type] = item.price_id;
    });

    return priceIds;
  } catch (error) {
    console.error('Error fetching price IDs:', error);
    throw error;
  }
};

/**
 * Create a Stripe checkout session
 */
export const createCheckoutSession = async (priceId, modelId, selectedImageId, planType) => {
  try {
    // Get current user and session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const headers = {
      'Content-Type': 'application/json',
      'x-user-id': user.id
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/stripe/create-checkout-session`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        priceId,
        modelId,
        selectedImageId,
        planType
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create checkout session');
    }

    const data = await response.json();
    return data.clientSecret;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

/**
 * Get checkout session status
 */
export const getSessionStatus = async (sessionId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/stripe/session-status?session_id=${sessionId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get session status');
    }

    return response.json();
  } catch (error) {
    console.error('Error getting session status:', error);
    throw error;
  }
};

/**
 * Create a Stripe Customer Portal session for billing management
 */
export const createCustomerPortalSession = async () => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const headers = {
      'Content-Type': 'application/json',
      'x-user-id': user.id
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/stripe/create-portal-session`, {
      method: 'POST',
      headers,
      body: JSON.stringify({})
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create portal session');
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    throw error;
  }
};
