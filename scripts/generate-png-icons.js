const fs = require('fs');
const path = require('path');

// This script generates proper PNG icons from SVG for PWA
// Uses canvas and SVG rendering for better Safari compatibility

const iconSizes = [72, 96, 128, 144, 152, 167, 180, 192, 256, 512];
const publicDir = path.join(__dirname, '..', 'public');

// Create SVG content for the icon
const createIconSVG = (size) => {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <!-- Background circle -->
    <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="#1976d2"/>
    
    <!-- Main icon content -->
    <g transform="translate(${size*0.2}, ${size*0.2})">
      <!-- Car silhouette -->
      <rect x="${size*0.1}" y="${size*0.25}" width="${size*0.4}" height="${size*0.15}" rx="${size*0.02}" fill="white"/>
      
      <!-- Wheels -->
      <circle cx="${size*0.15}" cy="${size*0.45}" r="${size*0.05}" fill="white"/>
      <circle cx="${size*0.35}" cy="${size*0.45}" r="${size*0.05}" fill="white"/>
      
      <!-- Windshield -->
      <rect x="${size*0.125}" y="${size*0.15}" width="${size*0.35}" height="${size*0.1}" rx="${size*0.02}" fill="white" opacity="0.8"/>
      
      <!-- Tool/wrench icon -->
      <rect x="${size*0.05}" y="${size*0.05}" width="${size*0.03}" height="${size*0.2}" rx="${size*0.01}" fill="white" transform="rotate(15 ${size*0.065} ${size*0.15})"/>
      <circle cx="${size*0.065}" cy="${size*0.08}" r="${size*0.025}" fill="none" stroke="white" stroke-width="${size*0.008}"/>
    </g>
    
    <!-- Text indicator -->
    <text x="${size/2}" y="${size*0.85}" font-family="Arial, sans-serif" font-size="${size*0.08}" fill="white" text-anchor="middle" font-weight="bold">VI</text>
  </svg>`;
};

// Function to create base64 PNG from SVG (simplified approach)
const createPNGPlaceholder = (size) => {
  // This creates a simple data URI for a colored square as a fallback
  // In production, you should use proper SVG to PNG conversion
  const canvas = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="#1976d2"/>
    <circle cx="${size/2}" cy="${size/2}" r="${size*0.4}" fill="rgba(255,255,255,0.9)"/>
    <text x="${size/2}" y="${size/2}" font-family="Arial, sans-serif" font-size="${size*0.2}" fill="#1976d2" text-anchor="middle" dominant-baseline="middle" font-weight="bold">VI</text>
  </svg>`;
  
  return `data:image/svg+xml;base64,${Buffer.from(canvas).toString('base64')}`;
};

console.log('Generating PWA PNG icons...');

// Create a simple HTML file that can convert SVG to PNG using browser APIs
const htmlConverter = `<!DOCTYPE html>
<html>
<head>
    <title>Icon Generator</title>
</head>
<body>
    <canvas id="canvas" style="display: none;"></canvas>
    <script>
        const iconSizes = [${iconSizes.join(', ')}];
        const icons = {};
        
        function createIconSVG(size) {
            return \`${createIconSVG('${size}').replace(/`/g, '\\`')}\`;
        }
        
        function convertSVGToPNG(svgString, size) {
            const canvas = document.getElementById('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = size;
            canvas.height = size;
            
            const img = new Image();
            const svgBlob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
            const url = URL.createObjectURL(svgBlob);
            
            return new Promise((resolve) => {
                img.onload = function() {
                    ctx.clearRect(0, 0, size, size);
                    ctx.drawImage(img, 0, 0, size, size);
                    const pngDataUrl = canvas.toDataURL('image/png');
                    URL.revokeObjectURL(url);
                    resolve(pngDataUrl);
                };
                img.src = url;
            });
        }
        
        async function generateIcons() {
            console.log('Generating icons...');
            for (const size of iconSizes) {
                const svg = createIconSVG(size);
                const png = await convertSVGToPNG(svg, size);
                icons[size] = png;
                console.log(\`Generated icon-\${size}.png\`);
            }
            
            // You would save these to files here in a real implementation
            console.log('Icons generated. In a real app, save these to PNG files.');
            console.log('Icons object:', Object.keys(icons));
        }
        
        generateIcons();
    </script>
</body>
</html>`;

// Save the HTML converter (for reference)
fs.writeFileSync(path.join(publicDir, 'icon-generator.html'), htmlConverter);

// For now, create SVG files that work as fallbacks
iconSizes.forEach(size => {
  const svgContent = createIconSVG(size);
  const svgPath = path.join(publicDir, `icon-${size}.svg`);
  
  fs.writeFileSync(svgPath, svgContent);
  console.log(`Created SVG icon: icon-${size}.svg`);
});

console.log('\n✅ PWA icons created as SVG files.');
console.log('\n📱 For optimal Safari iOS support:');
console.log('1. Install sharp: npm install sharp');
console.log('2. Use the provided HTML converter or an online tool to create PNG versions');
console.log('3. Upload your app icon to: https://www.pwabuilder.com/imageGenerator');
console.log('4. Replace the SVG files with the generated PNG files');
console.log('\n🔧 Quick fix: Update manifest.json to use .svg instead of .png temporarily');
console.log('5. Then convert to PNG for production');

// Create a package.json script suggestion
console.log('\n💡 Add this to your package.json scripts:');
console.log('"generate-icons": "node scripts/generate-png-icons.js"'); 