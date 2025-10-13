import tempfile
from pathlib import Path
from typing import Optional
from PIL import Image, ImageDraw, ImageFont
# Import styling constants from the dedicated styles file
from .styles import (
    PRIMARY_FONT_PATH,
    PersonaStyles,
    get_font
)

class PersonaOverlayGenerator:
    """Generate PNG overlays for persona templates using Pillow with centralized styling"""
    
    def __init__(self):
        """Initialize the persona overlay generator"""
        self.temp_dir = Path(tempfile.gettempdir()) / "persona_overlays"
        self.temp_dir.mkdir(exist_ok=True)
        
    async def generate_persona_overlay_png(
        self, 
        name: str = "", 
        title: str = "", 
        industry: str = ""
    ) -> Optional[str]:
        """
        Generate a PNG overlay for persona template with name, title, and industry using Pillow
        
        Args:
            name: Person's name
            title: Person's job title or role
            industry: Industry or description
            
        Returns:
            Path to generated PNG file or None if failed
        """
        try:
            # Calculate content-based dimensions using style configuration
            text_lines = []
            if name: text_lines.append(name)
            if title: text_lines.append(title)
            if industry: text_lines.append(industry[:PersonaStyles.INDUSTRY_MAX_CHARS] + "..." if len(industry) > PersonaStyles.INDUSTRY_MAX_CHARS else industry)
            
            # Estimate width based on content using style configuration
            max_text_width = max([len(line) for line in text_lines]) * PersonaStyles.CONTENT_ESTIMATE_CHAR_WIDTH if text_lines else 20
            content_width = min(max(max_text_width + PersonaStyles.LOGO_TEXT_PADDING, PersonaStyles.MIN_WIDTH), PersonaStyles.MAX_WIDTH)
            content_height = max(PersonaStyles.MIN_HEIGHT, len([line for line in text_lines if line]) * PersonaStyles.BASE_HEIGHT_PER_LINE + PersonaStyles.BASE_HEIGHT_PADDING)
            
            # Create a content-sized overlay image
            img = Image.new('RGBA', (content_width, content_height), (0, 0, 0, 0))
            draw = ImageDraw.Draw(img)
            
            # Load fonts using style configuration
            name_font = get_font(PRIMARY_FONT_PATH, PersonaStyles.NAME_SIZE)
            title_font = get_font(PRIMARY_FONT_PATH, PersonaStyles.TITLE_SIZE)
            industry_font = get_font(PRIMARY_FONT_PATH, PersonaStyles.INDUSTRY_SIZE)
            
            # Draw background using style configuration
            draw.rounded_rectangle([(0, 0), (content_width, content_height)], radius=PersonaStyles.BORDER_RADIUS, fill=PersonaStyles.BG_COLOR)
            
            # Draw text in order: industry, name, title using style configuration
            y_offset = PersonaStyles.TEXT_PADDING_Y
            if industry:
                # Truncate industry using style configuration
                industry_text = industry[:PersonaStyles.INDUSTRY_MAX_CHARS] + "..." if len(industry) > PersonaStyles.INDUSTRY_MAX_CHARS else industry
                draw.text((PersonaStyles.TEXT_PADDING_X, y_offset), industry_text, fill=PersonaStyles.TEXT_COLOR, font=industry_font)
                y_offset += PersonaStyles.INDUSTRY_LINE_HEIGHT
            if name:
                draw.text((PersonaStyles.TEXT_PADDING_X, y_offset), name, fill=PersonaStyles.TEXT_COLOR, font=name_font)
                y_offset += PersonaStyles.NAME_LINE_HEIGHT
            if title:
                draw.text((PersonaStyles.TEXT_PADDING_X, y_offset), title, fill=PersonaStyles.TEXT_COLOR, font=title_font)
                y_offset += PersonaStyles.TITLE_LINE_HEIGHT
            
            # Save the image
            output_path = self.temp_dir / f"persona_overlay_{hash(name + title + industry)}.png"
            img.save(output_path, "PNG")
            print(f"Persona overlay generated using Pillow: {output_path}")
            
            return str(output_path)
            
        except Exception as e:
            print(f"Error generating persona overlay: {e}")
            return None
    
