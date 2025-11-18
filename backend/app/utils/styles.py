# ==============================================================================
# VIDEO TEMPLATE STYLES CONFIGURATION
# ==============================================================================
"""
Centralized styling configuration for all video template overlays.
This file contains all the styling constants used across different templates
to ensure consistency and easy maintenance.
"""

# ==============================================================================
# CANVAS SETTINGS
# ==============================================================================

CANVAS_WIDTH = 1920
CANVAS_HEIGHT = 1080

# ==============================================================================
# FONT CONFIGURATION
# ==============================================================================

# Font paths
# SF Pro Rounded fonts - stored in backend/app/fonts/
# These paths work for both local development and production deployment
import os
from pathlib import Path

# Get the base path for fonts (relative to this file)
FONT_BASE_PATH = Path(__file__).parent.parent / "fonts"

SF_PRO_ROUNDED_REGULAR = str(FONT_BASE_PATH / "SF-Pro-Rounded-Regular.otf")
SF_PRO_ROUNDED_SEMIBOLD = str(FONT_BASE_PATH / "SF-Pro-Rounded-Semibold.otf")
SF_PRO_ROUNDED_BOLD = str(FONT_BASE_PATH / "SF-Pro-Rounded-Bold.otf")

# Fallback fonts for if SF Pro not available
PRIMARY_FONT_PATH = SF_PRO_ROUNDED_SEMIBOLD
FALLBACK_FONT_PATH_MACOS = "/System/Library/Fonts/Helvetica.ttc"  # macOS (try first on Mac)
FALLBACK_FONT_PATH_LINUX = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"  # Linux fallback

# Font sizes (in pixels)
FONT_SIZE_EXTRA_LARGE = 80    # Main titles
FONT_SIZE_LARGE = 60          # Secondary titles  
FONT_SIZE_MEDIUM = 42         # Email, medium text
FONT_SIZE_REGULAR = 32        # Subtitles
FONT_SIZE_SMALL = 24          # Body text, team info
FONT_SIZE_EXTRA_SMALL = 20    # Small captions
FONT_SIZE_TINY = 16           # Very small text

# ==============================================================================
# COLOR PALETTE
# ==============================================================================

# Primary colors (RGBA tuples)
WHITE_COLOR = (255, 255, 255, 255)
BLACK_COLOR = (0, 0, 0, 255)
GRAY_COLOR = (176, 176, 176, 255)
DARK_GRAY_COLOR = (128, 128, 128, 255)
LIGHT_GRAY_COLOR = (224, 224, 224, 255)

# Brand colors
YELLOW_COLOR = (254, 198, 46, 255)      # #FEC62E - Axon Yellow
BLUE_COLOR = (0, 123, 255, 255)         # Brand Blue
GREEN_COLOR = (40, 167, 69, 255)        # Success Green
RED_COLOR = (220, 53, 69, 255)          # Error Red

# Special colors
SHADOW_COLOR = (0, 0, 0, 128)           # Semi-transparent black for shadows
TRANSPARENT = (0, 0, 0, 0)              # Fully transparent

# ==============================================================================
# POSITIONING PERCENTAGES
# ==============================================================================

# Vertical positioning (as percentages of canvas height)
POSITION_TOP_LOGO = 0.35
POSITION_MAIN_TITLE = 0.50
POSITION_SUBTITLE = 0.62
POSITION_EMAIL = 0.67
POSITION_BOTTOM_SECTION = 0.80

# Horizontal positioning
POSITION_CENTER = 0.50
POSITION_LEFT_THIRD = 0.33
POSITION_RIGHT_THIRD = 0.67

# ==============================================================================
# MARGINS AND SPACING
# ==============================================================================

# Standard margins (in pixels)
MARGIN_TINY = 8
MARGIN_SMALL = 16
MARGIN_REGULAR = 32
MARGIN_LARGE = 56
MARGIN_EXTRA_LARGE = 80

# Text spacing
TEXT_LINE_HEIGHT = 1.2
TEXT_PARAGRAPH_SPACING = 20
TEAM_SEPARATOR_GAP = 8

# Element offsets
BOTTOM_TEXT_OFFSET = 15
LOGO_CENTER_OFFSET = 20

# ==============================================================================
# VISUAL EFFECTS
# ==============================================================================

# Shadow offsets (x, y)
SHADOW_SMALL = (1, 1)
SHADOW_MEDIUM = (2, 2)
SHADOW_LARGE = (3, 3)

# Bold effect settings
BOLD_OFFSET_X_RANGE = 2  # Draw text 0px and 1px horizontally
BOLD_OFFSET_Y_RANGE = 1  # Draw text only at 0px vertically

# Logo dimensions
LOGO_WIDTH_SMALL = 30
LOGO_WIDTH_REGULAR = 40
LOGO_WIDTH_LARGE = 60

