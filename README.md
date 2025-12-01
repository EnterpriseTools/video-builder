# Axon TakeOne

**Record your case. We'll file the evidence.**

A professional video creation platform built with React and FastAPI for generating high-quality video presentations with customizable templates, overlays, and animations. Designed for creating structured, multi-section presentation videos using a modal-based workflow.

## 🌟 Features

### 🎬 **Video Builder** (`/create`)
The centerpiece of the application - a unified modal-based video creation workflow:
- **Modal-Based Configuration**: All 6 templates are configured within a single page through modal dialogs
- **Timeline Grid View**: Visual card-based interface showing all templates in sequence
- **Progressive Creation**: Click template cards to configure each section individually with live previews
- **Ready State Tracking**: Visual indicators show configured templates with preview thumbnails and checkmarks
- **Template Order**: Introduction → Feature (Announcement) → Context (How It Works) → Who it's for (Persona) → Demo → Closing
- **Final Rendering**: Combines all configured templates into a single cohesive presentation video
- **Automatic Concatenation**: Renders each template section and stitches them together using FFmpeg
- **Smart Naming**: Final video automatically named using the title from your Announcement template
- **Web Optimization**: Final output is optimized for web playback with H.264 codec, 1920x1080 resolution, 30fps

### 📋 **Video Templates**

All templates are accessed through the Video Builder modal interface. Each template has its own backend API endpoint and overlay generator.

#### **Introduction Template**
- **Purpose**: Professional intro videos with team member information
- **Inputs**: Video file + Team name, full name, role
- **Features**: Animated text overlay with slide-in/slide-out animations
- **API Endpoint**: `/api/intro/render`
- **Config**: `templateConfigs.js` - intro

#### **Announcement Template** (Feature)
- **Purpose**: Feature announcements with image and text
- **Inputs**: Featured image + audio file + title & description
- **Features**: Split-screen layout (image right, text left), animated elements
- **API Endpoint**: `/api/announcement/render`
- **Config**: `templateConfigs.js` - announcement

#### **How It Works Template** (Problem)
- **Purpose**: Tutorial and explanation videos
- **Inputs**: Audio file + title & description (no image required)
- **Features**: Centered text layout with background elements
- **API Endpoint**: `/api/how-it-works/render`
- **Config**: `templateConfigs.js` - how-it-works

#### **Persona Template** (Who it's for)
- **Purpose**: Professional profile introductions
- **Inputs**: Profile image + audio file + name, title, industry description
- **Features**: Three-tier text hierarchy with elegant animations
- **API Endpoint**: `/api/persona/render`
- **Config**: `templateConfigs.js` - persona

#### **Demo Template**
- **Purpose**: Screen recording demonstrations  
- **Inputs**: Video file only (.mp4 or .mov)
- **Features**: Video-only processing with web optimization
- **API Endpoint**: `/api/demo/render`
- **Config**: `templateConfigs.js` - demo

#### **Closing Template**
- **Purpose**: Professional conclusion videos
- **Inputs**: Audio file + closing message, team details, contact info
- **Features**: Warm color scheme optimized for conclusions
- **API Endpoint**: `/api/closing/render`
- **Config**: `templateConfigs.js` - closing

### ✂️ **Video Trimming Tool** (`/trim`)
- Precise video trimming with FFmpeg
- Stream copy or re-encode options
- Support for multiple video formats
- API Endpoint: `/api/trim`

### 🔗 **Slack Integration**
- **Share to Slack**: Share generated videos directly to your Slack channel
- **One-Click Sharing**: From the success dialog after video generation
- **Secure Backend Upload**: Files uploaded via secure backend API
- **Loading States**: Beautiful animations and feedback during upload
- **Error Handling**: Automatic error detection and user feedback
- **Configuration**: Environment variable based setup
- **Feature Flag**: Can be enabled/disabled via `FEATURE_SLACK`
- **Setup Guide**: See [SLACK_INTEGRATION_SETUP.md](./SLACK_INTEGRATION_SETUP.md)

### 🏷️ **Axon Watermark** (`/axon-watermark`)
- Professional watermark configuration interface
- Automatically applied to all rendered videos
- Top-right positioning (non-user-editable)
- Configurable opacity, size, and logo type
- Live preview of watermark appearance
- Note: Configuration UI only - backend integration pending

