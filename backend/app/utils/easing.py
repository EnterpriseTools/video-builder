"""
FFmpeg easing functions for smooth, polished animations.

These functions return FFmpeg expression strings that can be used in overlay filters
to create smooth, professional animations with proper easing curves.

Reference: https://easings.net/ for visual examples of easing functions
"""

from typing import Literal

EasingType = Literal[
    "linear",           # No easing - constant speed
    "ease_out_cubic",   # Smooth deceleration - best for most slide animations
    "ease_out_quad",    # Gentler deceleration
    "ease_out_expo",    # Dramatic, snappy deceleration
    "ease_in_out_sine", # Smooth acceleration and deceleration
    "ease_out_back",    # Slight overshoot then settle (bouncy)
]


def get_easing_expression(
    easing: EasingType = "ease_out_cubic",
    normalized: bool = True
) -> str:
    """
    Get FFmpeg expression for easing function.
    
    Args:
        easing: Type of easing to apply
        normalized: If True, returns expression for t in [0,1]. 
                   If False, you need to normalize t yourself.
    
    Returns:
        FFmpeg expression string (without quotes) that evaluates to a value 0-1
        representing the eased progress of the animation.
        
    Usage:
        # For a slide animation from start_pos to end_pos over duration seconds:
        t_norm = f"t/{duration}"  # Normalize time to 0-1
        eased = get_easing_expression("ease_out_cubic")
        position = f"{start_pos}+({end_pos}-{start_pos})*({eased})"
        
    Example FFmpeg overlay expression:
        overlay=100:'if(lt(t,0.5), 1080+(940-1080)*(1-pow(1-t/0.5,3)), 940)'
    """
    
    # t is assumed to be normalized (0 to 1) if normalized=True
    # Otherwise, t is the raw time value
    t = "t" if not normalized else "t"
    
    easing_expressions = {
        # Linear - no easing
        "linear": t,
        
        # Ease-out functions (fast start, slow end - best for things coming to rest)
        # Cubic: 1 - (1-t)³
        "ease_out_cubic": f"1-pow(1-{t},3)",
        
        # Quadratic: 1 - (1-t)²
        "ease_out_quad": f"1-pow(1-{t},2)",
        
        # Exponential: 1 - 2^(-10t)
        "ease_out_expo": f"if(eq({t},1),1,1-pow(2,-10*{t}))",
        
        # Sine: smooth ease using cosine wave
        # (1 - cos(t * π)) / 2
        "ease_in_out_sine": f"(1-cos({t}*PI))/2",
        
        # Back: slight overshoot then settle (c1 = 1.70158)
        # (1 + c1) * (t-1)³ + c1*(t-1)² + 1
        # Simplified for FFmpeg
        "ease_out_back": f"1+2.70158*pow({t}-1,3)+1.70158*pow({t}-1,2)",
    }
    
    return easing_expressions.get(easing, easing_expressions["ease_out_cubic"])


def create_slide_animation(
    start_pos: float,
    end_pos: float,
    duration: float,
    easing: EasingType = "ease_out_cubic"
) -> str:
    """
    Create a complete FFmpeg expression for a slide animation with easing.
    
    Args:
        start_pos: Starting position (pixels)
        end_pos: Ending position (pixels)
        duration: Animation duration (seconds)
        easing: Easing function to use
        
    Returns:
        Complete FFmpeg expression (with quotes) ready to use in overlay filter.
        
    Example:
        >>> create_slide_animation(1080, 940, 0.5, "ease_out_cubic")
        "'if(lt(t,0.5),1080+(940-1080)*(1-pow(1-t/0.5,3)),940)'"
    """
    
    # Normalize time to 0-1 range
    t_normalized = f"t/{duration}"
    
    # Get easing expression with normalized time
    easing_expr = get_easing_expression(easing, normalized=False).replace("t", t_normalized)
    
    # Calculate distance in Python to avoid double-negative issues in FFmpeg expression
    # e.g., if start_pos=-400 and end_pos=100, we get distance=500
    # This prevents expressions like "100--400" or "1080+-350" which FFmpeg can't parse
    distance = end_pos - start_pos
    
    # Format the operation to avoid FFmpeg parsing issues with negative numbers
    # FFmpeg's filter parser has trouble with negative numbers in certain contexts
    # Solution: rewrite expressions to avoid leading negative numbers
    
    if start_pos < 0 and distance >= 0:
        # Negative start, positive distance (e.g., -400 → 100)
        # Use explicit subtraction with absolute value: (0-(400))+500*easing
        abs_start = abs(start_pos)
        position_expr = f"(0-({abs_start}))+{distance}*({easing_expr})"
    elif start_pos < 0 and distance < 0:
        # Negative start, negative distance (e.g., -400 → -500)
        # Use explicit subtraction with absolute value
        abs_start = abs(start_pos)
        position_expr = f"(0-({abs_start})){distance}*({easing_expr})"
    elif start_pos >= 0 and distance >= 0:
        # Positive start, positive distance (e.g., 100 → 500)
        position_expr = f"{start_pos}+{distance}*({easing_expr})"
    else:
        # Positive start, negative distance (e.g., 1080 → 730)
        position_expr = f"{start_pos}{distance}*({easing_expr})"  # distance has minus sign
    
    # Complete animation expression:
    # if (time < duration) {
    #   position = calculated_expression
    # } else {
    #   position = end
    # }
    # Wrap in single quotes - FFmpeg needs them to prevent comma from being
    # interpreted as a parameter separator
    animation_expr = f"'if(lt(t,{duration}),{position_expr},{end_pos})'"
    
    return animation_expr


# Preset animations for common use cases
def slide_up_from_bottom(
    final_y: float,
    screen_height: float = 1080,
    duration: float = 0.5,
    easing: EasingType = "ease_out_cubic"
) -> str:
    """Slide up from below screen to final position."""
    return create_slide_animation(screen_height, final_y, duration, easing)


def slide_down_from_top(
    final_y: float,
    duration: float = 0.5,
    easing: EasingType = "ease_out_cubic"
) -> str:
    """Slide down from above screen to final position."""
    return create_slide_animation(-100, final_y, duration, easing)


def slide_in_from_left(
    final_x: float,
    duration: float = 0.5,
    easing: EasingType = "ease_out_cubic"
) -> str:
    """Slide in from left side to final position."""
    return create_slide_animation(-400, final_x, duration, easing)


def slide_in_from_right(
    final_x: float,
    screen_width: float = 1920,
    duration: float = 0.5,
    easing: EasingType = "ease_out_cubic"
) -> str:
    """Slide in from right side to final position."""
    return create_slide_animation(screen_width, final_x, duration, easing)


# Example usage in comments:
"""
# In an FFmpeg overlay filter:

# Slide up with ease-out cubic (smooth deceleration)
from app.utils.easing import slide_up_from_bottom
y_expr = slide_up_from_bottom(final_y=940, duration=0.5, easing="ease_out_cubic")
overlay_filter = f"[base][ovr]overlay=40:y={y_expr}:format=yuv420"

# Slide in from left with bounce
from app.utils.easing import slide_in_from_left
x_expr = slide_in_from_left(final_x=100, duration=0.6, easing="ease_out_back")
overlay_filter = f"[base][ovr]overlay=x={x_expr}:440:format=yuv420"
"""

