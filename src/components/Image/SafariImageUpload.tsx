import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  IconButton, Alert, CircularProgress, Box, Dialog, DialogContent, Button, Typography
} from '@mui/material';
import {
  PhotoCamera, PhotoLibrary, Close as CloseIcon
} from '@mui/icons-material';
import {
  logImageUploadAttempt,
  detectBrowser,
  isHEICFile,
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
  cameraFacing?: 'user' | 'environment';
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
  cameraFacing = 'environment'
}, ref) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const validateFile = async (file: File): Promise<string | null> => {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/heic', 'image/heif'];
    if (!validTypes.includes(file.type) && !(await isHEICFile(file))) {
      return 'Only JPEG, PNG, GIF, and HEIC images are allowed';
    }
    if (file.size > 25 * 1024 * 1024) return 'Image must be smaller than 25MB';
    return null;
  };

  const processAndUpload = async (files: File[]) => {
    const filesToProcess = multiple ? files.slice(0, maxFiles) : [files[0]];
    setUploading(true);
    setError(null);

    let successCount = 0;
    let lastError: string | null = null;

    for (const file of filesToProcess) {
      try {
        logImageUploadAttempt(file);
        const validationError = await validateFile(file);
        if (validationError) { lastError = validationError; continue; }

        let processedFile: File;
        try {
          processedFile = await processImageForUpload(file, resize1080p);
        } catch (e) {
          lastError = `Failed to process ${file.name}: ${e instanceof Error ? e.message : 'unknown'}`;
          continue;
        }

        await onImageUpload(processedFile, uploadType);
        successCount++;
      } catch (e) {
        lastError = `Error with ${file.name}: ${e instanceof Error ? e.message : 'unknown'}`;
      }
    }

    setUploading(false);
    if (successCount === 0 && lastError) setError(lastError);
    else setError(null);
  };

  // ── In-browser camera ───────────────────────────────────────────────────────

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
    setError(null);
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
      setError('Camera access denied. Use the gallery button instead.');
    }
  };

  const openCamera = () => {
    setCameraOpen(true);
  };

  const closeCamera = () => {
    stopCamera();
    setCameraOpen(false);
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
      await processAndUpload([file]);
    }, 'image/jpeg', 0.9);
  };

  useEffect(() => { return () => stopCamera(); }, []);

  // ── Gallery (file picker — no capture attr so no native camera) ─────────────

  const handleGalleryClick = () => {
    if (disabled || uploading) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,image/heic,image/heif,.heic,.heif';
    input.multiple = multiple;
    input.style.display = 'none';
    document.body.appendChild(input);

    let handled = false;
    const onChange = async () => {
      if (handled) return;
      handled = true;
      const files = Array.from(input.files || []);
      if (files.length) await processAndUpload(files);
      if (document.body.contains(input)) document.body.removeChild(input);
    };

    input.addEventListener('change', onChange);
    input.click();
    setTimeout(() => { if (document.body.contains(input)) document.body.removeChild(input); }, 60000);
  };

  const handleCameraClick = () => {
    if (disabled || uploading) return;
    openCamera();
  };

  useImperativeHandle(ref, () => ({ handleCameraClick, handleGalleryClick }));

  return (
    <Box className={className}>
      {error && (
        <Alert severity="error" sx={{ mb: 1, fontSize: '0.875rem' }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 1 }}>
        {showCameraButton && (
          <IconButton color="primary" onClick={handleCameraClick} disabled={disabled || uploading} size={size} title="Take Photo">
            {uploading ? <CircularProgress size={20} /> : <PhotoCamera />}
          </IconButton>
        )}
        {showGalleryButton && (
          <IconButton color="primary" onClick={handleGalleryClick} disabled={disabled || uploading} size={size} title="Choose from Gallery">
            <PhotoLibrary />
          </IconButton>
        )}
      </Box>

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

          {/* Controls */}
          <Box sx={{
            position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 2, alignItems: 'center'
          }}>
            <IconButton onClick={closeCamera} sx={{ bgcolor: 'rgba(255,255,255,0.9)', color: 'black', '&:hover': { bgcolor: 'white' } }}>
              <CloseIcon />
            </IconButton>
            <Button
              variant="contained"
              onClick={capturePhoto}
              disabled={uploading}
              sx={{
                bgcolor: 'white', color: 'black', borderRadius: '50%',
                width: 64, height: 64, minWidth: 64,
                '&:hover': { bgcolor: 'grey.100' }
              }}
            >
              {uploading ? <CircularProgress size={28} /> : <PhotoCamera sx={{ fontSize: 28 }} />}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
});

export default SafariImageUpload;
