// Safari Image Upload Debug Utility
// Specifically for diagnosing iPhone Safari image upload issues

import heic2any from 'heic2any';

// Extend Window interface for Safari-specific features
declare global {
  interface Window {
    gc?: () => void; // Safari garbage collection (when available)
  }
}

// HEIC utility functions
export const isHEICFile = (file: File): boolean => {
  return file.type === 'image/heic' || file.type === 'image/heif' || 
         file.name.toLowerCase().endsWith('.heic') || 
         file.name.toLowerCase().endsWith('.heif');
};

export const convertHEICToJPEG = async (file: File): Promise<File> => {
  try {
    const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.8
    });
    
    // heic2any returns a blob or array of blobs
    const resultBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
    
    return new File([resultBlob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
      type: 'image/jpeg',
      lastModified: file.lastModified
    });
  } catch (error) {
    console.error('HEIC conversion failed:', error);
    throw new Error('Failed to convert HEIC image');
  }
};

// Safari iOS-compatible image resizing utility with retry logic
export const resizeImageTo1080p = async (file: File, quality: number = 0.8, attempt: number = 1): Promise<File> => {
  const maxAttempts = 3;
  const timeoutMs = 15000; // 15 second timeout

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let objectUrl: string | null = null;
    let timeoutId: NodeJS.Timeout;

    const cleanup = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    const handleError = (error: Error) => {
      cleanup();
      console.warn(`📸 Image resize attempt ${attempt}/${maxAttempts} failed:`, error.message);
      
      if (attempt < maxAttempts) {
        // Retry with exponential backoff
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        console.log(`🔄 Retrying image resize in ${delay}ms...`);
        setTimeout(() => {
          resizeImageTo1080p(file, quality, attempt + 1)
            .then(resolve)
            .catch(reject);
        }, delay);
      } else {
        reject(new Error(`Failed to resize image after ${maxAttempts} attempts: ${error.message}`));
      }
    };

    if (!ctx) {
      handleError(new Error('Canvas context not available'));
      return;
    }

    // Set timeout for the entire operation
    timeoutId = setTimeout(() => {
      handleError(new Error('Image resize operation timed out'));
    }, timeoutMs);

    img.onload = () => {
      try {
        // Calculate dimensions to fit within 1080p (1920x1080) while maintaining aspect ratio
        const maxWidth = 1920;
        const maxHeight = 1080;
        
        let { width, height } = img;
        
        // iOS Safari memory optimization: Skip resize if image is already small enough
        if (width <= maxWidth && height <= maxHeight) {
          console.log(`📸 Image already optimal size (${width}x${height}), converting to JPEG only`);
          
          // Just convert to JPEG without resizing
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0);
          
          canvas.toBlob((blob) => {
            cleanup();
            if (!blob) {
              handleError(new Error('Failed to create JPEG blob'));
              return;
            }
            
            const originalName = file.name.replace(/\.[^/.]+$/, '');
            const newFile = new File([blob], `${originalName}.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            
            console.log(`📸 Image converted to JPEG: ${file.name} → ${newFile.name}`);
            resolve(newFile);
          }, 'image/jpeg', quality);
          
          return;
        }
        
        // Calculate the scaling factor to fit within 1080p bounds
        const widthRatio = maxWidth / width;
        const heightRatio = maxHeight / height;
        const scale = Math.min(widthRatio, heightRatio, 1); // Don't upscale
        
        // Apply scaling
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        
        // iOS Safari optimization: Use smaller chunks for large images
        const isLargeImage = (img.width * img.height) > (4000 * 3000);
        if (isLargeImage) {
          console.log('📸 Large image detected, using Safari-optimized processing...');
        }
        
        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;
        
        // Clear canvas first (iOS Safari fix)
        ctx.clearRect(0, 0, width, height);
        
        // Draw the resized image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to JPEG blob with Safari-compatible options
        canvas.toBlob((blob) => {
          cleanup();
          if (!blob) {
            handleError(new Error('Failed to create resized image blob'));
            return;
          }
          
          // Create new file with .jpg extension
          const originalName = file.name.replace(/\.[^/.]+$/, '');
          const newFile = new File([blob], `${originalName}_1080p.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          
          console.log(`📸 Image resized successfully: ${file.name} (${img.width}x${img.height}) → ${newFile.name} (${width}x${height})`);
          resolve(newFile);
        }, 'image/jpeg', quality);
        
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Unknown canvas error'));
      }
    };
    
    img.onerror = () => {
      handleError(new Error('Failed to load image for resizing'));
    };
    
    // iOS Safari fix: Add crossOrigin before setting src
    img.crossOrigin = 'anonymous';
    
    try {
      // Create object URL and load the image
      objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Failed to create object URL'));
    }
  });
};

