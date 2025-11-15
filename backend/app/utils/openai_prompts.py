# System prompt for the conversation agent that asks clarifying questions
PERSONA_CONVERSATION_SYSTEM_PROMPT = """\
You help users generate realistic user persona images for business case studies.

Your responsibilities:
1. The user will typically start by providing only a role or subject (e.g., "Police officer", "Nurse").
2. When that happens, respond with exactly the following three questions formatted as a numbered list:

1. Any specific location you'd like this person to be in?
2. Should they be wearing anything specific, or is their standard uniform okay?
3. Any specific details you'd like included?

Guidelines:
- Format your response as a numbered list (1., 2., 3.) with each question on its own line.
- Keep your tone concise, professional, and friendly.
- If the user clicks "Generate Image" without answering, fill missing details intelligently based on the subject.
- Do not generate the image or include image details here — collect or infer details only. The collected answers will be passed to the image-generation prompt.
- Do not ask additional questions.
"""

# Template for the final DALL-E 3 image generation prompt
# This will be filled with user-provided details
PERSONA_IMAGE_GENERATION_PROMPT_TEMPLATE = """\
The generations should be a realistic, 16:9 photograph of {subject}, standing in {location}, viewed from a camera, first person POV. The subject is wearing {attire}, with clear lighting and sharp detail. The image includes {background}. Style is realistic, documentary-style photography. Depth of field is moderate with background in focus. Lighting is bright and evenly distributed, typical of indoor retail environments.

TECHNICAL REQUIREMENTS:
- Strictly realistic, documentary‑style photography (no stylization, no illustration, no anime)
- Aspect ratio: 16:9 (1920 x 1080)
- Sharp detail and clear, even lighting
- Natural skin texture, natural proportions, and professional camera optics
- Neutral facial expression: calm, professional, no exaggerated emotion
- Body posture square to the camera, standing naturally
- Camera height at true eye level
- First‑person POV facing the subject
- No text, logos, watermarks, or visual clutter
"""

# Default prompt when user provides minimal information
DEFAULT_PERSONA_IMAGE_PROMPT = """\
Create a professional, realistic user persona photograph (16:9, 1920x1080) that represents the subject in a realistic way. This must be a real‑world photograph—never stylized, never animated, never illustrated.

Defaults (use when user omits details):
- Police officer: urban street or precinct interior; standard patrol uniform.
- Nurse: hospital corridor or nurse station; scrubs or clinical attire.
- Retail associate: store floor or checkout; branded polo or workwear.
- Security officer: lobby, control room, or patrol area; uniform appropriate to role.

Requirements:
- Strict realism: no anime, no illustration, no CGI‑looking results
- High‑resolution, documentary‑style photography
- 16:9 landscape aspect ratio (1920x1080)
- Clean background appropriate for business contexts
- Bright, evenly distributed lighting
- Moderate depth of field (background in focus)
- Neutral, professional facial expression (no strong emotion)
- Body facing square to the camera
- Eye-level camera height using a 35mm documentary-style lens
- No text, watermarks, or logos
"""