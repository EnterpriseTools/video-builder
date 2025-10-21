# SF Pro Rounded Fonts

This directory should contain the SF Pro Rounded font files for use in video template overlays.

## Required Font Files

Place the following SF Pro Rounded font files in this directory:

1. `SF-Pro-Rounded-Regular.ttf` - For regular text
2. `SF-Pro-Rounded-Semibold.ttf` - For emphasized text (primary)
3. `SF-Pro-Rounded-Bold.ttf` - For titles and headers

## How to Obtain SF Pro Rounded Fonts

SF Pro Rounded is an Apple system font. You can download it from:

**Option 1: Download from Apple Developer**
- Visit: https://developer.apple.com/fonts/
- Sign in with your Apple ID
- Download the SF Pro font family
- Extract the `.ttf` files and place them in this directory

**Option 2: Extract from macOS**
- On macOS, the SF Pro fonts are located at:
  - `/System/Library/Fonts/` or
  - `/Library/Fonts/` or
  - `~/Library/Fonts/`
- Search for "SF-Pro-Rounded" fonts
- Copy the required `.ttf` files to this directory

## File Structure

After adding the fonts, this directory should contain:

```
backend/fonts/
├── README.md (this file)
├── SF-Pro-Rounded-Regular.ttf
├── SF-Pro-Rounded-Semibold.ttf
└── SF-Pro-Rounded-Bold.ttf
```

## Fallback Behavior

If SF Pro Rounded fonts are not available, the system will automatically fall back to:
1. DejaVu Sans Bold (Linux/Railway default)
2. Helvetica (macOS default)

## Deployment Notes

When deploying to Railway, ensure these font files are included in your repository
so they're available in the Docker container at `/app/fonts/`.

The fonts are referenced in `backend/app/utils/styles.py` with the following paths:
- `/app/fonts/SF-Pro-Rounded-Regular.ttf`
- `/app/fonts/SF-Pro-Rounded-Semibold.ttf`
- `/app/fonts/SF-Pro-Rounded-Bold.ttf`

