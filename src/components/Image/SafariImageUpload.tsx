import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { IconButton, Alert, CircularProgress, Box } from '@mui/material';
import { PhotoCamera, PhotoLibrary } from '@mui/icons-material';
import heic2any from 'heic2any';
import { 
  logImageUploadAttempt, 
  showSafariImageAlert, 
  detectBrowser,
  isHEICFile,
  convertHEICToJPEG,
  processImageForUpload 
} from '../../services/imageUploadDebug';

interface SafariImageUploadProps {
  onImageUpload: (file: File, type: any) => Promise<void>;
  uploadType: any;
  disabled?: boolean;
  multiple?: boolean;
  maxFiles?: number;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  showCameraButton?: boolean;
  showGalleryButton?: boolean;
  resize1080p?: boolean;
  allowProgrammaticTrigger?: boolean;
  cameraFacing?: 'user' | 'environment'; // Add camera facing prop
}

export interface SafariImageUploadRef {
  handleCameraClick: () => void;
  handleGalleryClick: () => void;
}

const SafariImageUpload = forwardRef<SafariImageUploadRef, SafariImageUploadProps>(({
  onImageUpload,
  uploadType,
  disabled = false,
  multiple = true,
  maxFiles = 5,
  className = '',
  size = 'small',
  showCameraButton = true,
  showGalleryButton = true,
  resize1080p = false,
  allowProgrammaticTrigger = false,
  cameraFacing = 'environment' // Default to 'environment' (rear camera)
}, ref) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isPageLoaded, setIsPageLoaded] = useState(false);
  
  // Track current camera input to prevent premature cleanup
  const currentCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Track user interaction and page load state
  useEffect(() => {
    // Set page as loaded after a short delay to prevent immediate triggering
    const loadTimer = setTimeout(() => {
      setIsPageLoaded(true);
    }, 1000);

    // Add global user interaction listeners
    const handleUserInteraction = () => {
      setHasUserInteracted(true);
    };

    // Listen for various user interaction events
    document.addEventListener('click', handleUserInteraction, { once: true });
    document.addEventListener('touchstart', handleUserInteraction, { once: true });
    document.addEventListener('keydown', handleUserInteraction, { once: true });

    return () => {
      clearTimeout(loadTimer);
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, []);

  const validateFile = async (file: File): Promise<string | null> => {
    // Check file type (including HEIC)
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/heic', 'image/heif'];
    if (!validTypes.includes(file.type) && !(await isHEICFile(file))) {
      return 'Only JPEG, PNG, GIF, and HEIC images are allowed';
    }

    // Check file size (max 25MB)
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      return 'Image must be smaller than 25MB';
    }

    return null;
  };

  const processFiles = async (files: FileList | null, retryAttempt: number = 1): Promise<void> => {
    console.log('🔄 processFiles called with:', { files, retryAttempt, uploadType });
    
    if (!files || files.length === 0) {
      console.warn('⚠️ processFiles: No files to process');
      return;
    }

    const fileArray = Array.from(files);
    const maxRetries = 3;
    
    console.log('🔄 Total files received:', fileArray.length);
    console.log('🔄 Multiple upload allowed:', multiple);
    console.log('🔄 Max files limit:', maxFiles);
    
    // Limit number of files
    const filesToProcess = multiple ? fileArray.slice(0, maxFiles) : [fileArray[0]];
    
    console.log('🔄 Files to process:', filesToProcess.length);
    
    setUploading(true);
    if (retryAttempt === 1) {
      setError(null); // Only clear error on first attempt
    }

    let successCount = 0;
    let lastError: string | null = null;

    for (const file of filesToProcess) {
      try {
        console.log(`📤 Processing file ${filesToProcess.indexOf(file) + 1}/${filesToProcess.length} (attempt ${retryAttempt}/${maxRetries}): ${file.name}`);
        
        // Log the upload attempt
        logImageUploadAttempt(file);

        // Validate file
        const validationError = await validateFile(file);
        if (validationError) {
          logImageUploadAttempt(file, { message: validationError });
          lastError = validationError;
          continue;
        }

        // Process image (HEIC conversion and/or 1080p resizing)
        let processedFile: File;
        try {
          processedFile = await processImageForUpload(file, resize1080p);
        } catch (processingError) {
          console.error('Image processing failed:', processingError);
          logImageUploadAttempt(file, processingError);
          
          const errorMsg = processingError instanceof Error ? processingError.message : 'Processing failed';
          lastError = `Failed to process ${file.name}: ${errorMsg}`;
          continue;
        }

        // Upload the file
        try {
          await onImageUpload(processedFile, uploadType);
          successCount++;
          console.log(`✅ Successfully uploaded: ${file.name}`);
        } catch (uploadError) {
          console.error('Upload failed:', uploadError);
          logImageUploadAttempt(file, uploadError);
          
          const errorMsg = uploadError instanceof Error ? uploadError.message : 'Upload failed';
          lastError = `Failed to upload ${file.name}: ${errorMsg}`;
        }
        
      } catch (error) {
        console.error('Error processing file:', error);
        logImageUploadAttempt(file, error);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        lastError = `Error with ${file.name}: ${errorMessage}`;
      }
    }

    // Handle retry logic for Safari iOS
    const isSafariIOS = detectBrowser().includes('Safari iOS');
    const shouldRetry = successCount === 0 && lastError && retryAttempt < maxRetries && isSafariIOS;
    
    if (shouldRetry && lastError) {
      const isRetryableError = lastError.includes('Failed to process') || 
                              lastError.includes('timeout') || 
                              lastError.includes('blob') ||
                              lastError.includes('canvas') ||
                              lastError.includes('NetworkError');
      
      if (isRetryableError) {
        setUploading(false);
        
        // Exponential backoff with jitter
        const baseDelay = Math.pow(2, retryAttempt - 1) * 1000; // 1s, 2s, 4s
        const jitter = Math.random() * 500; // Add 0-500ms random delay
        const delay = baseDelay + jitter;
        
        console.log(`🔄 No files uploaded successfully. Retrying in ${Math.round(delay)}ms... (${retryAttempt}/${maxRetries})`);
        setError(`Retrying upload... (${retryAttempt}/${maxRetries})`);
        
        setTimeout(() => {
          processFiles(files, retryAttempt + 1);
        }, delay);
        
        return;
      }
    }

    setUploading(false);
    
    // Set final error message
    if (successCount === 0 && lastError) {
      setError(lastError);
      
             // Show Safari-specific alert for persistent failures
       if (isSafariIOS && retryAttempt >= maxRetries && lastError) {
         showSafariImageAlert(`Image upload failed after ${maxRetries} attempts. ${lastError}\n\nTips:\n• Try selecting the image again\n• Check your internet connection\n• Try using a smaller image`);
       }
    } else if (successCount > 0 && lastError) {
      setError(`${successCount}/${filesToProcess.length} files uploaded successfully. Last error: ${lastError}`);
    } else if (successCount > 0) {
      setError(null); // Clear any previous errors on success
    }
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCameraClick = () => {
    if (disabled || uploading) return;
    
    // If programmatic triggering is allowed, bypass checks
    if (allowProgrammaticTrigger) {
      console.log('📷 Camera click allowed by programmatic trigger');
    } else {
      // Prevent automatic triggering on page load
      if (!isPageLoaded) {
        console.log('📷 Camera click blocked - page still loading');
        return;
      }
      
      if (!hasUserInteracted) {
        console.log('📷 Camera click blocked - no user interaction detected');
        return;
      }
    }
    
    console.log('📷 Camera button clicked - creating file input');
    
    // Clean up any existing input first
    const existingInput = document.querySelector('input[data-testid="camera-input"]');
    if (existingInput) {
      document.body.removeChild(existingInput);
    }
    
    // Clean up any tracked input
    if (currentCameraInputRef.current && document.body.contains(currentCameraInputRef.current)) {
      document.body.removeChild(currentCameraInputRef.current);
    }
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,image/heic,image/heif,.heic,.heif';
    input.capture = cameraFacing; // Use specified camera facing mode
    input.multiple = multiple;
    
    // Additional Safari iOS specific attributes
    input.setAttribute('data-testid', 'camera-input');
    input.setAttribute('aria-label', 'Camera input');
    
    // Add Safari iOS specific attributes
    input.style.position = 'absolute';
    input.style.left = '-9999px';
    input.style.opacity = '0';
    input.style.pointerEvents = 'none';
    
    console.log('📷 Camera input created with attributes:', {
      type: input.type,
      accept: input.accept,
      capture: input.capture,
      multiple: input.multiple,
      testId: input.getAttribute('data-testid'),
      ariaLabel: input.getAttribute('aria-label')
    });
    
    // Attach to DOM temporarily for Safari iOS
    document.body.appendChild(input);
    
    // Track this input
    currentCameraInputRef.current = input;
    
    // Verify input is in DOM
    console.log('📷 Camera input attached to DOM:', document.body.contains(input));
    console.log('📷 Camera input element:', input);
    
    // Prevent duplicate uploads with a flag
    let hasProcessed = false;
    let hasTriggered = false;
    
    const handleFileChange = async (files: FileList | null, eventType: string) => {
      if (hasProcessed) {
        console.log(`📷 ${eventType} - Skipping duplicate processing`);
        return;
      }
      
      hasProcessed = true;
      
      console.log(`📷 Camera input change event fired (${eventType})`);
      console.log('📷 Files from camera:', files);
      console.log('📷 Files count:', files?.length || 0);
      
      if (!files || !files.length) {
        console.warn('⚠️ No files from camera input');
        // Don't clean up immediately - give it more time
        setTimeout(() => {
          if (currentCameraInputRef.current && document.body.contains(currentCameraInputRef.current)) {
            document.body.removeChild(currentCameraInputRef.current);
            currentCameraInputRef.current = null;
          }
        }, 5000);
        return;
      }

      // Log detailed file information
      Array.from(files).forEach((file, index) => {
        console.log(`📷 Camera File ${index + 1}:`, {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          sizeInMB: (file.size / (1024 * 1024)).toFixed(2) + ' MB'
        });
      });
      
      await processFiles(files);
      
      // Clean up after processing is complete
      setTimeout(() => {
        if (currentCameraInputRef.current && document.body.contains(currentCameraInputRef.current)) {
          console.log('📷 Cleaning up camera input after processing');
          document.body.removeChild(currentCameraInputRef.current);
          currentCameraInputRef.current = null;
        }
      }, 2000);
    };
    
    // Add multiple event listeners for Safari iOS compatibility
    input.addEventListener('change', async (e) => {
      console.log('📷 Camera input change event listener triggered');
      const target = e.target as HTMLInputElement;
      await handleFileChange(target.files, 'addEventListener');
    });
    
    // Legacy onchange as fallback
    input.onchange = async (e) => {
      console.log('📷 Camera input onchange event triggered');
      const target = e.target as HTMLInputElement;
      await handleFileChange(target.files, 'onchange');
    };
    
    // Add input event for additional coverage
    input.addEventListener('input', async (e) => {
      console.log('📷 Camera input input event triggered');
      const target = e.target as HTMLInputElement;
      await handleFileChange(target.files, 'input');
    });
    
    // Add focus event for debugging
    input.addEventListener('focus', () => {
      console.log('📷 Camera input focused');
    });
    
    // Add blur event for debugging  
    input.addEventListener('blur', () => {
      console.log('📷 Camera input blurred');
    });
    
    // Add click event for debugging
    input.addEventListener('click', () => {
      console.log('📷 Camera input clicked');
    });
    
    // Add load event for debugging
    input.addEventListener('load', () => {
      console.log('📷 Camera input loaded');
    });
    
    // Add error event for debugging
    input.addEventListener('error', (e) => {
      console.log('📷 Camera input error:', e);
    });
    
    console.log('📷 Triggering camera input click');
    
    // Always trigger the camera input click, regardless of programmatic trigger
    setTimeout(() => {
      console.log('📷 Manual camera trigger - input in DOM:', document.body.contains(currentCameraInputRef.current));
      console.log('📷 Manual camera trigger - input attributes:', {
        type: currentCameraInputRef.current?.type,
        accept: currentCameraInputRef.current?.accept,
        capture: currentCameraInputRef.current?.capture,
        multiple: currentCameraInputRef.current?.multiple
      });
      
      if (currentCameraInputRef.current && document.body.contains(currentCameraInputRef.current)) {
        currentCameraInputRef.current.focus();
        currentCameraInputRef.current.click();
        console.log('📷 Camera input click attempted');
        hasTriggered = true;
      } else {
        console.log('📷 Camera trigger failed - input not in DOM');
      }
    }, 100);
    
    // Check if camera was successfully triggered after a delay (only for programmatic triggers)
    if (allowProgrammaticTrigger) {
      setTimeout(() => {
        if (!hasProcessed && hasTriggered) {
          console.log('📷 Camera trigger may have failed - showing fallback message');
          // For programmatic triggers, if no file was selected after 3 seconds, 
          // we can show a message to the user that they need to manually interact
          setError('Camera not opened automatically. Please tap the camera button to take a photo.');
          // Clear the error after 5 seconds to avoid confusion
          setTimeout(() => {
            setError(null);
          }, 5000);
        }
      }, 3000);
    }
    
    // Cleanup after timeout if no interaction
    setTimeout(() => {
      if (currentCameraInputRef.current && document.body.contains(currentCameraInputRef.current)) {
        console.log('📷 Cleaning up unused camera input element');
        document.body.removeChild(currentCameraInputRef.current);
        currentCameraInputRef.current = null;
      }
    }, 30000); // 30 second timeout
  };

  const handleGalleryClick = () => {
    if (disabled || uploading) return;
    
    // Prevent automatic triggering on page load
    if (!isPageLoaded) {
      console.log('🖼️ Gallery click blocked - page still loading');
      return;
    }
    
    if (!hasUserInteracted) {
      console.log('🖼️ Gallery click blocked - no user interaction detected');
      return;
    }
    
    console.log('🖼️ Gallery button clicked - creating file input');
    
    // Clean up any existing input first
    const existingInput = document.querySelector('input[data-testid="gallery-input"]');
    if (existingInput) {
      document.body.removeChild(existingInput);
    }
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,image/heic,image/heif,.heic,.heif';
    input.multiple = multiple;
    
    // Add Safari iOS specific attributes
    input.setAttribute('data-testid', 'gallery-input');
    input.setAttribute('aria-label', 'Gallery input');
    input.style.position = 'absolute';
    input.style.left = '-9999px';
    input.style.opacity = '0';
    input.style.pointerEvents = 'none';
    
    // Attach to DOM temporarily for Safari iOS
    document.body.appendChild(input);
    
    // Prevent duplicate uploads with a flag
    let hasProcessed = false;
    
    const handleFileChange = async (files: FileList | null, eventType: string) => {
      if (hasProcessed) {
        console.log(`🖼️ ${eventType} - Skipping duplicate processing`);
        return;
      }
      
      hasProcessed = true;
      
      console.log(`🖼️ Gallery input change event fired (${eventType})`);
      console.log('🖼️ Files from gallery:', files);
      console.log('🖼️ Files count:', files?.length || 0);
      
      if (!files || !files.length) {
        console.warn('⚠️ No files from gallery input');
        // Clean up
        if (document.body.contains(input)) {
          document.body.removeChild(input);
        }
        return;
      }

      // Log detailed file information
      Array.from(files).forEach((file, index) => {
        console.log(`🖼️ Gallery File ${index + 1}:`, {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          sizeInMB: (file.size / (1024 * 1024)).toFixed(2) + ' MB'
        });
      });
      
      await processFiles(files);
      
      // Clean up
      if (document.body.contains(input)) {
        document.body.removeChild(input);
      }
    };
    
    // Add multiple event listeners for Safari iOS compatibility
    input.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement;
      await handleFileChange(target.files, 'addEventListener');
    });
    
    // Legacy onchange as fallback
    input.onchange = async (e) => {
      const target = e.target as HTMLInputElement;
      await handleFileChange(target.files, 'onchange');
    };
    
    // Add focus event for debugging
    input.addEventListener('focus', () => {
      console.log('🖼️ Gallery input focused');
    });
    
    // Add blur event for debugging  
    input.addEventListener('blur', () => {
      console.log('🖼️ Gallery input blurred');
    });
    
    // Add click event for debugging
    input.addEventListener('click', () => {
      console.log('🖼️ Gallery input clicked');
    });
    
    console.log('🖼️ Triggering gallery input click');
    
    // Try multiple approaches for Safari iOS
    setTimeout(() => {
      input.focus();
      input.click();
      console.log('🖼️ Gallery input click attempted');
    }, 100);
    
    // Cleanup after timeout if no interaction
    setTimeout(() => {
      if (document.body.contains(input)) {
        console.log('🖼️ Cleaning up unused input element');
        document.body.removeChild(input);
      }
    }, 30000); // 30 second timeout
  };

  useImperativeHandle(ref, () => ({
    handleCameraClick: handleCameraClick,
    handleGalleryClick: handleGalleryClick,
  }));

  return (
    <Box className={className}>
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 1, fontSize: '0.875rem' }} 
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', gap: 1 }}>
        {showCameraButton && (
          <IconButton
            color="primary"
            onClick={handleCameraClick}
            disabled={disabled || uploading}
            size={size}
            title="Take Photo"
          >
            {uploading ? <CircularProgress size={20} /> : <PhotoCamera />}
          </IconButton>
        )}
        
        {showGalleryButton && (
          <IconButton
            color="primary"
            onClick={handleGalleryClick}
            disabled={disabled || uploading}
            size={size}
            title="Choose from Gallery"
          >
            <PhotoLibrary />
          </IconButton>
        )}
      </Box>
    </Box>
  );
});

export default SafariImageUpload; 