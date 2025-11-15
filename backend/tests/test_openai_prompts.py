"""
Unit tests for OpenAI prompt templates.

Verifies that prompt templates contain required placeholders
and maintain proper structure for image generation.
"""
import pytest
from app.utils.openai_prompts import (
    PERSONA_CONVERSATION_SYSTEM_PROMPT,
    PERSONA_IMAGE_GENERATION_PROMPT_TEMPLATE,
    DEFAULT_PERSONA_IMAGE_PROMPT
)


class TestPersonaPromptTemplates:
    """Test suite for persona prompt template validation."""
    
    def test_conversation_prompt_exists(self):
        """Verify conversation system prompt is defined and not empty."""
        assert PERSONA_CONVERSATION_SYSTEM_PROMPT
        assert len(PERSONA_CONVERSATION_SYSTEM_PROMPT) > 0
        assert isinstance(PERSONA_CONVERSATION_SYSTEM_PROMPT, str)
    
    def test_image_generation_template_contains_required_placeholders(self):
        """
        Verify image generation template contains all required placeholders.
        
        This ensures that the template can be properly formatted with user inputs
        before being sent to DALL-E 3 for image generation.
        """
        required_placeholders = [
            '{subject}',
            '{location}',
            '{attire}',
            '{background}'
        ]
        
        for placeholder in required_placeholders:
            assert placeholder in PERSONA_IMAGE_GENERATION_PROMPT_TEMPLATE, (
                f"Missing required placeholder: {placeholder}"
            )
    
    def test_image_generation_template_contains_technical_requirements(self):
        """Verify template includes key technical specifications."""
        template = PERSONA_IMAGE_GENERATION_PROMPT_TEMPLATE
        
        # Check for aspect ratio specification
        assert '16:9' in template or '1920' in template or '1080' in template, (
            "Template should specify 16:9 aspect ratio or 1920x1080 dimensions"
        )
        
        # Check for key quality indicators
        quality_keywords = ['realistic', 'professional', 'high-resolution', 'photograph']
        assert any(keyword in template.lower() for keyword in quality_keywords), (
            "Template should include quality/style specifications"
        )
    
    def test_image_generation_template_structure(self):
        """Verify template has proper structure and formatting."""
        template = PERSONA_IMAGE_GENERATION_PROMPT_TEMPLATE
        
        # Should be multi-line for readability
        assert '\n' in template, "Template should be multi-line for clarity"
        
        # Should not be excessively short
        assert len(template) > 100, "Template should contain detailed instructions"
    
    def test_default_prompt_exists_and_valid(self):
        """Verify default prompt is defined for fallback scenarios."""
        assert DEFAULT_PERSONA_IMAGE_PROMPT
        assert len(DEFAULT_PERSONA_IMAGE_PROMPT) > 0
        assert isinstance(DEFAULT_PERSONA_IMAGE_PROMPT, str)
        
        # Should mention aspect ratio
        assert '16:9' in DEFAULT_PERSONA_IMAGE_PROMPT or '1920' in DEFAULT_PERSONA_IMAGE_PROMPT, (
            "Default prompt should specify image dimensions"
        )
    
    def test_template_can_be_formatted(self):
        """Verify template can be formatted with sample data without errors."""
        sample_data = {
            'subject': 'Police officer',
            'location': 'Urban street',
            'attire': 'Standard patrol uniform',
            'background': 'City buildings in soft focus'
        }
        
        try:
            formatted = PERSONA_IMAGE_GENERATION_PROMPT_TEMPLATE.format(**sample_data)
            assert formatted
            
            # Verify placeholders were replaced
            assert '{subject}' not in formatted
            assert '{location}' not in formatted
            assert '{attire}' not in formatted
            assert '{background}' not in formatted
            
            # Verify actual values are present
            assert 'Police officer' in formatted
            assert 'Urban street' in formatted
            
        except KeyError as e:
            pytest.fail(f"Template formatting failed due to missing placeholder: {e}")
        except Exception as e:
            pytest.fail(f"Unexpected error during template formatting: {e}")
    
    def test_conversation_prompt_contains_guidelines(self):
        """Verify conversation prompt includes guidance for the AI."""
        prompt = PERSONA_CONVERSATION_SYSTEM_PROMPT
        
        # Should contain instructional language
        instructional_keywords = ['ask', 'question', 'help', 'user', 'provide']
        assert any(keyword in prompt.lower() for keyword in instructional_keywords), (
            "Conversation prompt should contain instructions for the AI"
        )
    
    def test_no_extra_placeholders_in_template(self):
        """Verify template doesn't contain unexpected placeholder syntax."""
        template = PERSONA_IMAGE_GENERATION_PROMPT_TEMPLATE
        
        # Find all {placeholder} patterns
        import re
        placeholders = re.findall(r'\{(\w+)\}', template)
        
        expected = {'subject', 'location', 'attire', 'background'}
        found = set(placeholders)
        
        unexpected = found - expected
        assert not unexpected, (
            f"Template contains unexpected placeholders: {unexpected}. "
            f"Only {expected} are allowed."
        )

