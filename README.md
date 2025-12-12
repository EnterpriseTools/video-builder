# Axon TakeOne

**Record your case. We'll file the evidence.**

Axon TakeOne is a modal-first video creation platform that guides you through six purpose-built templates, renders cinematic overlays with FastAPI + FFmpeg, and delivers a single polished video that is ready for review, sharing, and archival.

## 📚 Contents 

1. [About the Platform](#about-the-platform)
2. [Feature Highlights](#feature-highlights)
3. [Template & Workflow Guide](#template--workflow-guide)
4. [Audio Recording Route](#audio-recording-route)
5. [Getting Started](#getting-started)
6. [Configuration & Environment](#configuration--environment)
7. [Deployment Snapshot](#deployment-snapshot)
8. [AI Persona Generator Quick Start](#ai-persona-generator-quick-start)
9. [Slack Integration Overview](#slack-integration-overview)
10. [Audio Enhancement Quick Start](#audio-enhancement-quick-start)
11. [Production Readiness & Monitoring](#production-readiness--monitoring)
12. [Testing, Assets & Maintenance](#testing-assets--maintenance)
13. [Troubleshooting](#troubleshooting)
14. [Contributing](#contributing)
15. [Additional Documentation](#additional-documentation)

---

## About the Platform

- **Unified Builder** – `/create` houses all six templates inside a timeline grid. Clicking any card opens the `VideoTemplateCreator` modal where you can upload media, edit metadata, preview overlays, and flag readiness for final rendering.
- **Video Trimming** – `/trim` provides precise FFmpeg-backed trimming (stream copy or re-encode) with waveform visualization, drag handles, and manual timecode entry.
- **Axon Watermark Lab** – `/axon-watermark` is an internal admin UI for watermark presets. Configured watermarks and QR bands will be baked into Intro and Closing renders.
- **Backend Foundation** – FastAPI orchestrates template endpoints, trimming, concatenation, Slack uploads, and temporary file lifecycle management. Every render runs inside an isolated temp directory and is cleaned deterministically after download.

---

## Feature Highlights

### Template Catalog

| Order | Template | Purpose | Inputs |
| --- | --- | --- | --- |
| 1 | Introduction | Team + talent introductions with animated text stack | Video + team name, full name, role |
| 2 | Announcement (Feature) | Split layout with supporting image and narration | Image + audio + title & description |
| 3 | How It Works (Problem) | Storyboard-style explanation with optional imagery | Audio + title & description (+ optional image) |
| 4 | Persona (Who it's for) | Persona storytelling with AI/Manual imagery & overlay toggle | Audio + image (AI or upload) + persona fields |
| 5 | Demo | Raw screen recording or footage, optimized for playback | Video only |
| 6 | Closing | Warm outro with team info, CTA, and contact details | Audio + closing copy + team metadata |

### Additional Capabilities

- **AI-Powered Persona Imagery** – GPT‑4 handles clarifying questions while DALL·E 3 (1792×1024) generates persona imagery directly inside Step 2 of the Persona template. Manual uploads remain available as a fallback.
- **Share to Slack** – After final rendering, the success modal exposes a Slack-branded action that uploads the MP4 to your workspace via `POST /api/share-to-slack`, honoring `FEATURE_SLACK` and environment configuration.
- **Studio-Grade Audio Enhance** – The `/audio-recording` route now includes an **Enhance** button that sends takes through AssemblyAI, FFmpeg `arnndn` + `loudnorm`, and filler-word trimming so exported clips are leveled, de-noised, and ready for Trim or any template.
- **Fast Trim & Retry** – Any media uploaded through `VideoTemplateCreator` can be trimmed before rendering. Trim intent is persisted per template and re-applied on re-open.
- **Deterministic Temp Cleanup** – All render, trim, and concatenation endpoints attach `BackgroundTasks` that delete their temp directories once `FileResponse` streaming completes, with proactive cleanup for every failure path.
- **Smart Naming & Status Tracking** – Final downloads adopt the Announcement title automatically, while the Create grid shows thumbnails + checkmarks for every template that has been configured.

---

## Template & Workflow Guide

### Video Builder in Practice

1. Visit `/create` and review the six-card grid (Introduction → Closing).
2. Select any template card to open the modal.
3. Upload media, trim as needed, and fill in text inputs. Live previews update instantly.
4. Click **Done** to mark a template as ready (thumbnail + checkmark appear). You can re-open at any time to tweak data.
5. Repeat for the remaining templates. All six must be configured before final rendering unlocks.
6. Click **Create Final Presentation**. Each template renders sequentially, storing blobs in memory.
7. `/api/concatenate-multipart` stitches the rendered segments according to their order metadata and streams the final MP4 back to the browser.

### Persona Template Experience

The Persona flow now mirrors a three-step story-centric layout:

```
┌────────────── WHO IT'S FOR ───────────────┬────────────── Live Preview ───────────────┐
│ 1️⃣ Upload Audio                          │ Updates as each step is completed         │
│ 2️⃣ Generate Persona Image                │                                            │
│    • AI Image Generator (default)         │                                            │
│    • or upload your own image            │                                            │
│ 3️⃣ Add Persona Details                   │                                            │
│    • Name • Title • Industry             │                                            │
└────────────────────────────────────────────┴────────────────────────────────────────────┘
```

**AI Path:** describe your persona → GPT‑4 asks up to 3 clarifying questions → click **Generate Image** → review, download, regenerate, or start over → apply to preview.  
**Manual Path:** toggle "upload your own image" → drop a file → preview updates immediately.  
**User Journey Snapshot:** upload narration → craft persona via AI or manual upload → add text overlays → save → render with your newly generated persona imagery.

### Slack Share Flow

1. Generate your video as usual.  
2. In the success dialog, click **Share to Slack** (button is hidden unless `FEATURE_SLACK=true`).  
3. Button transitions through idle → spinner (**Sharing...**) → success (**Shared to Slack!**).  
4. Backend streams the MP4 to Slack using your bot token and posts into the configured channel.  
5. Video + message appear in Slack with your custom comment. Retry states surface inline errors if something fails.

### Video Trimming Route (`/trim`)

- Upload any .mp4 or .mov asset.  
- Scrub and drag handles across the waveform timeline.  
- Toggle stream copy vs re-encode for precision.  
- Preview trims, download immediately, or feed into the builder.

---

## Audio Recording Route

- **Path**: Visit `/audio-recording` to launch the standalone microphone capture experience powered by the reusable `AudioRecorder` component. The UI mirrors our in-template plan so we can validate UX, codecs, and trim hand-offs before embedding it everywhere.
- **Recording Flow**: Request mic access, monitor the live waveform + timer, stop to preview, then re-record, download, or save. The component emits a `File` + metadata payload that behaves exactly like a user-uploaded audio file.
- **Trim Hand-off**: Choosing **Open in Trim Tool** navigates to `/trim` with the recording pre-loaded, so you can immediately tighten the clip using the existing timeline/FFmpeg workflow. Export the trimmed file and drop it into any template today.
- **Formats & Compatibility**: Clips are saved as `audio/webm` (Opus) for broad browser + FFmpeg support. The backend trim endpoint already accepts the format, and HTML5 playback works seamlessly in Chrome/Edge with graceful fallbacks for unsupported browsers.
- **Future Integration**: Once battle-tested, the same component will sit alongside every “Upload Audio” dropzone so creators can toggle between uploading and recording without leaving the template modal.
- **Enhance Button**: A new **Enhance** CTA sits next to **Save Recording**. It uploads the take to `POST /api/audio/enhance`, waits for AssemblyAI to flag disfluencies + long pauses, runs FFmpeg RNNoise/loudnorm filters, removes filler ranges, and returns a polished WebM. The UX blocks Save while enhancement is running so users don’t advance with a partially processed clip.

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 20.19.0 (or ≥ 22.12.0)
- **Python** 3.13+
- **FFmpeg** available on PATH (`brew install ffmpeg` on macOS)
- **pipenv** for backend dependencies (`pip install pipenv`)

### Installation & Local Development

```bash
# From repo root
npm install              # Installs shared scripts + tooling
cd frontend && npm install
cd ../backend && pipenv install

# Start everything via the root package scripts
cd ..
npm run dev             # Runs frontend + backend concurrently
# or run individually
npm run dev:fe          # Vite dev server (http://localhost:5173)
npm run dev:be          # FastAPI via uvicorn (http://localhost:8000)
```

Access points:
- Frontend app: <http://localhost:5173>
- Backend API: <http://localhost:8000>
- Auto-generated docs: <http://localhost:8000/docs>

---

## Configuration & Environment

### Backend `.env` Template (`backend/.env`)

```env
ENV=development
PORT=8000
CORS_ORIGINS=http://localhost:5173

# Feature Flags
FEATURE_OPENAI=false
FEATURE_SLACK=false
FEATURE_AUDIO_ENHANCE=false

# Slack Integration
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_CHANNEL_ID=C01234ABC5D

# OpenAI (AI Persona Generator)
OPENAI_API_KEY=sk-your-key

# Audio Enhancement (AssemblyAI)
ASSEMBLYAI_API_KEY=your-assemblyai-key
ASSEMBLYAI_BASE_URL=https://api.assemblyai.com/v2
AUDIO_RNNOISE_MODEL_PATH=app/assets/audio/denoise_general.rnnn
```

### Frontend Environment (Vercel or `.env`)

```env
VITE_API_BASE_URL=https://your-backend-domain/api
```

### Asset Requirements

Place the `SF Pro Rounded` fonts in `backend/fonts/` so overlay generators can render consistent typography:

```
backend/fonts/
├── SF-Pro-Rounded-Regular.ttf
├── SF-Pro-Rounded-Semibold.ttf
└── SF-Pro-Rounded-Bold.ttf
```

The backend automatically falls back to DejaVu Sans → Helvetica if the fonts are missing, but the official look & feel assumes these assets exist.

For audio enhancement, download an RNNoise model (`denoise_general.rnnn`) from the [official repository](https://github.com/xiph/rnnoise/tree/master/models) and place it under `backend/app/assets/audio/`. Update `AUDIO_RNNOISE_MODEL_PATH` if you store it elsewhere.

---

## Deployment Snapshot

| Surface | Platform | Command Highlights |
| --- | --- | --- |
| Frontend | **Vercel** | `cd frontend && npm install && npm run build` → outputs `frontend/dist` |
| Backend | **Railway** | `cd backend && pip install pipenv && pipenv install` → `pipenv run uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

Key environment variables:

| Platform | Variable | Purpose |
| --- | --- | --- |
| Vercel | `VITE_API_BASE_URL` | Points to the Railway backend (`https://video-builder-production.up.railway.app/api`) |
| Railway | `OPENAI_API_KEY` | Enables GPT‑4/DALL·E 3 persona generation |
| Railway | `CORS_ORIGINS` | Include `http://localhost:5173` and your Vercel URL |
| Railway | `ENV` | Typically `production` |
| Railway | `FEATURE_SLACK`, `SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID` | Enables Slack uploads |

**Deployment flow:** push to `main` → Vercel + Railway auto-deploy → verify Slack + OpenAI env vars → smoke test `/create`, `/trim`, and Slack share.

---

## AI Persona Generator Quick Start

1. **Rename your env var** – ensure `backend/.env` uses `OPENAI_API_KEY` (not `OPEN_AI_KEY`).
2. **Restart backend** – `cd backend && pipenv run uvicorn app.main:app --reload --port 8000`.
3. **Launch frontend** – `cd frontend && npm run dev`.
4. **Use the Persona template**:
   - Step 1: Upload audio narration.
   - Step 2: Describe your persona and converse with GPT‑4 (three clarifying questions max). Click **Generate Image** to invoke DALL·E 3 at 1792×1024 (HD). Download, regenerate, or reset as needed. Manual upload remains one click away.
   - Step 3: Fill in Name, Title, and Industry, optionally hide the overlay.
5. **Render + verify** – ensure the generated image ships with the segment and the final concatenated video.

**Testing checklist:** backend boots cleanly, AI chat returns responses, image generation succeeds, Apply button updates preview, manual upload fallback works, final render completes, and logs capture any OpenAI/network errors.

**Cost snapshot:** GPT‑4 prompts (~$0.01–$0.03 per session) + DALL·E 3 HD (~$0.08/image) → ~$0.10–$0.15 per persona.

Customization pointers live in `backend/app/utils/openai_prompts.py` (conversation tone & image style) and `backend/app/utils/openai_client.py` (resolution, quality).

---

## Slack Integration Overview

- **Endpoints**: `POST /api/share-to-slack` streams files from the backend only (tokens never touch the frontend).
- **Frontend UX**: Success modal shows a purple Slack button with hover tooltip, spinner-based loading state, green success confirmation, and inline error callouts.
- **Quick Setup Recap**:
  1. Create a Slack app → add `files:write` + `chat:write` scopes → install → copy the Bot User OAuth token (`xoxb-...`).
  2. Fetch the Channel ID (desktop channel details or `conversations.list`).
  3. Invite the bot to that channel (`/invite @Take One Video Bot`).
  4. Update `backend/.env` with `FEATURE_SLACK=true`, `SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID`.
  5. Restart the backend and test with any rendered video.
- **Troubleshooting**: `FEATURE_SLACK` disabled → button hidden; `not_in_channel` errors mean the bot was not invited; `invalid_auth` indicates an expired token.
- **Production**: replicate the env vars inside Railway and redeploy. Detailed, screenshot-rich instructions now live in `Architecture.md`.

---

## Audio Enhancement Quick Start

1. **Create an AssemblyAI account** – visit <https://www.assemblyai.com>, create a project, and copy your API token.
2. **Download a RNNoise model** – grab `denoise_general.rnnn` from the [official RNNoise repo](https://github.com/xiph/rnnoise/tree/master/models) and place it at `backend/app/assets/audio/denoise_general.rnnn` (or update `AUDIO_RNNOISE_MODEL_PATH`).
3. **Update `backend/.env`**:
   - `FEATURE_AUDIO_ENHANCE=true`
   - `ASSEMBLYAI_API_KEY=<your token>`
   - (Optional) `ASSEMBLYAI_BASE_URL` if you use a proxy.
4. **Restart the backend** – `cd backend && pipenv run uvicorn app.main:app --reload --port 8000`.
5. **Open `/audio-recording`** – record a take, click **Enhance**, and wait for the inline spinner to finish. The summary card will note applied enhancements, and **Open in Trim Tool** continues to work with the polished clip.

The endpoint returns `audio/webm` (Opus) so all existing template renderers, the Trim flow, and final concatenation keep functioning without code changes. Failure cases surface inline error text under the waveform so users can retry or fall back to the original take.

---

## Production Readiness & Monitoring

Highlights pulled from the production checklist, deployment notes, and cleanup design:

- **Frontend hygiene**: No stray `console.log` in AI generator / template creator; Create.jsx intentionally retains a few debug logs for live triage.
- **Backend logging**: All `print` calls replaced with structured logging. HTTP exceptions carry human-readable details without leaking secrets.
- **Environment parity**: Vercel uses `VITE_API_BASE_URL`; Railway stores `OPENAI_API_KEY`, `CORS_ORIGINS`, Slack vars, and `ENV=production`.
- **Dependencies**: Backend Pipfile includes `openai`, `httpx`, and test deps; frontend relies solely on existing libraries (React, Sass, Video.js, Vite).
- **API coverage**: Persona gained `/api/persona/chat` and `/api/persona/generate-image`. All legacy template endpoints remained untouched and regression tested.
- **UX polish**: Auto-scrolling conversation threads, tooltips, download/regenerate controls, consistent loading states, and responsive layouts were validated across flows.
- **Testing**: Persona template edge cases (empty input, network failure, OpenAI timeout) handled gracefully. Demo renders confirm AI images are embedded correctly.
- **Security**: Secrets stay in env vars, `.env` is ignored, Slack tokens never reach the browser, and CORS restricts origins.
- **Performance**: AI imagery cached in memory as base64, template renders clean their temp directories, and FFmpeg timeouts guard long-running jobs.
- **Monitoring**: Watch Railway logs for OpenAI errors, FFmpeg failures, and trim/render timeouts. Vercel analytics track request errors and load times.
- **Known limits**: DALL·E 3 max resolution 1792×1024, generation latency 10–30 seconds, and cold starts on Railway free tier. Rollback plan: empty `OPENAI_API_KEY` to disable AI, or revert commit to remove UI if necessary.

---

## Testing, Assets & Maintenance

### Backend Tests

```bash
cd backend
pipenv run pytest                   # Entire suite
pipenv run pytest tests/test_openai_prompts.py -v
pipenv run pytest --cov=app tests/  # Coverage
# Focused audio enhance coverage
pipenv run pytest tests/test_audio_enhancer.py -v
```

Install dev dependencies first: `pipenv install --dev`. Tests favor descriptive naming, docstrings, and single-purpose assertions.

### Font Assets

Ensure `SF-Pro-Rounded-*` fonts live under `backend/fonts/` before deploying so Pillow can render overlays with the expected typography. Railway deployments bundle whatever is in version control, so commit the fonts (or document where operators should place them for automated builds).

### Temp File Lifecycle

Every render, trim, and concat endpoint now:
- Writes inputs and outputs to a template-specific temp directory.
- Schedules `cleanup_temp_path(temp_dir)` with FastAPI `BackgroundTasks` after streaming the file.
- Performs immediate cleanup on FFmpeg failures, timeouts, missing outputs, and unexpected exceptions.
This prevents orphaned directories under `/tmp`, reduces disk pressure, and keeps behavior consistent even if clients disconnect mid-transfer.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Port already in use (`5173` or `8000`) | `lsof -i :5173` → kill offending PID. |
| FFmpeg not found | Install via `brew install ffmpeg` (macOS) or `apt-get install ffmpeg` (Linux/Railway has it pre-installed). |
| Slack button disabled | Confirm `FEATURE_SLACK=true`, restart backend, hard refresh frontend, and verify bot token/channel ID. |
| Enhance button disabled / 503 error | Ensure `FEATURE_AUDIO_ENHANCE=true`, `ASSEMBLYAI_API_KEY` is set, and `backend/app/assets/audio/denoise_general.rnnn` exists. Restart the backend after updating env vars. |
| `invalid_auth` / `not_in_channel` (Slack) | Reinstall Slack app to refresh token and invite the bot to the channel. |
| `OPENAI_API_KEY not configured` | Update `backend/.env`, restart backend, ensure env var name is correct. |
| Persona image fails to render | Check backend logs for OpenAI errors, verify network connectivity, retry or fall back to manual upload. |
| API 404s during local dev | Ensure backend is running on :8000 and that Vite proxy is active (`npm run dev`). |
| Cold starts on Railway | First request after idle can take 30–60 seconds—wait, then retry. |

---

## Contributing

- Follow the modal-based template architecture—each template stays self-contained across frontend components, backend routes, and overlay utilities.
- Prefer shared components (`VideoTemplateCreator`, Button, Inputs, TrimControls, AIImageGenerator) over bespoke UI.
- Use `templateConfigs.js` for template metadata, file requirements, and preview wiring instead of custom pages.
- When adding new templates, ensure their render order, API routes, and concatenation hooks are updated consistently.
- Update this README (and `Architecture.md`) whenever you introduce new features, integrations, or architectural changes.

---

## Additional Documentation

See [`Architecture.md`](./Architecture.md) for deep dives into:
- Detailed technology stack and dependency matrices.
- Frontend & backend architecture diagrams, component hierarchies, and data flow.
- API reference for every endpoint (templates, trim, concatenate, Slack, OpenAI).
- Integration guides with screenshots/diagrams for Slack, OpenAI, and deployment topologies.
- FFmpeg filter breakdowns, overlay generator internals, and deterministic cleanup strategy.
- Deployment architecture (Vercel/Railway), environment variable guides, and operational runbooks.

That document consolidates every technical deep dive so this README can stay focused on day-to-day usage.
