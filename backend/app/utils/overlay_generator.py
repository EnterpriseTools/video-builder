import tempfile
from pathlib import Path
from typing import Optional

# Import styling constants from the dedicated styles file
from .styles import (
    PRIMARY_FONT_PATH,
    IntroStyles,
    get_font
)

class IntroOverlayGenerator:
    """Generates PNG overlays for intro templates using Pillow with centralized styling."""
    
    def __init__(self):
        self.temp_dir = Path(tempfile.gettempdir()) / "intro_overlays"
        self.temp_dir.mkdir(exist_ok=True)
        
    async def generate_overlay_png(
        self, 
        team: Optional[str] = "", 
        full_name: Optional[str] = "", 
        role: Optional[str] = "", 
        output_path: Optional[str] = None
    ) -> str:
        """
        Generate a PNG overlay image using Pillow with centralized styling.
        
        Args:
            team: Team name
            full_name: Person's full name  
            role: Person's role
            output_path: Optional output path for the PNG. If None, uses temp file.
            
        Returns:
            Path to the generated PNG file
        """
        
        if output_path is None:
            # Create temporary file for the PNG
            temp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
            output_path = temp_file.name
            temp_file.close()
        
        return self._create_intro_overlay(team, full_name, role, output_path)
    
    def _create_intro_overlay(
        self, 
        team: Optional[str], 
        full_name: Optional[str], 
        role: Optional[str], 
        output_path: str
    ) -> str:
        """Create intro overlay using Pillow with centralized styling."""
        try:
            from PIL import Image, ImageDraw, ImageFont
            
            # Use style configuration for card dimensions
            card_width = IntroStyles.CARD_WIDTH
            card_height = IntroStyles.CARD_HEIGHT
            
            # Create a transparent image sized to fit the card exactly
            img = Image.new('RGBA', (card_width, card_height), (0, 0, 0, 0))
            draw = ImageDraw.Draw(img)
            
            # Create rounded rectangle background using style configuration
            self._draw_rounded_rectangle(
                draw, 
                [0, 0, card_width, card_height],
                radius=IntroStyles.CARD_RADIUS,
                fill=IntroStyles.CARD_BG_COLOR,
                outline=IntroStyles.CARD_BORDER_COLOR
            )
            
            # Logo container using style configuration
            logo_x = IntroStyles.LOGO_MARGIN
            logo_y = IntroStyles.LOGO_Y_OFFSET
            logo_size = IntroStyles.LOGO_SIZE
            
            self._draw_rounded_rectangle(
                draw,
                [logo_x, logo_y, logo_x + logo_size, logo_y + logo_size],
                radius=IntroStyles.LOGO_RADIUS,
                fill=IntroStyles.LOGO_BG_COLOR,
                outline=IntroStyles.CARD_BORDER_COLOR
            )
            
            # Draw Axon logo approximation using style configuration
            logo_shape_points = [
                (logo_x + 16, logo_y + 10),  # Top left
                (logo_x + 48, logo_y + 10),  # Top right  
                (logo_x + 40, logo_y + 30),  # Middle right
                (logo_x + 24, logo_y + 50),  # Bottom
                (logo_x + 16, logo_y + 40),  # Bottom left
            ]
            draw.polygon(logo_shape_points, fill=IntroStyles.LOGO_COLOR)
            
            # Additional accent shape for the Axon style
            accent_points = [
                (logo_x + 20, logo_y + 20),
                (logo_x + 35, logo_y + 15),
                (logo_x + 30, logo_y + 35),
            ]
            draw.polygon(accent_points, fill=IntroStyles.LOGO_ACCENT_COLOR)
            
            # Text area using style configuration
            text_x = IntroStyles.TEXT_X_OFFSET
            text_y = IntroStyles.TEXT_Y_START
            
            # Load fonts using style configuration
            font_team = get_font(PRIMARY_FONT_PATH, IntroStyles.TEAM_SIZE)
            font_name = get_font(PRIMARY_FONT_PATH, IntroStyles.NAME_SIZE)
            font_role = get_font(PRIMARY_FONT_PATH, IntroStyles.ROLE_SIZE)
            
            # Draw text elements using style configuration
            current_y = text_y
            if team:
                draw.text((text_x, current_y), team, fill=IntroStyles.TEAM_COLOR, font=font_team)
                current_y += IntroStyles.TEAM_LINE_HEIGHT
            
            if full_name:
                draw.text((text_x, current_y), full_name, fill=IntroStyles.NAME_COLOR, font=font_name)
                current_y += IntroStyles.NAME_LINE_HEIGHT
            
            if role:
                draw.text((text_x, current_y), role, fill=IntroStyles.ROLE_COLOR, font=font_role)
            
            # Save the image
            img.save(output_path, 'PNG')
            print(f"Intro overlay generated using Pillow: {output_path}")
            return output_path
            
        except ImportError:
            raise Exception("Pillow not available. Cannot generate intro overlay.")
        except Exception as e:
            raise Exception(f"Failed to create intro overlay: {str(e)}")
    
    def _draw_rounded_rectangle(self, draw, coords, radius, fill=None, outline=None):
        """Draw a rounded rectangle using Pillow."""
        x1, y1, x2, y2 = coords
        
        # Draw the main rectangle
        draw.rectangle([x1 + radius, y1, x2 - radius, y2], fill=fill, outline=outline)
        draw.rectangle([x1, y1 + radius, x2, y2 - radius], fill=fill, outline=outline)
        
        # Draw the corners
        draw.pieslice([x1, y1, x1 + 2*radius, y1 + 2*radius], 180, 270, fill=fill, outline=outline)
        draw.pieslice([x2 - 2*radius, y1, x2, y1 + 2*radius], 270, 360, fill=fill, outline=outline)
        draw.pieslice([x1, y2 - 2*radius, x1 + 2*radius, y2], 90, 180, fill=fill, outline=outline)
        draw.pieslice([x2 - 2*radius, y2 - 2*radius, x2, y2], 0, 90, fill=fill, outline=outline)