## 🚀 Quick Start

### Prerequisites
- **Node.js**: ≥20.19.0 or ≥22.12.0 (specified in package.json engines)
- **Python**: 3.13+ (3.13.7 specified in Pipfile)
- **FFmpeg**: Required for video processing and concatenation
- **pipenv**: Python dependency management (`pip install pipenv`)

### Installation

1. **Install Dependencies**
   ```bash
   # Install all dependencies (frontend + backend)
   npm install
   cd frontend && npm install
   cd ../backend && pipenv install
   ```

2. **Start Development Servers**
   ```bash
   # Start both servers concurrently
   npm run dev

   # OR start individually:
   # Frontend (Vite dev server)
   npm run dev:fe
   # Backend (FastAPI with uvicorn)  
   npm run dev:be
   ```

3. **Access the Application**
   - **Frontend**: http://localhost:5173
   - **Backend API**: http://localhost:8000
   - **API Documentation**: http://localhost:8000/docs

### Available Routes

The application has three main routes:

1. **Home** (`/`)
   - Landing page with navigation to main features
   - Health check status display

2. **Video Builder** (`/create`)
   - Modal-based video creation workflow
   - 6-template grid interface
   - Final video concatenation and download

3. **Video Trimming** (`/trim`)
   - Standalone video trimming tool
   - Upload, trim, and download videos

4. **Axon Watermark** (`/axon-watermark`)
   - Watermark configuration interface
   - Live preview of watermark settings
   - Admin/developer tool for configuring automatic watermark

### Creating Videos

#### **Video Builder** (`/create`)
The main workflow for creating presentation videos:
1. Navigate to `/create` to see the 6-template grid layout
2. Click any template card to open its configuration modal
3. Upload files and fill out form fields in the modal dialog
4. Click "Done" to save the template configuration (shows preview thumbnail + checkmark)
5. Repeat for all templates you want to include
6. Click "Create Final Presentation" to render and concatenate all sections
7. The final video downloads automatically with the title from your Announcement template

**Note**: All templates must be configured before final rendering is enabled.

**How it works under the hood:**
1. Each template is configured in the modal and stored in React state
2. When you click "Create Final Presentation", each template is rendered individually via its API endpoint
3. The rendered video segments are sent to the `/api/concatenate-multipart` endpoint
4. FFmpeg concatenates all segments in the correct order (1-6) into a single MP4 file
5. The final video is optimized and downloaded to your computer

#### **Video Trimming** (`/trim`)
Standalone tool for trimming existing videos:
- Upload a video file
- Set start and end times
- Choose stream copy (fast) or re-encode options
- Download the trimmed result

## 🏗️ Architecture

### **Frontend Stack**
- **Framework**: React 19 with React Router for navigation
- **Build Tool**: Vite with SWC for fast development and building
- **Styling**: SCSS with CSS custom properties and design tokens
- **State Management**: React state with custom hooks (`useVideoTemplate`, `useVideoTrim`)
- **Components**: Modular component library with shared design system
- **Template System**: Modal-based configuration using `VideoTemplateCreator` component
- **Code Splitting**: Lazy loading for overlay components with React Suspense

### **Backend Stack**
- **Framework**: FastAPI for high-performance async API
- **Server**: Uvicorn ASGI server with hot reload
- **Video Processing**: FFmpeg for video manipulation, rendering, and concatenation
- **Image Processing**: Pillow (PIL) for PNG overlay generation
- **File Handling**: Multipart upload support with temporary file management
- **Video Concatenation**: Multi-segment video stitching with FFmpeg concat demuxer

### **Key Libraries & Tools**

#### Frontend Dependencies
```json
{
  "react": "^19.1.1",
  "react-dom": "^19.1.1",
  "react-router-dom": "^7.8.2", 
  "sass": "^1.91.0",
  "video.js": "^8.23.4",
  "vite": "^7.1.2"
}
```

