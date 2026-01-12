#!/bin/bash

# Fanova Deployment Script
# Run this script on your Digital Ocean Ubuntu server after initial setup

set -e  # Exit on error

echo "🚀 Starting Fanova Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root${NC}"
    exit 1
fi

# Variables
APP_DIR="/var/www/fanova"
DOMAIN="${1:-yourdomain.com}"  # Pass domain as first argument

echo -e "${GREEN}Deployment directory: ${APP_DIR}${NC}"
echo -e "${GREEN}Domain: ${DOMAIN}${NC}"

# Step 1: Install dependencies
echo -e "\n${YELLOW}Step 1: Installing system dependencies...${NC}"
apt update
apt install -y nodejs npm nginx git certbot python3-certbot-nginx

# Install PM2 globally
npm install -g pm2

# Step 2: Create directories
echo -e "\n${YELLOW}Step 2: Creating directories...${NC}"
mkdir -p $APP_DIR
mkdir -p /var/log/fanova

# Step 3: Clone repository (if not already cloned)
if [ ! -d "$APP_DIR/.git" ]; then
    echo -e "\n${YELLOW}Step 3: Cloning repository...${NC}"
    echo "Please clone your repository manually:"
    echo "  cd /var/www"
    echo "  git clone https://github.com/yourusername/fanova.git"
    echo ""
    read -p "Press Enter after you've cloned the repository..."
fi

# Step 4: Install backend dependencies
echo -e "\n${YELLOW}Step 4: Installing backend dependencies...${NC}"
cd $APP_DIR/server
npm install --production

# Step 5: Install frontend dependencies and build
echo -e "\n${YELLOW}Step 5: Installing frontend dependencies and building...${NC}"
cd $APP_DIR
npm install
npm run build

# Step 6: Setup PM2
echo -e "\n${YELLOW}Step 6: Setting up PM2...${NC}"
cd $APP_DIR
pm2 start ecosystem.config.js || pm2 restart fanova-backend
pm2 save
pm2 startup systemd -u root --hp /root

# Step 7: Configure Nginx
echo -e "\n${YELLOW}Step 7: Configuring Nginx...${NC}"
cat > /etc/nginx/sites-available/fanova <<EOF
upstream backend {
    server localhost:5000;
}

server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    location / {
        root ${APP_DIR}/build;
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "public, max-age=3600";
    }

    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /api/stripe/webhook {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_request_buffering off;
        proxy_buffering off;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /health {
        proxy_pass http://backend;
        access_log off;
    }

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/fanova /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# Step 8: Setup SSL
echo -e "\n${YELLOW}Step 8: Setting up SSL certificate...${NC}"
if [ "$DOMAIN" != "yourdomain.com" ]; then
    certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN || echo "SSL setup skipped (domain may not be configured)"
else
    echo -e "${YELLOW}Domain not set. Skipping SSL setup.${NC}"
    echo "Run manually: certbot --nginx -d yourdomain.com -d www.yourdomain.com"
fi

# Step 9: Configure firewall
echo -e "\n${YELLOW}Step 9: Configuring firewall...${NC}"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo -e "\n${GREEN}✅ Deployment complete!${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Create .env file in $APP_DIR/server/.env"
echo "2. Create .env.production file in $APP_DIR/.env.production"
echo "3. Update Stripe webhook URL to: https://${DOMAIN}/api/stripe/webhook"
echo "4. Test your deployment: https://${DOMAIN}"
echo ""
echo "Check status: pm2 status"
echo "View logs: pm2 logs fanova-backend"
