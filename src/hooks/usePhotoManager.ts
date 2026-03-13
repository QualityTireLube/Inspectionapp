import { useState, useRef, useCallback } from 'react';
import { ImageUpload, PhotoType } from '../types/quickCheck';
import { uploadImageToServer, ImageUploadResult } from '../services/imageUpload';

export const usePhotoManager = () => {
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [currentImagePhotos, setCurrentImagePhotos] = useState<ImageUpload[]>([]);
  const [currentPhotoType, setCurrentPhotoType] = useState<string>('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraType, setCameraType] = useState<PhotoType | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const validateImage = useCallback((file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const { width, height } = img;
        const aspectRatio = width / height;
        
        if (width < 400 || height < 400) {
          resolve('Image resolution too low. Please use a higher quality image (minimum 400x400).');
        } else if (aspectRatio < 0.5 || aspectRatio > 2) {
          resolve('Image aspect ratio is too extreme. Please use a more standard aspect ratio.');
        } else {
          resolve(null);
        }
      };
      img.onerror = () => resolve('Invalid image file.');
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const handleImageClick = useCallback((photos: ImageUpload[], photoType?: string) => {
    setCurrentImagePhotos(photos);
    setCurrentPhotoType(photoType || '');
    setImageModalOpen(true);
  }, []);

  const handleCloseImageModal = useCallback(() => {
    setImageModalOpen(false);
  }, []);

  const cleanupCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const handleCameraOpen = useCallback(async (type: PhotoType) => {
    setCameraType(type);
    setCameraOpen(true);
    
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  }, [facingMode]);

  const captureImage = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
            // Handle the captured image
            console.log('Image captured:', file);
          }
        }, 'image/jpeg', 0.8);
      }
    }
  }, []);

  const handleFlashToggle = useCallback(() => {
    setFlashEnabled(prev => !prev);
  }, []);

  const handleCameraSwitch = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  const handleImageUpload = useCallback(async (
    file: File, 
    type: PhotoType,
    onUpdate: (type: PhotoType, photos: ImageUpload[]) => void
  ) => {
    const validationError = await validateImage(file);
    if (validationError) {
      console.error('Validation error:', validationError);
      return;
    }

    try {
      const uploadResult = await uploadImageToServer(file, (verifiedResult: ImageUploadResult) => {
        console.log(`🔄 Image verification completed for ${type}:`, verifiedResult.status);
        
        // Update the photo with the verified relative path
        const updatedUpload: ImageUpload = {
          file,
          progress: 100,
          url: verifiedResult.serverUrl // Store relative path
        };

        // This would need to be connected to the form state
        console.log('Photo verified:', type, updatedUpload);
      });

      if (!uploadResult.success) {
        console.error('Upload failed:', uploadResult.error);
        return;
      }

      const newUpload: ImageUpload = {
        file,
        progress: 100,
        url: uploadResult.serverUrl // Store relative path instead of blob URL
      };

      // Update the form with the new photo
      console.log('Photo uploaded:', type, newUpload);
      
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  }, [validateImage]);

  const handleDeletePhoto = useCallback((
    photos: ImageUpload[], 
    index: number,
    onUpdate: (photos: ImageUpload[]) => void
  ) => {
    const updatedPhotos = photos.map((photo, i) => 
      i === index ? { ...photo, isDeleted: true } : photo
    );
    onUpdate(updatedPhotos);
  }, []);

  return {
    // State
    imageModalOpen,
    currentImagePhotos,
    currentPhotoType,
    cameraOpen,
    cameraType,
    facingMode,
    flashEnabled,
    currentDeviceId,
    devices,
    
    // Refs
    videoRef,
    canvasRef,
    streamRef,
    
    // Setters
    setCameraOpen,
    setCameraType,
    
    // Handlers
    validateImage,
    handleImageClick,
    handleCloseImageModal,
    cleanupCamera,
    handleCameraOpen,
    captureImage,
    handleFlashToggle,
    handleCameraSwitch,
    handleImageUpload,
    handleDeletePhoto
  };
}; 