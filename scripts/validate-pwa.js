const fs = require('fs');
const path = require('path');

// PWA Validation Script for Safari iOS compatibility
console.log('🔍 Validating PWA setup for Safari iOS...\n');

const publicDir = path.join(__dirname, '..', 'public');
const indexPath = path.join(__dirname, '..', 'index.html');

let issues = [];
let warnings = [];
let passed = [];

// Check 1: manifest.json exists and has required fields
try {
  const manifestPath = path.join(publicDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
  const missingFields = requiredFields.filter(field => !manifest[field]);
  
  if (missingFields.length === 0) {
    passed.push('✅ manifest.json has all required fields');
  } else {
    issues.push(`❌ manifest.json missing fields: ${missingFields.join(', ')}`);
  }
  
  // Check display mode
  if (manifest.display === 'standalone' || manifest.display === 'fullscreen') {
    passed.push('✅ Display mode set to standalone/fullscreen');
  } else {
    issues.push('❌ Display mode should be "standalone" or "fullscreen"');
  }
  
  // Check start_url
  if (manifest.start_url === '/' || manifest.start_url === './') {
    passed.push('✅ Start URL properly configured');
  } else {
    warnings.push('⚠️  Start URL should typically be "/" or "./"');
  }
  
  // Check icons
  if (manifest.icons && manifest.icons.length > 0) {
    passed.push(`✅ ${manifest.icons.length} icons defined in manifest`);
    
    // Check for required icon sizes
    const iconSizes = manifest.icons.map(icon => icon.sizes);
    const hasLargeIcon = iconSizes.some(size => 
      size.includes('192x192') || size.includes('512x512')
    );
    
    if (hasLargeIcon) {
      passed.push('✅ Large icons (192x192 or 512x512) present');
    } else {
      issues.push('❌ Missing large icons (192x192 and 512x512 required)');
    }
  } else {
    issues.push('❌ No icons defined in manifest');
  }
  
} catch (error) {
  issues.push('❌ manifest.json not found or invalid JSON');
}

// Check 2: index.html has Apple-specific meta tags
try {
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  
  const appleMetaTags = [
    { tag: 'apple-mobile-web-app-capable', content: 'yes' },
    { tag: 'apple-mobile-web-app-status-bar-style' },
    { tag: 'apple-mobile-web-app-title' }
  ];
  
  appleMetaTags.forEach(({ tag, content }) => {
    const regex = new RegExp(`<meta[^>]*name="${tag}"[^>]*>`, 'i');
    if (regex.test(indexContent)) {
      if (content && indexContent.includes(`content="${content}"`)) {
        passed.push(`✅ ${tag} meta tag with correct content`);
      } else if (!content) {
        passed.push(`✅ ${tag} meta tag present`);
      } else {
        warnings.push(`⚠️  ${tag} meta tag present but check content`);
      }
    } else {
      issues.push(`❌ Missing ${tag} meta tag`);
    }
  });
  
  // Check for apple-touch-icon
  if (indexContent.includes('rel="apple-touch-icon"')) {
    passed.push('✅ Apple touch icon link present');
  } else {
    issues.push('❌ Missing apple-touch-icon link');
  }
  
  // Check for manifest link
  if (indexContent.includes('rel="manifest"')) {
    passed.push('✅ Manifest link present in HTML');
  } else {
    issues.push('❌ Missing manifest link in HTML');
  }
  
  // Check for theme-color
  if (indexContent.includes('name="theme-color"')) {
    passed.push('✅ Theme color meta tag present');
  } else {
    warnings.push('⚠️  Theme color meta tag missing');
  }
  
} catch (error) {
  issues.push('❌ index.html not found or unreadable');
}

// Check 3: Service Worker
try {
  const swPath = path.join(publicDir, 'service-worker.js');
  const swContent = fs.readFileSync(swPath, 'utf8');
  
  passed.push('✅ Service worker file exists');
  
  // Check for basic SW events
  const requiredEvents = ['install', 'activate', 'fetch'];
  const missingEvents = requiredEvents.filter(event => 
    !swContent.includes(`addEventListener('${event}'`)
  );
  
  if (missingEvents.length === 0) {
    passed.push('✅ Service worker has required event listeners');
  } else {
    warnings.push(`⚠️  Service worker missing events: ${missingEvents.join(', ')}`);
  }
  
  // Check for caching
  if (swContent.includes('caches.open') || swContent.includes('cache.add')) {
    passed.push('✅ Service worker implements caching');
  } else {
    warnings.push('⚠️  Service worker should implement caching for offline support');
  }
  
} catch (error) {
  issues.push('❌ service-worker.js not found');
}

// Check 4: Icon files exist
const iconSizes = [72, 96, 128, 144, 152, 167, 180, 192, 256, 512];
let existingIcons = 0;

iconSizes.forEach(size => {
  const pngPath = path.join(publicDir, `icon-${size}.png`);
  const svgPath = path.join(publicDir, `icon-${size}.svg`);
  
  if (fs.existsSync(pngPath)) {
    existingIcons++;
  } else if (fs.existsSync(svgPath)) {
    existingIcons++;
    if (size === 192 || size === 512) {
      warnings.push(`⚠️  icon-${size}.svg exists but PNG recommended for better Safari support`);
    }
  }
});

if (existingIcons >= 8) {
  passed.push(`✅ ${existingIcons}/${iconSizes.length} icon files exist`);
} else {
  issues.push(`❌ Only ${existingIcons}/${iconSizes.length} icon files exist`);
}

// Check 5: HTTPS requirement
console.log('📋 PWA Validation Results:');
console.log('========================\n');

if (passed.length > 0) {
  console.log('✅ PASSED CHECKS:');
  passed.forEach(check => console.log(`   ${check}`));
  console.log('');
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS:');
  warnings.forEach(warning => console.log(`   ${warning}`));
  console.log('');
}

if (issues.length > 0) {
  console.log('❌ ISSUES TO FIX:');
  issues.forEach(issue => console.log(`   ${issue}`));
  console.log('');
}

// Summary and recommendations
console.log('📱 SAFARI iOS PWA CHECKLIST:');
console.log('============================');
console.log('□ Serve app over HTTPS (required for Safari PWA)');
console.log('□ Test "Add to Home Screen" in Safari iOS');
console.log('□ Test full-screen mode after adding to home screen');
console.log('□ Test offline functionality');
console.log('□ Verify app icon appears correctly on home screen');
console.log('□ Test app launch and navigation');

const score = Math.round((passed.length / (passed.length + issues.length)) * 100);
console.log(`\n🎯 PWA Readiness Score: ${score}%`);

if (score >= 90) {
  console.log('🎉 Excellent! Your PWA should work well in Safari iOS');
} else if (score >= 70) {
  console.log('👍 Good progress! Fix the remaining issues for optimal Safari support');
} else {
  console.log('🔧 Needs work. Address the critical issues above for Safari PWA support');
}

console.log('\n🚀 Next steps:');
console.log('1. Deploy to HTTPS server');
console.log('2. Test on actual iOS device with Safari');
console.log('3. Convert SVG icons to PNG for better compatibility');
console.log('4. Test offline functionality');

process.exit(issues.length > 0 ? 1 : 0); 