#### Backend Dependencies
```python
# Core framework
fastapi = "*"
uvicorn = {extras = ["standard"], version = "*"}

# Image processing
pillow = "*"

# File handling & configuration
python-multipart = "*"
pydantic-settings = "*"
python-dotenv = "*"
aiofiles = "*"
```

**Note**: The backend uses FFmpeg directly via subprocess calls to the system `ffmpeg` binary for video processing, not through a Python wrapper library.

### **Project Structure**
```
take-one/
├── frontend/                  # React frontend application
│   ├── src/
│   │   ├── components/       # UI components organized by feature
│   │   │   ├── shared/       # Reusable components (Button, Input, Spinner, etc.)
│   │   │   │   ├── video-template-creator/  # Modal template configuration
│   │   │   │   ├── overlay-preview-section/ # Preview rendering
│   │   │   │   └── rendering-modal/         # Video rendering UI
│   │   │   ├── *-overlay/    # Template-specific overlay components (6 templates)
│   │   │   └── *-preview/    # Template preview components
│   │   ├── hooks/            # Custom React hooks (useVideoTemplate, useVideoTrim)
│   │   ├── lib/              # Utilities and configurations
│   │   │   ├── api.js        # API client
│   │   │   ├── templateConfigs.js  # Template configurations
│   │   │   └── templateValidation.js
│   │   ├── pages/            # Route components (App, Create, Trim)
│   │   ├── routes/           # Router configuration (Router.jsx)
│   │   └── styles/           # SCSS design system with tokens
│   ├── public/               # Static assets (logos, social-card.png)
│   ├── index.html            # Entry HTML with social meta tags
│   └── vite.config.ts        # Vite configuration with API proxy
├── backend/                  # FastAPI backend application
│   ├── app/
│   │   ├── api/v1/          # API route handlers (9 routers)
│   │   │   ├── health.py
│   │   │   ├── trim.py
│   │   │   ├── intro.py
│   │   │   ├── announcement.py
│   │   │   ├── how_it_works.py
│   │   │   ├── persona.py
│   │   │   ├── demo.py
│   │   │   ├── closing.py
│   │   │   ├── concatenate.py   # Video stitching
│   │   │   └── routes.py        # Router aggregation
│   │   ├── core/            # Configuration and settings
│   │   │   └── config.py
│   │   └── utils/           # Video processing utilities
│   │       ├── media.py
│   │       ├── overlay_generator.py
│   │       ├── styles.py
│   │       └── *_overlay.py     # Template-specific overlays
│   └── Pipfile              # Python dependencies
├── package.json             # Root package with dev scripts
└── README.md                # This file
```

## 🎨 Design System

### **Component Architecture**

The project uses a unified component system with shared design patterns and a modal-based template configuration system.

#### **VideoTemplateCreator Component** (`/frontend/src/components/shared/video-template-creator/`)
- **Purpose**: Reusable modal-based template configuration interface
- **Features**: File uploads, text fields, live preview, video rendering
- **Configuration**: Driven by `templateConfigs.js` for each template type
- **Usage**: Used within the Create page modals to configure all 6 templates
- **Props**: Accepts config object with template-specific settings

#### **Button Component** (`/frontend/src/components/shared/button/`)
- **Variants**: Primary, Secondary, Tertiary, Destructive, Success, Link
- **Sizes**: Small, Medium, Large
- **Features**: Loading states, disabled states, accessibility
- **Usage**: `<Button variant="primary" size="large" loading={isLoading}>Submit</Button>`

#### **Input Components** (`/frontend/src/components/shared/input/`)
- **Text Input**: `<Input label="Name" value={name} onChange={setName} />`
- **File Input**: `<FileInput accept=".mp4,.mov" onChange={handleFile} />`
- **Variants**: Default, Time (monospace), Code (monospace)
- **Features**: Error states, validation, drag-and-drop

#### **Template Independence**
Each template is completely self-contained at the implementation level:
- **Frontend**: Separate overlay components and styles (no individual pages)
- **Backend**: Individual API endpoints and overlay generators
- **Configuration**: Isolated configs in `templateConfigs.js`
- **No Cross-Contamination**: Changes to one template don't affect others
- **Shared Infrastructure**: All use `VideoTemplateCreator` for configuration UI

