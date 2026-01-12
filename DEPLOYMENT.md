# Fanova Deployment Guide - Digital Ocean Ubuntu Server

This guide will help you deploy the Fanova application to a Digital Ocean Ubuntu server.

## Prerequisites

- Digital Ocean Ubuntu 22.04 LTS droplet
- Domain name (optional but recommended)
- Supabase project (already set up)
- Stripe account (already set up)

## Step 1: Initial Server Setup

### 1.1 Connect to Your Server

```bash
ssh root@your_server_ip
```

### 1.2 Update System

```bash
apt update && apt upgrade -y
```

### 1.3 Install Node.js and npm

```bash
# Install Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verify installation
node --version
npm --version
```

### 1.4 Install PM2 (Process Manager)

```bash
npm install -g pm2
```

### 1.5 Install Nginx

```bash
apt install -y nginx
systemctl enable nginx
systemctl start nginx
```

### 1.6 Install Git

```bash
apt install -y git
```

## Step 2: Clone Your Repository

```bash
# Create app directory
mkdir -p /var/www
cd /var/www

# Clone your repository (replace with your repo URL)
git clone https://github.com/yourusername/fanova.git
# OR if using SSH:
# git clone git@github.com:yourusername/fanova.git

cd fanova
```

## Step 3: Backend Setup

### 3.1 Install Backend Dependencies

```bash
cd server
npm install --production
```

### 3.2 Create Backend Environment File

```bash
nano .env
```

Add the following (replace with your actual values):

```env
# Server
PORT=5000
NODE_ENV=production

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Frontend URL (your domain)
FRONTEND_URL=https://yourdomain.com

# Image Generation API (choose one)
FAL_AI_KEY=your_fal_ai_key
# OR
REPLICATE_API_TOKEN=your_replicate_token
# OR
GOOGLE_API_KEY=your_google_api_key

# Wavespeed (for NSFW)
WAVESPEED_API_KEY=your_wavespeed_api_key
WAVESPEED_API_URL=https://api.wavespeed.ai/v1
```

Save and exit (Ctrl+X, then Y, then Enter)

### 3.3 Test Backend

```bash
npm start
```

If it works, stop it (Ctrl+C) and continue.

## Step 4: Frontend Setup

### 4.1 Install Frontend Dependencies

```bash
cd /var/www/fanova
npm install
```

### 4.2 Create Frontend Environment File

```bash
nano .env.production
```

Add the following:

```env
REACT_APP_API_URL=https://yourdomain.com/api
REACT_APP_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4.3 Build Frontend

```bash
npm run build
```

This creates a `build` folder with production-ready files.

## Step 5: Configure PM2

### 5.1 Create PM2 Ecosystem File

```bash
cd /var/www/fanova
nano ecosystem.config.js
```

Add the following:

```javascript
module.exports = {
  apps: [
    {
      name: 'fanova-backend',
      cwd: '/var/www/fanova/server',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: '/var/log/fanova/backend-error.log',
      out_file: '/var/log/fanova/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '500M'
    }
  ]
};
```

### 5.2 Create Log Directory

```bash
mkdir -p /var/log/fanova
```

### 5.3 Start Backend with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Follow the instructions PM2 provides to enable startup on boot.

## Step 6: Configure Nginx

### 6.1 Create Nginx Configuration

```bash
nano /etc/nginx/sites-available/fanova
```

Add the following (replace `yourdomain.com` with your actual domain):

```nginx
# Backend API
upstream backend {
    server localhost:5000;
}

# Frontend and API Server
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend static files
    location / {
        root /var/www/fanova/build;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "public, max-age=3600";
    }

    # Backend API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Stripe webhook (needs raw body)
    location /api/stripe/webhook {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Important: Don't buffer the request body for webhooks
        proxy_request_buffering off;
        proxy_buffering off;
        
        # Increase timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check
    location /health {
        proxy_pass http://backend;
        access_log off;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
}
```

### 6.2 Enable Site

```bash
ln -s /etc/nginx/sites-available/fanova /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default  # Remove default site
nginx -t  # Test configuration
systemctl reload nginx
```

## Step 7: SSL Certificate (Let's Encrypt)

### 7.1 Install Certbot

```bash
apt install -y certbot python3-certbot-nginx
```

### 7.2 Get SSL Certificate

```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts. Certbot will automatically configure Nginx.

### 7.3 Auto-renewal

Certbot sets up auto-renewal automatically. Test it:

```bash
certbot renew --dry-run
```

## Step 8: Firewall Configuration

```bash
# Allow SSH, HTTP, and HTTPS
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

## Step 9: Update Stripe Webhook URL

1. Go to Stripe Dashboard → Developers → Webhooks
2. Update your webhook endpoint URL to: `https://yourdomain.com/api/stripe/webhook`
3. Make sure to use the webhook secret in your `.env` file

## Step 10: Update Supabase Settings

1. Go to Supabase Dashboard → Settings → API
2. Add your domain to allowed origins if needed
3. Update any CORS settings if necessary

## Step 11: Verify Deployment

1. Visit `https://yourdomain.com` - should see your app
2. Test API: `https://yourdomain.com/api/health` - should return status
3. Check PM2: `pm2 status` - backend should be running
4. Check logs: `pm2 logs fanova-backend`

## Maintenance Commands

```bash
# View backend logs
pm2 logs fanova-backend

# Restart backend
pm2 restart fanova-backend

# Stop backend
pm2 stop fanova-backend

# View PM2 status
pm2 status

# Rebuild frontend after changes
cd /var/www/fanova
npm run build
systemctl reload nginx

# Update code from Git
cd /var/www/fanova
git pull
cd server && npm install --production
cd .. && npm install && npm run build
pm2 restart fanova-backend
```

## Troubleshooting

### Backend not starting
- Check logs: `pm2 logs fanova-backend`
- Check environment variables: `cd /var/www/fanova/server && cat .env`
- Test manually: `cd /var/www/fanova/server && node server.js`

### Frontend not loading
- Check Nginx: `systemctl status nginx`
- Check Nginx logs: `tail -f /var/log/nginx/error.log`
- Verify build exists: `ls -la /var/www/fanova/build`

### API not working
- Check backend is running: `pm2 status`
- Test API directly: `curl http://localhost:5000/health`
- Check Nginx proxy: `tail -f /var/log/nginx/error.log`

### SSL issues
- Renew certificate: `certbot renew`
- Check certificate: `certbot certificates`

## Security Checklist

- [ ] Firewall configured (UFW)
- [ ] SSL certificate installed
- [ ] Environment variables secured (not in Git)
- [ ] PM2 running as non-root user (recommended)
- [ ] Regular backups configured
- [ ] Logs monitored
- [ ] Updates scheduled

## Optional: Create Non-Root User

For better security, create a non-root user:

```bash
# Create user
adduser fanova
usermod -aG sudo fanova

# Switch to user
su - fanova

# Clone repo in user's home
cd ~
git clone https://github.com/yourusername/fanova.git
cd fanova

# Follow steps above, but adjust paths
# Update ecosystem.config.js paths
# Update Nginx paths
```
