# Quick Deployment Guide

## Prerequisites Checklist

- [ ] Digital Ocean Ubuntu 22.04 droplet created
- [ ] Domain name pointed to your server IP
- [ ] SSH access to server
- [ ] All API keys ready (Supabase, Stripe, Image Generation)

## Quick Start (5 Steps)

### 1. Connect to Server

```bash
ssh root@your_server_ip
```

### 2. Run Deployment Script

```bash
# Download and run deployment script
wget https://raw.githubusercontent.com/yourusername/fanova/main/deploy.sh
chmod +x deploy.sh
./deploy.sh yourdomain.com
```

OR manually follow `DEPLOYMENT.md`

### 3. Set Environment Variables

**Backend (.env):**
```bash
cd /var/www/fanova/server
nano .env
# Paste your backend environment variables (see server/.env.example)
```

**Frontend (.env.production):**
```bash
cd /var/www/fanova
nano .env.production
# Paste your frontend environment variables (see .env.example)
```

### 4. Rebuild and Restart

```bash
cd /var/www/fanova
npm run build
pm2 restart fanova-backend
systemctl reload nginx
```

### 5. Update External Services

- **Stripe Webhook**: Update URL to `https://yourdomain.com/api/stripe/webhook`
- **Supabase**: Add your domain to allowed origins if needed

## Verify Deployment

```bash
# Check backend
pm2 status
pm2 logs fanova-backend

# Check frontend
curl https://yourdomain.com

# Check API
curl https://yourdomain.com/api/health
```

## Common Issues

**Backend not starting?**
```bash
cd /var/www/fanova/server
node server.js  # Test manually
pm2 logs fanova-backend  # Check logs
```

**Frontend not loading?**
```bash
systemctl status nginx
tail -f /var/log/nginx/error.log
ls -la /var/www/fanova/build  # Check if build exists
```

**SSL not working?**
```bash
certbot certificates
certbot renew --dry-run
```
