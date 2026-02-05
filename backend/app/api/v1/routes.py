from fastapi import APIRouter
from .health import router as health_router
from .trim import router as trim_router
from .intro import router as intro_router
from .announcement import router as announcement_router
from .how_it_works import router as how_it_works_router
from .persona import router as persona_router
from .closing import router as closing_router
from .demo import router as demo_router
from .concatenate import router as concatenate_router
from ...core.config import settings
from .slack import router as slack_router
from .cs_share import router as cs_share_router

api_router = APIRouter()

# Always-on routes
api_router.include_router(health_router, tags=["health"])
api_router.include_router(trim_router, tags=["trim"])
api_router.include_router(intro_router, tags=["intro"])
api_router.include_router(announcement_router, tags=["announcement"])
api_router.include_router(how_it_works_router, tags=["how-it-works"])
api_router.include_router(persona_router, tags=["persona"])
api_router.include_router(closing_router, tags=["closing"])
api_router.include_router(demo_router, tags=["demo"])
api_router.include_router(concatenate_router, tags=["concatenate"])
api_router.include_router(cs_share_router, tags=["cs-share"])

# Optional routes (add files later when features are enabled)
if settings.FEATURE_OPENAI:
    from .openai_chat import router as openai_router  # type: ignore
    api_router.include_router(openai_router, tags=["openai"])

# Auto-enable Slack if credentials are configured
if settings.SLACK_BOT_TOKEN and settings.SLACK_CHANNEL_ID:
    api_router.include_router(slack_router, tags=["slack"])
