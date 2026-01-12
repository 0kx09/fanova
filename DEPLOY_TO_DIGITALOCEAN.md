# Deploy Fanova to Digital Ocean - Step by Step

## Prerequisites

- ✅ Your code is on GitHub
- ✅ Digital Ocean Ubuntu droplet created
- ✅ Domain name pointed to your server IP (optional but recommended)
- ✅ SSH access to your server

## Step 1: Connect to Your Server

```bash
ssh root@your_server_ip
```

Replace `your_server_ip` with your actual Digital Ocean droplet IP address.

## Step 2: Install Required Software

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install PM2 (process manager)
npm install -g pm2

# Install Nginx (web server)
apt install -y nginx

# Install Git (if not already installed)
apt install -y git

# Install Certbot (for SSL)
apt install -y certbot python3-certbot-nginx
```

## Step 3: Clone Your Repository

```bash
# Create app directory
mkdir -p /var/www
cd /var/www

# Clone your repository (replace with your GitHub URL)
git clone https://github.com/YOUR_USERNAME/fanova.git

# Go into the project
cd fanova
```

## Step 4: Set Up Backend

```bash
# Go to server directory
cd server

# Install dependencies
npm install --production

# Create .env file
nano .env
```

**Paste your backend environment variables:**
```env
PORT=5000
NODE_ENV=production

SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

FRONTEND_URL=https://yourdomain.com

# Choose one image generation API
FAL_AI_KEY=your_fal_ai_key
# OR
REPLICATE_API_TOKEN=your_replicate_token
# OR
GOOGLE_API_KEY=your_google_api_key

WAVESPEED_API_KEY=your_wavespeed_api_key
WAVESPEED_API_URL=https://api.wavespeed.ai/v1
```

Save and exit: `Ctrl+X`, then `Y`, then `Enter`

## Step 5: Set Up Frontend

```bash
# Go back to project root
cd /var/www/fanova

# Install dependencies
npm install

# Create .env.production file
nano .env.production
```

**Paste your frontend environment variables:**
```env
REACT_APP_API_URL=https://yourdomain.com/api
REACT_APP_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Save and exit: `Ctrl+X`, then `Y`, then `Enter`

```bash
# Build frontend
npm run build
```

## Step 6: Configure PM2

```bash
# Create log directory
mkdir -p /var/log/fanova

# Start backend with PM2
cd /var/www/fanova
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Enable PM2 to start on boot
pm2 startup
```

Follow the command that PM2 outputs (it will look like: `sudo env PATH=... pm2 startup systemd -u root --hp /root`)

## Step 7: Configure Nginx

```bash
# Create Nginx configuration
nano /etc/nginx/sites-available/fanova
```

**Paste this configuration** (replace `yourdomain.com` with your actual domain, or use your server IP):

```nginx
upstream backend {
    server localhost:5000;
}

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
        proxy_request_buffering off;
        proxy_buffering off;
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

Save and exit: `Ctrl+X`, then `Y`, then `Enter`

```bash
# Enable the site
ln -s /etc/nginx/sites-available/fanova /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

## Step 8: Set Up SSL (If You Have a Domain)

```bash
# Get SSL certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts. Certbot will automatically configure SSL.

**If you don't have a domain yet**, you can skip this step and access via IP: `http://your_server_ip`

## Step 9: Configure Firewall

```bash
# Allow SSH, HTTP, and HTTPS
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

## Step 10: Update Stripe Webhook

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → Developers → Webhooks
2. Update your webhook endpoint URL to: `https://yourdomain.com/api/stripe/webhook`
3. Copy the webhook secret and update it in your `server/.env` file

## Step 11: Verify Everything Works

```bash
# Check PM2 status
pm2 status

# Check backend logs
pm2 logs fanova-backend

# Check Nginx status
systemctl status nginx

# Test backend directly
curl http://localhost:5000/health
```

Visit your domain (or IP) in a browser to see your app!

## Quick Commands Reference

```bash
# View backend logs
pm2 logs fanova-backend

# Restart backend
pm2 restart fanova-backend

# Stop backend
pm2 stop fanova-backend

# Rebuild frontend after changes
cd /var/www/fanova
npm run build
systemctl reload nginx

# Update code from GitHub
cd /var/www/fanova
git pull
cd server && npm install --production
cd .. && npm install && npm run build
pm2 restart fanova-backend
```

## Troubleshooting

### Backend not starting?
```bash
cd /var/www/fanova/server
node server.js  # Test manually to see errors
```

### Frontend not loading?
```bash
# Check if build exists
ls -la /var/www/fanova/build

# Check Nginx logs
tail -f /var/log/nginx/error.log
```

### Can't access the site?
```bash
# Check firewall
ufw status

# Check if services are running
pm2 status
systemctl status nginx
```
