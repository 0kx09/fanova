# Pre-Launch Security Checklist

## ✅ Security Audit Complete

All security issues have been addressed:

### Fixed Issues:
1. ✅ **Test Routes Secured** - `/api/test-email/*` now returns 404 in production
2. ✅ **API Keys Removed** - All hardcoded keys moved to environment variables
3. ✅ **Error Stack Traces** - Only shown in development mode
4. ✅ **Localhost References** - Updated to use environment variables
5. ✅ **Email Service** - Enhanced validation and security

## 🚀 Pre-Launch Actions

### 1. Environment Variables (CRITICAL)
Set these in your production server `.env`:

```env
# Required
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://usefanova.com

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe (USE LIVE KEYS)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...  # Optional

# Email
RESEND_API_KEY=re_...

# Image Generation (choose one)
GOOGLE_API_KEY=...
# OR
FAL_AI_KEY=...
# OR
REPLICATE_API_TOKEN=...

# Optional
WAVESPEED_API_KEY=...  # For NSFW features
OPENAI_API_KEY=...    # For prompt enhancement
```

### 2. Revoke Old API Keys
If any keys were previously committed:
- [ ] Resend: https://resend.com/api-keys
- [ ] Stripe: https://dashboard.stripe.com/apikeys
- [ ] Wavespeed: Check their dashboard
- [ ] OpenAI: https://platform.openai.com/api-keys
- [ ] Google: https://console.cloud.google.com/apis/credentials

### 3. Domain Verification
- [ ] Resend domain verified: https://resend.com/domains
- [ ] SSL certificate active
- [ ] DNS records correct

### 4. Stripe Configuration
- [ ] Switch to **LIVE** mode (not test)
- [ ] Update `STRIPE_SECRET_KEY` to live key
- [ ] Configure webhook endpoint (optional)
- [ ] Test with real payment (small amount)

### 5. Database
- [ ] Run migration: `fix-user-trigger-and-defaults.sql`
- [ ] Verify user defaults are correct (0 credits, null plan)
- [ ] Test user registration flow

### 6. Testing
- [ ] Test user registration → verify welcome email
- [ ] Test payment flow → verify subscription email
- [ ] Test first model generation → verify congratulations email
- [ ] Verify test routes return 404: `/api/test-email/*`
- [ ] Check admin panel access
- [ ] Test NSFW features (if enabled)

### 7. Monitoring
- [ ] Set up error logging/monitoring
- [ ] Monitor server logs for errors
- [ ] Check email delivery rates
- [ ] Monitor API usage/limits

## 🔒 Security Verification

Run these checks:

```bash
# 1. Verify no API keys in code
grep -r "sk_live\|re_[A-Za-z0-9]\{20,\}\|pk_live" --exclude-dir=node_modules .

# 2. Verify test routes are disabled
curl https://usefanova.com/api/test-email/config
# Should return 404 in production

# 3. Check environment variables are set
# On server, verify all required env vars exist
```

## 📋 Final Checks

- [ ] All environment variables set
- [ ] All old API keys revoked
- [ ] Domain verified in Resend
- [ ] Stripe in live mode
- [ ] Database migrations applied
- [ ] Test routes return 404
- [ ] Error messages don't leak info
- [ ] SSL certificate active
- [ ] Monitoring/logging configured
- [ ] Backup strategy in place

## ✅ Ready to Launch

Once all items are checked, your site is ready for production!
