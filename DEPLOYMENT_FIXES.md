# Railway Deployment Fixes Applied

## Issues Fixed

### 1. Docker Configuration
- **Fixed Dockerfile.playwright**: Added proper working directory and browser installation
- **Updated main Dockerfile**: Improved system dependencies and health checks
- **Enhanced health checks**: Increased start period to 30s for proper initialization
- **Fixed working directory**: Set WORKDIR to /app/backend for correct module import

### 2. Nixpacks Configuration
- **Updated nixpacks.toml**: Added `--with-deps` flag for Playwright
- **Simplified dependencies**: Removed problematic packages
- **Better build commands**: More reliable installation process
- **Fixed start command**: Added `cd backend` for correct module path

### 3. Railway Configuration
- **Switched back to Nixpacks**: More reliable than Docker for this use case
- **Updated railway.toml**: Simplified configuration
- **Proper health check path**: `/api/config` endpoint

## Critical Fix: Module Import Error

**Problem**: `Error loading ASGI app. Could not import module "main"`

**Root Cause**: Railway was trying to import `main.py` from wrong directory
- `main.py` is located in `backend/` directory
- Previous config tried to run from root directory

**Solution**: Updated all deployment configs to use correct working directory:
- **Nixpacks**: `cd backend && python3 -m uvicorn main:app`
- **Docker**: `WORKDIR /app/backend` before CMD
- **Dockerfile.playwright**: `WORKDIR /app/backend` before CMD

## Deployment Strategy

### Primary: Nixpacks
```toml
[phases.setup]
nixPkgs = ["chromium", "python311"]

[phases.install]
cmds = [
  "python3 -m pip install --upgrade pip",
  "python3 -m pip install -r requirements.txt",
  "python3 -m playwright install chromium --with-deps"
]
```

### Fallback: Docker
- **Dockerfile**: Standard Python slim with manual dependencies
- **Dockerfile.playwright**: Official Playwright image with optimizations

## What to Try on Railway

1. **Redeploy with Nixpacks** (current default)
   - Railway will automatically use the updated nixpacks.toml
   - Should build successfully with Chromium + Playwright

2. **If Nixpacks fails, switch to Docker**:
   - Settings → Build Method → "Dockerfile"
   - Uses the main Dockerfile with manual dependency setup

3. **Last resort - Playwright Docker**:
   - Settings → Build Method → "Dockerfile.playwright"
   - Uses official Playwright image

## Environment Variables Required

Set these in Railway dashboard:
- `MODEL_PROVIDER=groq`
- `GROQ_API_KEY=your_groq_api_key`
- `PORT=8000` (auto-set by Railway)

## Health Check

- **Path**: `/api/config`
- **Timeout**: 100s
- **Start Period**: 30s (allows time for Playwright browser installation)

## Troubleshooting

### Build Fails
- Check Railway build logs for specific errors
- Try switching between build methods (Nixpacks → Docker → Playwright)

### Health Check Fails
- Wait longer for initial startup (Playwright needs time to install browsers)
- Check if all Python dependencies installed correctly
- Verify the `/api/config` endpoint is working

### Runtime Errors
- Ensure environment variables are set correctly
- Check that Playwright browsers are accessible
- Verify database permissions in `/tmp` directory

## Latest Changes

✅ **Fixed Docker health checks** - Increased start period  
✅ **Improved Nixpacks config** - Added --with-deps flag  
✅ **Updated Railway settings** - Switched back to Nixpacks  
✅ **Enhanced error handling** - Better fallback options  
✅ **Added deployment guide** - Complete troubleshooting steps  

Repository: https://github.com/ashutoshb206/AI_release_testing_agent
