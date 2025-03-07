// A script to generate PWA icons from an existing logo
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Source logo path (using your existing nuri_logo.png)
const SOURCE_LOGO = path.join(__dirname, '../public/images/nuri_logo.png');

// Output directory for icons
const ICONS_DIR = path.join(__dirname, '../public/icons');

// Ensure output directory exists
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// Define icon sizes to generate
const ICON_SIZES = [
  { width: 72, height: 72, name: 'icon-72x72.png' },
  { width: 96, height: 96, name: 'badge-96x96.png' },
  { width: 128, height: 128, name: 'icon-128x128.png' },
  { width: 144, height: 144, name: 'icon-144x144.png' },
  { width: 152, height: 152, name: 'icon-152x152.png' },
  { width: 192, height: 192, name: 'icon-192x192.png' },
  { width: 384, height: 384, name: 'icon-384x384.png' },
  { width: 512, height: 512, name: 'icon-512x512.png' },
];

// Generate each icon
async function generateIcons() {
  console.log('Generating PWA icons...');
  
  try {
    for (const size of ICON_SIZES) {
      const outputPath = path.join(ICONS_DIR, size.name);
      
      await sharp(SOURCE_LOGO)
        .resize(size.width, size.height)
        .toFile(outputPath);
      
      console.log(`✅ Generated: ${size.name}`);
    }
    
    console.log('PWA icon generation complete!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons(); 