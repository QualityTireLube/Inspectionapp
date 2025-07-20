import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  IconButton,
  Paper,
  Dialog,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Fab,
  useTheme,
  useMediaQuery,
  Slide,
  AppBar,
  Toolbar,
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import Grid from '../CustomGrid';
import {
  PhotoCamera,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  FlipCameraIos as FlipCameraIosIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import heic2any from 'heic2any';
import { uploadDepositImages } from '../../services/cashManagementApi';

interface UploadingImage {
  file: File;
  previewUrl: string;
  isUploading: boolean;
  uploadedFilename?: string;
  error?: string;
}

interface ImageUploadFieldProps {
  images: string[];
  onChange: (images: string[]) => void;
  label?: string;
  maxImages?: number;
  disabled?: boolean;
  multiple?: boolean;
  showImageCount?: boolean;
  continuousCamera?: boolean;
}

// HEIC detection helper
const isHEICFile = (file: File): boolean => {
  return file.type === 'image/heic' || file.type === 'image/heif' || 
         file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
};

// HEIC to JPEG conversion helper
const convertHEICToJPEG = async (file: File): Promise<File> => {
  try {
    const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.8, // Good quality while keeping file size reasonable
    });

    // heic2any returns a blob or array of blobs
    const resultBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
    
    // Create new file with .jpg extension
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
      try {
        const convertedFile = await convertHEICToJPEG(file);
        processedFiles.push(convertedFile);
      } catch (error) {
        // Re-throw the error to be handled by the calling function
        throw error;
      }
    } else {
      processedFiles.push(file);
    }
  }
  
  return processedFiles;
};

