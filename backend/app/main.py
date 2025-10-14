from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from .core.config import settings
from .api.v1.routes import api_router

load_dotenv()

app = FastAPI(
    title="TakeOne API",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

# CORS for Vite dev server or configured origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root health check endpoint for Render and other monitoring services
@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "ok", "service": "TakeOne API", "version": "1.0.0"}

# Mount all API routes under /api
app.include_router(api_router, prefix="/api")