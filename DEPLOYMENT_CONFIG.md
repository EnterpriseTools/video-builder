# Deployment Configuration

This document outlines all configuration settings for deploying the TakeOne application.

## Architecture Overview

```
┌─────────────────┐         ┌──────────────────┐
│   Vercel        │         │    Railway       │
│   (Frontend)    │────────▶│    (Backend)     │
│                 │   API   │                  │
│  React/Vite App │  Calls  │  FastAPI + FFmpeg│
└─────────────────┘         └──────────────────┘
```

## Environment Variables

### Frontend (Vercel)

**Required Variables:**

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `VITE_API_BASE_URL` | `https://video-builder-production.up.railway.app/api` | Full URL to Railway backend API |

**Configuration:**
- Set in: Vercel Dashboard → Project Settings → Environment Variables
- Apply to: Production, Preview, Development (all 3 environments)
- **Important**: Must redeploy after adding/changing this variable

### Backend (Railway)

**Required Variables:**

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `CORS_ORIGINS` | `http://localhost:5173,https://video-builder-nu.vercel.app` | Comma-separated list of allowed origins |

**Optional Variables:**

| Variable Name | Default | Description |
|--------------|---------|-------------|
| `ENV` | `development` | Environment name |
| `PORT` | Auto-set by Railway | Port number (automatically configured) |

## Deployment URLs

### Production URLs
- **Frontend**: https://video-builder-nu.vercel.app/
- **Backend**: https://video-builder-production.up.railway.app/
- **API Health Check**: https://video-builder-production.up.railway.app/
- **API Documentation**: https://video-builder-production.up.railway.app/api/docs

### Local Development URLs
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:8000
- **API Documentation**: http://localhost:8000/api/docs

## Configuration Files

### Frontend Configuration

#### `vercel.json`
```json
{
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist",
  "installCommand": "npm install",
  "framework": null,
  "devCommand": "cd frontend && npm run dev"
}
```

**Purpose**: Tells Vercel where to build and output the frontend files.

#### `frontend/vite.config.ts`
- **Proxy Configuration**: Routes `/api/*` requests to `http://localhost:8000` during local development
- **Build Configuration**: Configures Vite build process
- **SCSS Support**: Enables SCSS preprocessing

#### `frontend/src/lib/config.js`
- **Central Configuration**: Single source of truth for API base URL
- **Environment Detection**: Automatically uses correct URL based on environment

### Backend Configuration

#### `backend/app/core/config.py`
- **Settings Management**: Uses Pydantic settings for configuration
- **Environment Variables**: Reads from `.env` file or environment
- **CORS Configuration**: Manages allowed origins

#### `backend/app/main.py`
- **Root Health Check**: `GET /` returns service status
- **API Routes**: All routes mounted under `/api` prefix
- **CORS Middleware**: Configured with `CORS_ORIGINS` from settings

## Railway Configuration

Railway auto-detects the Python application and:
- ✅ Installs FFmpeg automatically
- ✅ Sets up Python environment
- ✅ Configures networking and domains
- ✅ Manages environment variables

**Build Command (configured in Railway dashboard):**
```bash
cd backend && pip install pipenv && pipenv install
```

