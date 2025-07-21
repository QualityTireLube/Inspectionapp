import React, { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  PhotoCamera as PhotoCameraIcon,
  CameraAlt as CameraAltIcon
} from '@mui/icons-material';
import { extractVinFromImage } from '../services/api';

interface AiVinScannerProps {
  open: boolean;
  onClose: () => void;
  onVinExtracted: (vin: string) => void;
}

const AiVinScanner: React.FC<AiVinScannerProps> = ({
  open,
  onClose,
  onVinExtracted
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenCamera = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      setError(null);
      setSuccess(null);

      // Read the file as base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;
        setCapturedImage(imageData);

        // Extract VIN using ChatGPT Vision API
        const result = await extractVinFromImage(imageData);

        if (result.success && result.vin) {
          setSuccess(`VIN extracted successfully: ${result.vin}`);
          // Auto-close after a short delay to show success
          setTimeout(() => {
            onVinExtracted(result.vin!);
            onClose();
          }, 1500);
        } else {
          setError(result.message || 'Failed to extract VIN from image');
        }
      };

      reader.onerror = () => {
        setError('Failed to read image file');
        setIsProcessing(false);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error('File processing error:', err);
      setError('Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClose = () => {
    setCapturedImage(null);
    setError(null);
    setSuccess(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'white',
          color: 'black',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: 'primary.main',
          color: 'white',
        }}
      >
        <Box>
          <Typography variant="h6">AI VIN Scanner</Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
            Take a photo of the VIN plate
          </Typography>
        </Box>
        <IconButton onClick={handleClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, textAlign: 'center' }}>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {/* Camera Preview Area */}
        <Box sx={{ 
          width: '100%', 
          height: '300px', 
          bgcolor: 'grey.100',
          borderRadius: 2,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          mb: 3,
          border: '2px dashed grey.300'
        }}>
          {capturedImage ? (
            <img 
              src={capturedImage} 
              alt="Captured VIN" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '100%', 
                objectFit: 'contain' 
              }} 
            />
          ) : (
            <Box sx={{ textAlign: 'center' }}>
              <CameraAltIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                No image selected
              </Typography>
            </Box>
          )}
        </Box>

        {/* Open Camera Button */}
        <Button
          variant="contained"
          size="large"
          onClick={handleOpenCamera}
          disabled={isProcessing}
          startIcon={isProcessing ? <CircularProgress size={20} /> : <PhotoCameraIcon />}
          sx={{
            width: '100%',
            py: 1.5,
            fontSize: '1.1rem',
            mb: 2
          }}
        >
          {isProcessing ? 'Processing...' : 'Open Camera'}
        </Button>

        {/* Status Messages */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {/* Instructions */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            📸 Take a clear photo of the VIN plate
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Ensure good lighting and clear text for best results
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default AiVinScanner; 