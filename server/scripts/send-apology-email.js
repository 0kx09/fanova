require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const supabase = require('../config/supabase');
const { Resend } = require('resend');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = 'Fanova <noreply@usefanova.com>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://usefanova.com';

if (!RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY not found in environment variables.');
  process.exit(1);
}

const resend = new Resend(RESEND_API_KEY);

/**
 * Send apology email to all customers
 */
async function sendApologyEmailToAll() {
  try {
    console.log('📧 Starting bulk email send...\n');

    // Get all users with email addresses
    console.log('📊 Fetching all users from database...');
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email')
      .not('email', 'is', null);

    if (error) {
      throw error;
    }

    if (!profiles || profiles.length === 0) {
      console.log('⚠️  No users found in database.');
      return;
    }

    console.log(`✅ Found ${profiles.length} users with email addresses.\n`);

    // Filter out invalid emails
    const validProfiles = profiles.filter(p => p.email && p.email.includes('@'));
    console.log(`📧 Sending emails to ${validProfiles.length} valid email addresses...\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Send emails in batches to avoid rate limits
    const BATCH_SIZE = 10;
    const DELAY_BETWEEN_BATCHES = 1000; // 1 second

    for (let i = 0; i < validProfiles.length; i += BATCH_SIZE) {
      const batch = validProfiles.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(validProfiles.length / BATCH_SIZE);

      console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} emails)...`);

      // Send emails in parallel for this batch
      const batchPromises = batch.map(async (profile) => {
        try {
          const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [profile.email],
            subject: 'We\'re Back! - Fanova Update',
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
                  .cta-button:hover {
                    background: #5568d3;
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
                    <h1>We're Back! 🎉</h1>
                  </div>
                  <div class="content">
                    <h2>Thank You for Your Patience</h2>
                    <p>
                      We sincerely apologize for the recent delays and any inconvenience this may have caused. 
                      We understand how frustrating it can be when services are unavailable.
                    </p>
                    <p>
                      <strong>Great news:</strong> We've completed all the necessary work and Fanova is now fully operational again!
                    </p>
                    <p>
                      You can now access all features and continue creating amazing AI models. We're committed to providing 
                      you with the best experience possible.
                    </p>
                    <p style="text-align: center;">
                      <a href="${FRONTEND_URL}" class="cta-button">Get Started</a>
                    </p>
                    <p>
                      If you have any questions or concerns, please don't hesitate to reach out to our support team. 
                      We're here to help!
                    </p>
                    <p>
                      Thank you for being a valued member of the Fanova community.
                    </p>
                    <p>
                      Best regards,<br>
                      <strong>The Fanova Team</strong>
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
            throw error;
          }

          return { success: true, email: profile.email, data };
        } catch (err) {
          return { success: false, email: profile.email, error: err.message || err };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      // Count results
      batchResults.forEach((result) => {
        if (result.success) {
          successCount++;
          console.log(`  ✅ Sent to: ${result.email}`);
        } else {
          errorCount++;
          errors.push({ email: result.email, error: result.error });
          console.log(`  ❌ Failed: ${result.email} - ${result.error}`);
        }
      });

      // Wait before next batch (except for the last one)
      if (i + BATCH_SIZE < validProfiles.length) {
        console.log(`⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...\n`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 EMAIL SEND SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully sent: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`📧 Total processed: ${validProfiles.length}`);

    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(({ email, error }) => {
        console.log(`  - ${email}: ${error}`);
      });
    }

    console.log('\n✅ Bulk email send completed!');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
sendApologyEmailToAll()
  .then(() => {
    console.log('\n✨ Script finished.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
