import tempfile
from pathlib import Path
from typing import Optional

# Import styling constants from the dedicated styles file
from .styles import (
    PRIMARY_FONT_PATH,
    SF_PRO_ROUNDED_REGULAR,
    SF_PRO_ROUNDED_BOLD,
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
            self._draw_rounded_rectangle_clean(
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
            
            self._draw_rounded_rectangle_clean(
                draw,
                [logo_x, logo_y, logo_x + logo_size, logo_y + logo_size],
                radius=IntroStyles.LOGO_RADIUS,
                fill=IntroStyles.LOGO_BG_COLOR,
                outline=None  # No border
            )
            
            # Load and paste the actual Axon logo image
            # Path should go up 3 levels: utils -> app -> backend -> project root
            logo_img_path = Path(__file__).resolve().parents[3] / "frontend" / "public" / "logoAxonStyled.png"
            if logo_img_path.exists():
                try:
                    logo_img = Image.open(logo_img_path).convert('RGBA')
                    # Resize logo to exact 200x200 size for the new styled logo
                    logo_img = logo_img.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
                    
                    # Paste at logo position (no centering needed - exact size)
                    img.paste(logo_img, (logo_x, logo_y), logo_img)
                except Exception as e:
                    print(f"Warning: Could not load logo image: {e}. Using placeholder.")
                    # Fallback to placeholder if logo fails to load
                    self._draw_logo_placeholder(draw, logo_x, logo_y, logo_size)
            else:
                print(f"Warning: Logo not found at {logo_img_path}. Using placeholder.")
                self._draw_logo_placeholder(draw, logo_x, logo_y, logo_size)
            
            # Text area using style configuration
            text_x = IntroStyles.TEXT_X_OFFSET
            text_y = IntroStyles.TEXT_Y_START
            
            # Load fonts using style configuration
            font_team = get_font(SF_PRO_ROUNDED_REGULAR, IntroStyles.TEAM_SIZE)  # Use regular weight
            font_name = get_font(SF_PRO_ROUNDED_BOLD, IntroStyles.NAME_SIZE)  # Use bold for name
            font_role = get_font(PRIMARY_FONT_PATH, IntroStyles.ROLE_SIZE)  # Semibold for role
            
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
            
            # Save the image with optimization
            img.save(output_path, 'PNG', optimize=False, compress_level=0)
            print(f"Intro overlay generated using Pillow: {output_path}")
            return output_path
            
        except ImportError:
            raise Exception("Pillow not available. Cannot generate intro overlay.")
        except Exception as e:
            raise Exception(f"Failed to create intro overlay: {str(e)}")
    
    def _draw_rounded_rectangle_clean(self, draw, coords, radius, fill=None, outline=None, width=1):
        """Draw a rounded rectangle using Pillow without overlapping artifacts."""
        from PIL import Image, ImageDraw
        
        x1, y1, x2, y2 = coords
        rect_width = x2 - x1
        rect_height = y2 - y1
        
        # Create a temporary image for the rounded rectangle to avoid overlaps
        temp = Image.new('RGBA', (rect_width, rect_height), (0, 0, 0, 0))
        temp_draw = ImageDraw.Draw(temp)
        
        # Draw using the modern rounded_rectangle method if available (Pillow 8.2.0+)
        try:
            temp_draw.rounded_rectangle(
                [(0, 0), (rect_width, rect_height)],
                radius=radius,
                fill=fill,
                outline=outline,
                width=width  # Explicitly set border width (default 1px)
            )
        except AttributeError:
            # Fallback for older Pillow versions - draw without overlaps
            # Draw center rectangle
            temp_draw.rectangle([radius, 0, rect_width - radius, rect_height], fill=fill)
            temp_draw.rectangle([0, radius, rect_width, rect_height - radius], fill=fill)
            
            # Draw corners
            temp_draw.pieslice([0, 0, 2*radius, 2*radius], 180, 270, fill=fill)
            temp_draw.pieslice([rect_width - 2*radius, 0, rect_width, 2*radius], 270, 360, fill=fill)
            temp_draw.pieslice([0, rect_height - 2*radius, 2*radius, rect_height], 90, 180, fill=fill)
            temp_draw.pieslice([rect_width - 2*radius, rect_height - 2*radius, rect_width, rect_height], 0, 90, fill=fill)
            
            # Draw outline if specified
            if outline:
                temp_draw.arc([0, 0, 2*radius, 2*radius], 180, 270, fill=outline)
                temp_draw.arc([rect_width - 2*radius, 0, rect_width, 2*radius], 270, 360, fill=outline)
                temp_draw.arc([0, rect_height - 2*radius, 2*radius, rect_height], 90, 180, fill=outline)
                temp_draw.arc([rect_width - 2*radius, rect_height - 2*radius, rect_width, rect_height], 0, 90, fill=outline)
                temp_draw.line([(radius, 0), (rect_width - radius, 0)], fill=outline, width=width)
                temp_draw.line([(radius, rect_height), (rect_width - radius, rect_height)], fill=outline, width=width)
                temp_draw.line([(0, radius), (0, rect_height - radius)], fill=outline, width=width)
                temp_draw.line([(rect_width, radius), (rect_width, rect_height - radius)], fill=outline, width=width)
        
        # Paste the temporary image onto the main image
        draw._image.paste(temp, (int(x1), int(y1)), temp)
    
    def _draw_logo_placeholder(self, draw, logo_x, logo_y, logo_size):
        """Draw a placeholder logo when the actual logo image is not available."""
        # Simple placeholder - draw initials "A" for Axon
        from PIL import ImageFont
        
        try:
            placeholder_font = get_font(PRIMARY_FONT_PATH, 32)
            text = "A"
            bbox = draw.textbbox((0, 0), text, font=placeholder_font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            
            # Center the text in the logo container
            text_x = logo_x + (logo_size - text_width) // 2
            text_y = logo_y + (logo_size - text_height) // 2
            
            draw.text((text_x, text_y), text, fill=(255, 255, 255, 255), font=placeholder_font)
        except Exception as e:
            print(f"Warning: Could not draw placeholder logo: {e}")
    
    def _draw_rounded_rectangle(self, draw, coords, radius, fill=None, outline=None):
        """Draw a rounded rectangle using Pillow (legacy method)."""
        x1, y1, x2, y2 = coords
        
        # Draw the main rectangle
        draw.rectangle([x1 + radius, y1, x2 - radius, y2], fill=fill, outline=outline)
        draw.rectangle([x1, y1 + radius, x2, y2 - radius], fill=fill, outline=outline)
        
        # Draw the corners
        draw.pieslice([x1, y1, x1 + 2*radius, y1 + 2*radius], 180, 270, fill=fill, outline=outline)
        draw.pieslice([x2 - 2*radius, y1, x2, y1 + 2*radius], 270, 360, fill=fill, outline=outline)
        draw.pieslice([x1, y2 - 2*radius, x1 + 2*radius, y2], 90, 180, fill=fill, outline=outline)
        draw.pieslice([x2 - 2*radius, y2 - 2*radius, x2, y2], 0, 90, fill=fill, outline=outline)
    
    def cleanup_temp_file(self, file_path: str):
        """Clean up a temporary file if it exists."""
        try:
            if file_path and Path(file_path).exists():
                Path(file_path).unlink()
        except Exception as e:
            print(f"Warning: Could not clean up temp file {file_path}: {e}")


