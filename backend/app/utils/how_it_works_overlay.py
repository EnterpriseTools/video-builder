import tempfile
from pathlib import Path
from typing import Optional
from PIL import Image, ImageDraw, ImageFont
import textwrap

# Import styling constants from the dedicated styles file
from .styles import (
    PRIMARY_FONT_PATH,
    SHADOW_COLOR,
    HowItWorksStyles,
    get_font
)

class HowItWorksOverlayGenerator:
    """
    Dedicated overlay generator for HowItWorks template.
    Completely separate from other generators to prevent cross-contamination.
    """
    
    def __init__(self):
        pass
        
    async def generate_how_it_works_overlay_png(
        self, 
        title: Optional[str] = "", 
        subtitle: Optional[str] = "",
        step_number: Optional[str] = "",
        description: Optional[str] = "", 
        output_path: Optional[str] = None
    ) -> str:
        """
        Generate a PNG overlay image for how it works with step-based layout.
        
        Args:
            title: Main title
            subtitle: Subtitle text
            step_number: Step number (e.g., "01", "02")
            description: Step description
            output_path: Optional output path for the PNG. If None, uses temp file.
            
        Returns:
            Path to the generated PNG file
        """
        
        if output_path is None:
            # Create temporary file for the PNG
            temp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
            output_path = temp_file.name
            temp_file.close()
        
        return self._create_how_it_works_overlay(
            title or '', 
            subtitle or '', 
            step_number or '',
            description or '', 
            output_path
        )
    
    def _create_how_it_works_overlay(
        self, 
        title: str, 
        subtitle: str,
        step_number: str,
        description: str, 
        output_path: str
    ) -> str:
        """Create how it works overlay using Pillow with style configuration."""
        try:
            # Calculate dynamic size based on content using style configuration
            base_width = HowItWorksStyles.BASE_WIDTH
            
            # Estimate height based on content (only title and description matter)
            content_elements = [title, description]
            filled_elements = [elem for elem in content_elements if elem.strip()]
            
            if len(filled_elements) >= 2:
                base_height = HowItWorksStyles.BASE_HEIGHT_BOTH
            elif len(filled_elements) >= 1:
                base_height = HowItWorksStyles.BASE_HEIGHT_SINGLE
            else:
                base_height = HowItWorksStyles.BASE_HEIGHT_MIN
            
            # Create image with transparent background
            img = Image.new('RGBA', (base_width, base_height), (0, 0, 0, 0))
            draw = ImageDraw.Draw(img)
            
            # Load fonts using style configuration
            title_font = get_font(PRIMARY_FONT_PATH, HowItWorksStyles.TITLE_SIZE)
            desc_font = get_font(PRIMARY_FONT_PATH, HowItWorksStyles.DESCRIPTION_SIZE)
            
            # Calculate text positioning using style configuration
            y_offset = HowItWorksStyles.PADDING
            
            # Draw title using style configuration
            if title:
                wrapped_title = textwrap.fill(title, width=HowItWorksStyles.TITLE_WRAP_WIDTH)
                title_lines = wrapped_title.split('\n')
                
                for line in title_lines:
                    bbox = draw.textbbox((0, 0), line, font=title_font)
                    # Center the text horizontally
                    x = (base_width - (bbox[2] - bbox[0])) // 2
                    
                    # Draw text with configured shadow
                    shadow_x, shadow_y = HowItWorksStyles.TITLE_SHADOW
                    draw.text((x + shadow_x, y_offset + shadow_y), line, font=title_font, fill=SHADOW_COLOR)
                    draw.text((x, y_offset), line, font=title_font, fill=HowItWorksStyles.TITLE_COLOR)
                    
                    y_offset += bbox[3] - bbox[1] + HowItWorksStyles.TITLE_LINE_SPACING
                
                y_offset += HowItWorksStyles.TITLE_DESC_SPACING
            
            
            # Draw description using style configuration
            if description:
                wrapped_desc = textwrap.fill(description, width=HowItWorksStyles.DESCRIPTION_WRAP_WIDTH)
                desc_lines = wrapped_desc.split('\n')
                
                for line in desc_lines:
                    bbox = draw.textbbox((0, 0), line, font=desc_font)
                    # Center the text horizontally
                    x = (base_width - (bbox[2] - bbox[0])) // 2
                    
                    # Draw text with configured shadow
                    shadow_x, shadow_y = HowItWorksStyles.DESCRIPTION_SHADOW
                    draw.text((x + shadow_x, y_offset + shadow_y), line, font=desc_font, fill=SHADOW_COLOR)
                    draw.text((x, y_offset), line, font=desc_font, fill=HowItWorksStyles.DESCRIPTION_COLOR)
                    
                    y_offset += bbox[3] - bbox[1] + HowItWorksStyles.DESCRIPTION_LINE_SPACING
            
            # Save the image
            img.save(output_path, 'PNG')
            print(f"How It Works overlay generated: {output_path}")
            return output_path
            
        except ImportError:
            raise Exception("Pillow not available. Cannot generate how it works overlay.")
        except Exception as e:
            raise Exception(f"Failed to create how it works overlay: {str(e)}")

