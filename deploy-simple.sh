#!/bin/bash

# Simple Deployment Script for Digital Ocean
# Run this on your server after cloning the repository

set -e

echo "🚀 Starting Fanova Deployment..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

APP_DIR="/var/www/fanova"

# Check if we're in the right directory
if [ ! -f "$APP_DIR/package.json" ]; then
    echo "❌ Error: Not in Fanova directory"
    echo "Please run: cd /var/www/fanova"
    exit 1
fi

echo -e "${YELLOW}Step 1: Installing backend dependencies...${NC}"
cd $APP_DIR/server
npm install --production

echo -e "${YELLOW}Step 2: Installing frontend dependencies...${NC}"
cd $APP_DIR
npm install

echo -e "${YELLOW}Step 3: Building frontend...${NC}"
npm run build

echo -e "${YELLOW}Step 4: Setting up PM2...${NC}"
mkdir -p /var/log/fanova
cd $APP_DIR
pm2 start ecosystem.config.js || pm2 restart fanova-backend
pm2 save

echo -e "${YELLOW}Step 5: Reloading Nginx...${NC}"
systemctl reload nginx

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Create server/.env file with your environment variables"
echo "2. Create .env.production file with frontend environment variables"
echo "3. Restart: pm2 restart fanova-backend"
echo ""
echo "Check status: pm2 status"
echo "View logs: pm2 logs fanova-backend"