# ==============================================================================
# TEMPLATE-SPECIFIC STYLE CONFIGURATIONS
# ==============================================================================

class ClosingStyles:
    """Style configuration specifically for closing template"""
    
    # Fonts
    TITLE_SIZE = FONT_SIZE_EXTRA_LARGE      # 80px
    SUBTITLE_SIZE = FONT_SIZE_REGULAR       # 32px
    EMAIL_SIZE = FONT_SIZE_MEDIUM           # 42px
    SMALL_TEXT_SIZE = FONT_SIZE_SMALL       # 24px
    
    # Colors
    TITLE_COLOR = WHITE_COLOR
    SUBTITLE_COLOR = GRAY_COLOR
    EMAIL_COLOR = YELLOW_COLOR
    SMALL_TEXT_COLOR = GRAY_COLOR
    
    # Positioning
    LOGO_Y = POSITION_TOP_LOGO
    TITLE_Y = POSITION_MAIN_TITLE
    SUBTITLE_Y = POSITION_SUBTITLE
    EMAIL_Y = POSITION_EMAIL
    
    # Margins
    BOTTOM_LEFT_MARGIN = MARGIN_LARGE       # 56px
    BOTTOM_RIGHT_MARGIN = MARGIN_REGULAR    # 32px
    
    # Effects
    TITLE_SHADOW = SHADOW_MEDIUM
    SUBTITLE_SHADOW = SHADOW_SMALL
    EMAIL_SHADOW = SHADOW_MEDIUM
    SMALL_SHADOW = SHADOW_SMALL
    
    # Logo
    LOGO_WIDTH = 80  # 80px (increased from 40px)

class AnnouncementStyles:
    """Style configuration specifically for announcement template"""
    
    # Fonts (optimized for 1080p video render)
    TITLE_SIZE = 80                        # Title size for video
    DESCRIPTION_SIZE = 42                   # Description size for video
    
    # Colors (match frontend SCSS preview)
    TITLE_COLOR = WHITE_COLOR                       # #ffffff (white)
    DESCRIPTION_COLOR = (222, 222, 222, 255)        # rgba(222, 222, 222, 1) - light gray
    
    # Canvas dimensions (dynamic sizing) - scaled up for 168px/72px fonts
    BASE_WIDTH = 1600                       # Increased from 800 to fit larger text
    BASE_HEIGHT_MIN = 1080                  # Full video height for proper vertical centering
    BASE_HEIGHT_SINGLE = 1080               # Full video height for proper vertical centering
    BASE_HEIGHT_BOTH = 1080                 # Full video height for proper vertical centering
    
    # Layout - scaled proportionally for larger fonts
    PADDING = 120                           # Increased from 60 (2x)
    TITLE_LINE_SPACING = 16                 # Increased from 8 (2x)
    DESCRIPTION_LINE_SPACING = 12           # Increased from 6 (2x)
    TITLE_DESC_SPACING = 40                 # Increased from 20 (2x)
    
    # Text wrapping
    TITLE_WRAP_WIDTH = 20  # Reduced from 30 to wrap sooner and avoid image overlap
    DESCRIPTION_WRAP_WIDTH = 45
    
    # Shadows
    TITLE_SHADOW = SHADOW_MEDIUM
    DESCRIPTION_SHADOW = SHADOW_SMALL

class PersonaStyles:
    """Style configuration specifically for persona template"""
    
    # Canvas dimensions (content-based)
    MIN_WIDTH = 200
    MAX_WIDTH = 600
    MIN_HEIGHT = 80
    BASE_HEIGHT_PER_LINE = 25
    BASE_HEIGHT_PADDING = 40
    
    # Background
    BG_COLOR = (254, 198, 46, 255)          # Yellow background (#FEC62E)
    BORDER_RADIUS = 4
    
    # Layout
    TEXT_PADDING_X = 24
    TEXT_PADDING_Y = 20
    LOGO_TEXT_PADDING = 120  # Space for logo + padding
    CONTENT_ESTIMATE_CHAR_WIDTH = 12
    
    # Font sizes
    NAME_SIZE = 24                          # Large text for name
    TITLE_SIZE = 16                         # Medium text for title
    INDUSTRY_SIZE = 14                      # Small text for industry
    
    # Fallback overlay dimensions
    FALLBACK_WIDTH = 480
    FALLBACK_HEIGHT = 150
    FALLBACK_PADDING_Y = 20
    
    # Colors
    TEXT_COLOR = (0, 0, 0, 255)             # Black text on yellow background
    
    # Text spacing
    INDUSTRY_LINE_HEIGHT = 20
    NAME_LINE_HEIGHT = 30
    TITLE_LINE_HEIGHT = 20
    FALLBACK_INDUSTRY_SPACING = 6
    FALLBACK_NAME_SPACING = 8
    FALLBACK_TITLE_SPACING = 6
    
    # Text truncation
    INDUSTRY_MAX_CHARS = 50
    FALLBACK_INDUSTRY_MAX_CHARS = 60

