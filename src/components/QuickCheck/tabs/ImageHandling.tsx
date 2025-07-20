import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Modal,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  PhotoCamera as PhotoCameraIcon,
  FlashOn as FlashOnIcon,
  FlashOff as FlashOffIcon,
  Close as CloseIcon,
  FlipCameraIos as FlipCameraIosIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Delete as DeleteIcon,
  PhotoLibrary as PhotoLibraryIcon
} from '@mui/icons-material';
import heic2any from 'heic2any';
import { 
  logImageUploadAttempt, 
  showSafariImageAlert, 
  detectBrowser, 
  testImageUploadCapabilities,
  testAllImageMethods,
  showVisualImageDebug,
  getImageDebugReport
} from '../../../services/imageUploadDebug';

export interface ImageUpload {
  file: File;
  progress: number;
  url?: string;
  error?: string;
  position?: number;
  isDeleted?: boolean;
}

export interface ImageHandlingProps {
  onImageUpload: (file: File, type: string) => Promise<void>;
  onImageClick: (photos: ImageUpload[], photoType?: string) => void;
  onDeleteImage: (photoType: string, index: number) => void;
  onError: (error: string) => void;
  showDebugPanel?: boolean;
}

export type CameraType = 'passenger_front' | 'driver_front' | 'driver_rear' | 'passenger_rear' | 'spare' | 'undercarriage_photos' | 'front_brakes' | 'rear_brakes' | 'tpms_placard' | 'washer_fluid' | 'engine_air_filter' | 'battery' | 'tpms_tool' | 'dashLights';

