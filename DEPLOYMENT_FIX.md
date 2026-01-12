# Fix: react-scripts not found

## Problem
When running `npm run build`, you get:
```
sh: 1: react-scripts: not found
```

## Solution

The frontend dependencies aren't installed. Run:

```bash
cd /var/www/fanova
npm install
npm run build
```

## Full Deployment Checklist

Make sure you've done all these steps:

### 1. Install System Dependencies
```bash
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs nginx git certbot python3-certbot-nginx
npm install -g pm2
```

### 2. Clone Repository
```bash
cd /var/www
git clone https://github.com/YOUR_USERNAME/fanova.git
cd fanova
```

### 3. Install Backend Dependencies
```bash
cd server
npm install --production
cd ..
```

### 4. Install Frontend Dependencies ⚠️ (This is what you're missing!)
```bash
npm install
```

### 5. Build Frontend
```bash
npm run build
```

### 6. Set Environment Variables
```bash
# Backend
nano server/.env
# (paste your backend env vars)

# Frontend
nano .env.production
# (paste your frontend env vars)

# Rebuild after setting env vars
npm run build
```

### 7. Start with PM2
```bash
mkdir -p /var/log/fanova
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 8. Configure Nginx
```bash
# Create config file (see DEPLOY_TO_DIGITALOCEAN.md for full config)
nano /etc/nginx/sites-available/fanova
# (paste nginx config)

ln -s /etc/nginx/sites-available/fanova /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

## Quick Fix Command

If you're already in `/var/www/fanova`:

```bash
npm install
npm run build
pm2 restart fanova-backend
systemctl reload nginx
```
