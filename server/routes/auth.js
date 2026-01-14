const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { sendWelcomeEmail } = require('../services/emailService');

/**
 * POST /api/auth/ensure-profile
 * Ensures a profile exists for the authenticated user
 * This bypasses RLS using the service role key
 */
router.post('/ensure-profile', async (req, res) => {
  try {
    // Get user ID from request
    const authHeader = req.headers.authorization;
    let userId = null;
    let userEmail = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          userId = user.id;
          userEmail = user.email;
        }
      } catch (e) {
        console.error('Error verifying token:', e);
      }
    }

    // Fallback to x-user-id header if provided
    if (!userId) {
      userId = req.headers['x-user-id'];
    }

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    console.log('🔍 Ensuring profile exists for user:', userId);

    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id, credits, subscription_plan')
      .eq('id', userId)
      .maybeSingle();

    if (existingProfile) {
      console.log('✅ Profile already exists:', existingProfile);
      return res.json({
        success: true,
        profile: existingProfile,
        created: false
      });
    }

    // Profile doesn't exist - create it
    console.log('📝 Creating new profile for user:', userId);

    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert([
        {
          id: userId,
          email: userEmail || '',
          credits: 0,
          subscription_plan: null,
          monthly_credits_allocated: 0
        }
      ])
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating profile:', createError);
      return res.status(500).json({
        error: 'Failed to create profile',
        details: createError.message
      });
    }

    console.log('✅ Profile created successfully:', newProfile);

    // Send welcome email (async, don't block response)
    if (userEmail) {
      sendWelcomeEmail(userEmail)
        .then(result => {
          if (result.success) {
            console.log('✅ Welcome email sent successfully to:', userEmail);
          } else {
            console.error('⚠️ Failed to send welcome email:', result.error);
          }
        })
        .catch(err => {
          console.error('⚠️ Exception sending welcome email (non-blocking):', err.message || err);
        });
    } else {
      console.warn('⚠️ Cannot send welcome email: userEmail is missing');
    }

    res.json({
      success: true,
      profile: newProfile,
      created: true
    });
  } catch (error) {
    console.error('❌ Error in ensure-profile:', error);
    res.status(500).json({
      error: error.message || 'Failed to ensure profile exists',
      details: error.stack
    });
  }
});

module.exports = router;