const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  images,
  onChange,
  label = "Images",
  maxImages = 5,
  disabled = false,
  multiple = true,
  showImageCount = true,
  continuousCamera = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImages, setUploadingImages] = useState<UploadingImage[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [captureSuccess, setCaptureSuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Mobile detection and responsive design
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery('(max-width: 480px)');

  // Haptic feedback helper (if available on mobile)
  const triggerHapticFeedback = useCallback(() => {
    if ('vibrate' in navigator && navigator.vibrate) {
      navigator.vibrate(50); // Short vibration for feedback
    }
  }, []);

  // Initialize camera with mobile optimizations
  const initializeCamera = useCallback(async () => {
    try {
      // Get available devices
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = deviceList.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);

      // Mobile-optimized camera constraints
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: isMobile ? 1280 : 1920, max: isMobile ? 1280 : 1920 },
          height: { ideal: isMobile ? 720 : 1080, max: isMobile ? 720 : 1080 },
          frameRate: { ideal: 30, max: 30 },
          aspectRatio: { ideal: 16/9 }
        }
      };

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setError('Failed to access camera. Please ensure camera permissions are granted.');
    }
  }, [facingMode, isMobile]);

  // Cleanup camera
  const cleanupCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Handle camera open
  const handleCameraOpen = useCallback(async () => {
    setCameraOpen(true);
    setError(null);
    await initializeCamera();
  }, [initializeCamera]);

  // Handle camera close
  const handleCameraClose = useCallback(() => {
    setCameraOpen(false);
    cleanupCamera();
  }, [cleanupCamera]);

  // Switch camera (front/back)
  const handleCameraSwitch = useCallback(async () => {
    if (devices.length <= 1) return;
    
    cleanupCamera();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    
    // Re-initialize with new facing mode
    setTimeout(() => {
      initializeCamera();
    }, 100);
  }, [devices.length, cleanupCamera, initializeCamera]);

  // Enhanced capture photo with mobile optimizations
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Trigger haptic feedback
    triggerHapticFeedback();

    // Show capture success animation
    setCaptureSuccess(true);
    setTimeout(() => setCaptureSuccess(false), 1000);

    // Set canvas dimensions to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0);

    // Convert canvas to blob with optimized quality for mobile
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const file = new File([blob], `camera-capture-${Date.now()}.jpg`, { 
        type: 'image/jpeg' 
      });

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      const uploadingImage: UploadingImage = {
        file,
        previewUrl,
        isUploading: true,
      };

      setUploadingImages(prev => [...prev, uploadingImage]);
      setUploading(true);

      try {
        const uploadedFilenames = await uploadDepositImages([file]);
        
        // Remove from uploading and add to main images
        setUploadingImages(prev => prev.filter(img => img !== uploadingImage));
        onChange([...images, ...uploadedFilenames]);
        
        // Clean up preview URL
        URL.revokeObjectURL(previewUrl);

        // If not in continuous mode, close camera after first capture
        if (!continuousCamera) {
          handleCameraClose();
        }
      } catch (error) {
        console.error('Error uploading captured image:', error);
        setError('Failed to upload captured image. Please try again.');
        setUploadingImages(prev => prev.filter(img => img !== uploadingImage));
        URL.revokeObjectURL(previewUrl);
      } finally {
        setUploading(false);
      }
    }, 'image/jpeg', isMobile ? 0.85 : 0.8); // Slightly higher compression on mobile
  }, [images, onChange, continuousCamera, handleCameraClose, triggerHapticFeedback, isMobile]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      cleanupCamera();
    };
  }, [cleanupCamera]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Validate file types (including HEIC before conversion)
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/heic', 'image/heif'];
    const invalidFiles = files.filter(file => {
      return !validTypes.includes(file.type) && !isHEICFile(file);
    });
    if (invalidFiles.length > 0) {
      setError('Only JPEG, PNG, GIF, and HEIC images are allowed');
      return;
    }

    // Validate file sizes (max 25MB each)
    const maxSize = 25 * 1024 * 1024; // 25MB
    const oversizedFiles = files.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      setError('Each image must be smaller than 25MB');
      return;
    }

    // For single image uploads, replace the existing image
    if (!multiple && files.length > 0) {
      const originalFile = files[0];
      setError(null);
      setUploading(true);
      
      try {
        // Process HEIC conversion if needed
        const processedFiles = await processFilesWithHEICConversion([originalFile]);
        const file = processedFiles[0];
        
        // Create immediate preview
        const previewUrl = URL.createObjectURL(file);
        const uploadingImage: UploadingImage = {
          file,
          previewUrl,
          isUploading: true,
        };
        
        setUploadingImages([uploadingImage]);

        const uploadedFilenames = await uploadDepositImages([file]);
        
        // Update the uploading image with the server filename
        setUploadingImages([]);
        onChange(uploadedFilenames);
        
        // Clean up the preview URL
        URL.revokeObjectURL(previewUrl);
      } catch (error) {
        console.error('Error uploading image:', error);
        
        // Extract specific error message from server response
        let errorMessage = 'Failed to upload image. Please try again.';
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as any;
          if (axiosError.response?.data?.error) {
            errorMessage = axiosError.response.data.error;
          }
        } else if (error && typeof error === 'object' && 'message' in error) {
          const generalError = error as any;
          errorMessage = generalError.message;
        }
        
        setError(errorMessage);
        setUploadingImages([]);
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
      return;
    }

    // For multiple image uploads
    if (images.length + uploadingImages.length + files.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed`);
      return;
    }

    setError(null);
    setUploading(true);

    try {
      // Process HEIC conversion if needed
      const processedFiles = await processFilesWithHEICConversion(files);
      
      // Create immediate previews for all processed files
      const newUploadingImages: UploadingImage[] = processedFiles.map(file => ({
        file,
        previewUrl: URL.createObjectURL(file),
        isUploading: true,
      }));
      
      setUploadingImages(prev => [...prev, ...newUploadingImages]);

      const uploadedFilenames = await uploadDepositImages(processedFiles);
      
      // Remove the uploading images and add to the main images array
      setUploadingImages(prev => {
        const remainingUploading = prev.filter(img => !newUploadingImages.includes(img));
        return remainingUploading;
      });
      
      onChange([...images, ...uploadedFilenames]);
      
      // Clean up preview URLs
      newUploadingImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
    } catch (error) {
      console.error('Error uploading images:', error);
      
      // Extract specific error message from server response
      let errorMessage = 'Failed to upload images. Please try again.';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        if (axiosError.response?.data?.error) {
          errorMessage = axiosError.response.data.error;
        }
      } else if (error && typeof error === 'object' && 'message' in error) {
        const generalError = error as any;
        errorMessage = generalError.message;
      }
      
      setError(errorMessage);
      
      // Remove failed uploads and clean up URLs
      setUploadingImages(prev => []);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  };

  const getImageUrl = (filename: string) => {
    const baseUrl = import.meta.env.VITE_UPLOAD_URL || 
      `${window.location.protocol === 'https:' ? 'https' : 'http'}://${window.location.hostname}:5001/uploads`;
    return `${baseUrl}/${filename}`;
  };

  // Helper functions for slideshow
  const getAllImages = () => {
    const allImages = [
      ...uploadingImages.map((img, index) => ({
        url: img.previewUrl,
        isUploading: true,
        index,
      })),
      ...images.map((filename, index) => ({
        url: getImageUrl(filename),
        isUploading: false,
        index: uploadingImages.length + index,
      })),
    ];
    return allImages;
  };

  const getCurrentImageUrl = () => {
    const allImages = getAllImages();
    return allImages[currentImageIndex]?.url || previewImage;
  };

  const goToPrevious = () => {
    const allImages = getAllImages();
    if (currentImageIndex > 0) {
      const newIndex = currentImageIndex - 1;
      setCurrentImageIndex(newIndex);
      setPreviewImage(allImages[newIndex].url);
    }
  };

  const goToNext = () => {
    const allImages = getAllImages();
    if (currentImageIndex < allImages.length - 1) {
      const newIndex = currentImageIndex + 1;
      setCurrentImageIndex(newIndex);
      setPreviewImage(allImages[newIndex].url);
    }
  };

  const totalImages = images.length + uploadingImages.length;
  const shouldShowFileInput = multiple ? totalImages < maxImages : totalImages === 0;

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        {label} {showImageCount && `(${totalImages}${multiple && maxImages < 100 ? `/${maxImages}` : ''})`}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 2 }}>
        <input
          type="file"
          multiple={multiple}
          accept="image/jpeg,image/png,image/gif,image/heic,image/heif,.heic,.heif"
          ref={fileInputRef}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          disabled={disabled || uploading || (!multiple && images.length >= 1)}
        />
        {shouldShowFileInput && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              onClick={() => fileInputRef.current?.click()}
              startIcon={<PhotoCamera />}
              disabled={disabled || uploading}
            >
              {uploading ? 'Uploading...' : multiple ? 'Add Images' : 'Add Image'}
            </Button>
            {continuousCamera && (
              <Button
                variant="contained"
                onClick={handleCameraOpen}
                startIcon={<PhotoCamera />}
                disabled={disabled || uploading}
                color="primary"
              >
                Take Photos
              </Button>
            )}
          </Box>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {multiple 
            ? `${maxImages >= 100 ? 'Unlimited' : `Maximum ${maxImages}`} images. JPEG, PNG, GIF, or HEIC format. Max 25MB each.`
            : 'Single image only. JPEG, PNG, GIF, or HEIC format. Max 25MB.'
          }
          {continuousCamera && <><br />Camera mode: Take multiple photos, click "Done" when finished.</>}
          <br />HEIC images will be automatically converted to JPEG.
        </Typography>
      </Box>

      {/* Quick thumbnails preview right after upload controls */}
      {(uploadingImages.length > 0 || images.length > 0) && (
        <Box sx={{ mt: 2, mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Click thumbnail to view full size:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {/* Show uploading thumbnails */}
            {uploadingImages.map((uploadingImage, index) => (
              <Box
                key={`uploading-thumb-${index}`}
                sx={{
                  position: 'relative',
                  width: 60,
                  height: 60,
                  border: '2px solid',
                  borderColor: 'primary.main',
                  borderRadius: 1,
                  overflow: 'hidden',
                  cursor: 'pointer',
                }}
                                 onClick={() => {
                   setCurrentImageIndex(index);
                   setPreviewImage(uploadingImage.previewUrl);
                 }}
              >
                <Box
                  component="img"
                  src={uploadingImage.previewUrl}
                  alt={`Uploading ${index + 1}`}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CircularProgress size={16} sx={{ color: 'white' }} />
                </Box>
              </Box>
            ))}
            
            {/* Show uploaded thumbnails */}
            {images.map((filename, index) => (
              <Box
                key={`thumb-${filename}`}
                sx={{
                  position: 'relative',
                  width: 60,
                  height: 60,
                  border: '1px solid',
                  borderColor: 'grey.300',
                  borderRadius: 1,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'scale(1.1)',
                    boxShadow: 2,
                    borderColor: 'primary.main',
                    '& .delete-btn': {
                      opacity: 1,
                    },
                  },
                }}
                onClick={() => setPreviewImage(getImageUrl(filename))}
              >
                <Box
                  component="img"
                  src={getImageUrl(filename)}
                  alt={`${label} ${index + 1}`}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                  onError={(e) => {
                    console.error('Thumbnail failed to load:', getImageUrl(filename));
                  }}
                />
                {!disabled && (
                  <IconButton
                    className="delete-btn"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage(index);
                    }}
                    sx={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      backgroundColor: 'error.main',
                      color: 'white',
                      width: 20,
                      height: 20,
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      '&:hover': {
                        backgroundColor: 'error.dark',
                      },
                    }}
                  >
                    <DeleteIcon sx={{ fontSize: 12 }} />
                  </IconButton>
                )}
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {(images.length > 0 || uploadingImages.length > 0) && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ mb: 2, fontWeight: 'medium' }}>
            Images ({totalImages})
          </Typography>
          <Grid container spacing={2}>
            {/* Show uploading images first */}
            {uploadingImages.map((uploadingImage, index) => (
              <Grid item xs={6} sm={4} md={multiple ? 3 : 6} key={`uploading-${index}`}>
                <Paper
                  elevation={3}
                  sx={{
                    position: 'relative',
                    paddingTop: '75%', // 4:3 aspect ratio
                    overflow: 'hidden',
                    borderRadius: 2,
                    border: '2px solid',
                    borderColor: 'primary.main',
                    opacity: 0.8,
                  }}
                >
                  <Box
                    component="img"
                    src={uploadingImage.previewUrl}
                    alt={`Uploading ${index + 1}`}
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                  
                  {/* Upload progress overlay */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                    }}
                  >
                    <CircularProgress size={32} sx={{ color: 'white', mb: 1 }} />
                    <Typography variant="caption" sx={{ color: 'white', fontWeight: 'medium' }}>
                      Uploading...
                    </Typography>
                  </Box>
                  
                  {/* Image index indicator */}
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 8,
                      left: 8,
                      backgroundColor: 'primary.main',
                      color: 'white',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: '0.75rem',
                      fontWeight: 'medium',
                    }}
                  >
                    {index + 1}
                  </Box>
                </Paper>
              </Grid>
            ))}
            
            {/* Show uploaded images */}
            {images.map((filename, index) => (
              <Grid item xs={6} sm={4} md={multiple ? 3 : 6} key={index}>
                <Paper
                  elevation={3}
                  sx={{
                    position: 'relative',
                    paddingTop: '75%', // 4:3 aspect ratio
                    overflow: 'hidden',
                    borderRadius: 2,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'scale(1.02)',
                      boxShadow: (theme) => theme.shadows[6],
                    },
                  }}
                >
                  <Box
                    component="img"
                    src={getImageUrl(filename)}
                    alt={`${label} ${index + 1}`}
                    onError={(e) => {
                      console.error('Image failed to load:', getImageUrl(filename));
                      console.error('Filename:', filename);
                      // Show a placeholder or error state
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                    onLoad={() => {
                      console.log('Image loaded successfully:', getImageUrl(filename));
                    }}
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setCurrentImageIndex(uploadingImages.length + index);
                      setPreviewImage(getImageUrl(filename));
                    }}
                  />
                  
                  {/* Overlay for better button visibility */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.3) 100%)',
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      '&:hover': {
                        opacity: 1,
                      },
                    }}
                  />
                  
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      display: 'flex',
                      gap: 0.5,
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      '&:hover': {
                        opacity: 1,
                      },
                      '.MuiPaper-root:hover &': {
                        opacity: 1,
                      }
                    }}
                  >
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewImage(getImageUrl(filename));
                      }}
                      sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(4px)',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 1)',
                        },
                      }}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                    {!disabled && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage(index);
                        }}
                        sx={{
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          backdropFilter: 'blur(4px)',
                          color: 'error.main',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 1)',
                          },
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                  
                  {/* Image index indicator */}
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 8,
                      left: 8,
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      color: 'white',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: '0.75rem',
                      fontWeight: 'medium',
                    }}
                  >
                    {uploadingImages.length + index + 1}
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Image Slideshow Dialog */}
      <Dialog
        open={Boolean(previewImage)}
        onClose={() => {
          setPreviewImage(null);
          setCurrentImageIndex(0);
        }}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: '90vh',
            m: 2,
          }
        }}
      >
        <DialogContent sx={{ p: 2, position: 'relative' }}>
          {previewImage && (
            <>
              {/* Main Image Display */}
              <Box
                sx={{
                  position: 'relative',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: '60vh',
                  maxHeight: '60vh',
                  backgroundColor: '#f5f5f5',
                  borderRadius: 1,
                  overflow: 'hidden',
                }}
              >
                                  {getCurrentImageUrl() && (
                    <Box
                      component="img"
                      src={getCurrentImageUrl() || ''}
                      alt={`Preview ${currentImageIndex + 1}`}
                      sx={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                      }}
                    />
                  )}
                
                {/* Navigation Arrows */}
                {getAllImages().length > 1 && (
                  <>
                    <IconButton
                      onClick={goToPrevious}
                      sx={{
                        position: 'absolute',
                        left: 16,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        color: 'white',
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        },
                      }}
                      disabled={currentImageIndex === 0}
                    >
                      <ArrowBackIcon />
                    </IconButton>
                    <IconButton
                      onClick={goToNext}
                      sx={{
                        position: 'absolute',
                        right: 16,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        color: 'white',
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        },
                      }}
                      disabled={currentImageIndex === getAllImages().length - 1}
                    >
                      <ArrowForwardIcon />
                    </IconButton>
                  </>
                )}
                
                {/* Image Counter */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    px: 2,
                    py: 1,
                    borderRadius: 1,
                    fontSize: '0.875rem',
                  }}
                >
                  {currentImageIndex + 1} of {getAllImages().length}
                </Box>
              </Box>
              
              {/* Thumbnail Navigation */}
              {getAllImages().length > 1 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, textAlign: 'center' }}>
                    Click thumbnail to navigate:
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 1,
                      justifyContent: 'center',
                      flexWrap: 'wrap',
                      maxHeight: '120px',
                      overflowY: 'auto',
                      p: 1,
                    }}
                  >
                    {getAllImages().map((imageData, index) => (
                      <Box
                        key={`slideshow-thumb-${index}`}
                        onClick={() => {
                          setCurrentImageIndex(index);
                          setPreviewImage(imageData.url);
                        }}
                        sx={{
                          width: 60,
                          height: 60,
                          border: '2px solid',
                          borderColor: index === currentImageIndex ? 'primary.main' : 'grey.300',
                          borderRadius: 1,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          opacity: index === currentImageIndex ? 1 : 0.7,
                          transform: index === currentImageIndex ? 'scale(1.1)' : 'scale(1)',
                          '&:hover': {
                            borderColor: 'primary.main',
                            opacity: 1,
                            transform: 'scale(1.1)',
                          },
                        }}
                      >
                        <Box
                          component="img"
                          src={imageData.url}
                          alt={`Thumbnail ${index + 1}`}
                          sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                        {imageData.isUploading && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              backgroundColor: 'rgba(0, 0, 0, 0.5)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <CircularProgress size={16} sx={{ color: 'white' }} />
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Use arrow keys or click thumbnails to navigate
          </Typography>
          <Button 
            onClick={() => {
              setPreviewImage(null);
              setCurrentImageIndex(0);
            }} 
            startIcon={<CloseIcon />}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enhanced Mobile-Optimized Camera Dialog */}
              <Dialog
          open={cameraOpen}
          onClose={handleCameraClose}
          fullScreen={isMobile}
          maxWidth={isMobile ? false : "lg"}
          fullWidth={!isMobile}
          TransitionComponent={isMobile ? Slide : undefined}
          TransitionProps={isMobile ? { direction: "up" } as any : undefined}
          PaperProps={{
            sx: {
              maxHeight: isMobile ? '100vh' : '90vh',
              m: isMobile ? 0 : 2,
              borderRadius: isMobile ? 0 : 2,
            }
          }}
        >
        {/* Mobile App Bar */}
        {isMobile && (
          <AppBar position="static" color="default" elevation={1}>
            <Toolbar>
              <IconButton
                edge="start"
                onClick={handleCameraClose}
                sx={{ mr: 2 }}
              >
                <CloseIcon />
              </IconButton>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                {label} - Camera
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {images.length + uploadingImages.length} photos
              </Typography>
            </Toolbar>
          </AppBar>
        )}

        <DialogContent sx={{ 
          p: isMobile ? 1 : 2,
          display: 'flex',
          flexDirection: 'column',
          height: isMobile ? 'calc(100vh - 64px)' : 'auto',
        }}>
          <Box sx={{ 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative' 
          }}>
            {!isMobile && (
              <Typography variant="h6" gutterBottom>
                Take Photos - {label}
              </Typography>
            )}
            
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {/* Enhanced Camera Video Container */}
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                flex: isMobile ? 1 : 'none',
                aspectRatio: isMobile ? 'auto' : '16/9',
                backgroundColor: '#000',
                borderRadius: isMobile ? 1 : 2,
                overflow: 'hidden',
                mb: isMobile ? 1 : 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              
              {/* Capture Success Animation */}
              {captureSuccess && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'flash 0.3s ease-out',
                    '@keyframes flash': {
                      '0%': { opacity: 0 },
                      '50%': { opacity: 1 },
                      '100%': { opacity: 0 },
                    },
                  }}
                >
                  <CheckCircleIcon 
                    sx={{ 
                      fontSize: isMobile ? 80 : 60, 
                      color: 'success.main' 
                    }} 
                  />
                </Box>
              )}
              
              {/* Enhanced Mobile Camera Controls */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: isMobile ? 24 : 16,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  gap: isMobile ? 3 : 2,
                  alignItems: 'center',
                }}
              >
                {/* Enhanced Switch Camera Button for Mobile */}
                {devices.length > 1 && (
                  <IconButton
                    onClick={handleCameraSwitch}
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      backdropFilter: 'blur(8px)',
                      width: isMobile ? 56 : 48,
                      height: isMobile ? 56 : 48,
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 1)',
                        transform: 'scale(1.05)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <FlipCameraIosIcon sx={{ fontSize: isMobile ? 24 : 20 }} />
                  </IconButton>
                )}

                {/* Enhanced Capture Button for Mobile */}
                <Fab
                  color="primary"
                  size={isMobile ? "large" : "large"}
                  onClick={capturePhoto}
                  disabled={uploading}
                  sx={{
                    width: isMobile ? 100 : 80,
                    height: isMobile ? 100 : 80,
                    backgroundColor: uploading ? 'grey.400' : 'primary.main',
                    border: '4px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)',
                    },
                    '&:active': {
                      transform: 'scale(0.95)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  {uploading ? (
                    <CircularProgress size={isMobile ? 40 : 32} sx={{ color: 'white' }} />
                  ) : (
                    <PhotoCamera sx={{ fontSize: isMobile ? 50 : 40 }} />
                  )}
                </Fab>
              </Box>

              {/* Enhanced Photo Count Indicator */}
              <Box
                sx={{
                  position: 'absolute',
                  top: isMobile ? 20 : 16,
                  right: isMobile ? 20 : 16,
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  color: 'white',
                  px: isMobile ? 3 : 2,
                  py: isMobile ? 1.5 : 1,
                  borderRadius: 3,
                  fontSize: isMobile ? '1rem' : '0.875rem',
                  fontWeight: 'medium',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
              >
                📷 {images.length + uploadingImages.length}
              </Box>

              {/* Mobile-specific orientation hint */}
              {isMobile && isSmallMobile && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 20,
                    left: 20,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    fontSize: '0.75rem',
                  }}
                >
                  💡 Rotate for better view
                </Box>
              )}
            </Box>

            {/* Hidden Canvas for Capture */}
            <canvas
              ref={canvasRef}
              style={{ display: 'none' }}
            />

            {/* Enhanced Recent Photos Preview */}
            {(images.length > 0 || uploadingImages.length > 0) && (
              <Box sx={{ mb: isMobile ? 1 : 2 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontSize: isMobile ? '0.875rem' : '0.875rem' }}>
                  Recent Photos:
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  gap: 1, 
                  flexWrap: 'wrap',
                  maxHeight: isMobile ? '80px' : '120px',
                  overflow: 'auto',
                }}>
                  {/* Enhanced uploading images preview */}
                  {uploadingImages.slice(-5).map((uploadingImage, index) => (
                    <Box
                      key={`recent-uploading-${index}`}
                      sx={{
                        position: 'relative',
                        width: isMobile ? 70 : 60,
                        height: isMobile ? 70 : 60,
                        border: '3px solid',
                        borderColor: 'primary.main',
                        borderRadius: 2,
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      <Box
                        component="img"
                        src={uploadingImage.previewUrl}
                        alt={`Recent ${index + 1}`}
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: 'rgba(0, 0, 0, 0.6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <CircularProgress size={isMobile ? 20 : 16} sx={{ color: 'white' }} />
                      </Box>
                    </Box>
                  ))}
                  
                  {/* Enhanced uploaded images preview */}
                  {images.slice(-5).map((filename, index) => (
                    <Box
                      key={`recent-${filename}`}
                      sx={{
                        width: isMobile ? 70 : 60,
                        height: isMobile ? 70 : 60,
                        border: '2px solid',
                        borderColor: 'success.main',
                        borderRadius: 2,
                        overflow: 'hidden',
                        flexShrink: 0,
                        position: 'relative',
                      }}
                    >
                      <Box
                        component="img"
                        src={getImageUrl(filename)}
                        alt={`Recent ${index + 1}`}
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                      {/* Success checkmark */}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 2,
                          right: 2,
                          backgroundColor: 'success.main',
                          borderRadius: '50%',
                          width: 16,
                          height: 16,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <CheckCircleIcon sx={{ fontSize: 12, color: 'white' }} />
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
        
        {/* Enhanced Dialog Actions */}
        {!isMobile && (
          <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 3 }}>
            <Typography variant="body2" color="text.secondary">
              📱 Tap the camera button to take photos. Photos are automatically saved.
            </Typography>
            <Button 
              onClick={handleCameraClose} 
              startIcon={<CheckCircleIcon />}
              variant="contained"
              color="success"
              size="large"
            >
              Done ({images.length + uploadingImages.length} photos)
            </Button>
          </DialogActions>
        )}

        {/* Mobile floating action button for done */}
        {isMobile && (
          <Fab
            onClick={handleCameraClose}
            color="success"
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 1300,
              width: 64,
              height: 64,
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 32 }} />
          </Fab>
        )}
      </Dialog>
    </Paper>
  );
};

export default ImageUploadField; 