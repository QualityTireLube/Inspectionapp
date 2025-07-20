#!/usr/bin/env node

// Production script to convert SVG icons to PNG for optimal Safari PWA support
// Run: npm install sharp && node scripts/convert-to-png.js

const fs = require('fs');
const path = require('path');

async function convertIconsToPNG() {
  try {
    // Try to import sharp
    const sharp = await import('sharp');
    
    console.log('🎨 Converting SVG icons to PNG for Safari PWA optimization...\n');
    
    const publicDir = path.join(__dirname, '..', 'public');
    const iconSizes = [72, 96, 128, 144, 152, 167, 180, 192, 256, 512];
    
    let converted = 0;
    let errors = 0;
    
    for (const size of iconSizes) {
      const svgPath = path.join(publicDir, `icon-${size}.svg`);
      const pngPath = path.join(publicDir, `icon-${size}.png`);
      
      try {
        if (fs.existsSync(svgPath)) {
          await sharp.default(svgPath)
            .resize(size, size)
            .png({ quality: 90, compressionLevel: 6 })
            .toFile(pngPath);
          
          console.log(`✅ Converted icon-${size}.svg → icon-${size}.png`);
          converted++;
        } else {
          console.log(`⚠️  SVG not found: icon-${size}.svg`);
          errors++;
        }
      } catch (error) {
        console.log(`❌ Failed to convert icon-${size}.svg:`, error.message);
        errors++;
      }
    }
    
    console.log(`\n📊 Conversion Summary:`);
    console.log(`   ✅ Successfully converted: ${converted} icons`);
    console.log(`   ❌ Errors: ${errors} icons`);
    
    if (converted > 0) {
      console.log(`\n🔄 Next step: Update manifest.json to use .png instead of .svg`);
      console.log('   You can run: node scripts/update-manifest-png.js');
    }
    
  } catch (importError) {
    console.log('❌ Sharp not installed. Installing sharp...\n');
    
    const { spawn } = require('child_process');
    
    const install = spawn('npm', ['install', 'sharp'], { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    install.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ Sharp installed! Please run this script again:');
        console.log('   node scripts/convert-to-png.js');
      } else {
        console.log('\n❌ Failed to install Sharp. Please install manually:');
        console.log('   npm install sharp');
        console.log('\nAlternatively, use an online converter:');
        console.log('   🌐 https://www.pwabuilder.com/imageGenerator');
        console.log('   🌐 https://realfavicongenerator.net/');
      }
    });
  }
}

// Alternative method using online tools
function showAlternativeOptions() {
  console.log('\n🌐 Alternative: Use Online PWA Icon Generators');
  console.log('===============================================');
  console.log('');
  console.log('1. PWA Builder Image Generator:');
  console.log('   https://www.pwabuilder.com/imageGenerator');
  console.log('   • Upload your favicon.svg');
  console.log('   • Download the generated icon pack');
  console.log('   • Extract icons to public/ folder');
  console.log('');
  console.log('2. Real Favicon Generator:');
  console.log('   https://realfavicongenerator.net/');
  console.log('   • Upload your favicon.svg');
  console.log('   • Configure PWA settings');
  console.log('   • Download and extract files');
  console.log('');
  console.log('3. Manual conversion with online SVG to PNG:');
  console.log('   • Use any SVG to PNG converter');
  console.log('   • Create icons in sizes: 72, 96, 128, 144, 152, 167, 180, 192, 256, 512');
  console.log('   • Save as icon-{size}.png in public/ folder');
  console.log('');
}

// Check if --help flag is passed
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('🎨 SVG to PNG Icon Converter for PWA');
  console.log('====================================');
  console.log('');
  console.log('Usage: node scripts/convert-to-png.js');
  console.log('');
  console.log('This script converts SVG icons to PNG format for optimal Safari PWA support.');
  console.log('Requires Sharp library (will auto-install if missing).');
  console.log('');
  showAlternativeOptions();
  process.exit(0);
}

// Run the conversion
convertIconsToPNG().catch(error => {
  console.error('❌ Conversion failed:', error);
  showAlternativeOptions();
  process.exit(1);
}); 