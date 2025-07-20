/**
 * Image Upload Service
 * 
 * Handles uploading images to the backend server or S3
 * and returns public image URLs for use in the application.
 */

// Get the base URL for API calls (matches api.ts logic)
const getBaseUrl = () => {
  // Use environment variable if set
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    console.log('🌐 Using env API URL:', envUrl);
    return envUrl;
  }
  
  // Always use HTTPS in development for mixed content security
  const protocol = 'https';
  const hostname = window.location.hostname;
  const port = import.meta.env.DEV ? '5001' : window.location.port;
  
  // In development with localhost, use direct HTTPS connection (no proxy for mixed content)
  if (import.meta.env.DEV) {
    const backendUrl = `${protocol}://${hostname}:5001/api`;
    console.log('🔒 Using direct HTTPS API URL:', backendUrl);
    return backendUrl;
  }
  
  // In production, use same-origin HTTPS
  const productionUrl = `${protocol}://${hostname}${port ? `:${port}` : ''}/api`;
  console.log('🔒 Using production HTTPS API URL:', productionUrl);
  return productionUrl;
};

// Interface for upload results with preview and verification status
export interface ImageUploadResult {
  success: boolean;
  previewUrl?: string;  // Local preview URL (blob URL)
  serverUrl?: string;   // Server URL after verification
  error?: string;
  status: 'uploading' | 'uploaded' | 'verified' | 'unverified' | 'error';
  uploadId?: string;    // Unique ID for tracking
  fileName?: string;    // Original filename
}

// Track active uploads for cleanup
const activeUploads = new Map<string, AbortController>();

// Generate unique upload ID
const generateUploadId = (): string => {
  return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Clean up blob URL to prevent memory leaks
const cleanupBlobUrl = (url: string) => {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
};

// Background verification function
const startBackgroundVerification = async (
  serverUrl: string,
  uploadResult: ImageUploadResult,
  onVerificationComplete?: (result: ImageUploadResult) => void
): Promise<void> => {
  const maxRetries = 30;
  const retryDelay = 500; // 500ms between retries
  let retries = 0;
  
  const uploadId = uploadResult.uploadId!;
  const controller = new AbortController();
  activeUploads.set(uploadId, controller);
  
  const verifyImage = async (): Promise<boolean> => {
    try {
      if (controller.signal.aborted) {
        return false;
      }
      
      const response = await fetch(serverUrl, {
        method: 'GET',
        signal: controller.signal
      });
      
      return response.ok;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return false;
      }
      console.warn(`Image verification attempt ${retries + 1} failed:`, error);
      return false;
    }
  };
  
  const attemptVerification = async () => {
    if (controller.signal.aborted) {
      return;
    }
    
    const isAvailable = await verifyImage();
    
    if (isAvailable) {
      // Success - image is verified
      const verifiedResult: ImageUploadResult = {
        ...uploadResult,
        status: 'verified',
        serverUrl
      };
      
      console.log(`✅ Image verified successfully: ${serverUrl}`);
      activeUploads.delete(uploadId);
      
      if (onVerificationComplete) {
        onVerificationComplete(verifiedResult);
      }
    } else if (retries < maxRetries - 1) {
      // Retry
      retries++;
      setTimeout(attemptVerification, retryDelay);
    } else {
      // Max retries reached - mark as unverified but keep preview
      const unverifiedResult: ImageUploadResult = {
        ...uploadResult,
        status: 'unverified',
        serverUrl
      };
      
      console.warn(`⚠️ Image verification failed after ${maxRetries} attempts: ${serverUrl}`);
      console.warn('Preview will remain visible. Image may be available later.');
      activeUploads.delete(uploadId);
      
      if (onVerificationComplete) {
        onVerificationComplete(unverifiedResult);
      }
    }
  };
  
  // Start verification
  attemptVerification();
};

// Cancel verification for a specific upload
export const cancelImageVerification = (uploadId: string): void => {
  const controller = activeUploads.get(uploadId);
  if (controller) {
    controller.abort();
    activeUploads.delete(uploadId);
  }
};

// Cancel all active verifications (cleanup)
export const cancelAllImageVerifications = (): void => {
  activeUploads.forEach((controller, uploadId) => {
    controller.abort();
  });
  activeUploads.clear();
};