### **Color Palette**
- **Primary**: `#646cff` (Brand Blue)
- **Background**: `#0f1120` (Dark Navy)
- **Foreground**: `#e6e8ff` (Light Blue)
- **Success**: `#10b981` (Green)
- **Error**: `#ef4444` (Red)

### **Typography**
- **Font Family**: System UI stack (system-ui, -apple-system, Segoe UI, Roboto, Arial)
- **Font Sizes**: Token-based system (100-600 scale)
- **Font Weights**: Normal (400), Medium (500), Semibold (600), Bold (700)

### **Spacing & Layout**
- **Space Tokens**: `--space-*` variables (50, 100, 150, 200, 300, 400, 600)
- **Border Radius**: `--radius-*` variables (100, 200)
- **Responsive Design**: Mobile-first with fluid layouts

### **Branding & Social Media**

The application is branded as **Axon TakeOne** with the tagline "Record your case. We'll file the evidence."

#### **Social Media Integration**
The `index.html` includes Open Graph and Twitter Card meta tags for rich social media previews:
- **Title**: "Axon TakeOne : @preed"
- **Description**: "Record your case. We'll file the evidence."
- **Social Card**: `/social-card.png` (displayed when sharing links)
- **Favicon**: `/phr.svg`

When sharing links to the application, social media platforms will automatically display the custom social card image along with the branding.

## 🔧 Development

### **Available Scripts**
```bash
# Development
npm run dev          # Start both frontend and backend
npm run dev:fe       # Frontend only (Vite)
npm run dev:be       # Backend only (FastAPI)

# Frontend specific
cd frontend
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # ESLint

# Backend specific  
cd backend
pipenv run uvicorn app.main:app --reload  # Manual backend start
```

### **Configuration**

#### Environment Variables
Create `backend/.env`:
```env
ENV=development
PORT=8000
CORS_ORIGINS=http://localhost:5173

# Feature Flags
FEATURE_OPENAI=false
FEATURE_SLACK=false

# Slack Integration (optional - requires FEATURE_SLACK=true)
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_CHANNEL_ID=C01234ABC5D
```

See [SLACK_INTEGRATION_SETUP.md](./SLACK_INTEGRATION_SETUP.md) for complete Slack configuration instructions.

#### API Proxy
The frontend automatically proxies `/api/*` requests to `http://localhost:8000`

### **Adding New Templates**

The project follows a strict template independence pattern with modal-based configuration. To add a new template:

1. **Use the Template Generator** (Recommended):
   ```bash
   python readMe/scripts/create-template.py template-name "Description"
   ```

2. **Manual Creation** (Follow these patterns):
   ```bash
   # Frontend structure (no pages needed - uses modals)
   mkdir frontend/src/components/template-name-overlay
   mkdir frontend/src/components/template-name-preview
   
   # Backend structure
   touch backend/app/api/v1/template_name.py
   touch backend/app/utils/template_name_overlay.py
   ```

3. **Template Requirements**:
   - **Frontend**: 
     - Overlay component for preview rendering
     - Configuration entry in `frontend/src/lib/templateConfigs.js`
     - Styling in component SCSS files using design tokens
   - **Backend**: 
     - API endpoints (`/test`, `/generate-overlay-png`, `/render`)
     - Overlay generator for PNG creation
     - Template-specific utility in `utils/`

4. **Integration Steps**:
   - Add template config to `templateConfigs.js` with file/text requirements
   - Add API router to `backend/app/api/v1/routes.py`
   - Add template to the 6-template grid in `frontend/src/pages/create/Create.jsx`
   - Update template order mapping if changing sequence

### **Template Architecture Principles**

#### **Independence First**
- Each template is completely self-contained at the implementation level
- No shared template-specific components between templates
- Separate backend APIs and utilities for each template
- Independent styling systems per template
- Isolated configuration in `templateConfigs.js`

#### **Shared Foundation**
- Reuse common UI components (Button, Input, VideoTemplateCreator, etc.)
- Share global design tokens and utilities
- Use consistent API patterns across all templates
- Follow common error handling and file upload patterns
- Single modal-based configuration interface for all templates