class IntroStyles:
    """Style configuration specifically for intro template"""
    
    # Card dimensions
    CARD_WIDTH = 400
    CARD_HEIGHT = 120
    
    # Background colors
    CARD_BG_COLOR = (26, 26, 26, 255)      # Dark background #1A1A1A - fully opaque
    CARD_BORDER_COLOR = (53, 53, 53, 255)  # Updated border color #353535
    LOGO_BG_COLOR = (0, 0, 0, 0)           # Transparent background (no background)
    
    # Layout
    CARD_RADIUS = 24
    LOGO_RADIUS = 16
    LOGO_SIZE = 88  # Logo size: 88px x 88px (increased by 8px)
    LOGO_MARGIN = 20
    LOGO_Y_OFFSET = 18
    TEXT_X_OFFSET = 120  # Text starts at 120px (increased from 100px)
    TEXT_Y_START = 20
    
    # Font sizes
    TEAM_SIZE = 18
    NAME_SIZE = 24
    ROLE_SIZE = 16
    
    # Colors
    TEAM_COLOR = (255, 255, 255, 180)      # Semi-transparent white
    NAME_COLOR = (255, 255, 255, 255)      # Full white
    ROLE_COLOR = (255, 255, 255, 200)      # Semi-transparent white
    LOGO_COLOR = (255, 255, 255, 255)      # White logo
    LOGO_ACCENT_COLOR = (255, 255, 255, 180) # Logo accent
    
    # Text spacing
    TEAM_LINE_HEIGHT = 34  # 18px font + 16px padding below
    NAME_LINE_HEIGHT = 28  # 24px font + 4px padding below

class HowItWorksStyles:
    """Style configuration specifically for how-it-works template"""
    
    # Canvas dimensions (dynamic sizing)
    BASE_WIDTH = 1000
    BASE_HEIGHT_MIN = 150
    BASE_HEIGHT_SINGLE = 200
    BASE_HEIGHT_BOTH = 350
    
    # Layout
    PADDING = 60
    TITLE_LINE_SPACING = 10
    DESCRIPTION_LINE_SPACING = 6
    TITLE_DESC_SPACING = 20
    
    # Font sizes
    TITLE_SIZE = 48                         # Title font size
    DESCRIPTION_SIZE = 24                   # Description font size
    
    # Colors
    TITLE_COLOR = WHITE_COLOR               # White title text
    DESCRIPTION_COLOR = (200, 200, 200, 255) # Light gray description
    
    # Shadows
    TITLE_SHADOW = SHADOW_MEDIUM
    DESCRIPTION_SHADOW = SHADOW_SMALL
    
    # Text wrapping
    TITLE_WRAP_WIDTH = 35
    DESCRIPTION_WRAP_WIDTH = 60

# ==============================================================================
# UTILITY FUNCTIONS
# ==============================================================================

def get_font(font_path: str, size: int):
    """Helper function to load fonts with fallback (minimal logging)"""
    from PIL import ImageFont
    import os
    import platform
    
    # Detect if we're on macOS
    is_macos = platform.system() == 'Darwin'
    
    # Try primary font (SF Pro) - silently fail if not found
    if os.path.exists(font_path):
        try:
            return ImageFont.truetype(font_path, size)
        except Exception:
            pass  # Silent fallback
    
    # On macOS, prioritize Helvetica
    if is_macos:
        if os.path.exists(FALLBACK_FONT_PATH_MACOS):
            try:
                return ImageFont.truetype(FALLBACK_FONT_PATH_MACOS, size)
            except Exception:
                pass
    
    # Try Linux fallback (DejaVu)
    if os.path.exists(FALLBACK_FONT_PATH_LINUX):
        try:
            return ImageFont.truetype(FALLBACK_FONT_PATH_LINUX, size)
        except Exception:
            pass
    
    # Last resort: use Pillow's default font
    print(f"WARNING: No suitable fonts found, using default font at {size}px")
    return ImageFont.load_default()


def get_logo_path():
    """Get the path to the Axon logo - works for both local dev and Docker"""
    from pathlib import Path
    
    # Try Docker path first (most common in production)
    # In Docker: styles.py is at /app/app/utils/styles.py
    # Logo is at /app/frontend/public/logoAxon.png
    docker_path = Path(__file__).parent.parent.parent / "frontend" / "public" / "logoAxon.png"
    
    if docker_path.exists():
        return docker_path
    
    # Fall back to local development path
    # In local: styles.py is at /path/to/project/backend/app/utils/styles.py
    # Logo is at /path/to/project/frontend/public/logoAxon.png
    local_path = Path(__file__).parent.parent.parent.parent / "frontend" / "public" / "logoAxon.png"
    
    if local_path.exists():
        return local_path
    
    # If neither exists, return the Docker path and let the error handler deal with it
    return docker_path
