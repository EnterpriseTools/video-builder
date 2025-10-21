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
# For SF Pro Rounded, we need to include the font files in the repository
# SF Pro Rounded is available in multiple weights. For overlays, we'll use:
# - SF-Pro-Rounded-Regular.otf for regular text
# - SF-Pro-Rounded-Semibold.otf for emphasis
# - SF-Pro-Text-Bold.otf for titles (using Text Bold as Rounded Bold equivalent)
SF_PRO_ROUNDED_REGULAR = "/app/fonts/SF-Pro-Rounded-Regular.otf"
SF_PRO_ROUNDED_SEMIBOLD = "/app/fonts/SF-Pro-Rounded-Semibold.otf"
SF_PRO_ROUNDED_BOLD = "/app/fonts/SF-Pro-Text-Bold.otf"  # Using Text Bold

# Fallback fonts for local development and if SF Pro not available
PRIMARY_FONT_PATH = SF_PRO_ROUNDED_SEMIBOLD
FALLBACK_FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"  # Linux fallback
FALLBACK_FONT_PATH_2 = "/System/Library/Fonts/Helvetica.ttc"  # macOS fallback

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
    LOGO_WIDTH = LOGO_WIDTH_REGULAR         # 40px

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
    BASE_HEIGHT_MIN = 400                   # Increased from 200
    BASE_HEIGHT_SINGLE = 500                # Increased from 250
    BASE_HEIGHT_BOTH = 800                  # Increased from 400
    
    # Layout - scaled proportionally for larger fonts
    PADDING = 120                           # Increased from 60 (2x)
    TITLE_LINE_SPACING = 16                 # Increased from 8 (2x)
    DESCRIPTION_LINE_SPACING = 12           # Increased from 6 (2x)
    TITLE_DESC_SPACING = 40                 # Increased from 20 (2x)
    
    # Text wrapping
    TITLE_WRAP_WIDTH = 30
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
    CARD_HEIGHT = 100
    
    # Background colors
    CARD_BG_COLOR = (26, 26, 26, 250)      # Dark background with transparency
    CARD_BORDER_COLOR = (53, 53, 53, 255)  # Updated border color #353535
    LOGO_BG_COLOR = (74, 74, 74, 230)      # Logo container background
    
    # Layout
    CARD_RADIUS = 24
    LOGO_RADIUS = 16
    LOGO_SIZE = 80  # Logo size: 80px x 80px
    LOGO_MARGIN = 20
    LOGO_Y_OFFSET = 18
    TEXT_X_OFFSET = 100  # Space for logo + padding
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
    """Helper function to load fonts with fallback"""
    from PIL import ImageFont
    import os
    
    # Try primary font
    if os.path.exists(font_path):
        try:
            font = ImageFont.truetype(font_path, size)
            print(f"DEBUG: Loaded font from {font_path} at {size}px")
            return font
        except Exception as e:
            print(f"WARNING: Failed to load font from {font_path}: {e}")
    else:
        print(f"WARNING: Font not found at {font_path}")
    
    # Try first fallback font (Linux)
    if os.path.exists(FALLBACK_FONT_PATH):
        try:
            font = ImageFont.truetype(FALLBACK_FONT_PATH, size)
            print(f"DEBUG: Loaded fallback font from {FALLBACK_FONT_PATH} at {size}px")
            return font
        except Exception as e:
            print(f"WARNING: Failed to load fallback font from {FALLBACK_FONT_PATH}: {e}")
    else:
        print(f"WARNING: Fallback font not found at {FALLBACK_FONT_PATH}")
    
    # Try second fallback font (macOS)
    if os.path.exists(FALLBACK_FONT_PATH_2):
        try:
            font = ImageFont.truetype(FALLBACK_FONT_PATH_2, size)
            print(f"DEBUG: Loaded second fallback font from {FALLBACK_FONT_PATH_2} at {size}px")
            return font
        except Exception as e:
            print(f"WARNING: Failed to load second fallback font from {FALLBACK_FONT_PATH_2}: {e}")
    else:
        print(f"WARNING: Second fallback font not found at {FALLBACK_FONT_PATH_2}")
    
    # Last resort - but this will cause small text!
    print(f"ERROR: No TrueType fonts available! Falling back to default bitmap font (will be tiny)")
    return ImageFont.load_default()


def get_logo_path():
    """Get the path to the Axon logo"""
    from pathlib import Path
    # In Docker: styles.py is at /app/app/utils/styles.py
    # Go up 3 levels to /app/, then to frontend/public/logoAxon.png
    return Path(__file__).parent.parent.parent / "frontend" / "public" / "logoAxon.png"
