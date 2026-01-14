/**
 * Script to send account deletion apology emails to affected users
 * Usage: node server/scripts/send-apology-emails.js
 *
 * This script sends apology emails to users whose accounts were deleted
 * due to incorrect billing information during signup.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { sendAccountDeletionApologyEmail } = require('../services/emailService');

// List of affected users - update this array with actual user emails
const AFFECTED_USERS = [
  // Add user emails here, for example:
   { email: 'skubiadam2@gmail.com', name: 'skubiadam2' },
   { email: 'raucescuandrew3@gmail.com', name: 'raucescuandrew3' },
  // { email: 'user3@example.com' }, // Name is optional
];

/**
 * Send apology emails to all affected users
 */
async function sendApologyEmails() {
  console.log('═══════════════════════════════════════════════');
  console.log('  📧 SENDING ACCOUNT DELETION APOLOGY EMAILS');
  console.log('═══════════════════════════════════════════════\n');

  if (AFFECTED_USERS.length === 0) {
    console.log('⚠️  No affected users configured.');
    console.log('Please add user emails to the AFFECTED_USERS array in this script.\n');
    console.log('Example:');
    console.log('const AFFECTED_USERS = [');
    console.log('  { email: "user@example.com", name: "John Doe" },');
    console.log('  { email: "user2@example.com" }');
    console.log('];\n');
    return;
  }

  console.log(`📋 Total users to email: ${AFFECTED_USERS.length}\n`);

  const results = {
    success: [],
    failed: []
  };

  // Send emails one by one
  for (let i = 0; i < AFFECTED_USERS.length; i++) {
    const user = AFFECTED_USERS[i];
    const userEmail = user.email;
    const userName = user.name || '';

    console.log(`[${i + 1}/${AFFECTED_USERS.length}] Sending email to: ${userEmail}${userName ? ` (${userName})` : ''}`);

    try {
      const result = await sendAccountDeletionApologyEmail(userEmail, userName);

      if (result.success) {
        console.log(`   ✅ Email sent successfully`);
        results.success.push(userEmail);
      } else {
        console.log(`   ❌ Failed to send email: ${result.error?.message || 'Unknown error'}`);
        results.failed.push({ email: userEmail, error: result.error?.message });
      }
    } catch (error) {
      console.log(`   ❌ Exception: ${error.message}`);
      results.failed.push({ email: userEmail, error: error.message });
    }

    // Add a small delay between emails to avoid rate limiting
    if (i < AFFECTED_USERS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }

    console.log('');
  }

  // Summary
  console.log('═══════════════════════════════════════════════');
  console.log('  📊 SUMMARY');
  console.log('═══════════════════════════════════════════════\n');

  console.log(`✅ Successfully sent: ${results.success.length}`);
  console.log(`❌ Failed: ${results.failed.length}\n`);

  if (results.success.length > 0) {
    console.log('Successfully sent to:');
    results.success.forEach(email => console.log(`  • ${email}`));
    console.log('');
  }

  if (results.failed.length > 0) {
    console.log('Failed to send to:');
    results.failed.forEach(({ email, error }) => {
      console.log(`  • ${email}`);
      console.log(`    Error: ${error}`);
    });
    console.log('');
  }

  console.log('═══════════════════════════════════════════════');
  console.log('  ✨ DONE');
  console.log('═══════════════════════════════════════════════\n');
}

// Run the script
sendApologyEmails()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
