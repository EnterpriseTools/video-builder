import tempfile
from pathlib import Path
from typing import Optional
from PIL import Image, ImageDraw, ImageFont
import textwrap

# Import styling constants from the dedicated styles file
from .styles import (
    PRIMARY_FONT_PATH,
    SHADOW_COLOR,
    AnnouncementStyles,
    get_font,
    BOLD_OFFSET_X_RANGE,
    BOLD_OFFSET_Y_RANGE
)

class AnnouncementOverlayGenerator:
    """
    Dedicated overlay generator for Announcement template.
    Completely separate from IntroOverlayGenerator to prevent cross-contamination.
    """
    
    def __init__(self):
        pass
        
    async def generate_announcement_overlay_png(
        self, 
        title: Optional[str] = "", 
        description: Optional[str] = "", 
        output_path: Optional[str] = None
    ) -> str:
        """
        Generate a PNG overlay image for announcements using Pillow.
        
        Args:
            title: Announcement title
            description: Announcement description
            output_path: Optional output path for the PNG. If None, uses temp file.
            
        Returns:
            Path to the generated PNG file
        """
        
        if output_path is None:
            # Create temporary file for the PNG
            temp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
            output_path = temp_file.name
            temp_file.close()
        
        return self._create_announcement_overlay(title or '', description or '', output_path)
    
    def _create_announcement_overlay(self, title: str, description: str, output_path: str) -> str:
        """Create announcement overlay using Pillow with style configuration."""
        try:
            # Calculate dynamic size based on content using style configuration
            base_width = AnnouncementStyles.BASE_WIDTH
            
            # Estimate height based on content
            if title and description:
                base_height = AnnouncementStyles.BASE_HEIGHT_BOTH
            elif title or description:
                base_height = AnnouncementStyles.BASE_HEIGHT_SINGLE
            else:
                base_height = AnnouncementStyles.BASE_HEIGHT_MIN
            
            # Create image with transparent background
            img = Image.new('RGBA', (base_width, base_height), (0, 0, 0, 0))
            draw = ImageDraw.Draw(img)
            
            # Load fonts using style configuration
            title_font = get_font(PRIMARY_FONT_PATH, AnnouncementStyles.TITLE_SIZE)
            desc_font = get_font(PRIMARY_FONT_PATH, AnnouncementStyles.DESCRIPTION_SIZE)
            
            # Debug: Print actual font sizes being used
            print(f"DEBUG: Title font size: {AnnouncementStyles.TITLE_SIZE}px")
            print(f"DEBUG: Description font size: {AnnouncementStyles.DESCRIPTION_SIZE}px")
            print(f"DEBUG: Canvas dimensions: {base_width}x{base_height}")
            
            # No background - just transparent text overlay to match screenshot
            # The background will be handled by the video composition
            
            # Calculate text positioning using style configuration
            y_offset = AnnouncementStyles.PADDING
            
            # Draw title using style configuration (with bold effect)
            if title:
                # Wrap title text
                wrapped_title = textwrap.fill(title, width=AnnouncementStyles.TITLE_WRAP_WIDTH)
                title_lines = wrapped_title.split('\n')
                
                for line in title_lines:
                    bbox = draw.textbbox((0, 0), line, font=title_font)
                    x = 0  # Left-aligned
                    
                    # Draw text with configured shadow
                    shadow_x, shadow_y = AnnouncementStyles.TITLE_SHADOW
                    draw.text((x + shadow_x, y_offset + shadow_y), line, font=title_font, fill=SHADOW_COLOR)
                    
                    # Draw text multiple times with slight offset to simulate bold (font-weight: 700)
                    for bold_x in range(BOLD_OFFSET_X_RANGE):
                        for bold_y in range(BOLD_OFFSET_Y_RANGE):
                            draw.text((x + bold_x, y_offset + bold_y), line, font=title_font, fill=AnnouncementStyles.TITLE_COLOR)
                    
                    y_offset += bbox[3] - bbox[1] + AnnouncementStyles.TITLE_LINE_SPACING
                
                y_offset += AnnouncementStyles.TITLE_DESC_SPACING
            
            # Draw description using style configuration
            if description:
                # Wrap description text
                wrapped_desc = textwrap.fill(description, width=AnnouncementStyles.DESCRIPTION_WRAP_WIDTH)
                desc_lines = wrapped_desc.split('\n')
                
                for line in desc_lines:
                    bbox = draw.textbbox((0, 0), line, font=desc_font)
                    x = 0  # Left-aligned
                    
                    # Draw text with configured shadow
                    shadow_x, shadow_y = AnnouncementStyles.DESCRIPTION_SHADOW
                    draw.text((x + shadow_x, y_offset + shadow_y), line, font=desc_font, fill=SHADOW_COLOR)
                    draw.text((x, y_offset), line, font=desc_font, fill=AnnouncementStyles.DESCRIPTION_COLOR)
                    
                    y_offset += bbox[3] - bbox[1] + AnnouncementStyles.DESCRIPTION_LINE_SPACING
            
            # Save the image
            img.save(output_path, 'PNG')
            print(f"Announcement overlay generated: {output_path}")
            return output_path
            
        except ImportError:
            raise Exception("Pillow not available. Cannot generate announcement overlay.")
        except Exception as e:
            raise Exception(f"Failed to create announcement overlay: {str(e)}")

