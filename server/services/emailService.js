const { Resend } = require('resend');

// Initialize Resend client
// Resend SDK automatically uses RESEND_API_KEY from environment if not provided
const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
  console.warn('⚠️  RESEND_API_KEY not found in environment variables. Emails will not be sent.');
} else if (!RESEND_API_KEY.startsWith('re_')) {
  console.warn('⚠️  RESEND_API_KEY format appears invalid (should start with "re_"). Emails may not work.');
}

const resend = new Resend(RESEND_API_KEY);

// Email configuration
const FROM_EMAIL = 'Fanova <noreply@usefanova.com>'; // Update with your verified domain
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://usefanova.com';

/**
 * Send welcome email to new user after registration
 * @param {string} userEmail - User's email address
 * @param {string} userName - User's name (optional)
 */
async function sendWelcomeEmail(userEmail, userName = '') {
  // Validate API key before attempting to send
  if (!RESEND_API_KEY) {
    console.error('❌ Cannot send welcome email: RESEND_API_KEY not configured');
    return { success: false, error: { message: 'Email service not configured' } };
  }

  // Validate email address
  if (!userEmail || typeof userEmail !== 'string' || !userEmail.includes('@')) {
    console.error('❌ Invalid email address:', userEmail);
    return { success: false, error: { message: 'Invalid email address' } };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [userEmail],
      subject: 'Welcome to Fanova - Your AI Model Creator',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
              line-height: 1.6;
              color: #18181b;
              background-color: #fafafa;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background: white;
              border: 1px solid #e4e4e7;
              border-radius: 12px;
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 40px 32px;
              text-align: center;
            }
            .header h1 {
              color: white;
              margin: 0;
              font-size: 28px;
              font-weight: 600;
            }
            .content {
              padding: 40px 32px;
            }
            .content h2 {
              color: #18181b;
              font-size: 20px;
              font-weight: 600;
              margin: 0 0 16px 0;
            }
            .content p {
              color: #71717a;
              margin: 0 0 16px 0;
              font-size: 15px;
            }
            .cta-button {
              display: inline-block;
              background: #667eea;
              color: white;
              text-decoration: none;
              padding: 14px 28px;
              border-radius: 8px;
              font-weight: 500;
              margin: 24px 0;
              font-size: 15px;
            }
            .features {
              background: #f4f4f5;
              border-radius: 8px;
              padding: 24px;
              margin: 24px 0;
            }
            .features h3 {
              color: #18181b;
              font-size: 16px;
              font-weight: 600;
              margin: 0 0 16px 0;
            }
            .features ul {
              margin: 0;
              padding: 0 0 0 20px;
              color: #52525b;
            }
            .features li {
              margin-bottom: 8px;
            }
            .footer {
              padding: 24px 32px;
              background: #fafafa;
              border-top: 1px solid #e4e4e7;
              text-align: center;
            }
            .footer p {
              color: #a1a1aa;
              font-size: 13px;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Fanova! 🎨</h1>
            </div>
            <div class="content">
              <h2>Hi${userName ? ` ${userName}` : ''}!</h2>
              <p>
                Thank you for joining Fanova, your AI-powered model creator. We're excited to have you on board!
              </p>
              <p>
                With Fanova, you can create stunning AI-generated models with consistent identity and high-quality results.
              </p>

              <div class="features">
                <h3>What you can do with Fanova:</h3>
                <ul>
                  <li>Create AI models with custom attributes and features</li>
                  <li>Generate consistent, high-quality images</li>
                  <li>Chat with your models to generate new scenarios</li>
                  <li>Access NSFW content generation (with subscription)</li>
                  <li>Build and manage your model portfolio</li>
                </ul>
              </div>

              <p>
                Ready to create your first AI model?
              </p>

              <center>
                <a href="${FRONTEND_URL}/login" class="cta-button">Get Started</a>
              </center>

              <p style="margin-top: 32px; font-size: 14px;">
                Need help? Check out our <a href="${FRONTEND_URL}/guide" style="color: #667eea;">getting started guide</a> or join our <a href="https://discord.gg/fanova" style="color: #667eea;">Discord community</a>.
              </p>
            </div>
            <div class="footer">
              <p>
                © ${new Date().getFullYear()} Fanova. All rights reserved.<br>
                You're receiving this email because you signed up for Fanova.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Resend API error sending welcome email:', {
        name: error.name,
        message: error.message,
        statusCode: error.statusCode
      });
      return { success: false, error };
    }

    if (data && data.id) {
      console.log('✅ Welcome email sent successfully. Email ID:', data.id);
      return { success: true, data };
    } else {
      console.warn('⚠️ Welcome email sent but no ID returned:', data);
      return { success: true, data };
    }
  } catch (error) {
    console.error('❌ Exception sending welcome email:', {
      message: error.message,
      stack: error.stack
    });
    return { success: false, error: { message: error.message } };
  }
}

