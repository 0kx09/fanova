# Referral System Setup Guide

## Overview
The referral system allows users to share their unique referral link. When someone signs up using that link, both the referrer and the new user receive 20 credits each.

## Database Setup

1. **Run the referral schema SQL:**
   ```bash
   # Connect to your Supabase database and run:
   psql -h [your-db-host] -U postgres -d postgres -f server/referral-schema.sql
   ```
   
   Or execute the SQL file in your Supabase SQL Editor.

2. **What it does:**
   - Adds `referral_code` column to `profiles` table (unique 8-character code)
   - Adds `referred_by` column to track who referred each user
   - Creates `referrals` table to track referral history
   - Updates `handle_new_user` trigger to generate referral codes
   - Generates referral codes for existing users

## Features

### For Users:
- **Unique Referral Link**: Each user gets a unique 8-character referral code
- **Referral URL Format**: `https://yourdomain.com/register?ref=ABC12345`
- **Automatic Credit Award**: Both users get 20 credits when referral is used
- **Referral Stats**: View total referrals and credits earned

### How It Works:

1. **User Registration with Referral Code:**
   - User visits `/register?ref=ABC12345`
   - Referral code is auto-filled in the registration form
   - After signup, the system processes the referral
   - Both users receive 20 credits

2. **Getting Your Referral Link:**
   - Go to Settings → Referrals tab
   - Copy your unique referral link
   - Share with friends

3. **Referral Processing:**
   - Happens automatically after user signup
   - Credits are awarded immediately
   - Referral is recorded in the database

## API Endpoints

### `GET /api/referrals/my-link`
Get current user's referral link and stats
- **Auth**: Required (Bearer token)
- **Returns**: `{ referralCode, referralLink, referralCount }`

### `GET /api/referrals/stats`
Get referral statistics for current user
- **Auth**: Required (Bearer token)
- **Returns**: `{ totalReferrals, totalCreditsEarned, referrals[] }`

### `POST /api/referrals/process`
Process a referral after signup
- **Body**: `{ userId, referralCode }`
- **Returns**: `{ success, message, creditsAwarded }`

## Frontend Features

### Registration Page
- Detects `?ref=` parameter in URL
- Auto-fills referral code field
- Shows message: "You'll receive 20 credits when you sign up with this code!"
- Processes referral after successful signup

### Settings Page - Referrals Tab
- Displays user's referral link
- Copy to clipboard button
- Shows referral code
- Displays stats:
  - Total referrals
  - Total credits earned
- Instructions on how it works

## Database Tables

### `profiles` (updated)
- `referral_code` (TEXT, UNIQUE): User's unique referral code
- `referred_by` (UUID): ID of user who referred them

### `referrals` (new)
- `id` (UUID): Primary key
- `referrer_id` (UUID): User who made the referral
- `referred_id` (UUID): User who was referred (unique)
- `referral_code` (TEXT): Code used
- `credits_awarded_referrer` (INTEGER): Credits given to referrer
- `credits_awarded_referred` (INTEGER): Credits given to referred user
- `created_at` (TIMESTAMP): When referral was processed

## Security

- Users cannot use their own referral code
- Each user can only be referred once (enforced by unique constraint)
- Referral codes are case-insensitive (automatically uppercased)
- All referral processing is logged in `credit_transactions` table

## Testing

1. **Test Referral Link Generation:**
   - Sign in as a user
   - Go to Settings → Referrals
   - Verify referral link is displayed

2. **Test Referral Signup:**
   - Copy a referral link
   - Open in incognito/private window
   - Register new account
   - Verify both users received 20 credits

3. **Test Invalid Referral:**
   - Try registering with invalid code
   - Should fail gracefully without blocking registration

## Troubleshooting

### Referral code not generating:
- Check if `generate_referral_code()` function exists in database
- Verify trigger `on_auth_user_created` is active

### Credits not awarded:
- Check `credit_transactions` table for referral entries
- Verify `referrals` table has the record
- Check server logs for errors

### Referral link not working:
- Verify `FRONTEND_URL` environment variable is set correctly
- Check that referral code exists in user's profile
