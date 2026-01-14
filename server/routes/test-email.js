const express = require('express');
const router = express.Router();
const { sendWelcomeEmail, sendFirstModelEmail, sendSubscriptionConfirmationEmail } = require('../services/emailService');

// SECURITY: Only enable test routes in development
// In production, these routes should be disabled or require admin authentication
const isDevelopment = process.env.NODE_ENV !== 'production';

// Middleware to block test routes in production
const requireDevelopment = (req, res, next) => {
  if (!isDevelopment) {
    return res.status(404).json({ error: 'Not found' });
  }
  next();
};

/**
 * POST /api/test-email/welcome
 * Test welcome email sending
 * SECURITY: Only available in development mode
 */
router.post('/welcome', requireDevelopment, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    console.log('🧪 Testing welcome email to:', email);
    const result = await sendWelcomeEmail(email, 'Test User');

    res.json({
      success: result.success,
      message: result.success ? 'Welcome email sent successfully!' : 'Failed to send email',
      data: result.data,
      error: result.error
    });
  } catch (error) {
    console.error('❌ Test email error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error
    });
  }
});

/**
 * POST /api/test-email/first-model
 * Test first model email sending
 * SECURITY: Only available in development mode
 */
router.post('/first-model', requireDevelopment, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    console.log('🧪 Testing first model email to:', email);
    const result = await sendFirstModelEmail(email, 'Test User', 'test-model-id', 'Test Model');

    res.json({
      success: result.success,
      message: result.success ? 'First model email sent successfully!' : 'Failed to send email',
      data: result.data,
      error: result.error
    });
  } catch (error) {
    console.error('❌ Test email error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error
    });
  }
});

/**
 * POST /api/test-email/subscription
 * Test subscription confirmation email sending
 * SECURITY: Only available in development mode
 */
router.post('/subscription', requireDevelopment, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    console.log('🧪 Testing subscription email to:', email);
    const result = await sendSubscriptionConfirmationEmail(email, 'Test User', 'Essential', 250);

    res.json({
      success: result.success,
      message: result.success ? 'Subscription email sent successfully!' : 'Failed to send email',
      data: result.data,
      error: result.error
    });
  } catch (error) {
    console.error('❌ Test email error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error
    });
  }
});

/**
 * GET /api/test-email/config
 * Check Resend configuration
 * SECURITY: Only available in development mode
 */
router.get('/config', requireDevelopment, async (req, res) => {
  try {
    const hasApiKey = !!process.env.RESEND_API_KEY;
    const apiKeyPrefix = process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.substring(0, 10) + '...' : 'NOT SET';

    res.json({
      configured: hasApiKey,
      apiKeyPrefix: apiKeyPrefix,
      frontendUrl: process.env.FRONTEND_URL || 'NOT SET',
      message: hasApiKey ? 'Resend API key is configured' : 'Resend API key is missing'
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

module.exports = router;
