

## Generate AI Favicon for Stratify Workforce

### What Will Happen

1. **Generate a favicon image** using AI (Gemini flash-image model) with a prompt emphasizing:
   - Learning/education iconography (book, graduation cap, or brain)
   - Simulation/gaming elements (controller, joystick, or circuit patterns)
   - Skills development theme
   - The app's dark industrial color palette with FGN Amber (#f49d14) as the primary accent
   - Clean, simple design suitable for a 64x64 favicon

2. **QA the generated image** to ensure it reads well at small sizes

3. **Copy the favicon to `public/favicon.png`** and update `index.html` with a `<link rel="icon">` reference

### Technical Details

- Model: `google/gemini-3-pro-image-preview` (higher quality)
- Output: 64×64 PNG optimized for favicon use
- Color palette: Dark background (#080c16) with amber (#f49d14) accent
- Update `index.html` to add `<link rel="icon" href="/favicon.png" type="image/png">`

