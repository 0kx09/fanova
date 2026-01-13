import { supabase } from '../lib/supabase';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Ensures a profile exists for the authenticated user
 * This is critical for new users as RLS policies may block direct profile creation
 */
export const ensureProfile = async () => {
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

    const response = await fetch(`${API_BASE_URL}/auth/ensure-profile`, {
      method: 'POST',
      headers
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to ensure profile exists');
    }

    const data = await response.json();
    console.log('Profile ensured:', data);
    return data;
  } catch (error) {
    console.error('Error ensuring profile:', error);
    throw error;
  }
};
