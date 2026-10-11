#!/bin/bash
set -e

APP_DIR="/home/nalendev-vps/app/audit-finance"

echo "🚀 [1/3] Navigating to: $APP_DIR"
cd "$APP_DIR"

echo "📥 [2/3] Pulling latest changes from git..."
git pull

echo "🐳 [3/3] Rebuilding & running Docker containers..."
docker compose up -d --build

echo "🧹 Cleaning dangling Docker images..."
docker image prune -f

echo "✅ App updated successfully!"
echo "Status containers:"
docker compose ps