#### **Modal-Based Workflow**
- All templates configured through `VideoTemplateCreator` component
- Configuration driven by `templateConfigs.js` entries
- No individual template pages - everything in `/create`
- Template state managed in Create page component
- Final concatenation of all configured templates

#### **API Patterns**
```python
# Standard endpoint structure for each template
@router.get("/template_name/test")
@router.post("/template_name/generate-overlay-png")
@router.post("/template_name/render")
```

## 📚 API Reference

### **Template Endpoints**

All templates follow the same API pattern:

#### **Test Endpoint**
```bash
GET /api/{template_name}/test
# Returns: {"status": "ok", "message": "Template API is working"}
```

#### **Overlay Generation**
```bash
POST /api/{template_name}/generate-overlay-png
# Form data: template-specific parameters
# Returns: PNG file download
```

#### **Video Rendering**
```bash
POST /api/{template_name}/render
# Form data: files + template-specific parameters
# Returns: MP4 video file download
```

### **Trim API**
```bash
POST /api/trim/analyze        # Analyze uploaded video
POST /api/trim/server         # Server-side video trimming
POST /api/trim/download/{filename}  # Download trimmed video
```

### **Concatenation API**
```bash
GET /api/concatenate/test     # Test endpoint
POST /api/concatenate         # Concatenate videos (JSON format)
POST /api/concatenate-multipart  # Concatenate videos (multipart form data)
# Form data: segment_0 through segment_5, order_0 through order_5, final_filename
# Returns: Final concatenated MP4 video file
```

The `/concatenate-multipart` endpoint is used by the Video Builder to stitch together all configured template videos into a single final presentation.

### **Slack API**
```bash
POST /api/share-to-slack
# Form data: file (video blob), filename (optional), initial_comment (optional)
# Returns: {"success": true, "message": "Video shared to Slack successfully!", "file_info": {...}}
```

The Slack endpoint uploads generated videos to a configured Slack channel. Requires `FEATURE_SLACK=true` and proper configuration. See [SLACK_INTEGRATION_SETUP.md](./SLACK_INTEGRATION_SETUP.md).

### **Health Check**
```bash
GET /api/health
# Returns: {"status": "ok", "timestamp": "..."}
```

## 🚀 Production Deployment

### **Frontend Build**
```bash
cd frontend
npm run build
# Static files generated in frontend/dist/
```

### **Backend Deployment**
```bash
cd backend
pipenv install --deploy
pipenv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### **Environment Configuration**
- Set `ENV=production` in backend environment
- Configure appropriate `CORS_ORIGINS` for production domains
- Ensure FFmpeg is available in production environment

## 🛠️ Troubleshooting

### **Common Issues**

**Port already in use:**
```bash
lsof -i :5173  # or :8000
kill -9 <PID>
```

**FFmpeg not found:**
- Ensure FFmpeg is installed and available in PATH
- On macOS: `brew install ffmpeg`

**Video upload/processing issues:**
- Check file permissions and disk space
- Ensure supported formats (.mov, .mp4)
- Verify FFmpeg installation

**API 404 errors:**
- Ensure backend is running on port 8000
- Check frontend proxy configuration in `vite.config.ts`

**Template not working:**
- Check template-specific API endpoints
- Verify overlay generator is working
- Test with `/test` endpoint first

## 🚀 Deployment

This application is deployed using a modern, scalable cloud architecture with automatic deployments.

### Architecture Overview

```
┌─────────────────┐         ┌──────────────────┐
│   Vercel        │         │    Railway       │
│   (Frontend)    │────────▶│    (Backend)     │
│                 │   API   │                  │
│  React/Vite App │  Calls  │  FastAPI + FFmpeg│
└─────────────────┘         └──────────────────┘
```

### Production URLs

- **Frontend**: https://video-builder-nu.vercel.app/
- **Backend**: https://video-builder-production.up.railway.app/
- **API Health Check**: https://video-builder-production.up.railway.app/
- **API Documentation**: https://video-builder-production.up.railway.app/api/docs

### Environment Variables

#### Frontend (Vercel)

**Required:**
| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_API_BASE_URL` | `https://video-builder-production.up.railway.app/api` | Full URL to Railway backend API |

