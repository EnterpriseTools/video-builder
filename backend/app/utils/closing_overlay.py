import tempfile
import datetime
from pathlib import Path
from typing import Optional
from PIL import Image, ImageDraw, ImageFont

# Import all styling constants from the dedicated styles file
from .styles import (
    CANVAS_WIDTH, CANVAS_HEIGHT,
    PRIMARY_FONT_PATH,
    SHADOW_COLOR, TEAM_SEPARATOR_GAP,
    BOLD_OFFSET_X_RANGE, BOLD_OFFSET_Y_RANGE,
    BOTTOM_TEXT_OFFSET,
    ClosingStyles,
    get_font, get_logo_path
)

class ClosingOverlayGenerator:
    """
    Dedicated overlay generator for Closing template.
    Completely separate from other generators to prevent cross-contamination.
    """
    
    def __init__(self):
        pass
        
    async def generate_closing_overlay_png(
        self, 
        title: Optional[str] = "", 
        subtitle: Optional[str] = "",
        email: Optional[str] = "",
        team_name: Optional[str] = "",
        director_name: Optional[str] = "",
        output_path: Optional[str] = None
    ) -> str:
        """
        Generate a PNG overlay image for closing with Axon-branded layout.
        
        Args:
            title: Main title (e.g., "Thank you.")
            subtitle: Subtitle text (e.g., "If you have any questions:")
            email: Email address
            team_name: Team name for bottom left
            director_name: Director name for bottom left
            output_path: Optional output path for the PNG. If None, uses temp file.
            
        Returns:
            Path to the generated PNG file
        """
        
        if output_path is None:
            # Create temporary file for the PNG
            temp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
            output_path = temp_file.name
            temp_file.close()
        
        return self._create_closing_overlay(
            title or '', 
            subtitle or '', 
            email or '',
            team_name or '',
            director_name or '', 
            output_path
        )
    
    def _create_closing_overlay(
        self, 
        title: str, 
        subtitle: str,
        email: str,
        team_name: str,
        director_name: str, 
        output_path: str
    ) -> str:
        """Create closing overlay using Pillow with Axon-branded layout."""
        try:
            # Create full-screen overlay using configured dimensions
            img = Image.new('RGBA', (CANVAS_WIDTH, CANVAS_HEIGHT), (0, 0, 0, 0))
            draw = ImageDraw.Draw(img)
            
            # Load fonts using style configuration
            title_font = get_font(PRIMARY_FONT_PATH, ClosingStyles.TITLE_SIZE)
            subtitle_font = get_font(PRIMARY_FONT_PATH, ClosingStyles.SUBTITLE_SIZE)
            email_font = get_font(PRIMARY_FONT_PATH, ClosingStyles.EMAIL_SIZE)
            small_font = get_font(PRIMARY_FONT_PATH, ClosingStyles.SMALL_TEXT_SIZE)
            
            # Positioning to match frontend percentages
            # Frontend uses: logo 35%, title 50%, subtitle 65%, email 72%
            
            # Draw Axon logo using style configuration
            logo_y = int(CANVAS_HEIGHT * ClosingStyles.LOGO_Y)
            
            # Load and resize the Axon logo image using utility function
            logo_path = get_logo_path()
            
            # Ensure logo exists
            if not logo_path.exists():
                raise Exception(f"Required logo file not found: {logo_path}")
            
            # Load the logo image
            logo_img = Image.open(logo_path)
            # Convert to RGBA if needed
            if logo_img.mode != 'RGBA':
                logo_img = logo_img.convert('RGBA')
            
            # Resize using style configuration
            aspect_ratio = logo_img.height / logo_img.width
            logo_height = int(ClosingStyles.LOGO_WIDTH * aspect_ratio)
            logo_img = logo_img.resize((ClosingStyles.LOGO_WIDTH, logo_height), Image.Resampling.LANCZOS)
            
            # Center the logo horizontally
            logo_x = (CANVAS_WIDTH - ClosingStyles.LOGO_WIDTH) // 2
            logo_y_pos = logo_y - (logo_height // 2)  # Center vertically on the y position
            
            # Paste the logo onto the overlay
            img.paste(logo_img, (logo_x, logo_y_pos), logo_img)
            
            # Draw title using style configuration
            title_y = int(CANVAS_HEIGHT * ClosingStyles.TITLE_Y)
            if title:
                bbox = draw.textbbox((0, 0), title, font=title_font)
                title_x = (CANVAS_WIDTH - (bbox[2] - bbox[0])) // 2
                # Draw title with configured shadow
                shadow_x, shadow_y = ClosingStyles.TITLE_SHADOW
                draw.text((title_x + shadow_x, title_y + shadow_y), title, font=title_font, fill=SHADOW_COLOR)
                # Draw bold effect using configured ranges
                for offset_x in range(0, BOLD_OFFSET_X_RANGE):
                    for offset_y in range(0, BOLD_OFFSET_Y_RANGE):
                        draw.text((title_x + offset_x, title_y + offset_y), title, font=title_font, fill=ClosingStyles.TITLE_COLOR)
            
            # Draw subtitle using style configuration
            subtitle_y = int(CANVAS_HEIGHT * ClosingStyles.SUBTITLE_Y)
            if subtitle:
                bbox = draw.textbbox((0, 0), subtitle, font=subtitle_font)
                subtitle_x = (CANVAS_WIDTH - (bbox[2] - bbox[0])) // 2
                # Draw subtitle with configured shadow
                shadow_x, shadow_y = ClosingStyles.SUBTITLE_SHADOW
                draw.text((subtitle_x + shadow_x, subtitle_y + shadow_y), subtitle, font=subtitle_font, fill=SHADOW_COLOR)
                draw.text((subtitle_x, subtitle_y), subtitle, font=subtitle_font, fill=ClosingStyles.SUBTITLE_COLOR)
            
            # Draw email using style configuration
            email_y = int(CANVAS_HEIGHT * ClosingStyles.EMAIL_Y)
            if email:
                bbox = draw.textbbox((0, 0), email, font=email_font)
                email_x = (CANVAS_WIDTH - (bbox[2] - bbox[0])) // 2
                # Draw email with configured shadow
                shadow_x, shadow_y = ClosingStyles.EMAIL_SHADOW
                draw.text((email_x + shadow_x, email_y + shadow_y), email, font=email_font, fill=SHADOW_COLOR)
                # Draw bold effect using configured ranges
                for offset_x in range(0, BOLD_OFFSET_X_RANGE):
                    for offset_y in range(0, BOLD_OFFSET_Y_RANGE):
                        draw.text((email_x + offset_x, email_y + offset_y), email, font=email_font, fill=ClosingStyles.EMAIL_COLOR)
            
            # Draw bottom left team info using style configuration
            bottom_y = CANVAS_HEIGHT - ClosingStyles.BOTTOM_LEFT_MARGIN
            current_x = ClosingStyles.BOTTOM_LEFT_MARGIN
            text_y = bottom_y - BOTTOM_TEXT_OFFSET
            
            # Configure shadow offset for small text
            shadow_x, shadow_y = ClosingStyles.SMALL_SHADOW
            
            # Show team name if provided
            if team_name:
                draw.text((current_x + shadow_x, text_y + shadow_y), team_name, font=small_font, fill=SHADOW_COLOR)
                draw.text((current_x, text_y), team_name, font=small_font, fill=ClosingStyles.SMALL_TEXT_COLOR)
                
                # Get text width to position separator
                bbox = draw.textbbox((0, 0), team_name, font=small_font)
                current_x += (bbox[2] - bbox[0]) + TEAM_SEPARATOR_GAP
            
            # Add separator "|" if both team and director name exist
            if team_name and director_name:
                separator = "|"
                draw.text((current_x + shadow_x, text_y + shadow_y), separator, font=small_font, fill=SHADOW_COLOR)
                draw.text((current_x, text_y), separator, font=small_font, fill=ClosingStyles.SMALL_TEXT_COLOR)
                
                # Get separator width
                bbox = draw.textbbox((0, 0), separator, font=small_font)
                current_x += (bbox[2] - bbox[0]) + TEAM_SEPARATOR_GAP
            
            # Show director name if provided
            if director_name:
                draw.text((current_x + shadow_x, text_y + shadow_y), director_name, font=small_font, fill=SHADOW_COLOR)
                draw.text((current_x, text_y), director_name, font=small_font, fill=ClosingStyles.SMALL_TEXT_COLOR)
            
            # Show placeholder if no team info (match frontend)
            if not team_name and not director_name:
                placeholder = "Enter team name..."
                draw.text((ClosingStyles.BOTTOM_LEFT_MARGIN + shadow_x, text_y + shadow_y), placeholder, font=small_font, fill=SHADOW_COLOR)
                draw.text((ClosingStyles.BOTTOM_LEFT_MARGIN, text_y), placeholder, font=small_font, fill=ClosingStyles.SMALL_TEXT_COLOR)
            
            # Draw bottom right company info using style configuration
            current_year = datetime.datetime.now().year
            company_text = f"Axon Enterprise {current_year}"
            
            bbox = draw.textbbox((0, 0), company_text, font=small_font)
            company_x = CANVAS_WIDTH - (bbox[2] - bbox[0]) - ClosingStyles.BOTTOM_RIGHT_MARGIN
            company_y = CANVAS_HEIGHT - ClosingStyles.BOTTOM_RIGHT_MARGIN - BOTTOM_TEXT_OFFSET
            
            # Use configured shadow offset for small text
            shadow_x, shadow_y = ClosingStyles.SMALL_SHADOW
            draw.text((company_x + shadow_x, company_y + shadow_y), company_text, font=small_font, fill=SHADOW_COLOR)
            draw.text((company_x, company_y), company_text, font=small_font, fill=ClosingStyles.SMALL_TEXT_COLOR)
            
            # Save the image
            img.save(output_path, 'PNG')
            print(f"Closing overlay generated: {output_path}")
            return output_path
            
        except ImportError:
            raise Exception("Pillow not available. Cannot generate closing overlay.")
        except Exception as e:
            raise Exception(f"Failed to create closing overlay: {str(e)}")

