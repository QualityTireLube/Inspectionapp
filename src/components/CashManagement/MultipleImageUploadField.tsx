import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  IconButton,
  Paper,
  Dialog,
  DialogContent,
  Alert,
  CircularProgress,
  Badge,
  Chip,
} from '@mui/material';
import {
  PhotoCamera,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon,
  FlipCameraIos as FlipCameraIosIcon,
} from '@mui/icons-material';
import heic2any from 'heic2any';
import { uploadDepositImages } from '../../services/cashManagementApi';

interface UploadingImage {
  file: File;
  previewUrl: string;
  isUploading: boolean;
}

interface MultipleImageUploadFieldProps {
  images: string[];
  onChange: (images: string[]) => void;
  label?: string;
  maxImages?: number;
  disabled?: boolean;
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
      quality: 0.8,
    });
    
    // heic2any returns a blob or array of blobs
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
      try {
        const convertedFile = await convertHEICToJPEG(file);
        processedFiles.push(convertedFile);
      } catch (error) {
        throw error;
      }
    } else {
      processedFiles.push(file);
    }
  }
  
  return processedFiles;
};

const MultipleImageUploadField: React.FC<MultipleImageUploadFieldProps> = ({
  images,
  onChange,
  label = "Images",
  maxImages = 5,
  disabled = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImages, setUploadingImages] = useState<UploadingImage[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
    const maxSize = 25 * 1024 * 1024;
    const oversizedFiles = files.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      setError('Each image must be smaller than 25MB');
      return;
    }

    // Check total image count
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

  const openPreview = (index: number) => {
    setCurrentImageIndex(index);
    setPreviewOpen(true);
  };

  const goToPrevious = () => {
    const totalImages = images.length + uploadingImages.length;
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  const goToNext = () => {
    const totalImages = images.length + uploadingImages.length;
    if (currentImageIndex < totalImages - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  const getCurrentImageUrl = () => {
    if (currentImageIndex < uploadingImages.length) {
      return uploadingImages[currentImageIndex].previewUrl;
    } else {
      const imageIndex = currentImageIndex - uploadingImages.length;
      return getImageUrl(images[imageIndex]);
    }
  };

  // Camera functions
  const initializeCamera = async () => {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = deviceList.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 30 },
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setError('Failed to access camera. Please ensure camera permissions are granted.');
    }
  };

  const cleanupCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleCameraOpen = async () => {
    setCameraOpen(true);
    setCapturedImages([]);
    setError(null);
    await initializeCamera();
  };

  const handleCameraClose = () => {
    setCameraOpen(false);
    cleanupCamera();
    setCapturedImages([]);
  };

  const handleCameraSwitch = async () => {
    if (devices.length <= 1) return;
    
    cleanupCamera();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    
    setTimeout(() => {
      initializeCamera();
    }, 100);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImages(prev => [...prev, dataUrl]);
  };

  const removeCapturedImage = (index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleFinishCapturing = async () => {
    if (capturedImages.length === 0) {
      handleCameraClose();
      return;
    }

    setUploading(true);

    try {
      // Convert all captured images to files
      const files: File[] = [];
      for (let i = 0; i < capturedImages.length; i++) {
        const response = await fetch(capturedImages[i]);
        const blob = await response.blob();
        const file = new File([blob], `camera-capture-${Date.now()}-${i}.jpg`, { type: 'image/jpeg' });
        files.push(file);
      }

      // Upload all files
      const uploadedFilenames = await uploadDepositImages(files);
      onChange([...images, ...uploadedFilenames]);
      
      handleCameraClose();
    } catch (error) {
      console.error('Error uploading captured images:', error);
      setError('Failed to upload captured images. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const totalImages = images.length + uploadingImages.length;
  const canAddMore = totalImages < maxImages;

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          {label}
        </Typography>
        <Chip 
          label={`${totalImages}/${maxImages}`} 
          color={totalImages >= maxImages ? 'error' : 'primary'}
          size="small"
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 2 }}>
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/gif,image/heic,image/heif,.heic,.heif"
          ref={fileInputRef}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          disabled={disabled || uploading || !canAddMore}
        />

        {canAddMore && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => fileInputRef.current?.click()}
              startIcon={<PhotoCamera />}
              disabled={disabled || uploading}
              sx={{ flex: 1 }}
            >
              {uploading ? 'Uploading...' : 'Add Images'}
            </Button>
            <Button
              variant="contained"
              onClick={handleCameraOpen}
              startIcon={<PhotoCamera />}
              disabled={disabled || uploading}
              color="primary"
            >
              Camera
            </Button>
          </Box>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {`Maximum ${maxImages} images. JPEG, PNG, GIF, or HEIC format. Max 25MB each.`}
          <br />HEIC images will be automatically converted to JPEG.
        </Typography>
      </Box>

      {/* Images Grid */}
      {totalImages > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Click thumbnail to view full size:
          </Typography>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
            gap: 2 
          }}>
            {/* Show uploading thumbnails */}
            {uploadingImages.map((uploadingImage, index) => (
              <Box
                key={`uploading-${index}`}
                sx={{
                  position: 'relative',
                  aspectRatio: '1',
                  border: '2px solid',
                  borderColor: 'primary.main',
                  borderRadius: 1,
                  overflow: 'hidden',
                  cursor: 'pointer',
                }}
                onClick={() => openPreview(index)}
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
                  <CircularProgress size={20} sx={{ color: 'white' }} />
                </Box>
              </Box>
            ))}

            {/* Show uploaded images */}
            {images.map((filename, index) => (
              <Box
                key={`image-${index}`}
                sx={{
                  position: 'relative',
                  aspectRatio: '1',
                  border: '2px solid',
                  borderColor: 'grey.300',
                  borderRadius: 1,
                  overflow: 'hidden',
                  cursor: 'pointer',
                }}
                onClick={() => openPreview(uploadingImages.length + index)}
              >
                <Box
                  component="img"
                  src={getImageUrl(filename)}
                  alt={`Image ${index + 1}`}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <IconButton
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    bgcolor: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.9)' },
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage(index);
                  }}
                  disabled={uploading}
                >
                  <DeleteIcon fontSize="small" color="error" />
                </IconButton>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          <IconButton
            sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2, bgcolor: 'rgba(0,0,0,0.5)' }}
            onClick={() => setPreviewOpen(false)}
          >
            <CloseIcon sx={{ color: 'white' }} />
          </IconButton>

          {/* Navigation arrows */}
          {totalImages > 1 && (
            <>
              <IconButton
                sx={{ 
                  position: 'absolute', 
                  left: 8, 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  zIndex: 2, 
                  bgcolor: 'rgba(0,0,0,0.5)',
                  '&:disabled': { display: 'none' }
                }}
                onClick={goToPrevious}
                disabled={currentImageIndex === 0}
              >
                <ArrowBackIcon sx={{ color: 'white' }} />
              </IconButton>
              <IconButton
                sx={{ 
                  position: 'absolute', 
                  right: 8, 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  zIndex: 2, 
                  bgcolor: 'rgba(0,0,0,0.5)',
                  '&:disabled': { display: 'none' }
                }}
                onClick={goToNext}
                disabled={currentImageIndex === totalImages - 1}
              >
                <ArrowForwardIcon sx={{ color: 'white' }} />
              </IconButton>
            </>
          )}

          <Box
            component="img"
            src={getCurrentImageUrl()}
            alt="Preview"
            sx={{
              width: '100%',
              height: 'auto',
              maxHeight: '80vh',
              objectFit: 'contain',
            }}
          />

          {/* Image counter */}
          {totalImages > 1 && (
            <Box
              sx={{
                position: 'absolute',
                bottom: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                bgcolor: 'rgba(0,0,0,0.7)',
                color: 'white',
                px: 2,
                py: 1,
                borderRadius: 1,
              }}
            >
              {currentImageIndex + 1} of {totalImages}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Camera Dialog */}
      <Dialog
        open={cameraOpen}
        onClose={handleCameraClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { bgcolor: 'black' }
        }}
      >
        <DialogContent sx={{ p: 0, position: 'relative', bgcolor: 'black' }}>
          {/* Camera Controls */}
          <Box sx={{ 
            position: 'absolute', 
            top: 16, 
            left: 16, 
            right: 16, 
            zIndex: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <IconButton
              onClick={handleCameraClose}
              sx={{ bgcolor: 'rgba(0,0,0,0.5)' }}
            >
              <CloseIcon sx={{ color: 'white' }} />
            </IconButton>
            
            {/* Captured images counter */}
            {capturedImages.length > 0 && (
              <Box sx={{
                bgcolor: 'rgba(0,0,0,0.7)',
                color: 'white',
                px: 2,
                py: 1,
                borderRadius: 1,
                fontSize: '0.875rem'
              }}>
                {capturedImages.length} photo{capturedImages.length !== 1 ? 's' : ''} captured
              </Box>
            )}
            
            {devices.length > 1 && (
              <IconButton
                onClick={handleCameraSwitch}
                sx={{ bgcolor: 'rgba(0,0,0,0.5)' }}
              >
                <FlipCameraIosIcon sx={{ color: 'white' }} />
              </IconButton>
            )}
          </Box>

          {/* Video Stream */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '60vh',
              objectFit: 'cover',
            }}
          />

          {/* Captured Images Thumbnails */}
          {capturedImages.length > 0 && (
            <Box sx={{
              position: 'absolute',
              bottom: 120,
              left: 16,
              right: 16,
              zIndex: 2,
            }}>
              <Box sx={{
                display: 'flex',
                gap: 1,
                overflowX: 'auto',
                bgcolor: 'rgba(0,0,0,0.5)',
                p: 1,
                borderRadius: 1,
              }}>
                {capturedImages.map((imageUrl, index) => (
                  <Box
                    key={index}
                    sx={{
                      position: 'relative',
                      flexShrink: 0,
                      width: 60,
                      height: 60,
                      borderRadius: 1,
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      component="img"
                      src={imageUrl}
                      alt={`Captured ${index + 1}`}
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => removeCapturedImage(index)}
                      sx={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        bgcolor: 'error.main',
                        color: 'white',
                        width: 20,
                        height: 20,
                        '&:hover': { bgcolor: 'error.dark' },
                      }}
                    >
                      <CloseIcon sx={{ fontSize: 12 }} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Camera Controls Bottom */}
          <Box sx={{
            position: 'absolute',
            bottom: 32,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}>
            {/* Finish Button (Green Check) */}
            <IconButton
              onClick={handleFinishCapturing}
              disabled={uploading}
              sx={{
                bgcolor: 'success.main',
                color: 'white',
                width: 60,
                height: 60,
                '&:hover': { bgcolor: 'success.dark' },
                '&:disabled': { bgcolor: 'grey.600' },
              }}
            >
              {uploading ? (
                <CircularProgress size={24} sx={{ color: 'white' }} />
              ) : (
                <CheckCircleIcon sx={{ fontSize: 30 }} />
              )}
            </IconButton>

            {/* Capture Button */}
            <IconButton
              onClick={capturePhoto}
              disabled={totalImages + capturedImages.length >= maxImages}
              sx={{
                bgcolor: 'white',
                width: 80,
                height: 80,
                '&:hover': { bgcolor: 'grey.100' },
                '&:disabled': { bgcolor: 'grey.400' },
              }}
            >
              <PhotoCamera sx={{ fontSize: 40, color: 'primary.main' }} />
            </IconButton>
          </Box>

          {/* Hidden canvas for photo capture */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </DialogContent>
      </Dialog>
    </Paper>
  );
};

export default MultipleImageUploadField; 