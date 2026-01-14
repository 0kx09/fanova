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

    let userCreatedAt = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          userId = user.id;
          userEmail = user.email;
          userCreatedAt = user.created_at; // Get user creation timestamp
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
      .select('id, credits, subscription_plan, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (existingProfile) {
      console.log('✅ Profile already exists:', existingProfile);
      
      // Check if this is a newly created user/profile
      // If user was created within last 5 minutes, send welcome email
      let isNewUser = false;
      
      if (userCreatedAt) {
        // Use user creation time from auth (most accurate)
        const userCreated = new Date(userCreatedAt);
        const now = new Date();
        const minutesSinceCreation = (now - userCreated) / (1000 * 60);
        isNewUser = minutesSinceCreation < 5; // Created within last 5 minutes
        
        if (isNewUser) {
          console.log(`📧 User was created ${minutesSinceCreation.toFixed(1)} minutes ago - sending welcome email`);
        }
      } else {
        // Fallback: check profile creation time
        const profileCreatedAt = new Date(existingProfile.created_at);
        const now = new Date();
        const minutesSinceCreation = (now - profileCreatedAt) / (1000 * 60);
        isNewUser = minutesSinceCreation < 5; // Created within last 5 minutes
        
        if (isNewUser) {
          console.log(`📧 Profile was created ${minutesSinceCreation.toFixed(1)} minutes ago - sending welcome email`);
        }
      }
      
      // Send welcome email if this is a new user (profile created by trigger)
      if (isNewUser && userEmail) {
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
      }
      
      return res.json({
        success: true,
        profile: existingProfile,
        created: false,
        isNewUser: isNewUser
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
