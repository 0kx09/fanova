#!/bin/bash

# Fanova Update Script
# Run this after making code changes to update the production server

set -e

APP_DIR="/var/www/fanova"

echo "🔄 Updating Fanova..."

cd $APP_DIR

# Pull latest code
echo "📥 Pulling latest code..."
git pull

# Update backend dependencies
echo "📦 Updating backend dependencies..."
cd server
npm install --production

# Update frontend dependencies and rebuild
echo "📦 Updating frontend dependencies..."
cd ..
npm install
npm run build

# Restart backend
echo "🔄 Restarting backend..."
pm2 restart fanova-backend

# Reload Nginx
echo "🔄 Reloading Nginx..."
systemctl reload nginx

echo "✅ Update complete!"
echo ""
echo "Check status: pm2 status"
echo "View logs: pm2 logs fanova-backend"