/**
 * Send congratulations email after first model generation
 * @param {string} userEmail - User's email address
 * @param {string} userName - User's name (optional)
 * @param {string} modelId - ID of the generated model
 * @param {string} modelName - Name of the generated model
 */
async function sendFirstModelEmail(userEmail, userName = '', modelId, modelName = 'Your Model') {
  // Validate API key before attempting to send
  if (!RESEND_API_KEY) {
    console.error('❌ Cannot send first model email: RESEND_API_KEY not configured');
    return { success: false, error: { message: 'Email service not configured' } };
  }

  // Validate email address
  if (!userEmail || typeof userEmail !== 'string' || !userEmail.includes('@')) {
    console.error('❌ Invalid email address:', userEmail);
    return { success: false, error: { message: 'Invalid email address' } };
  }

  try {
    const modelUrl = `${FRONTEND_URL}/model/${modelId}`;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [userEmail],
      subject: '🎉 Congratulations! Your First Model is Ready',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
              line-height: 1.6;
              color: #18181b;
              background-color: #fafafa;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background: white;
              border: 1px solid #e4e4e7;
              border-radius: 12px;
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 40px 32px;
              text-align: center;
            }
            .header h1 {
              color: white;
              margin: 0;
              font-size: 32px;
              font-weight: 600;
            }
            .header .emoji {
              font-size: 48px;
              margin-bottom: 16px;
            }
            .content {
              padding: 40px 32px;
            }
            .content h2 {
              color: #18181b;
              font-size: 20px;
              font-weight: 600;
              margin: 0 0 16px 0;
            }
            .content p {
              color: #71717a;
              margin: 0 0 16px 0;
              font-size: 15px;
            }
            .cta-button {
              display: inline-block;
              background: #667eea;
              color: white;
              text-decoration: none;
              padding: 14px 28px;
              border-radius: 8px;
              font-weight: 500;
              margin: 24px 0;
              font-size: 15px;
            }
            .highlight-box {
              background: #eff6ff;
              border-left: 4px solid #667eea;
              border-radius: 8px;
              padding: 20px 24px;
              margin: 24px 0;
            }
            .highlight-box p {
              color: #3f3f46;
              margin: 0;
              font-weight: 500;
            }
            .next-steps {
              background: #f4f4f5;
              border-radius: 8px;
              padding: 24px;
              margin: 24px 0;
            }
            .next-steps h3 {
              color: #18181b;
              font-size: 16px;
              font-weight: 600;
              margin: 0 0 16px 0;
            }
            .next-steps ul {
              margin: 0;
              padding: 0 0 0 20px;
              color: #52525b;
            }
            .next-steps li {
              margin-bottom: 8px;
            }
            .footer {
              padding: 24px 32px;
              background: #fafafa;
              border-top: 1px solid #e4e4e7;
              text-align: center;
            }
            .footer p {
              color: #a1a1aa;
              font-size: 13px;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="emoji">🎉</div>
              <h1>Your First Model is Ready!</h1>
            </div>
            <div class="content">
              <h2>Congratulations${userName ? `, ${userName}` : ''}!</h2>
              <p>
                You've successfully created your first AI model with Fanova. This is an exciting milestone!
              </p>

              <div class="highlight-box">
                <p>Model: ${modelName}</p>
              </div>

              <p>
                Your model is now ready to generate amazing images with consistent identity and style.
              </p>

              <center>
                <a href="${modelUrl}" class="cta-button">View Your Model</a>
              </center>

              <div class="next-steps">
                <h3>What's Next?</h3>
                <ul>
                  <li><strong>Generate more images:</strong> Create variations and explore different scenarios</li>
                  <li><strong>Use Chat mode:</strong> Describe what you want and let AI generate it</li>
                  <li><strong>Upgrade your plan:</strong> Unlock NSFW content and more credits</li>
                  <li><strong>Create more models:</strong> Build your AI model portfolio</li>
                </ul>
              </div>

              <p>
                Pro tip: The more you use your model, the better you'll understand how to get the best results!
              </p>

              <p style="margin-top: 32px; font-size: 14px;">
                Questions? Join our <a href="https://discord.gg/fanova" style="color: #667eea;">Discord community</a> or check out our <a href="${FRONTEND_URL}/guide" style="color: #667eea;">user guide</a>.
              </p>
            </div>
            <div class="footer">
              <p>
                © ${new Date().getFullYear()} Fanova. All rights reserved.<br>
                Keep creating amazing AI models!
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Error sending first model email:', error);
      return { success: false, error };
    }

    console.log('✅ First model email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Exception sending first model email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send subscription confirmation email
 * @param {string} userEmail - User's email address
 * @param {string} userName - User's name (optional)
 * @param {string} planName - Name of the subscribed plan
 * @param {number} credits - Monthly credits included
 */
async function sendSubscriptionConfirmationEmail(userEmail, userName = '', planName, credits) {
  // Validate API key before attempting to send
  if (!RESEND_API_KEY) {
    console.error('❌ Cannot send subscription email: RESEND_API_KEY not configured');
    return { success: false, error: { message: 'Email service not configured' } };
  }

  // Validate email address
  if (!userEmail || typeof userEmail !== 'string' || !userEmail.includes('@')) {
    console.error('❌ Invalid email address:', userEmail);
    return { success: false, error: { message: 'Invalid email address' } };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [userEmail],
      subject: `Welcome to Fanova ${planName} Plan!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
              line-height: 1.6;
              color: #18181b;
              background-color: #fafafa;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background: white;
              border: 1px solid #e4e4e7;
              border-radius: 12px;
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
              padding: 40px 32px;
              text-align: center;
            }
            .header h1 {
              color: white;
              margin: 0;
              font-size: 28px;
              font-weight: 600;
            }
            .content {
              padding: 40px 32px;
            }
            .content h2 {
              color: #18181b;
              font-size: 20px;
              font-weight: 600;
              margin: 0 0 16px 0;
            }
            .content p {
              color: #71717a;
              margin: 0 0 16px 0;
              font-size: 15px;
            }
            .plan-details {
              background: #f0fdf4;
              border-left: 4px solid #22c55e;
              border-radius: 8px;
              padding: 20px 24px;
              margin: 24px 0;
            }
            .plan-details p {
              color: #166534;
              margin: 8px 0;
              font-weight: 500;
            }
            .cta-button {
              display: inline-block;
              background: #22c55e;
              color: white;
              text-decoration: none;
              padding: 14px 28px;
              border-radius: 8px;
              font-weight: 500;
              margin: 24px 0;
              font-size: 15px;
            }
            .footer {
              padding: 24px 32px;
              background: #fafafa;
              border-top: 1px solid #e4e4e7;
              text-align: center;
            }
            .footer p {
              color: #a1a1aa;
              font-size: 13px;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Subscription Confirmed! ✨</h1>
            </div>
            <div class="content">
              <h2>Thank you${userName ? `, ${userName}` : ''}!</h2>
              <p>
                Your subscription to the <strong>${planName}</strong> plan has been confirmed. You now have access to premium features!
              </p>

              <div class="plan-details">
                <p>Plan: ${planName}</p>
                <p>Monthly Credits: ${credits}</p>
              </div>

              <p>
                Your credits have been added to your account and you can start creating amazing content right away.
              </p>

              <center>
                <a href="${FRONTEND_URL}/dashboard" class="cta-button">Go to Dashboard</a>
              </center>

              <p style="margin-top: 32px; font-size: 14px;">
                Need help? Contact us or join our <a href="https://discord.gg/fanova" style="color: #22c55e;">Discord community</a>.
              </p>
            </div>
            <div class="footer">
              <p>
                © ${new Date().getFullYear()} Fanova. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Error sending subscription confirmation email:', error);
      return { success: false, error };
    }

    console.log('✅ Subscription confirmation email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Exception sending subscription confirmation email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send account deletion apology email
 * For users whose accounts were deleted due to incorrect billing signup
 * @param {string} userEmail - User's email address
 * @param {string} userName - User's name (optional)
 */
async function sendAccountDeletionApologyEmail(userEmail, userName = '') {
  // Validate API key before attempting to send
  if (!RESEND_API_KEY) {
    console.error('❌ Cannot send account deletion email: RESEND_API_KEY not configured');
    return { success: false, error: { message: 'Email service not configured' } };
  }

  // Validate email address
  if (!userEmail || typeof userEmail !== 'string' || !userEmail.includes('@')) {
    console.error('❌ Invalid email address:', userEmail);
    return { success: false, error: { message: 'Invalid email address' } };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [userEmail],
      subject: 'Important: Account Update Required - Fanova',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
              line-height: 1.6;
              color: #18181b;
              background-color: #fafafa;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background: white;
              border: 1px solid #e4e4e7;
              border-radius: 12px;
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
              padding: 40px 32px;
              text-align: center;
            }
            .header h1 {
              color: white;
              margin: 0;
              font-size: 28px;
              font-weight: 600;
            }
            .content {
              padding: 40px 32px;
            }
            .content h2 {
              color: #18181b;
              font-size: 20px;
              font-weight: 600;
              margin: 0 0 16px 0;
            }
            .content p {
              color: #71717a;
              margin: 0 0 16px 0;
              font-size: 15px;
            }
            .important-box {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              border-radius: 8px;
              padding: 20px 24px;
              margin: 24px 0;
            }
            .important-box p {
              color: #78350f;
              margin: 8px 0;
              font-weight: 500;
            }
            .important-box p:first-child {
              margin-top: 0;
            }
            .important-box p:last-child {
              margin-bottom: 0;
            }
            .assurance-box {
              background: #dcfce7;
              border-left: 4px solid #22c55e;
              border-radius: 8px;
              padding: 20px 24px;
              margin: 24px 0;
            }
            .assurance-box p {
              color: #166534;
              margin: 8px 0;
              font-weight: 500;
            }
            .assurance-box p:first-child {
              margin-top: 0;
            }
            .assurance-box p:last-child {
              margin-bottom: 0;
            }
            .cta-button {
              display: inline-block;
              background: #667eea;
              color: white;
              text-decoration: none;
              padding: 14px 28px;
              border-radius: 8px;
              font-weight: 500;
              margin: 24px 0;
              font-size: 15px;
            }
            .footer {
              padding: 24px 32px;
              background: #fafafa;
              border-top: 1px solid #e4e4e7;
              text-align: center;
            }
            .footer p {
              color: #a1a1aa;
              font-size: 13px;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Important Account Notice</h1>
            </div>
            <div class="content">
              <h2>Dear${userName ? ` ${userName}` : ' valued customer'},</h2>
              <p>
                We sincerely apologize for any inconvenience this may cause. We are writing to inform you about an issue with your recent account registration.
              </p>

              <div class="important-box">
                <p><strong>What happened:</strong></p>
                <p>
                  Your account was created with incorrect billing information during the signup process. As a result, we have had to delete your account to maintain the integrity of our billing system.
                </p>
              </div>

              <div class="assurance-box">
                <p><strong>Important - Please read:</strong></p>
                <p>✓ You have NOT been charged</p>
                <p>✓ No payment details have been stored</p>
                <p>✓ Your data has been securely removed from our systems</p>
              </div>

              <p>
                <strong>What you need to do:</strong>
              </p>
              <p>
                To continue using Fanova, please create a new account with the correct information. We've made improvements to our signup process to ensure this doesn't happen again.
              </p>

              <center>
                <a href="${FRONTEND_URL}/register" class="cta-button">Create New Account</a>
              </center>

              <p>
                We understand this is frustrating, and we genuinely apologize for the disruption. Our team is working to prevent similar issues in the future.
              </p>

              <p style="margin-top: 32px; font-size: 14px;">
                If you have any questions or concerns, please don't hesitate to contact our support team. We're here to help make this right.
              </p>

              <p style="margin-top: 24px; font-size: 14px; color: #a1a1aa;">
                Thank you for your understanding and patience.
              </p>
            </div>
            <div class="footer">
              <p>
                © ${new Date().getFullYear()} Fanova. All rights reserved.<br>
                <a href="${FRONTEND_URL}" style="color: #667eea; text-decoration: none;">Visit Fanova</a> |
                <a href="mailto:support@usefanova.com" style="color: #667eea; text-decoration: none;">Contact Support</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Error sending account deletion apology email:', error);
      return { success: false, error };
    }

    console.log('✅ Account deletion apology email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Exception sending account deletion apology email:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendWelcomeEmail,
  sendFirstModelEmail,
  sendSubscriptionConfirmationEmail,
  sendAccountDeletionApologyEmail
};
