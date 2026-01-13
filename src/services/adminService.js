import { supabase } from '../lib/supabase';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Check first admin and setup/login
 */
export const checkFirstAdmin = async (email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/check-first-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to authenticate');
    }

    const data = await response.json();
    
    // If first admin setup, sign in with Supabase
    if (data.isFirstAdmin) {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) throw authError;
      return { ...data, session: authData };
    }

    return data;
  } catch (error) {
    console.error('Error checking first admin:', error);
    throw error;
  }
};

/**
 * Get all users
 */
export const getUsers = async (page = 1, limit = 50, search = '', status = 'all') => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      search,
      status
    });

    const response = await fetch(`${API_BASE_URL}/admin/users?${params}`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch users');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

/**
 * Get user details
 */
export const getUserDetails = async (userId) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch user details');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching user details:', error);
    throw error;
  }
};

/**
 * Ban user
 */
export const banUser = async (userId, reason) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/ban`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to ban user');
    }

    return response.json();
  } catch (error) {
    console.error('Error banning user:', error);
    throw error;
  }
};

/**
 * Unban user
 */
export const unbanUser = async (userId) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/unban`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to unban user');
    }

    return response.json();
  } catch (error) {
    console.error('Error unbanning user:', error);
    throw error;
  }
};

/**
 * Lock user
 */
export const lockUser = async (userId, reason) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/lock`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to lock user');
    }

    return response.json();
  } catch (error) {
    console.error('Error locking user:', error);
    throw error;
  }
};

/**
 * Unlock user
 */
export const unlockUser = async (userId) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/unlock`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to unlock user');
    }

    return response.json();
  } catch (error) {
    console.error('Error unlocking user:', error);
    throw error;
  }
};

/**
 * Delete user
 */
export const deleteUser = async (userId) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete user');
    }

    return response.json();
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

/**
 * Update user
 */
export const updateUser = async (userId, updates) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/update`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update user');
    }

    return response.json();
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

/**
 * Get all admins
 */
export const getAdmins = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE_URL}/admin/admins`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch admins');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching admins:', error);
    throw error;
  }
};

/**
 * Create admin
 */
export const createAdmin = async (email, adminRole = 'admin') => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE_URL}/admin/admins`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, admin_role: adminRole })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create admin');
    }

    return response.json();
  } catch (error) {
    console.error('Error creating admin:', error);
    throw error;
  }
};

/**
 * Get admin stats
 */
export const getAdminStats = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE_URL}/admin/stats`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch stats');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching stats:', error);
    throw error;
  }
};
