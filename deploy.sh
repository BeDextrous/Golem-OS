#!/bin/bash

# Configuration
DESCRIPTION=${1:-"Update: $(date +'%Y-%m-%d %H:%M:%S')"}

echo "🚀 Starting Golem OS Deployment..."

# 1. Sync to Google Apps Script
echo "📤 Pushing to Google Apps Script..."
clasp push -f

if [ $? -ne 0 ]; then
  echo "❌ Clasp push failed. Deployment aborted."
  exit 1
fi

# 2. Deploy version (optional but recommended for web apps)
# echo "🏷️ Creating new deployment..."
# clasp deploy --description "$DESCRIPTION"

# 3. Push to GitHub
echo "🐙 Pushing to GitHub..."
git add .
git commit -m "$DESCRIPTION"
git push

if [ $? -ne 0 ]; then
  echo "⚠️ Git push failed, but code was pushed to Apps Script."
else
  echo "✅ Successfully pushed to both Apps Script and GitHub!"
fi

echo "✨ Deployment Complete."
