# Email Setup Guide (Resend)

## Overview
The application now uses [Resend](https://resend.com) for sending transactional emails including:
- Welcome emails when users register
- Congratulations emails when users generate their first model
- Subscription confirmation emails when users subscribe to a plan

## Configuration

### 1. Environment Variables
The Resend API key has been added to `server/.env`:
```
RESEND_API_KEY=re_VyBqKpbc_4F2YuqQzyW6AdCqHQFCEFuaw
```

### 2. Domain Verification
**IMPORTANT:** You need to verify your sending domain in Resend before emails will work.

1. Log into [Resend Dashboard](https://resend.com/domains)
2. Add and verify the domain: `usefanova.com`
3. Follow their DNS configuration steps (add SPF, DKIM, and DMARC records)
4. Once verified, emails will be sent from: `Fanova <noreply@usefanova.com>`

**Note:** Until the domain is verified, Resend will only allow sending to the email address associated with your Resend account (for testing).

### 3. Update Sender Email (if needed)
If you want to use a different sender email, update the `FROM_EMAIL` constant in `server/services/emailService.js`:
```javascript
const FROM_EMAIL = 'Fanova <noreply@yourdomain.com>';
```

## Email Templates

### 1. Welcome Email
**Trigger:** When a new user registers and their profile is created
**File:** `server/routes/auth.js` (line 86-89)
**Content:**
- Beautiful purple gradient header
- Welcome message with getting started information
- Feature list (what users can do with Fanova)
- Call-to-action button to "Get Started"
- Links to Discord community

### 2. First Model Email
**Trigger:** When a user generates images for their first model
**File:** `server/routes/models.js` (line 474-503)
**Content:**
- Celebration emoji and congratulations message
- Model name highlight
- "View Your Model" call-to-action button
- "What's Next?" section with suggestions
- Links to Discord and user guide

### 3. Subscription Confirmation Email
**Trigger:** After successful Stripe subscription payment
**File:** `server/routes/stripe.js` (line 469-480)
**Content:**
- Green gradient header (success theme)
- Subscription confirmation with plan name
- Monthly credits amount
- "Go to Dashboard" call-to-action button
- Support and community links

## Email Design
All emails follow a modern, minimalist design inspired by Linear/Vercel:
- Clean white cards with subtle borders
- Gradient headers (purple for general, green for success)
- Professional typography (system fonts)
- Mobile-responsive layout
- Subtle shadows and rounded corners

## Testing Emails

### Local Testing
1. Start the server: `cd server && npm start`
2. Trigger the flows:
   - **Welcome:** Register a new account
   - **First Model:** Generate images for your first model
   - **Subscription:** Complete a Stripe checkout

### Production Testing
Before going live, test with a verified domain:
1. Verify your domain in Resend
2. Register a test account with your own email
3. Verify all emails are received correctly
4. Check that links work properly
5. Test on mobile devices and different email clients

## Error Handling
All email sending is **non-blocking** - if an email fails to send, it won't affect the user's flow:
- Welcome email failure → User can still access the app
- First model email failure → User can still generate more images
- Subscription email failure → User still gets their credits

Errors are logged to the console with `⚠️` prefix for monitoring.

## Monitoring
Check server logs for email status:
- `✅ Welcome email sent successfully`
- `✅ First model email sent successfully`
- `✅ Subscription confirmation email sent successfully`
- `⚠️ Failed to send [email type] (non-blocking)`

## Cost
Resend pricing (as of 2024):
- Free tier: 100 emails/day, 3,000 emails/month
- Pro tier: $20/month for 50,000 emails
- See [Resend Pricing](https://resend.com/pricing) for latest details

## Support
For issues with Resend:
- [Resend Documentation](https://resend.com/docs)
- [Resend Support](https://resend.com/support)
- Check API status: [Resend Status](https://resend.statuspage.io)