**Start Command (configured in Railway dashboard):**
```bash
cd backend && pipenv run uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

## Vercel Configuration

Vercel automatically:
- ✅ Detects the monorepo structure via `vercel.json`
- ✅ Builds the frontend from the `frontend` directory
- ✅ Deploys to CDN
- ✅ Provides preview deployments for PRs

## API Base URL Flow

### Development (Local)
1. `VITE_API_BASE_URL` is not set
2. `config.js` defaults to `/api`
3. Vite proxy routes `/api/*` to `http://localhost:8000`

### Production (Vercel)
1. `VITE_API_BASE_URL` = `https://video-builder-production.up.railway.app/api`
2. `config.js` uses this value
3. All API calls go directly to Railway backend

## File Structure

```
take-one/
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── config.js          # ⭐ Central API configuration
│   │   │   ├── api.js              # API client (uses config.js)
│   │   │   └── templateConfigs.js  # Template configs (uses config.js)
│   │   ├── hooks/
│   │   │   └── useVideoTrim.js     # Trim hook (uses config.js)
│   │   └── pages/
│   │       └── create/
│   │           └── Create.jsx      # Create page (uses config.js)
│   └── vite.config.ts              # Vite configuration
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app entry point
│   │   ├── core/
│   │   │   └── config.py           # Backend settings
│   │   └── api/
│   │       └── v1/                 # API routes
│   └── Pipfile                     # Python dependencies
└── vercel.json                     # Vercel configuration

```

## Checklist for New Deployments

### Initial Setup
- [ ] Create Vercel project connected to GitHub
- [ ] Create Railway project connected to GitHub
- [ ] Get Railway URL from Railway dashboard
- [ ] Set `VITE_API_BASE_URL` in Vercel
- [ ] Set `CORS_ORIGINS` in Railway (include Vercel URL)
- [ ] Deploy both services

### After Code Changes
- [ ] Commit and push to GitHub
- [ ] Vercel auto-deploys (watch deployment logs)
- [ ] Railway auto-deploys (watch deployment logs)
- [ ] Test the deployed application

### When Changing URLs
- [ ] Update `VITE_API_BASE_URL` in Vercel
- [ ] Update `CORS_ORIGINS` in Railway
- [ ] Redeploy Vercel (required for env var changes)
- [ ] Railway auto-redeploys on env var changes

## Troubleshooting

### Frontend Issues

**Problem**: API calls return 404
- **Check**: Verify `VITE_API_BASE_URL` is set in Vercel
- **Check**: Redeploy Vercel after adding env var
- **Check**: Network tab shows requests going to Railway URL

**Problem**: CORS errors
- **Check**: Vercel URL is in Railway's `CORS_ORIGINS`
- **Check**: No trailing slashes in URLs
- **Check**: Protocol matches (https://)

### Backend Issues

**Problem**: FFmpeg not found
- **Solution**: Railway has FFmpeg built-in, should work automatically
- **Check**: Railway logs for FFmpeg-related errors

**Problem**: Backend won't start
- **Check**: Start command includes `--host 0.0.0.0`
- **Check**: `$PORT` variable is used (Railway auto-sets this)
- **Check**: Python dependencies installed correctly

### Deployment Issues

**Problem**: Vercel build fails
- **Check**: `vercel.json` is in root directory
- **Check**: Frontend dependencies in `frontend/package.json`
- **Check**: Build command is correct

**Problem**: Railway build fails
- **Check**: `Pipfile` is in `backend/` directory
- **Check**: Python version compatibility
- **Check**: All dependencies listed in Pipfile

## Security Notes

1. **Never commit `.env` files** - They're in `.gitignore`
2. **Use environment variables** for sensitive data
3. **CORS configuration** restricts API access to approved domains
4. **Railway free tier** spins down after 15 minutes of inactivity

## Performance Considerations

### Railway Free Tier
- **Cold starts**: First request after idle takes 30-60 seconds
- **Sleep after 15 minutes** of inactivity
- **Solution**: Upgrade to paid tier for always-on service

### Vercel
- **CDN deployment**: Fast global delivery
- **Edge network**: Minimal latency
- **Preview deployments**: Every PR gets a preview URL

## Maintenance

### Updating Dependencies

**Frontend:**
```bash
cd frontend
npm update
npm audit fix
```

**Backend:**
```bash
cd backend
pipenv update
pipenv check
```

### Monitoring

**Vercel:**
- Dashboard → Analytics
- Dashboard → Deployments (view logs)

**Railway:**
- Dashboard → Metrics
- Dashboard → Logs (live log streaming)

## Support

- **Frontend Issues**: Check Vercel deployment logs
- **Backend Issues**: Check Railway logs
- **API Issues**: Check Railway logs and `/api/docs` for endpoint details
- **CORS Issues**: Verify CORS_ORIGINS includes your frontend URL

