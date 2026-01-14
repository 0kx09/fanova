# Account Deletion Apology Email

This documentation explains how to send apology emails to customers whose accounts were deleted due to incorrect billing information during signup.

## What This Email Does

The email:
- Apologizes for the inconvenience
- Explains that their account was deleted due to incorrect billing information
- **Reassures them they were NOT charged**
- **Reassures them that NO payment details were stored**
- **Confirms their data has been securely removed**
- Provides a clear call-to-action to create a new account
- Includes support contact information

## Email Preview

**Subject:** Important: Account Update Required - Fanova

**Key Sections:**
1. **Personalized greeting** (with user name if available)
2. **What happened** - Clear explanation in a highlighted box
3. **Important reassurances** - Green highlighted box with checkmarks:
   - ✓ You have NOT been charged
   - ✓ No payment details have been stored
   - ✓ Your data has been securely removed
4. **What to do next** - Instructions with "Create New Account" button
5. **Apology and support** - Contact information

## How to Send the Emails

### Method 1: Using the Script (Recommended)

1. **Add user emails to the script:**
   ```bash
   # Edit the file
   code server/scripts/send-apology-emails.js
   ```

2. **Update the AFFECTED_USERS array:**
   ```javascript
   const AFFECTED_USERS = [
     { email: 'user1@example.com', name: 'John Doe' },
     { email: 'user2@example.com', name: 'Jane Smith' },
     { email: 'user3@example.com' }, // Name is optional
   ];
   ```

3. **Make sure your .env file has RESEND_API_KEY configured:**
   ```env
   RESEND_API_KEY=re_your_api_key_here
   ```

4. **Run the script:**
   ```bash
   cd server
   node scripts/send-apology-emails.js
   ```

5. **Review the output:**
   - The script will show progress for each email
   - At the end, it displays a summary of successes and failures
   - Failed emails will show the error message for troubleshooting

### Method 2: Using the Function Directly

You can also use the function in your own Node.js code:

```javascript
const { sendAccountDeletionApologyEmail } = require('./server/services/emailService');

// Send to a single user
await sendAccountDeletionApologyEmail('user@example.com', 'John Doe');

// Send without a name (optional)
await sendAccountDeletionApologyEmail('user@example.com');
```

## Testing

Before sending to real users, test the email:

1. **Send to yourself first:**
   ```javascript
   const AFFECTED_USERS = [
     { email: 'your-email@example.com', name: 'Test User' }
   ];
   ```

2. **Check the email:**
   - Verify formatting looks correct
   - Test all links work
   - Ensure reassurances are clear and prominent
   - Confirm the tone is appropriately apologetic

## Script Features

- **Progress tracking**: Shows real-time progress as emails are sent
- **Rate limiting**: Adds 1-second delay between emails to avoid hitting rate limits
- **Error handling**: Catches and reports errors for each email
- **Summary report**: Shows final count of successes and failures
- **Detailed logging**: Lists all successful sends and failures with error messages

## Important Notes

1. **Double-check the email list** - Make sure you're sending to the correct users
2. **Test first** - Always send a test email to yourself before the production batch
3. **RESEND_API_KEY** - Ensure your API key is valid and has sufficient quota
4. **Rate limits** - The script includes delays, but be aware of your email provider's limits
5. **Logs** - Keep the console output for your records

## Troubleshooting

### "RESEND_API_KEY not configured"
- Make sure your `.env` file has `RESEND_API_KEY=re_your_key`
- Restart the script after adding the key

### "Invalid email address"
- Check that all emails in AFFECTED_USERS are properly formatted
- Email must be a string and include '@'

### Emails not arriving
- Check your Resend dashboard for delivery status
- Verify the domain is properly configured in Resend
- Check recipient spam folders

## Support

If you encounter issues:
1. Check the error messages in the script output
2. Verify your Resend API key is valid
3. Check Resend dashboard for delivery logs
4. Contact Resend support if email delivery fails

## File Locations

- **Email template**: `server/services/emailService.js` (function: `sendAccountDeletionApologyEmail`)
- **Send script**: `server/scripts/send-apology-emails.js`
- **This README**: `server/scripts/APOLOGY_EMAIL_README.md`
