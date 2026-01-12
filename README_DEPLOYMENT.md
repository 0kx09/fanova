# Fanova Deployment to Digital Ocean

## 📋 Overview

This guide will help you deploy your Fanova application to a Digital Ocean Ubuntu server.

## 🚀 Quick Start

1. **Read the full guide**: See `DEPLOYMENT.md` for detailed instructions
2. **Quick reference**: See `QUICK_DEPLOY.md` for a condensed version
3. **Automated script**: Use `deploy.sh` for automated deployment

## 📁 Files Created

- `DEPLOYMENT.md` - Complete step-by-step deployment guide
- `QUICK_DEPLOY.md` - Quick reference guide
- `deploy.sh` - Automated deployment script
- `update.sh` - Script to update production after code changes
- `ecosystem.config.js` - PM2 configuration for process management
- `.env.example` - Frontend environment variables template
- `server/.env.example` - Backend environment variables template

## 🔑 Key Steps

1. **Server Setup**: Install Node.js, PM2, Nginx
2. **Code Deployment**: Clone repository, install dependencies
3. **Configuration**: Set environment variables
4. **Process Management**: Use PM2 to run backend
5. **Web Server**: Configure Nginx as reverse proxy
6. **SSL**: Set up Let's Encrypt certificate
7. **Firewall**: Configure UFW

## 📝 Environment Variables Needed

### Backend (`server/.env`)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `FRONTEND_URL`
- Image generation API key (FAL_AI_KEY, REPLICATE_API_TOKEN, or GOOGLE_API_KEY)
- `WAVESPEED_API_KEY` (for NSFW)

### Frontend (`.env.production`)
- `REACT_APP_API_URL`
- `REACT_APP_STRIPE_PUBLISHABLE_KEY`
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`

## 🔄 After Deployment

### Update Code
```bash
cd /var/www/fanova
./update.sh
```

### Check Status
```bash
pm2 status
pm2 logs fanova-backend
```

### Restart Services
```bash
pm2 restart fanova-backend
systemctl reload nginx
```

## ⚠️ Important Notes

1. **Stripe Webhook**: Update webhook URL to `https://yourdomain.com/api/stripe/webhook`
2. **Supabase**: Add your domain to allowed origins if needed
3. **SSL**: Required for Stripe webhooks to work
4. **Environment Files**: Never commit `.env` files to Git

## 🆘 Troubleshooting

See `DEPLOYMENT.md` for detailed troubleshooting steps.

## 📞 Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs fanova-backend`
2. Check Nginx logs: `tail -f /var/log/nginx/error.log`
3. Test backend directly: `curl http://localhost:5000/health`
4. Verify environment variables are set correctly