const ImageHandling: React.FC<ImageHandlingProps> = ({
  onImageUpload,
  onImageClick,
  onDeleteImage,
  onError,
  showDebugPanel = false
}) => {
  // Camera and image states
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [hasFlashSupport, setHasFlashSupport] = useState(false);
  const [cameraType, setCameraType] = useState<CameraType>('passenger_front');
  const [cameraPermission, setCameraPermission] = useState<PermissionState>('prompt');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  const [slideshowPhotos, setSlideshowPhotos] = useState<ImageUpload[]>([]);
  const [slideshowPhotoType, setSlideshowPhotoType] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const tirePhotoInputRef = useRef<HTMLInputElement | null>(null);

  // Safari detection and capability testing
  useEffect(() => {
    const browser = detectBrowser();
    if (browser.includes('Safari')) {
      console.log('📱 Safari detected - Testing image upload capabilities...');
      testAllImageMethods();
      
      const capabilities = testImageUploadCapabilities();
      if (!capabilities.fileInputSupported || !capabilities.fileAPISupported) {
        showSafariImageAlert('Some image upload features may not work properly in this browser version.');
      }
    }
  }, []);

  // Add debug button for testing
  const handleDebugInfo = () => {
    const debugReport = getImageDebugReport();
    const visualDebug = showVisualImageDebug();
    
    // Log to console for web inspector
    console.group('🔍 FULL DEBUG REPORT FOR DEVELOPER');
    console.log('Visual Debug:', visualDebug);
    console.log('Full Debug History:', debugReport);
    console.log('Current Capabilities:', testImageUploadCapabilities());
    console.log('Browser Info:', detectBrowser());
    console.log('User Agent:', navigator.userAgent);
    console.log('Protocol:', window.location.protocol);
    console.log('Host:', window.location.host);
    console.groupEnd();
    
    // Also show visual alert
    alert(`DEBUG INFO:\n\n${visualDebug}\n\nCheck console for full details.`);
  };

  // Image validation function
  const validateImage = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith('image/')) {
      return 'Please upload an image file (JPEG, PNG, HEIC, etc.)';
    }
    if (file.size > 25 * 1024 * 1024) {
      return 'File size should be less than 25MB';
    }
    
    // Check if it's a HEIC file (iPhone photos) - will be converted to JPG
    if (await isHEICFile(file)) {
      // Skip dimension validation for HEIC files since they'll be converted
      return null;
    }
    
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        if (img.width < 200 || img.height < 200) {
          resolve('Image resolution should be at least 200x200 pixels');
        } else {
          resolve(null);
        }
      };
      img.onerror = () => resolve('Invalid image file');
      img.src = URL.createObjectURL(file);
    });
  };

  // HEIC file detection helper
  const isHEICFile = (file: File): boolean => {
    return file.type === 'image/heic' || 
           file.type === 'image/heif' || 
           file.name.toLowerCase().endsWith('.heic') || 
           file.name.toLowerCase().endsWith('.heif');
  };

  // HEIC to JPEG conversion helper
  const convertHEICToJPEG = async (file: File): Promise<File> => {
    try {
      const convertedBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.8,
      });

      const resultBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      const originalName = file.name.replace(/\.(heic|heif)$/i, '');
      const convertedFile = new File([resultBlob], `${originalName}.jpg`, {
        type: 'image/jpeg',
        lastModified: file.lastModified,
      });

      return convertedFile;
    } catch (error) {
      console.error('Error converting HEIC to JPEG:', error);
      throw new Error('Failed to convert HEIC image. Please try selecting the image again.');
    }
  };

  // Process files with HEIC conversion
  const processFilesWithHEICConversion = async (files: File[]): Promise<File[]> => {
    const processedFiles: File[] = [];
    
    for (const file of files) {
      if (isHEICFile(file)) {
        const convertedFile = await convertHEICToJPEG(file);
        processedFiles.push(convertedFile);
      } else {
        processedFiles.push(file);
      }
    }
    
    return processedFiles;
  };

  // Camera handling functions
  const handleCameraOpen = async (type: CameraType) => {
    setCameraType(type);
    setScannerOpen(true);
    setCameraError(null);
    
    try {
      // Try to get camera access for preview
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoTrackRef.current = stream.getVideoTracks()[0];
      }
      
      // Get available cameras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      setAvailableCameras(cameras);
      
    } catch (error) {
      console.log('Camera access denied, fallback to file picker');
      setCameraError('Camera access denied. Using file picker instead.');
      
      // Fallback to direct file picker if camera access is denied
      setTimeout(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.multiple = true;
        input.onchange = async (e) => {
          const files = (e.target as HTMLInputElement).files;
          if (files) {
            for (let i = 0; i < files.length; i++) {
              await handleImageUpload(files[i], type);
            }
          }
          setScannerOpen(false);
        };
        input.click();
      }, 1000);
    }
  };

  const handleTireCameraOpen = (type: CameraType) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      for (const file of files) {
        await handleImageUpload(file, type);
      }
    };
    input.click();
  };

  const handleChooseFile = (type: CameraType) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        for (let i = 0; i < files.length; i++) {
          await handleImageUpload(files[i], type);
        }
      }
    };
    input.click();
  };

  const handleImageUpload = async (file: File, type: string) => {
    try {
      // Log the upload attempt for debugging
      logImageUploadAttempt(file);
      
      const validationError = await validateImage(file);
      if (validationError) {
        logImageUploadAttempt(file, { message: validationError });
        onError(validationError);
        return;
      }

      // Process HEIC conversion if needed
      const processedFile = isHEICFile(file) ? await convertHEICToJPEG(file) : file;
      
      await onImageUpload(processedFile, type);
    } catch (error) {
      console.error('Error handling image:', error);
      logImageUploadAttempt(file, error);
      
      // Show Safari-specific alert if this is a Safari browser
      if (detectBrowser().includes('Safari')) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        showSafariImageAlert(`Image upload failed: ${errorMessage}. Check console for details.`);
      }
      
      onError('Failed to process image');
    }
  };

  const handleFlashToggle = () => {
    setIsFlashOn(!isFlashOn);
  };

  const handleCameraSwitch = () => {
    setCurrentCameraIndex((prev) => (prev + 1) % availableCameras.length);
  };

  const cleanupCamera = () => {
    // Stop video stream
    if (videoTrackRef.current) {
      videoTrackRef.current.stop();
      videoTrackRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setScannerOpen(false);
    setCapturedImage(null);
    setCameraError(null);
  };

  const openPhotoLibrary = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.webkitdirectory = false;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        for (let i = 0; i < files.length; i++) {
          await handleImageUpload(files[i], cameraType);
        }
      }
      cleanupCamera();
    };
    input.click();
  };

  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        
        // Convert canvas to blob and create file
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], `camera-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            await handleImageUpload(file, cameraType);
            cleanupCamera();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const handleCapturedImage = async () => {
    // Handle captured image logic would go here
    cleanupCamera();
  };

  const handleImageClick = (photos: ImageUpload[], photoType?: string) => {
    setSlideshowOpen(true);
    setSlideshowPhotos(photos);
    setSlideshowPhotoType(photoType || null);
    onImageClick(photos, photoType);
  };

  const handleCloseImageModal = () => {
    setSelectedImage(null);
  };

  const handleTirePhotoFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    await handleImageUpload(file, cameraType);
  };

  // PhotoSlideshow component
  const PhotoSlideshow: React.FC<{
    open: boolean;
    photos: ImageUpload[];
    onClose: () => void;
    onDelete: (index: number) => void;
  }> = ({ open, photos, onClose, onDelete }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    React.useEffect(() => {
      if (open && currentIndex >= photos.length && photos.length > 0) {
        setCurrentIndex(0);
      }
    }, [open, currentIndex, photos.length]);

    const handlePrevious = () => {
      setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
    };

    const handleNext = () => {
      setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
    };

    const safeCurrentIndex = Math.min(currentIndex, photos.length - 1);

    if (!open || photos.length === 0) return null;

    return (
      <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth="md" 
        fullWidth
      >
        <DialogContent>
          {photos[safeCurrentIndex] && (
            <img
              src={photos[safeCurrentIndex].url || URL.createObjectURL(photos[safeCurrentIndex].file)}
              alt={`Photo ${safeCurrentIndex + 1}`}
              style={{ width: '100%', height: 'auto' }}
            />
          )}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={handlePrevious} disabled={photos.length <= 1}>Previous</Button>
            <Typography variant="body2" color="text.secondary">
              {safeCurrentIndex + 1} of {photos.length}
            </Typography>
            <Button onClick={() => onDelete(safeCurrentIndex)} color="error">Delete</Button>
            <Button onClick={handleNext} disabled={photos.length <= 1}>Next</Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Public interface for parent component
  const imageHandlingAPI = {
    handleCameraOpen,
    handleTireCameraOpen,
    handleChooseFile,
    handleImageClick,
    handleImageUpload,
    handleTirePhotoFileUpload,
    openSlideshow: (photos: ImageUpload[], photoType?: string) => {
      setSlideshowOpen(true);
      setSlideshowPhotos(photos);
      setSlideshowPhotoType(photoType || null);
    }
  };

  return (
    <>
      {/* Debug Button - Only show when debug panel is enabled */}
      {showDebugPanel && (
        <Box sx={{ position: 'fixed', top: 10, right: 10, zIndex: 9999 }}>
          <Button
            variant="contained"
            color="secondary"
            size="small"
            onClick={handleDebugInfo}
            sx={{ fontSize: '10px', minWidth: 'auto', p: 1 }}
          >
            🔍 DEBUG
          </Button>
        </Box>
      )}

      {/* QR Scanner Dialog */}
      <Dialog 
        open={scannerOpen} 
        onClose={cleanupCamera}
        maxWidth="md" 
        fullWidth
      >
        <DialogContent>
          {cameraError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {cameraError}
            </Alert>
          )}
          
          <Box sx={{ position: 'relative', width: '100%', height: 'auto', aspectRatio: '4/3' }}>
            {!capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: 4
                  }}
                  playsInline
                  autoPlay
                />
                {['tpms_placard', 'undercarriage_photos', 'passenger_front', 'driver_front', 'driver_rear', 'passenger_rear', 'spare', 'front_brakes', 'rear_brakes'].includes(cameraType) && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '80%',
                      height: '60%',
                      border: '2px solid #1042D8',
                      borderRadius: 2,
                      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                      pointerEvents: 'none',
                    }}
                  />
                )}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    display: 'flex',
                    gap: 1
                  }}
                >
                  {hasFlashSupport && (
                    <IconButton
                      onClick={handleFlashToggle}
                      sx={{
                        bgcolor: 'rgba(0,0,0,0.5)',
                        color: 'white',
                        '&:hover': {
                          bgcolor: 'rgba(0,0,0,0.7)',
                        },
                      }}
                    >
                      {isFlashOn ? <FlashOnIcon /> : <FlashOffIcon />}
                    </IconButton>
                  )}
                  {availableCameras.length > 1 && (
                    <IconButton
                      onClick={handleCameraSwitch}
                      sx={{
                        bgcolor: 'rgba(0,0,0,0.5)',
                        color: 'white',
                        '&:hover': {
                          bgcolor: 'rgba(0,0,0,0.7)',
                        },
                      }}
                    >
                      <FlipCameraIosIcon />
                    </IconButton>
                  )}
                </Box>
                {/* Camera Controls */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 16,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    width: '80%',
                    justifyContent: 'space-between'
                  }}
                >
                  {/* Photo Library Button - Bottom Left Corner */}
                  <IconButton
                    onClick={openPhotoLibrary}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.9)',
                      color: 'black',
                      width: 48,
                      height: 48,
                      border: '2px solid white',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,1)',
                      },
                    }}
                  >
                    <PhotoLibraryIcon />
                  </IconButton>
                  
                  {/* Capture Button - Center */}
                  <Button
                    variant="contained"
                    onClick={captureImage}
                    sx={{
                      bgcolor: 'white',
                      color: 'black',
                      borderRadius: '50%',
                      width: 72,
                      height: 72,
                      minWidth: 72,
                      border: '4px solid rgba(255,255,255,0.8)',
                      '&:hover': {
                        bgcolor: 'grey.100',
                      },
                    }}
                  >
                    <PhotoCameraIcon sx={{ fontSize: 32 }} />
                  </Button>
                  
                  {/* Placeholder for balance */}
                  <Box sx={{ width: 48, height: 48 }} />
                </Box>
              </>
            ) : (
              <Box sx={{ position: 'relative' }}>
                <img
                  src={capturedImage}
                  alt="Captured"
                  style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: 4
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 16,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: 2
                  }}
                >
                  <Button
                    variant="contained"
                    onClick={() => setCapturedImage(null)}
                    sx={{
                      bgcolor: 'white',
                      color: 'black',
                      '&:hover': {
                        bgcolor: 'grey.100',
                      },
                    }}
                  >
                    Retake
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleCapturedImage}
                    sx={{
                      bgcolor: 'white',
                      color: 'black',
                      '&:hover': {
                        bgcolor: 'grey.100',
                      },
                    }}
                  >
                    Use Photo
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      <Modal
        open={!!selectedImage}
        onClose={handleCloseImageModal}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Box
          sx={{
            position: 'relative',
            maxWidth: '90vw',
            maxHeight: '90vh',
            bgcolor: 'background.paper',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          {selectedImage && (
            <>
              <img
                src={selectedImage}
                alt="Preview"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
              <IconButton
                onClick={handleCloseImageModal}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  bgcolor: 'rgba(0,0,0,0.5)',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'rgba(0,0,0,0.7)',
                  },
                }}
              >
                <CloseIcon />
              </IconButton>
            </>
          )}
        </Box>
      </Modal>

      {/* Hidden file input for tire photos */}
      <input
        type="file"
        accept="image/*"
        hidden
        ref={tirePhotoInputRef}
        onChange={e => handleTirePhotoFileUpload(e.target.files)}
      />

      {/* Photo Slideshow */}
      <PhotoSlideshow
        open={slideshowOpen}
        photos={slideshowPhotos}
        onClose={() => setSlideshowOpen(false)}
        onDelete={(index) => {
          const updatedPhotos = [...slideshowPhotos];
          updatedPhotos.splice(index, 1);
          setSlideshowPhotos(updatedPhotos);
          
          // Notify parent component about the deletion
          if (slideshowPhotoType) {
            onDeleteImage(slideshowPhotoType, index);
          }
        }}
      />
    </>
  );
};

export default ImageHandling; 