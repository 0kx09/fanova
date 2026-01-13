const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

/**
 * Middleware to get authenticated user ID
 */
async function getUserId(req) {
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

  return userId;
}

/**
 * GET /api/referrals/my-link
 * Get the current user's referral link and stats
 */
router.get('/my-link', async (req, res) => {
  try {
    const userId = await getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's profile with referral code
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('referral_code, email')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Generate referral code if user doesn't have one
    if (!profile.referral_code) {
      // Generate a unique referral code
      let newCode = generateReferralCode();
      let codeExists = true;
      let attempts = 0;
      
      // Ensure code is unique
      while (codeExists && attempts < 10) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('referral_code', newCode)
          .single();
        
        if (!existing) {
          codeExists = false;
        } else {
          newCode = generateReferralCode();
          attempts++;
        }
      }
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ referral_code: newCode })
        .eq('id', userId);

      if (updateError) {
        return res.status(500).json({ error: 'Failed to generate referral code' });
      }

      profile.referral_code = newCode;
    }

    // Get referral stats
    const { count: referralCount } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', userId);

    // Build referral link
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const referralLink = `${baseUrl}/register?ref=${profile.referral_code}`;

    res.json({
      success: true,
      referralCode: profile.referral_code,
      referralLink: referralLink,
      referralCount: referralCount || 0
    });
  } catch (error) {
    console.error('Error getting referral link:', error);
    res.status(500).json({ error: 'Failed to get referral link' });
  }
});

/**
 * GET /api/referrals/stats
 * Get referral statistics for current user
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = await getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get total referrals
    const { count: totalReferrals } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', userId);

    // Get total credits earned from referrals
    const { data: referrals } = await supabase
      .from('referrals')
      .select('credits_awarded_referrer, created_at')
      .eq('referrer_id', userId);

    const totalCreditsEarned = referrals?.reduce((sum, r) => sum + (r.credits_awarded_referrer || 0), 0) || 0;

    res.json({
      success: true,
      totalReferrals: totalReferrals || 0,
      totalCreditsEarned: totalCreditsEarned,
      referrals: referrals || []
    });
  } catch (error) {
    console.error('Error getting referral stats:', error);
    res.status(500).json({ error: 'Failed to get referral stats' });
  }
});

/**
 * POST /api/referrals/process
 * Process a referral after user signup (called from frontend after registration)
 */
router.post('/process', async (req, res) => {
  try {
    const { userId, referralCode } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!referralCode) {
      // No referral code - just ensure user has a referral code
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', userId)
        .single();

      if (!profile?.referral_code) {
        // Generate referral code for user
        const newCode = generateReferralCode();
        await supabase
          .from('profiles')
          .update({ referral_code: newCode })
          .eq('id', userId);
      }

      return res.json({ success: true, message: 'No referral code provided' });
    }

    // Find referrer by code
    const { data: referrerProfile, error: referrerError } = await supabase
      .from('profiles')
      .select('id')
      .eq('referral_code', referralCode.toUpperCase().trim())
      .single();

    if (referrerError || !referrerProfile) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }

    // Check if user was already referred
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('id')
      .eq('referred_id', userId)
      .single();

    if (existingReferral) {
      return res.json({ success: true, message: 'Referral already processed' });
    }

    // Check if user is trying to refer themselves
    if (referrerProfile.id === userId) {
      return res.status(400).json({ error: 'Cannot use your own referral code' });
    }

    // Get current credits for both users
    const { data: referrerProfileFull, error: refError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', referrerProfile.id)
      .single();

    const { data: newUserProfile, error: newUserError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single();

    if (refError || !referrerProfileFull) {
      return res.status(500).json({ error: 'Failed to fetch referrer profile' });
    }

    if (newUserError || !newUserProfile) {
      return res.status(500).json({ error: 'Failed to fetch new user profile' });
    }

    // Award credits to both users
    const { error: updateError1 } = await supabase
      .from('profiles')
      .update({ credits: (referrerProfileFull?.credits || 0) + 20 })
      .eq('id', referrerProfile.id);

    const { error: updateError2 } = await supabase
      .from('profiles')
      .update({ 
        credits: (newUserProfile?.credits || 0) + 20,
        referred_by: referrerProfile.id
      })
      .eq('id', userId);

    if (updateError1 || updateError2) {
      console.error('Error updating credits:', updateError1 || updateError2);
      return res.status(500).json({ error: 'Failed to award referral credits' });
    }

    // Record the referral
    const { error: referralError } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrerProfile.id,
        referred_id: userId,
        referral_code: referralCode.toUpperCase().trim(),
        credits_awarded_referrer: 20,
        credits_awarded_referred: 20
      });

    if (referralError) {
      console.error('Error recording referral:', referralError);
      // Don't fail - credits were already awarded
    }

    // Log credit transactions
    await supabase.from('credit_transactions').insert([
      {
        user_id: referrerProfile.id,
        amount: 20,
        transaction_type: 'referral',
        description: 'Referral bonus - referred new user',
        metadata: { referred_user_id: userId, type: 'referrer' }
      },
      {
        user_id: userId,
        amount: 20,
        transaction_type: 'referral',
        description: 'Referral bonus - signed up with referral code',
        metadata: { referrer_id: referrerProfile.id, type: 'referred' }
      }
    ]);

    res.json({
      success: true,
      message: 'Referral processed successfully! You both received 20 credits.',
      creditsAwarded: 20
    });
  } catch (error) {
    console.error('Error processing referral:', error);
    res.status(500).json({ error: 'Failed to process referral' });
  }
});

/**
 * Helper function to generate referral code
 */
function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

module.exports = router;