// Main upload function with immediate preview and background verification
export const uploadImageToServer = async (
  file: File,
  onVerificationComplete?: (result: ImageUploadResult) => void
): Promise<ImageUploadResult> => {
  const uploadId = generateUploadId();
  
  // Create immediate local preview
  const previewUrl = URL.createObjectURL(file);
  
  try {
    // Get the authentication token
    const token = localStorage.getItem('token');
    if (!token) {
      cleanupBlobUrl(previewUrl);
      return {
        success: false,
        error: 'No authentication token found',
        status: 'error',
        uploadId
      };
    }
    
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('image', file);
    
    const baseUrl = getBaseUrl();
    const uploadUrl = `${baseUrl}/upload-image`;
    
    // Upload to server
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      cleanupBlobUrl(previewUrl);
      
      return {
        success: false,
        error: errorData.error || `Upload failed: ${response.status} ${response.statusText}`,
        status: 'error',
        uploadId
      };
    }
    
    const data = await response.json();
    
    // Extract the relative path from the returned URL
    const relativePath = data.url.startsWith('/') ? data.url : new URL(data.url).pathname;
    
    // For static file access, use the host without /api prefix
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = import.meta.env.DEV ? '5001' : window.location.port;
    const staticBaseUrl = `${protocol}//${hostname}${port ? `:${port}` : ''}`;
    const serverUrl = `${staticBaseUrl}${relativePath}`;
    
    // Create upload result with local preview and relative path
    const uploadResult: ImageUploadResult = {
      success: true,
      previewUrl,
      serverUrl: relativePath, // Store relative path instead of full URL
      status: 'uploaded',
      uploadId,
      fileName: file.name
    };
    
    // Start background verification (non-blocking) with full URL
    const fullServerUrl = `${staticBaseUrl}${relativePath}`;
    startBackgroundVerification(fullServerUrl, uploadResult, onVerificationComplete);
    
    console.log(`📤 Image uploaded successfully, preview ready: ${file.name}`);
    console.log(`🔄 Starting background verification for: ${fullServerUrl}`);
    
    return uploadResult;
    
  } catch (error) {
    console.error('Upload error:', error);
    cleanupBlobUrl(previewUrl);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
      status: 'error',
      uploadId
    };
  }
};

// Utility function to get display URL (previewUrl or full URL from relative path)
export const getDisplayUrl = (uploadResult: ImageUploadResult): string | undefined => {
  // Use preview URL if available (for immediate display)
  if (uploadResult.previewUrl) {
    return uploadResult.previewUrl;
  }
  
  // Generate full URL from relative path
  if (uploadResult.serverUrl) {
    return getFullImageUrl(uploadResult.serverUrl);
  }
  
  return undefined;
};

// Utility function to generate full image URL from relative path
export const getFullImageUrl = (relativePath: string): string => {
  if (!relativePath) return '';
  
  // If it's already a full URL, return as is
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  
  // If it's a blob URL, return as is
  if (relativePath.startsWith('blob:')) {
    return relativePath;
  }
  
  // Use environment variable if set
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return `${envUrl.replace('/api', '')}${relativePath}`;
  }
  
  // Generate base URL for static files
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = import.meta.env.DEV ? '5001' : window.location.port;
  const staticBaseUrl = `${protocol}//${hostname}${port ? `:${port}` : ''}`;
  
  return `${staticBaseUrl}${relativePath}`;
};

// Utility function to convert full URL to relative path (for migration)
export const convertFullUrlToRelativePath = (fullUrl: string): string => {
  if (!fullUrl) return '';
  
  // If it's already a relative path, return as is
  if (fullUrl.startsWith('/')) {
    return fullUrl;
  }
  
  // If it's a blob URL, return as is
  if (fullUrl.startsWith('blob:')) {
    return fullUrl;
  }
  
  // Extract pathname from full URL
  try {
    const url = new URL(fullUrl);
    return url.pathname;
  } catch (error) {
    console.warn('Could not parse URL:', fullUrl);
    return fullUrl;
  }
};

// Utility function to cleanup upload result
export const cleanupUploadResult = (uploadResult: ImageUploadResult): void => {
  if (uploadResult.uploadId) {
    cancelImageVerification(uploadResult.uploadId);
  }
  
  if (uploadResult.previewUrl) {
    cleanupBlobUrl(uploadResult.previewUrl);
  }
}; 