# Railway Deployment Guide

## Quick Deploy to Railway

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Add Railway deployment configuration"
   git push origin main
   ```

2. **Deploy on Railway**
   - Go to [railway.app](https://railway.app)
   - Click "New Project"
   - Connect your GitHub repository
   - Select this repository
   - Railway will auto-detect the Nixpacks configuration

## Environment Variables

Set these in Railway dashboard:

**Required:**
- `MODEL_PROVIDER=groq`
- `GROQ_API_KEY=your_groq_api_key`

**Optional:**
- `JIRA_TOKEN=your_jira_token` (for Jira integration)
- `ANTHROPIC_API_KEY=your_anthropic_key` (if using Claude)
- `HF_TOKEN=your_hf_token` (if using HuggingFace)

## What's Configured

✅ **Nixpacks.toml** - Chromium + Playwright installation  
✅ **railway.toml** - Railway deployment settings  
✅ **database.py** - Uses /tmp for Railway ephemeral storage  
✅ **.gitignore** - Excludes sensitive files  
✅ **Health Check** - `/api/config` endpoint for monitoring  

## Features

- 🚀 Automatic frontend build and serving
- 🎭 Playwright with Chromium support
- 🗄️ SQLite database with Railway-compatible paths
- 📊 Health monitoring endpoint
- 🔗 Jira integration support
- 📡 Real-time test execution streaming

## Post-Deployment

1. Your app will be available at `https://your-app-name.up.railway.app`
2. Test the health check: `https://your-app-name.up.railway.app/api/config`
3. Set environment variables in Railway dashboard
4. Restart the deployment to apply env vars

## Troubleshooting

**Build fails?**
- Check that `nixpacks.toml` is in project root
- Verify Railway has Nixpacks enabled

**Playwright errors?**
- Railway automatically installs Chromium via nixpkgs
- Browsers are installed during build phase

**Database issues?**
- SQLite database is stored in `/tmp` on Railway
- Data persists between deployments within the same environment
