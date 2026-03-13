/**
 * VIN Field Component
 * 
 * Advanced VIN input with:
 * - API decoding
 * - Camera OCR for image-to-VIN
 * - QR/Barcode scanner
 * - Real-time validation
 */

import React, { useState, useRef } from 'react';
import {
  Box,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  QrCodeScanner as QrIcon,
  CameraAlt as CameraIcon,
  Search as LookupIcon,
  Clear as ClearIcon,
  CheckCircle as ValidIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { NormalizedFieldTemplate } from '../base/NormalizedFieldTemplate';
import { BaseFieldProps } from '../base/FieldProps';

export interface VinDecodedData {
  make?: string;
  model?: string;
  year?: string;
  engine?: string;
  transmission?: string;
  fuelType?: string;
  bodyStyle?: string;
  trim?: string;
  country?: string;
  manufacturer?: string;
}

export interface VinFieldProps extends BaseFieldProps {
  onVinDecoded?: (data: VinDecodedData) => void;
  enableOcr?: boolean;
  enableQrScanner?: boolean;
  enableApiLookup?: boolean;
  apiEndpoint?: string;
  autoValidate?: boolean;
}

export const VinField: React.FC<VinFieldProps> = ({
  value = '',
  onChange,
  onVinDecoded,
  enableOcr = true,
  enableQrScanner = true,
  enableApiLookup = true,
  apiEndpoint = '/api/vin-decode',
  autoValidate = true,
  ...templateProps
}) => {
  const [vin, setVin] = useState<string>(typeof value === 'string' ? value : '');
  const [decodedData, setDecodedData] = useState<VinDecodedData | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [ocrOpen, setOcrOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [decodedOpen, setDecodedOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // VIN validation regex
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;

  const validateVin = (vinValue: string): boolean => {
    if (!vinValue || vinValue.length !== 17) return false;
    return vinRegex.test(vinValue.toUpperCase());
  };

  const handleVinChange = (newVin: string) => {
    const cleanVin = newVin.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
    setVin(cleanVin);
    onChange(cleanVin);
    
    if (autoValidate) {
      const valid = validateVin(cleanVin);
      setIsValid(valid);
      
      if (valid && enableApiLookup) {
        decodeVin(cleanVin);
      }
    }
    
    setError(null);
  };

  const decodeVin = async (vinValue: string) => {
    if (!validateVin(vinValue)) {
      setError('Invalid VIN format');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiEndpoint}/${vinValue}`);
      
      if (!response.ok) {
        throw new Error('VIN lookup failed');
      }
      
      const data: VinDecodedData = await response.json();
      setDecodedData(data);
      onVinDecoded?.(data);
      setDecodedOpen(true);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'VIN decode failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOcrUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/ocr/vin', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('OCR processing failed');
      }
      
      const result = await response.json();
      
      if (result.vin) {
        handleVinChange(result.vin);
        setOcrOpen(false);
      } else {
        setError('No VIN found in image');
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OCR failed');
    } finally {
      setIsLoading(false);
    }
  };

  const startQrScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setQrOpen(true);
      }
    } catch (err) {
      setError('Camera access denied');
    }
  };

  const stopQrScanner = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setQrOpen(false);
  };

  const getValidationIcon = () => {
    if (isLoading) return <CircularProgress size={20} />;
    if (isValid === true) return <ValidIcon color="success" />;
    if (isValid === false) return <ErrorIcon color="error" />;
    return null;
  };

  const formatVin = (vinValue: string) => {
    // Format VIN with spaces for readability: XXX XXX XXX XXX XXXXX
    return vinValue.replace(/(.{3})(.{3})(.{3})(.{3})(.{5})/, '$1 $2 $3 $4 $5');
  };

  return (
    <NormalizedFieldTemplate
      {...templateProps}
      onCameraClick={enableOcr ? () => setOcrOpen(true) : undefined}
      showDuallyButton={decodedData !== null}
      duallyLabel="Decoded"
      duallyColor="success"
      onDuallyClick={() => setDecodedOpen(true)}
    >
      <Box sx={{ position: 'relative' }}>
        <TextField
          fullWidth
          value={vin}
          onChange={(e) => handleVinChange(e.target.value)}
          placeholder="Enter 17-character VIN"
          inputProps={{ maxLength: 17 }}
          sx={{
            '& .MuiOutlinedInput-root': {
              pr: 6 // Make room for icons
            }
          }}
          InputProps={{
            endAdornment: (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {getValidationIcon()}
                
                {enableQrScanner && (
                  <Tooltip title="Scan QR/Barcode">
                    <IconButton
                      size="small"
                      onClick={startQrScanner}
                      color="primary"
                    >
                      <QrIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                
                {enableApiLookup && vin.length === 17 && (
                  <Tooltip title="Decode VIN">
                    <IconButton
                      size="small"
                      onClick={() => decodeVin(vin)}
                      color="primary"
                    >
                      <LookupIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                
                {vin && (
                  <Tooltip title="Clear">
                    <IconButton
                      size="small"
                      onClick={() => handleVinChange('')}
                      color="error"
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            )
          }}
        />
        
        {vin && (
          <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
            Formatted: {formatVin(vin)}
          </Typography>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}
      </Box>

      {/* OCR Upload Dialog */}
      <Dialog open={ocrOpen} onClose={() => setOcrOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload VIN Image</DialogTitle>
        <DialogContent>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleOcrUpload(file);
            }}
            style={{ display: 'none' }}
          />
          
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CameraIcon sx={{ fontSize: 64, color: '#999', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Take or Upload VIN Photo
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Take a clear photo of the VIN number for automatic recognition
            </Typography>
            
            <Button
              variant="contained"
              startIcon={<CameraIcon />}
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Choose Photo'}
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOcrOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* QR Scanner Dialog */}
      <Dialog open={qrOpen} onClose={stopQrScanner} maxWidth="sm" fullWidth>
        <DialogTitle>Scan QR Code or Barcode</DialogTitle>
        <DialogContent>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{ width: '100%', height: 'auto' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={stopQrScanner}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Decoded Data Dialog */}
      <Dialog open={decodedOpen} onClose={() => setDecodedOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>VIN Decoded Information</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid size={12}>
              <Chip
                label={`VIN: ${formatVin(vin)}`}
                color="primary"
                variant="outlined"
                sx={{ mb: 2 }}
              />
            </Grid>
            
            {decodedData && Object.entries(decodedData).map(([key, value]) => (
              value && (
                <Grid size={{ xs: 6, sm: 4 }} key={key}>
                  <Card variant="outlined">
                    <CardContent sx={{ pb: '16px !important' }}>
                      <Typography variant="caption" color="textSecondary">
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {value}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDecodedOpen(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </NormalizedFieldTemplate>
  );
};

export default VinField;
