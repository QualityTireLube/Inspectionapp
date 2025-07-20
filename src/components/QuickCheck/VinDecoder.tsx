import React, { useState, useRef, useCallback } from 'react';
import { 
  Box, 
  TextField,
  CircularProgress, 
  Alert, 
  Chip, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography,
  IconButton,
  InputAdornment
} from '@mui/material';
import { Info as InfoIcon, QrCodeScanner as QrIcon, CameraAlt as CameraAltIcon } from '@mui/icons-material';
import { useVinDecoder } from '../../hooks/useVinDecoder';
import { extractVinFromImage } from '../../services/api';

interface VinDecoderProps {
  vin: string;
  onVinChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  disabled?: boolean;
}

export const VinDecoder: React.FC<VinDecoderProps> = ({ 
  vin, 
  onVinChange, 
  required = false,
  disabled = false 
}) => {
  const vinDecoder = useVinDecoder();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Decode VIN when it changes
  React.useEffect(() => {
    if (vin) {
      vinDecoder.decodeVin(vin);
    }
  }, [vin, vinDecoder.decodeVin]);

  const vehicleInfo = vinDecoder.getVehicleInfo();

  const handleQrCodeClick = () => {
    // TODO: Implement QR code scanning functionality
    console.log('QR Code scanner clicked');
    // For now, just show an alert
    alert('QR Code scanner functionality to be implemented');
  };

  const handleCameraClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      setError(null);

      // Read the file as base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;

        // Extract VIN using ChatGPT Vision API
        const result = await extractVinFromImage(imageData);

        if (result.success && result.vin) {
          // Create a synthetic event to update the VIN input
          const syntheticEvent = {
            target: {
              name: 'vin',
              value: result.vin
            }
          } as React.ChangeEvent<HTMLInputElement>;
          
          onVinChange(syntheticEvent);
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
  }, [onVinChange]);

  return (
    <Box>
      {/* Hidden file input for camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* VIN Input Field with Camera Button */}
      <TextField
        fullWidth
        label="VIN"
        name="vin"
        value={vin}
        onChange={onVinChange}
        required={required}
        disabled={disabled}
        placeholder="Enter VIN number"
        helperText="17-character Vehicle Identification Number"
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={handleCameraClick}
                disabled={isProcessing}
                edge="end"
                aria-label="Take photo of VIN"
                title="Take photo of VIN"
                sx={{
                  color: isProcessing ? 'grey.400' : 'primary.main',
                  mr: 0.5,
                  '&:hover': {
                    backgroundColor: isProcessing ? 'transparent' : 'primary.light',
                    color: isProcessing ? 'grey.400' : 'primary.contrastText'
                  }
                }}
              >
                {isProcessing ? <CircularProgress size={20} /> : <CameraAltIcon />}
              </IconButton>
              <IconButton
                onClick={handleQrCodeClick}
                edge="end"
                aria-label="scan QR code"
                title="Scan QR Code"
                sx={{
                  color: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'primary.light',
                    color: 'primary.contrastText'
                  }
                }}
              >
                <QrIcon />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mt: 1, fontSize: '14px', py: 0.5 }}>
          {error}
        </Alert>
      )}

      {/* VIN Decoding Results */}
      <Box sx={{ mt: 1 }}>
        {/* Loading State */}
        {vinDecoder.vinDecodeLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="body2" sx={{ fontSize: '14px', color: 'text.secondary' }}>
              Decoding VIN...
            </Typography>
          </Box>
        )}
        
        {/* Error State */}
        {vinDecoder.vinDecodeError && (
          <Alert severity="error" sx={{ fontSize: '14px', py: 0.5 }}>
            {vinDecoder.vinDecodeError}
          </Alert>
        )}
        
        {/* Success State - Vehicle Info Chip */}
        {vehicleInfo && vehicleInfo.label && (
          <Box>
            <Chip 
              icon={<InfoIcon />}
              label={vehicleInfo.label} 
              color="primary" 
              variant="filled"
              clickable
              onClick={vinDecoder.openDetailsDialog}
              sx={{ 
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                  transform: 'scale(1.02)',
                  transition: 'all 0.2s ease-in-out'
                }
              }}
            />
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
              Click for more details
            </Typography>
          </Box>
        )}
      </Box>

      {/* Vehicle Details Dialog */}
      <Dialog 
        open={vinDecoder.showDetailsDialog} 
        onClose={vinDecoder.closeDetailsDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            Vehicle Details
            <Chip 
              label={vin} 
              size="small" 
              variant="outlined" 
              sx={{ fontFamily: 'monospace' }}
            />
          </Box>
        </DialogTitle>
        <DialogContent>
          {vinDecoder.vehicleDetails && vinDecoder.vehicleDetails.Results && (() => {
            const getValue = (variable: string) => {
              const found = vinDecoder.vehicleDetails.Results.find((r: any) => r.Variable === variable);
              return found && found.Value && found.Value !== 'Not Applicable' && found.Value !== '0' ? found.Value : 'N/A';
            };
            
            const basicInfo = [
              { label: 'Year', value: getValue('Model Year') },
              { label: 'Make', value: getValue('Make') },
              { label: 'Model', value: getValue('Model') },
              { label: 'Series', value: getValue('Series') },
              { label: 'Trim', value: getValue('Trim') }
            ];

            const engineInfo = [
              { label: 'Engine Size', value: getValue('Displacement (L)') + (getValue('Displacement (L)') !== 'N/A' ? 'L' : '') },
              { label: 'Engine Configuration', value: getValue('Engine Configuration') },
              { label: 'Fuel Type', value: getValue('Fuel Type - Primary') },
              { label: 'Cylinders', value: getValue('Engine Number of Cylinders') + (getValue('Engine Number of Cylinders') !== 'N/A' ? ' cyl' : '') }
            ];

            const vehicleDetailsInfo = [
              { label: 'Body Class', value: getValue('Body Class') },
              { label: 'Vehicle Type', value: getValue('Vehicle Type') },
              { label: 'Drive Type', value: getValue('Drive Type') },
              { label: 'Doors', value: getValue('Doors') }
            ];

            const manufacturerInfo = [
              { label: 'Manufacturer', value: getValue('Manufacturer Name') },
              { label: 'Plant City', value: getValue('Plant City') },
              { label: 'Plant State', value: getValue('Plant State') },
              { label: 'Plant Country', value: getValue('Plant Country') }
            ];
            
            return (
              <Box sx={{ pt: 1 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  <Box sx={{ minWidth: '250px', flex: 1 }}>
                    <Typography variant="h6" gutterBottom color="primary">
                      Basic Information
                    </Typography>
                    {basicInfo.map((item, index) => (
                      <Box key={index} sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ fontWeight: 'medium', minWidth: '100px' }}>
                          {item.label}:
                        </Typography>
                        <Typography variant="body2" sx={{ textAlign: 'right', flex: 1 }}>
                          {item.value}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  <Box sx={{ minWidth: '250px', flex: 1 }}>
                    <Typography variant="h6" gutterBottom color="primary">
                      Engine Details
                    </Typography>
                    {engineInfo.map((item, index) => (
                      <Box key={index} sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ fontWeight: 'medium', minWidth: '120px' }}>
                          {item.label}:
                        </Typography>
                        <Typography variant="body2" sx={{ textAlign: 'right', flex: 1 }}>
                          {item.value}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  <Box sx={{ minWidth: '250px', flex: 1 }}>
                    <Typography variant="h6" gutterBottom color="primary">
                      Vehicle Details
                    </Typography>
                    {vehicleDetailsInfo.map((item, index) => (
                      <Box key={index} sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ fontWeight: 'medium', minWidth: '100px' }}>
                          {item.label}:
                        </Typography>
                        <Typography variant="body2" sx={{ textAlign: 'right', flex: 1 }}>
                          {item.value}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  <Box sx={{ minWidth: '250px', flex: 1 }}>
                    <Typography variant="h6" gutterBottom color="primary">
                      Manufacturing
                    </Typography>
                    {manufacturerInfo.map((item, index) => (
                      <Box key={index} sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ fontWeight: 'medium', minWidth: '100px' }}>
                          {item.label}:
                        </Typography>
                        <Typography variant="body2" sx={{ textAlign: 'right', flex: 1 }}>
                          {item.value}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={vinDecoder.closeDetailsDialog} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}; 