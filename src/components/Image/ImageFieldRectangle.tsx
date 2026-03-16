import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Typography, IconButton, Dialog, DialogContent, Button, CircularProgress
} from '@mui/material';
import {
  PhotoCamera, Delete, Close as CloseIcon, PhotoLibrary
} from '@mui/icons-material';
import { acquireCamera, releaseCamera } from '../../utils/cameraLock';

interface ImageFieldRectangleProps {
  label: string;
  images: string[];
  onImageUpload: (file: File, type: any) => Promise<void>;
  onImageRemove: (index: number) => void;
  onImageView: (imageUrl: string) => void;
  uploadType: any;
  disabled?: boolean;
  multiple?: boolean;
  maxFiles?: number;
  cameraFacing?: 'user' | 'environment';
}

const ImageFieldRectangle: React.FC<ImageFieldRectangleProps> = ({
  label,
  images,
  onImageUpload,
  onImageRemove,
  onImageView,
  uploadType,
  disabled = false,
  multiple = true,
  maxFiles = 5,
  cameraFacing = 'environment'
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  const handleUpload = async (file: File) => {
    try {
      setIsUploading(true);
      await onImageUpload(file, uploadType);
    } finally {
      setIsUploading(false);
    }
  };

  const pendingStreamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (trackRef.current) { trackRef.current.stop(); trackRef.current = null; }
    if (pendingStreamRef.current) {
      pendingStreamRef.current.getTracks().forEach(t => t.stop());
      pendingStreamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing }
      });
      trackRef.current = stream.getVideoTracks()[0];
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      } else {
        pendingStreamRef.current = stream;
      }
    } catch {
      stopCamera();
      setCameraOpen(false);
      openGallery();
    }
  };

  const cameraOwnerId = `img-field-${uploadType}`;

  const openCamera = () => {
    if (!acquireCamera(cameraOwnerId)) return;
    setCameraOpen(true);
  };

  const closeCamera = () => {
    stopCamera();
    setCameraOpen(false);
    releaseCamera(cameraOwnerId);
  };

  useEffect(() => {
    if (cameraOpen) {
      initCamera();
    }
  }, [cameraOpen]);

  const videoRefCallback = (el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && pendingStreamRef.current) {
      el.srcObject = pendingStreamRef.current;
      el.play().catch(() => {});
      pendingStreamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      closeCamera();
      await handleUpload(file);
    }, 'image/jpeg', 0.9);
  };

  const openGallery = () => {
    closeCamera();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,image/heic,image/heif,.heic,.heif';
    input.multiple = multiple;
    input.style.display = 'none';
    document.body.appendChild(input);
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      for (const file of files) {
        await handleUpload(file);
      }
      if (document.body.contains(input)) document.body.removeChild(input);
    };
    input.click();
    setTimeout(() => { if (document.body.contains(input)) document.body.removeChild(input); }, 60000);
  };

  useEffect(() => { return () => stopCamera(); }, []);

  const hasImages = images && Array.isArray(images) && images.length > 0;

  return (
    <Box sx={{ mb: 3 }}>
      {label && (
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          {label}
        </Typography>
      )}

      {!hasImages && (
        <Box
          onClick={() => { if (!disabled && !isUploading) openCamera(); }}
          sx={{
            width: '100%',
            aspectRatio: '3 / 1',
            border: '2px dashed #ccc',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.paper',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: 'action.hover',
            },
            position: 'relative',
            minHeight: 120,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              opacity: isUploading ? 0.5 : 1,
            }}
          >
            <PhotoCamera
              sx={{
                fontSize: 48,
                color: 'text.secondary',
                transition: 'color 0.3s ease',
              }}
            />
            <Typography variant="body2" color="text.secondary">
              {isUploading ? 'Uploading...' : 'Tap to take photo'}
            </Typography>
          </Box>
        </Box>
      )}

      {hasImages && (
        <Box
          sx={{
            width: '100%',
            aspectRatio: '3 / 1',
            borderRadius: 2,
            overflow: 'hidden',
            cursor: 'pointer',
            position: 'relative',
            '&:hover .overlay, &:hover .delete-main': {
              opacity: 1,
            },
          }}
          onClick={() => images && images[0] && onImageView(images[0])}
        >
          <img
            src={images && images[0] ? images[0] : ''}
            alt="Dashboard lights"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          <IconButton
            className="delete-main"
            onClick={(e) => {
              e.stopPropagation();
              onImageRemove(0);
            }}
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              bgcolor: 'rgba(0, 0, 0, 0.6)',
              color: 'white',
              opacity: 0,
              transition: 'opacity 0.3s ease',
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.8)',
              },
            }}
            size="small"
          >
            <Delete fontSize="small" />
          </IconButton>
          {images && images.length > 1 && (
            <Box
              className="overlay"
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                bgcolor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontSize: '0.875rem',
                opacity: 0.8,
                transition: 'opacity 0.3s ease',
              }}
            >
              +{images && images.length ? images.length - 1 : 0} more
            </Box>
          )}
        </Box>
      )}

      {hasImages && images && images.length > 1 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Additional images ({images && images.length ? images.length - 1 : 0}):
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
              gap: 1
            }}
          >
            {images && images.slice(1).map((imageUrl, index) => (
              <Box
                key={index + 1}
                sx={{
                  position: 'relative',
                  aspectRatio: '1',
                  borderRadius: 1,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  '&:hover .delete-btn': {
                    opacity: 1,
                  },
                }}
              >
                <img
                  src={imageUrl}
                  alt={`${label} ${index + 2}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                  onClick={() => onImageView(imageUrl)}
                />
                <IconButton
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onImageRemove(index + 1);
                  }}
                  sx={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    bgcolor: 'rgba(0, 0, 0, 0.6)',
                    color: 'white',
                    opacity: 0,
                    transition: 'opacity 0.3s ease',
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.8)',
                    },
                    padding: '2px',
                  }}
                  size="small"
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {maxFiles && images && images.length >= maxFiles && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Maximum {maxFiles} images uploaded
        </Typography>
      )}

      {/* In-browser camera dialog */}
      <Dialog open={cameraOpen} onClose={closeCamera} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'black' } }}>
        <DialogContent sx={{ p: 0, bgcolor: 'black', position: 'relative' }}>
          <video
            ref={videoRefCallback}
            playsInline
            autoPlay
            muted
            style={{ width: '100%', minHeight: 300, objectFit: 'cover', display: 'block' }}
          />
          <Box sx={{
            position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 2, alignItems: 'center'
          }}>
            <IconButton
              onClick={closeCamera}
              sx={{ bgcolor: 'rgba(255,255,255,0.9)', color: 'black', '&:hover': { bgcolor: 'white' } }}
            >
              <CloseIcon />
            </IconButton>
            <Button
              variant="contained"
              onClick={capturePhoto}
              disabled={isUploading}
              sx={{
                bgcolor: 'white', color: 'black', borderRadius: '50%',
                width: 64, height: 64, minWidth: 64,
                '&:hover': { bgcolor: 'grey.100' }
              }}
            >
              {isUploading ? <CircularProgress size={28} /> : <PhotoCamera sx={{ fontSize: 28 }} />}
            </Button>
            <IconButton
              onClick={openGallery}
              sx={{ bgcolor: 'rgba(255,255,255,0.9)', color: 'black', '&:hover': { bgcolor: 'white' } }}
            >
              <PhotoLibrary />
            </IconButton>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ImageFieldRectangle;
