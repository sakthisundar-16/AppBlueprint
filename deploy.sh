#!/bin/bash
# Quick Deploy Script for AI Compiler Demo

echo "🚀 AI Compiler Demo - Deployment Guide"
echo "========================================"
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
  echo "📦 Step 1: Initialize Git Repository"
  echo "Run these commands:"
  echo ""
  echo "  git init"
  echo "  git add ."
  echo "  git commit -m 'AI compiler demo - production ready'"
  echo ""
  echo "Then create a GitHub repository and run:"
  echo "  git remote add origin https://github.com/YOUR_USERNAME/ai-compiler-demo.git"
  echo "  git branch -M main"
  echo "  git push -u origin main"
  echo ""
else
  echo "✅ Git repository already initialized"
fi

echo "📤 Step 2: Deploy to Vercel (Recommended)"
echo ""
echo "Option A: Using Vercel CLI"
echo "  npm install -g vercel"
echo "  vercel"
echo ""
echo "Option B: Using Vercel Web UI"
echo "  1. Go to https://vercel.com"
echo "  2. Click 'New Project'"
echo "  3. Import from GitHub"
echo "  4. Select your repository"
echo "  5. Settings already configured (vercel.json)"
echo "  6. Click Deploy"
echo ""

echo "🌐 Your live URL will be:"
echo "  https://ai-compiler-demo-XXXX.vercel.app"
echo ""

echo "✅ Verify Deployment"
echo "  1. Open your live URL in browser"
echo "  2. Try: 'Build a CRM with login and contacts'"
echo "  3. Should see JSON config output"
echo ""

echo "📋 Submission Checklist"
echo "  ☐ Live URL deployed and tested"
echo "  ☐ GitHub repository is public"
echo "  ☐ README.md is clear"
echo "  ☐ Evaluation metrics documented (75% success rate)"
echo "  ☐ Fill Google Form with:"
echo "     - Live URL"
echo "     - GitHub repository link"
echo "     - Loom video (architecture explanation)"
echo ""
