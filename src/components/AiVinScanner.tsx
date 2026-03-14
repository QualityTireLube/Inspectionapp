/**
 * AiVinScanner — capture a photo and extract the VIN via Tesseract.js OCR.
 * Runs entirely in the browser; no backend or API key required.
 */
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
  CircularProgress,
  LinearProgress,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  PhotoCamera as PhotoCameraIcon,
  CameraAlt as CameraAltIcon,
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { extractVinFromImage } from '../services/vinOcr';
import { VinDecoderService } from '../services/vinDecoder';

interface AiVinScannerProps {
  open: boolean;
  onClose: () => void;
  onVinExtracted: (vin: string) => void;
}

const TIPS = [
  'Get within 15–30 cm of the VIN plate',
  'Hold the camera steady — blurry images fail',
  'Good lighting is critical; avoid shadows',
  'VIN is usually on the dashboard or door jamb',
  'Include only the VIN row — crop out distractions',
];

const AiVinScanner: React.FC<AiVinScannerProps> = ({ open, onClose, onVinExtracted }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [extractedVin, setExtractedVin] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [tipIndex] = useState(() => Math.floor(Math.random() * TIPS.length));

  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setCapturedImage(null);
    setError(null);
    setExtractedVin(null);
    setConfidence(null);
    setProgress(0);
  };

  const handleOpenCamera = () => {
    reset();
    fileInputRef.current?.click();
  };

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset file input so the same photo can be retried
    if (fileInputRef.current) fileInputRef.current.value = '';

    setIsProcessing(true);
    setError(null);
    setExtractedVin(null);
    setProgress(0);

    // Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    setCapturedImage(previewUrl);

    try {
      const result = await extractVinFromImage(file, (pct) => setProgress(pct));

      if (result.success && result.vin) {
        setExtractedVin(result.vin);
        setConfidence(result.confidence ?? null);
      } else {
        setError(result.message ?? 'Could not find a VIN. Try again with a clearer photo.');
      }
    } catch (err) {
      console.error('OCR error:', err);
      setError('OCR failed. Please try again.');
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  }, []);

  const handleUseVin = () => {
    if (extractedVin) {
      onVinExtracted(VinDecoderService.formatVin(extractedVin));
      handleClose();
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const isValidVin = extractedVin ? VinDecoderService.validateVin(extractedVin) : false;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { maxHeight: '90vh' } }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: 'primary.main',
          color: 'white',
          pb: 1.5,
        }}
      >
        <Box>
          <Typography variant="h6">VIN Scanner</Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
            Photo-based OCR — no internet needed
          </Typography>
        </Box>
        <IconButton onClick={handleClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {/* Image preview */}
        <Box
          sx={{
            width: '100%',
            height: 220,
            bgcolor: 'grey.100',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2,
            overflow: 'hidden',
            border: '2px dashed',
            borderColor: capturedImage ? 'primary.main' : 'grey.300',
            position: 'relative',
          }}
        >
          {capturedImage ? (
            <img
              src={capturedImage}
              alt="VIN photo"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          ) : (
            <Box sx={{ textAlign: 'center', px: 2 }}>
              <CameraAltIcon sx={{ fontSize: 56, color: 'grey.400', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Take or upload a photo of the VIN plate
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Tip: {TIPS[tipIndex]}
              </Typography>
            </Box>
          )}

          {/* Processing overlay */}
          {isProcessing && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                bgcolor: 'rgba(0,0,0,0.55)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.5,
              }}
            >
              <CircularProgress size={36} sx={{ color: 'white' }} />
              <Typography variant="body2" sx={{ color: 'white' }}>
                Reading VIN… {progress}%
              </Typography>
            </Box>
          )}
        </Box>

        {/* Progress bar */}
        {isProcessing && (
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ mb: 2, borderRadius: 1, height: 6 }}
          />
        )}

        {/* Extracted VIN result */}
        {extractedVin && (
          <Box
            sx={{
              bgcolor: isValidVin ? 'success.50' : 'warning.50',
              border: '1px solid',
              borderColor: isValidVin ? 'success.300' : 'warning.300',
              borderRadius: 2,
              p: 2,
              mb: 2,
              textAlign: 'center',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Extracted VIN
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 0.5 }}>
              <Typography
                variant="h6"
                sx={{ fontFamily: 'monospace', letterSpacing: 2, fontWeight: 700 }}
              >
                {extractedVin}
              </Typography>
              <Tooltip title="Copy">
                <IconButton
                  size="small"
                  onClick={() => navigator.clipboard?.writeText(extractedVin)}
                >
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mt: 1, flexWrap: 'wrap' }}>
              {isValidVin ? (
                <Chip label="Valid VIN format" color="success" size="small" />
              ) : (
                <Chip label="VIN format invalid — check characters" color="warning" size="small" />
              )}
              {confidence !== null && (
                <Chip
                  label={`OCR confidence: ${confidence.toFixed(0)}%`}
                  color={confidence >= 70 ? 'success' : 'warning'}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
        )}

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Action buttons */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {extractedVin ? (
            <>
              <Button
                variant="contained"
                size="large"
                onClick={handleUseVin}
                disabled={!isValidVin}
                sx={{ py: 1.5 }}
              >
                Use This VIN
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={handleOpenCamera}
                startIcon={<RefreshIcon />}
                sx={{ py: 1.5 }}
              >
                Retake Photo
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              size="large"
              onClick={handleOpenCamera}
              disabled={isProcessing}
              startIcon={isProcessing ? <CircularProgress size={20} /> : <PhotoCameraIcon />}
              sx={{ py: 1.5, fontSize: '1.05rem' }}
            >
              {isProcessing ? `Scanning… ${progress}%` : 'Open Camera'}
            </Button>
          )}
        </Box>

        {/* Tips */}
        {!capturedImage && !isProcessing && (
          <Box sx={{ mt: 2.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
              Tips for best results:
            </Typography>
            {TIPS.map((tip, i) => (
              <Typography key={i} variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                • {tip}
              </Typography>
            ))}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AiVinScanner;
