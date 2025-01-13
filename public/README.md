# Assets Directory Structure

This directory contains all static assets for the Nuri application.

## Directory Structure

- `images/`: Place all image assets here (PNG, JPG, etc.)
  - Screenshots
  - Logos
  - Background images
  - User interface elements

- `icons/`: Store custom icons here (SVG preferred)
  - Custom application icons
  - Navigation icons
  - Feature icons

- `fonts/`: Custom web fonts
  - Font files (.woff, .woff2)
  - Typography assets

## Usage in React Components

To reference these assets in your React components, use the public URL path:

```jsx
// Example usage in components
<img src="/images/nuri_logo.png" alt="Nuri Logo" />
<img src="/icons/custom-icon.svg" alt="Custom Icon" />
```

## Asset Guidelines

1. Image formats:
   - Use PNG for images requiring transparency
   - Use JPG for photographs
   - Use SVG for icons and scalable graphics

2. Naming convention:
   - Use lowercase
   - Separate words with underscores
   - Be descriptive: `feature_name_purpose.extension`
   Example: `village_circles_background.png`

3. Optimization:
   - Compress images before adding
   - Use appropriate resolution for the intended display size
