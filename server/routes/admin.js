const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const supabase = require('../config/supabase');

/**
 * Middleware to check if user is admin
 */
async function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    let userId = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          userId = user.id;
        }
      } catch (e) {
        console.error('Error verifying token:', e);
      }
    }

    if (!userId) {
      userId = req.headers['x-user-id'];
    }

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user is admin
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('is_admin, admin_role')
      .eq('id', userId)
      .single();

    if (error || !profile || !profile.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.adminId = userId;
    req.adminRole = profile.admin_role;
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
}

/**
 * Middleware to check if user is super admin
 */
function requireSuperAdmin(req, res, next) {
  if (req.adminRole !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
}

/**
 * GET /api/admin/users
 * Get all users with pagination and filters
 */
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', status = 'all' } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('profiles')
      .select(`
        id,
        email,
        credits,
        subscription_plan,
        subscription_start_date,
        subscription_renewal_date,
        monthly_credits_allocated,
        stripe_customer_id,
        stripe_subscription_id,
        is_banned,
        is_locked,
        banned_reason,
        locked_reason,
        banned_at,
        locked_at,
        is_admin,
        admin_role,
        created_at
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply search filter
    if (search) {
      query = query.or(`email.ilike.%${search}%,id.eq.${search}`);
    }

    // Apply status filter
    if (status === 'banned') {
      query = query.eq('is_banned', true);
    } else if (status === 'locked') {
      query = query.eq('is_locked', true);
    } else if (status === 'active') {
      query = query.eq('is_banned', false).eq('is_locked', false);
    } else if (status === 'subscribed') {
      query = query.not('subscription_plan', 'is', null);
    }

    const { data: users, error, count } = await query;

    if (error) {
      throw error;
    }

    // Get total count
    const { count: totalCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Enrich with Stripe subscription data
    const enrichedUsers = await Promise.all(users.map(async (user) => {
      let subscriptionData = null;
      let isTrialing = false;
      let nextPaymentDate = null;

      if (user.stripe_subscription_id) {
        try {
          const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
          subscriptionData = {
            status: subscription.status,
            current_period_end: subscription.current_period_end,
            current_period_start: subscription.current_period_start,
            trial_end: subscription.trial_end,
            cancel_at_period_end: subscription.cancel_at_period_end
          };

          isTrialing = subscription.status === 'trialing';
          nextPaymentDate = subscription.current_period_end 
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null;
        } catch (e) {
          console.error('Error fetching Stripe subscription:', e);
        }
      }

      return {
        ...user,
        subscription: subscriptionData,
        isTrialing,
        nextPaymentDate
      };
    }));

    res.json({
      users: enrichedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/users/:userId
 * Get detailed user information
 */
router.get('/users/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get subscription history
    const { data: subscriptionHistory } = await supabase
      .from('subscription_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Get credit transactions
    const { data: creditTransactions } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    // Get Stripe subscription details
    let stripeSubscription = null;
    let paymentHistory = [];
    if (profile.stripe_customer_id) {
      try {
        // Get subscription
        if (profile.stripe_subscription_id) {
          stripeSubscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
        }

        // Get payment history (invoices)
        const invoices = await stripe.invoices.list({
          customer: profile.stripe_customer_id,
          limit: 20
        });
        paymentHistory = invoices.data.map(inv => ({
          id: inv.id,
          amount: inv.amount_paid / 100,
          currency: inv.currency,
          status: inv.status,
          date: new Date(inv.created * 1000).toISOString(),
          description: inv.description || inv.lines.data[0]?.description
        }));
      } catch (e) {
        console.error('Error fetching Stripe data:', e);
      }
    }

    // Get user's models count
    const { count: modelsCount } = await supabase
      .from('models')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    res.json({
      profile,
      subscriptionHistory: subscriptionHistory || [],
      creditTransactions: creditTransactions || [],
      stripeSubscription,
      paymentHistory,
      modelsCount: modelsCount || 0
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/users/:userId/ban
 * Ban a user
 */
router.post('/users/:userId/ban', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const { error } = await supabase
      .from('profiles')
      .update({
        is_banned: true,
        banned_reason: reason || 'No reason provided',
        banned_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;

    // Log admin action
    await supabase
      .from('admin_actions')
      .insert({
        admin_id: req.adminId,
        action_type: 'ban',
        target_user_id: userId,
        details: { reason: reason || 'No reason provided' },
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

    res.json({ success: true, message: 'User banned successfully' });
  } catch (error) {
    console.error('Error banning user:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/users/:userId/unban
 * Unban a user
 */
router.post('/users/:userId/unban', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const { error } = await supabase
      .from('profiles')
      .update({
        is_banned: false,
        banned_reason: null,
        banned_at: null
      })
      .eq('id', userId);

    if (error) throw error;

    // Log admin action
    await supabase
      .from('admin_actions')
      .insert({
        admin_id: req.adminId,
        action_type: 'unban',
        target_user_id: userId,
        details: {},
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

    res.json({ success: true, message: 'User unbanned successfully' });
  } catch (error) {
    console.error('Error unbanning user:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/users/:userId/lock
 * Lock a user account
 */
router.post('/users/:userId/lock', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const { error } = await supabase
      .from('profiles')
      .update({
        is_locked: true,
        locked_reason: reason || 'No reason provided',
        locked_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;

    // Log admin action
    await supabase
      .from('admin_actions')
      .insert({
        admin_id: req.adminId,
        action_type: 'lock',
        target_user_id: userId,
        details: { reason: reason || 'No reason provided' },
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

    res.json({ success: true, message: 'User account locked successfully' });
  } catch (error) {
    console.error('Error locking user:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/users/:userId/unlock
 * Unlock a user account
 */
router.post('/users/:userId/unlock', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const { error } = await supabase
      .from('profiles')
      .update({
        is_locked: false,
        locked_reason: null,
        locked_at: null
      })
      .eq('id', userId);

    if (error) throw error;

    // Log admin action
    await supabase
      .from('admin_actions')
      .insert({
        admin_id: req.adminId,
        action_type: 'unlock',
        target_user_id: userId,
        details: {},
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

    res.json({ success: true, message: 'User account unlocked successfully' });
  } catch (error) {
    console.error('Error unlocking user:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/admin/users/:userId
 * Delete a user (super admin only)
 */
router.delete('/users/:userId', requireAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user email before deletion for logging
    const { data: user } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    // Delete user from auth (this will cascade delete profile due to foreign key)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteError) {
      // If auth deletion fails, try deleting profile directly
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) throw profileError;
    }

    // Log admin action
    await supabase
      .from('admin_actions')
      .insert({
        admin_id: req.adminId,
        action_type: 'delete_user',
        target_user_id: userId,
        details: { email: user?.email },
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/users/:userId/update
 * Update user details
 */
router.post('/users/:userId/update', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { credits, subscription_plan } = req.body;

    const updateData = {};
    if (credits !== undefined) updateData.credits = credits;
    if (subscription_plan !== undefined) updateData.subscription_plan = subscription_plan;

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (error) throw error;

    // Log admin action
    await supabase
      .from('admin_actions')
      .insert({
        admin_id: req.adminId,
        action_type: 'update_user',
        target_user_id: userId,
        details: updateData,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/admins
 * Get all admins
 */
router.get('/admins', requireAdmin, async (req, res) => {
  try {
    const { data: admins, error } = await supabase
      .from('profiles')
      .select('id, email, admin_role, created_at')
      .eq('is_admin', true)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json({ admins: admins || [] });
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/admins
 * Create a new admin (super admin only)
 */
router.post('/admins', requireAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const { email, admin_role = 'admin' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user by email
    const { data: profile, error: findError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .single();

    if (findError || !profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user to admin
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_admin: true,
        admin_role: admin_role
      })
      .eq('id', profile.id);

    if (updateError) throw updateError;

    // Log admin action
    await supabase
      .from('admin_actions')
      .insert({
        admin_id: req.adminId,
        action_type: 'create_admin',
        target_user_id: profile.id,
        details: { email, admin_role },
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

    res.json({ success: true, message: 'Admin created successfully', admin: { id: profile.id, email } });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/admin/admins/:adminId
 * Remove admin status (super admin only)
 */
router.delete('/admins/:adminId', requireAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const { adminId } = req.params;

    // Don't allow removing super admin status from the first admin
    const { data: firstAdmin } = await supabase
      .from('profiles')
      .select('id, admin_role')
      .eq('is_admin', true)
      .eq('admin_role', 'super_admin')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (firstAdmin && firstAdmin.id === adminId) {
      return res.status(403).json({ error: 'Cannot remove super admin status from the first admin' });
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        is_admin: false,
        admin_role: null
      })
      .eq('id', adminId);

    if (error) throw error;

    res.json({ success: true, message: 'Admin status removed successfully' });
  } catch (error) {
    console.error('Error removing admin:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    // Total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Banned users
    const { count: bannedUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_banned', true);

    // Locked users
    const { count: lockedUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_locked', true);

    // Users with subscriptions
    const { count: subscribedUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .not('subscription_plan', 'is', null);

    // Total credits across all users
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('credits');
    
    const totalCredits = allProfiles?.reduce((sum, p) => sum + (p.credits || 0), 0) || 0;

    res.json({
      totalUsers: totalUsers || 0,
      bannedUsers: bannedUsers || 0,
      lockedUsers: lockedUsers || 0,
      subscribedUsers: subscribedUsers || 0,
      totalCredits
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/check-first-admin
 * Check if first admin exists and setup
 */
router.post('/check-first-admin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (email !== 'admin@fanova.com') {
      return res.status(400).json({ error: 'Invalid admin email' });
    }

    // Check if any admin exists
    const { data: existingAdmins, error: checkError } = await supabase
      .from('profiles')
      .select('id, email, is_admin')
      .eq('is_admin', true)
      .limit(1);

    if (checkError) throw checkError;

    // If no admins exist, this is the first admin setup
    if (!existingAdmins || existingAdmins.length === 0) {
      // Check if user exists in auth
      let adminUser = null;
      try {
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        if (!listError && users) {
          adminUser = users.find(u => u.email === email);
        }
      } catch (e) {
        console.log('Error listing users, will create new:', e);
      }

      if (!adminUser) {
        // Create the admin user
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true
        });

        if (createError) {
          console.error('Error creating admin user:', createError);
          throw createError;
        }
        adminUser = newUser.user;
      } else {
        // Update password if user exists
        const { error: updateError } = await supabase.auth.admin.updateUserById(adminUser.id, {
          password
        });
        if (updateError) {
          console.error('Error updating password:', updateError);
          // Continue anyway - password might already be set
        }
      }

      // Make them super admin in profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: adminUser.id,
          email: adminUser.email,
          is_admin: true,
          admin_role: 'super_admin',
          credits: 0,
          subscription_plan: null
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        console.error('Error updating profile:', profileError);
        throw profileError;
      }

      return res.json({ 
        success: true, 
        isFirstAdmin: true,
        message: 'First admin created successfully'
      });
    }

    // Admin exists, verify password
    const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, admin_role')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    res.json({ 
      success: true, 
      isFirstAdmin: false,
      user: {
        id: user.id,
        email: user.email,
        admin_role: profile.admin_role
      }
    });
  } catch (error) {
    console.error('Error checking first admin:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