**Configuration:**
- Set in: Vercel Dashboard → Project Settings → Environment Variables
- Apply to: Production, Preview, Development (all 3 environments)
- **Important**: Must redeploy after adding/changing this variable

#### Backend (Railway)

**Required:**
| Variable | Value | Description |
|----------|-------|-------------|
| `CORS_ORIGINS` | `http://localhost:5173,https://video-builder-nu.vercel.app` | Comma-separated list of allowed origins |

**Optional:**
| Variable | Default | Description |
|----------|---------|-------------|
| `ENV` | `development` | Environment name |
| `PORT` | Auto-set by Railway | Port number (automatically configured) |
| `FEATURE_SLACK` | `false` | Enable Slack integration |
| `SLACK_BOT_TOKEN` | - | Slack Bot User OAuth Token (starts with `xoxb-`) |
| `SLACK_CHANNEL_ID` | - | Slack channel ID for video uploads |

**Slack Configuration:**
To enable Slack integration in production:
1. Create a Slack App and get your Bot Token
2. Get your Channel ID from Slack
3. Set the environment variables in Railway
4. See [SLACK_INTEGRATION_SETUP.md](./SLACK_INTEGRATION_SETUP.md) for detailed instructions

### Configuration Files

#### **`vercel.json`**
Vercel build and deployment configuration:
```json
{
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist",
  "installCommand": "npm install",
  "framework": null,
  "devCommand": "cd frontend && npm run dev"
}
```

#### **`frontend/src/lib/config.js`** ⭐
Central API configuration (single source of truth):
- Exports `API_BASE_URL` used by all API calls
- Automatically detects development vs production environment
- Defaults to `/api` in development (proxied by Vite)
- Uses `VITE_API_BASE_URL` in production

#### **`frontend/vite.config.ts`**
- Proxy configuration: Routes `/api/*` to `http://localhost:8000` during local development
- Build configuration: Configures Vite build process
- SCSS support: Enables SCSS preprocessing

#### **`backend/app/core/config.py`**
Backend settings and environment variables:
- Uses Pydantic settings for configuration
- Reads from `.env` file or environment variables
- Manages CORS configuration

#### **`backend/app/main.py`**
FastAPI application entry point:
- Root health check: `GET /` returns service status
- API routes: All routes mounted under `/api` prefix
- CORS middleware: Configured with `CORS_ORIGINS` from settings

### API Base URL Flow

#### Development (Local)
1. `VITE_API_BASE_URL` is not set
2. `config.js` defaults to `/api`
3. Vite proxy routes `/api/*` to `http://localhost:8000`
4. Works seamlessly without any configuration

#### Production (Vercel)
1. `VITE_API_BASE_URL` = `https://video-builder-production.up.railway.app/api`
2. `config.js` uses this value
3. All API calls go directly to Railway backend
4. No proxy involved

### Deployment Platforms

#### Vercel (Frontend)
Automatically:
- ✅ Detects monorepo structure via `vercel.json`
- ✅ Builds frontend from `frontend` directory
- ✅ Deploys to global CDN
- ✅ Provides preview deployments for PRs
- ✅ Auto-deploys on git push to main

**Configuration:**
- Connected to GitHub repository
- Auto-deployment enabled on main branch
- Environment variables set in dashboard

#### Railway (Backend)
Automatically:
- ✅ Installs FFmpeg (required for video processing)
- ✅ Sets up Python environment
- ✅ Configures networking and domains
- ✅ Manages environment variables
- ✅ Auto-deploys on git push to main

**Build Command:**
```bash
cd backend && pip install pipenv && pipenv install
```