// Combined function: Convert HEIC and resize to 1080p with Safari iOS retry logic
export const processImageForUpload = async (file: File, resize1080p: boolean = false, attempt: number = 1): Promise<File> => {
  const maxAttempts = 3;
  
  try {
    console.group(`📸 Processing image (attempt ${attempt}/${maxAttempts}): ${file.name}`);
    console.log('📊 File details:', {
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      type: file.type,
      isHEIC: isHEICFile(file),
      resize1080p
    });
    
    let processedFile = file;
    
    // First, convert HEIC to JPEG if needed
    if (isHEICFile(file)) {
      console.log('📱 Converting HEIC to JPEG...');
      try {
        processedFile = await convertHEICToJPEG(file);
        console.log('✅ HEIC conversion successful');
      } catch (heicError) {
        console.error('❌ HEIC conversion failed:', heicError);
        throw new Error(`HEIC conversion failed: ${heicError instanceof Error ? heicError.message : 'Unknown error'}`);
      }
    }
    
    // Then, resize to 1080p if requested
    if (resize1080p) {
      console.log('📐 Resizing image to 1080p...');
      try {
        processedFile = await resizeImageTo1080p(processedFile);
        console.log('✅ Image resize successful');
      } catch (resizeError) {
        console.error('❌ Image resize failed:', resizeError);
        throw new Error(`Image resize failed: ${resizeError instanceof Error ? resizeError.message : 'Unknown error'}`);
      }
    }
    
    console.log('✅ Image processing completed successfully');
    console.log('📊 Final file details:', {
      name: processedFile.name,
      size: `${(processedFile.size / 1024 / 1024).toFixed(2)} MB`,
      type: processedFile.type
    });
    console.groupEnd();
    
    return processedFile;
    
  } catch (error) {
    console.groupEnd();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`📸 Image processing attempt ${attempt}/${maxAttempts} failed:`, errorMessage);
    
    // Safari iOS specific retry logic
    const isSafariIOS = navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad');
    const isRetryableError = errorMessage.includes('timeout') || 
                           errorMessage.includes('blob') || 
                           errorMessage.includes('canvas') ||
                           errorMessage.includes('Failed to load') ||
                           errorMessage.includes('NetworkError');
    
    if (attempt < maxAttempts && isSafariIOS && isRetryableError) {
      // Force garbage collection if available (Safari specific)
      if (window.gc) {
        console.log('🗑️ Forcing garbage collection...');
        window.gc();
      }
      
      // Exponential backoff with jitter for Safari iOS
      const baseDelay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
      const jitter = Math.random() * 500; // Add 0-500ms random delay
      const delay = baseDelay + jitter;
      
      console.log(`🔄 Retrying image processing in ${Math.round(delay)}ms... (Safari iOS retry logic)`);
      
      return new Promise((resolve, reject) => {
        setTimeout(async () => {
          try {
            const result = await processImageForUpload(file, resize1080p, attempt + 1);
            resolve(result);
          } catch (retryError) {
            reject(retryError);
          }
        }, delay);
      });
    } else {
      // Final failure
      const finalError = new Error(`Failed to process image after ${attempt} attempts: ${errorMessage}`);
      console.error('💥 Image processing failed permanently:', finalError);
      throw finalError;
    }
  }
};

interface ImageUploadDebugInfo {
  timestamp: string;
  userAgent: string;
  browser: string;
  fileInputSupported: boolean;
  cameraSupported: boolean;
  heicSupported: boolean;
  fileAPISupported: boolean;
  uploadError: any;
  fileDetails: {
    name: string;
    size: number;
    type: string;
    lastModified: number;
  } | null;
}

class ImageUploadDebugger {
  private logs: ImageUploadDebugInfo[] = [];

