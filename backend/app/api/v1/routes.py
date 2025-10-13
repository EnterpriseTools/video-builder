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

# Optional routes (add files later when features are enabled)
if settings.FEATURE_OPENAI:
    from .openai_chat import router as openai_router  # type: ignore
    api_router.include_router(openai_router, tags=["openai"])