**Start Command:**
```bash
cd backend && pipenv run uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Deployment Checklist

#### Initial Setup
- [ ] Create Vercel project connected to GitHub
- [ ] Create Railway project connected to GitHub
- [ ] Get Railway URL from Railway dashboard
- [ ] Set `VITE_API_BASE_URL` in Vercel
- [ ] Set `CORS_ORIGINS` in Railway (include Vercel URL)
- [ ] Deploy both services
- [ ] Test production deployment

#### After Code Changes
- [ ] Commit and push to GitHub (`git push origin main`)
- [ ] Vercel auto-deploys (watch deployment logs)
- [ ] Railway auto-deploys (watch deployment logs)
- [ ] Test the deployed application

#### When Changing URLs
- [ ] Update `VITE_API_BASE_URL` in Vercel
- [ ] Update `CORS_ORIGINS` in Railway
- [ ] Redeploy Vercel (required for env var changes)
- [ ] Railway auto-redeploys on env var changes

### Deployment Troubleshooting

#### Frontend Issues

**Problem:** API calls return 404
- **Check**: Verify `VITE_API_BASE_URL` is set in Vercel
- **Check**: Redeploy Vercel after adding env var
- **Check**: Network tab shows requests going to Railway URL

**Problem:** CORS errors
- **Check**: Vercel URL is in Railway's `CORS_ORIGINS`
- **Check**: No trailing slashes in URLs
- **Check**: Protocol matches (https://)

**Problem:** Vercel build fails
- **Check**: `vercel.json` is in root directory
- **Check**: Frontend dependencies in `frontend/package.json`
- **Check**: Build command is correct
- **Solution**: Review Vercel deployment logs for specific errors

#### Backend Issues

**Problem:** FFmpeg not found
- **Solution**: Railway has FFmpeg built-in, should work automatically
- **Check**: Railway logs for FFmpeg-related errors
- **Check**: Service is "Live" in Railway dashboard

**Problem:** Backend won't start
- **Check**: Start command includes `--host 0.0.0.0`
- **Check**: `$PORT` variable is used (Railway auto-sets this)
- **Check**: Python dependencies installed correctly
- **Check**: Pipfile is in `backend/` directory

**Problem:** Railway build fails
- **Check**: `Pipfile` is in `backend/` directory
- **Check**: Python version compatibility (3.13+)
- **Check**: All dependencies listed in Pipfile

#### API Call Issues

**Problem:** Requests still going to Vercel instead of Railway
- **Check**: Open DevTools → Console, look for API configuration log
- **Check**: Should see `API Configuration: { baseUrl: "https://video-builder-production.up.railway.app/api", ... }`
- **Solution**: If showing `/api`, environment variable isn't applied - redeploy Vercel

**Problem:** Cold start delays (Railway free tier)
- **Symptom**: First request after idle takes 30-60 seconds
- **Cause**: Railway free tier spins down after 15 minutes of inactivity
- **Solution**: This is expected behavior on free tier
- **Workaround**: Wait for backend to wake up, then subsequent requests are fast
- **Permanent fix**: Upgrade to Railway paid tier for always-on service

### Performance Considerations

#### Railway Free Tier
- **Cold starts**: First request after idle takes 30-60 seconds
- **Sleep after 15 minutes** of inactivity
- **Solution**: Upgrade to paid tier for always-on service

#### Vercel
- **CDN deployment**: Fast global delivery
- **Edge network**: Minimal latency
- **Preview deployments**: Every PR gets a preview URL

### Security Notes

1. **Never commit `.env` files** - They're in `.gitignore`
2. **Use environment variables** for sensitive data
3. **CORS configuration** restricts API access to approved domains
4. **Environment variables** are set in platform dashboards, not in code

### Maintenance

#### Updating Dependencies

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

#### Monitoring

**Vercel:**
- Dashboard → Analytics
- Dashboard → Deployments (view logs)

**Railway:**
- Dashboard → Metrics
- Dashboard → Logs (live log streaming)

## 🤝 Contributing

This project follows a modular, modal-based architecture designed for easy extension:

1. **Templates**: Use the template generator script for new video types (configure in `templateConfigs.js`)
2. **Components**: Add shared components to `frontend/src/components/shared/`
3. **Styling**: Follow the design token system in `frontend/src/styles/`
4. **API**: Add new endpoints to `backend/app/api/v1/`
5. **Integration**: Add template cards to the `/create` page grid

### **Development Guidelines**
- Follow template independence principles (isolated implementations)
- Use shared components for consistency (especially `VideoTemplateCreator`)
- Configure templates in `templateConfigs.js` rather than creating separate pages
- Test template rendering via the modal workflow
- Update documentation for new features
- Follow the established naming conventions
- All templates should work through the unified Video Builder interface