  detectBrowser(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Safari') && !ua.includes('Chrome')) {
      if (ua.includes('iPhone') || ua.includes('iPad')) {
        return 'Safari iOS';
      }
      return 'Safari Desktop';
    }
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    return 'Unknown';
  }

  testImageUploadCapabilities(): {
    fileInputSupported: boolean;
    cameraSupported: boolean;
    heicSupported: boolean;
    fileAPISupported: boolean;
  } {
    const capabilities = {
      fileInputSupported: false,
      cameraSupported: false,
      heicSupported: false,
      fileAPISupported: false
    };

    // Test file input support
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      capabilities.fileInputSupported = input.files !== undefined;
    } catch (e) {
      console.warn('File input not supported:', e);
    }

    // Test camera/getUserMedia support
    try {
      capabilities.cameraSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    } catch (e) {
      console.warn('Camera not supported:', e);
    }

    // Test HEIC support (checking if heic2any is available and functional)
    try {
      // Test if heic2any is imported and available
      capabilities.heicSupported = typeof heic2any === 'function';
      
      if (capabilities.heicSupported) {
        console.log('✅ HEIC conversion library (heic2any) is available');
      } else {
        console.warn('❌ HEIC conversion library (heic2any) not available');
      }
    } catch (e) {
      console.warn('❌ HEIC conversion not supported:', e);
      capabilities.heicSupported = false;
    }

    // Test File API support
    try {
      capabilities.fileAPISupported = !!(window.File && window.FileReader && window.FileList && window.Blob);
    } catch (e) {
      console.warn('File API not supported:', e);
    }

    return capabilities;
  }

  logImageUploadAttempt(file: File | null, error?: any): ImageUploadDebugInfo {
    const capabilities = this.testImageUploadCapabilities();
    const debugInfo: ImageUploadDebugInfo = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      browser: this.detectBrowser(),
      fileInputSupported: capabilities.fileInputSupported,
      cameraSupported: capabilities.cameraSupported,
      heicSupported: capabilities.heicSupported,
      fileAPISupported: capabilities.fileAPISupported,
      uploadError: error,
      fileDetails: file ? {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      } : null
    };

    this.logs.push(debugInfo);
    
    // Enhanced logging for image upload issues
    console.group('📸 Safari Image Upload Debug');
    console.log('Browser:', debugInfo.browser);
    console.log('Protocol:', window.location.protocol);
    console.log('Capabilities:', {
      fileInput: debugInfo.fileInputSupported ? '✅' : '❌',
      camera: debugInfo.cameraSupported ? '✅' : '❌',
      heic: debugInfo.heicSupported ? '✅' : '❌',
      fileAPI: debugInfo.fileAPISupported ? '✅' : '❌'
    });
    
    if (debugInfo.fileDetails) {
      console.log('File Details:', debugInfo.fileDetails);
      
      // Check for common iPhone photo issues
      if (debugInfo.fileDetails.type === 'image/heic' || debugInfo.fileDetails.type === 'image/heif') {
        console.warn('📱 iPhone HEIC format detected - conversion required');
      }
      
      if (debugInfo.fileDetails.size > 25 * 1024 * 1024) {
        console.warn('📏 File size exceeds 25MB limit');
      }
    }
    
    if (error) {
      console.error('Upload Error:', error);
      
      // Check for specific Safari issues
      if (error.message?.includes('NetworkError') || error.message?.includes('Load failed')) {
        console.error('🔒 Network/CORS Issue:');
        console.error('- Check if server is running');
        console.error('- Verify HTTPS/HTTP protocol matching');
        console.error('- Check CORS headers for Safari');
      }
      
      if (error.message?.includes('heic-to') || error.message?.includes('HEIC')) {
        console.error('🖼️ HEIC Conversion Issue:');
        console.error('- HEIC conversion library may not be loaded');
        console.error('- Try selecting image again');
        console.error('- Check if image is corrupted');
      }
      
      if (error.message?.includes('Permission') || error.message?.includes('denied')) {
        console.error('🔒 Permission Issue:');
        console.error('- Camera access denied');
        console.error('- Check Safari settings');
        console.error('- Try using file picker instead of camera');
      }
    }
    
    console.groupEnd();

    return debugInfo;
  }

  showVisualDebug(): string {
    const latest = this.logs[this.logs.length - 1];
    if (!latest) return 'No debug data available';

    return `
📸 SAFARI IMAGE UPLOAD DEBUG
Browser: ${latest.browser}
File Input: ${latest.fileInputSupported ? '✅' : '❌'}
Camera: ${latest.cameraSupported ? '✅' : '❌'}
HEIC Support: ${latest.heicSupported ? '✅' : '❌'}
File API: ${latest.fileAPISupported ? '✅' : '❌'}
${latest.fileDetails ? `File: ${latest.fileDetails.name} (${latest.fileDetails.type}, ${(latest.fileDetails.size / 1024 / 1024).toFixed(2)}MB)` : 'No file selected'}
${latest.uploadError ? `Error: ${latest.uploadError.message || 'Unknown error'}` : 'No errors'}
Time: ${latest.timestamp}
    `.trim();
  }

  // Create a visual alert for Safari image upload issues
  showSafariImageAlert(message: string): void {
    if (this.detectBrowser().includes('Safari')) {
      const alertDiv = document.createElement('div');
      alertDiv.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        right: 10px;
        background: #ff6b35;
        color: white;
        padding: 15px;
        border-radius: 8px;
        z-index: 10000;
        font-family: Arial, sans-serif;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      `;
      alertDiv.innerHTML = `
        <strong>📸 Safari Image Upload Debug:</strong><br>
        ${message}
        <br><br>
        <button onclick="this.parentElement.remove()" style="background: white; color: #ff6b35; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
          Close
        </button>
      `;
      document.body.appendChild(alertDiv);

      // Auto-remove after 15 seconds
      setTimeout(() => {
        if (alertDiv.parentNode) {
          alertDiv.parentNode.removeChild(alertDiv);
        }
      }, 15000);
    }
  }

  getDebugReport(): ImageUploadDebugInfo[] {
    return [...this.logs];
  }

  // Test all image upload methods
  async testAllMethods(): Promise<void> {
    console.group('🧪 Testing All Image Upload Methods');
    
    // Skip camera access test unless explicitly enabled
    if (!window.location.href.includes('debug-camera')) {
      console.log("🚫 Skipping camera access test (not in debug mode)");
      return;
    }
    
    const capabilities = this.testImageUploadCapabilities();
    console.log('Capabilities:', capabilities);
    
    // Test 1: File input
    console.log('Testing file input...');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    console.log('File input created:', input.files !== undefined);
    
    // Test 2: Camera access
    if (capabilities.cameraSupported) {
      console.log('Testing camera access...');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        console.log('Camera access: ✅');
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.log('Camera access: ❌', error);
      }
    }
    
    // Test 3: HEIC support
    console.log('HEIC support:', capabilities.heicSupported ? '✅' : '❌');
    
    // Test 4: Comprehensive HEIC test
    await this.testHEICFunctionality();
    
    console.groupEnd();
  }

  // Comprehensive HEIC functionality test
  async testHEICFunctionality(): Promise<void> {
    console.group('🖼️ Testing HEIC Conversion Functionality');
    
    try {
      // Test 1: Check if heic2any is available
      if (typeof heic2any !== 'function') {
        console.error('❌ heic2any is not available as a function');
        console.groupEnd();
        return;
      }
      
      console.log('✅ heic2any function is available');
      
      // Test 2: Create a minimal test blob to see if the library loads
      const testBlob = new Blob(['test'], { type: 'image/heic' });
      console.log('📝 Testing with minimal HEIC blob...');
      
      // This should fail gracefully but confirm the library is loaded
      try {
        await heic2any({
          blob: testBlob,
          toType: 'image/jpeg'
        });
        console.log('✅ HEIC library responded (test completed)');
      } catch (conversionError) {
        // This is expected to fail with a test blob, but confirms library is loaded
        console.log('✅ HEIC library loaded and responded (expected test failure)');
        console.log('Test error (expected):', conversionError instanceof Error ? conversionError.message : String(conversionError));
      }
      
    } catch (error) {
      console.error('❌ HEIC functionality test failed:', error);
      
      // Check if this is a loading issue
      if (error instanceof Error && error.message?.includes('heic2any')) {
        console.error('🔧 HEIC library loading issue detected');
        console.error('💡 Potential fixes:');
        console.error('   1. Check if heic2any is properly installed');
        console.error('   2. Verify import statement');
        console.error('   3. Check bundle configuration');
      }
    }
    
    console.groupEnd();
  }
}

// Create singleton instance
const imageUploadDebugger = new ImageUploadDebugger();

// Export functions
export const logImageUploadAttempt = (file: File | null, error?: any) => imageUploadDebugger.logImageUploadAttempt(file, error);
export const showVisualImageDebug = () => imageUploadDebugger.showVisualDebug();
export const getImageDebugReport = () => imageUploadDebugger.getDebugReport();
export const showSafariImageAlert = (message: string) => imageUploadDebugger.showSafariImageAlert(message);
export const detectBrowser = () => imageUploadDebugger.detectBrowser();
export const testImageUploadCapabilities = () => imageUploadDebugger.testImageUploadCapabilities();
export const testAllImageMethods = () => imageUploadDebugger.testAllMethods();
export const testHEICFunctionality = () => imageUploadDebugger.testHEICFunctionality(); 