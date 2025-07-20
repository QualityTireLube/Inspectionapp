import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Typography, Box, Button, Paper, Alert, IconButton, Tooltip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FlipCameraIosIcon from '@mui/icons-material/FlipCameraIos';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import FlashOffIcon from '@mui/icons-material/FlashOff';
import { BrowserMultiFormatReader, BarcodeFormat } from '@zxing/browser';

// Extend the BrowserMultiFormatReader type to include stopAsyncDecode
declare module '@zxing/browser' {
  interface BrowserMultiFormatReader {
    stopAsyncDecode(): void;
  }
}

const Scanner: React.FC = () => {
  const navigate = useNavigate();
  const [scanResult, setScanResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [hasFlashSupport, setHasFlashSupport] = useState(false);
  const [isScanning, setIsScanning] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to check flash support
  const checkFlashSupport = async (track: MediaStreamTrack) => {
    try {
      const imageCapture = new (window as any).ImageCapture(track);
      const capabilities = await imageCapture.getPhotoCapabilities();
      return capabilities.torch || false;
    } catch (error) {
      console.error('Error checking flash support:', error);
      return false;
    }
  };

  // Function to get all available cameras
  const getAvailableCameras = async () => {
    try {
      // First, request camera permission to get labels
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      // Stop the temporary stream
      tempStream.getTracks().forEach(track => track.stop());

      // Now enumerate devices with labels
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setAvailableCameras(videoDevices);
      
      if (videoDevices.length === 0) {
        throw new Error('No cameras found');
      }

      // Find the rear camera on mobile devices
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        // First try to find a camera with "back" or "rear" in the label
        const rearCamera = videoDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear')
        );

        if (rearCamera) {
          const index = videoDevices.indexOf(rearCamera);
          setCurrentCameraIndex(index);
          return rearCamera.deviceId;
        }

        // If no labeled rear camera found, try to use the last camera
        // (on most mobile devices, the last camera is the rear camera)
        if (videoDevices.length > 1) {
          const lastCamera = videoDevices[videoDevices.length - 1];
          const index = videoDevices.indexOf(lastCamera);
          setCurrentCameraIndex(index);
          return lastCamera.deviceId;
        }
      }

      // Default to first camera if no rear camera found
      setCurrentCameraIndex(0);
      return videoDevices[0].deviceId;
    } catch (error) {
      console.error('Error getting cameras:', error);
      throw error;
    }
  };

  // Handle camera switch
  const handleCameraSwitch = async () => {
    if (availableCameras.length <= 1) return;
    
    try {
      // Calculate next camera index
      const newIndex = (currentCameraIndex + 1) % availableCameras.length;
      setCurrentCameraIndex(newIndex);
      const newDeviceId = availableCameras[newIndex].deviceId;

      // Initialize scanner with new camera
      await initializeScanner(newDeviceId);
    } catch (error) {
      console.error('Error switching camera:', error);
      setError('Failed to switch camera. Please try again.');
    }
  };

  // Handle flash toggle
  const handleFlashToggle = async () => {
    try {
      const track = videoTrackRef.current;
      if (!track) return;

      const newState = !isFlashOn;
      await track.applyConstraints({
        advanced: [{ torch: newState } as any]
      });
      
      setIsFlashOn(newState);
    } catch (error) {
      console.error('Error toggling flash:', error);
      setHasFlashSupport(false);
      setIsFlashOn(false);
    }
  };

  // Initialize scanner
  const initializeScanner = async (deviceId?: string) => {
    try {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Stop existing stream if any
      if (videoTrackRef.current) {
        videoTrackRef.current.stop();
      }

      // Get device ID if not provided
      const targetDeviceId = deviceId || await getAvailableCameras();
      setSelectedDeviceId(targetDeviceId);

      // Create new reader instance
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      // Configure supported formats
      reader.hints.set(
        2, // DecodeHintType.POSSIBLE_FORMATS
        [
          BarcodeFormat.CODE_39,
          BarcodeFormat.CODE_128,
          BarcodeFormat.QR_CODE
        ]
      );

      // Get video stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: targetDeviceId }
        }
      });

      // Get video track and check flash support
      const videoTrack = stream.getVideoTracks()[0];
      videoTrackRef.current = videoTrack;
      const hasFlash = await checkFlashSupport(videoTrack);
      setHasFlashSupport(hasFlash);

      // Start video stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Reset scanning state
      setIsScanning(true);
      setError('');

      // Set timeout for scanning
      timeoutRef.current = setTimeout(() => {
        setIsScanning(false);
        setError('No barcode detected. Please try again or check the lighting conditions.');
      }, 10000);

      // Start scanning
      const scan = async () => {
        try {
          if (videoRef.current) {
            const result = await reader.decodeFromVideoElement(videoRef.current, (result, error) => {
              if (result) {
                // Clear timeout on successful scan
                if (timeoutRef.current) {
                  clearTimeout(timeoutRef.current);
                }
                setScanResult(result.getText());
                navigate('/inspection-form', { state: { scannedVIN: result.getText() } });
                stopScanning();
              }
            });
          }
        } catch (error) {
          // Ignore errors during scanning
        }
        // Continue scanning
        requestAnimationFrame(scan);
      };

      // Start scanning loop
      scan();
    } catch (error) {
      console.error('Scanner initialization error:', error);
      setError('Failed to initialize camera. Please ensure camera permissions are granted.');
    }
  };

  // Stop scanning and cleanup
  const stopScanning = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (videoTrackRef.current) {
      // Turn off flash before stopping the track
      if (isFlashOn) {
        videoTrackRef.current.applyConstraints({
          advanced: [{ torch: false } as any]
        }).catch(() => {
          // Ignore errors when turning off flash during cleanup
        });
      }
      videoTrackRef.current.stop();
    }
    if (readerRef.current) {
      readerRef.current.stopAsyncDecode();
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    // Reset states
    setIsScanning(false);
    setIsFlashOn(false);
    setHasFlashSupport(false);
  };

  // Initialize scanner on mount
  useEffect(() => {
    if (window.isSecureContext) {
      initializeScanner();
    } else {
      setError('Camera access requires a secure context (HTTPS or localhost). Please use HTTPS or localhost to access the app.');
    }

    return () => {
      stopScanning();
    };
  }, []);

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          sx={{ mb: 2 }}
        >
          Back to Home
        </Button>

        <Typography variant="h4" component="h1" gutterBottom align="center">
          Scan VIN
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Paper elevation={3} sx={{ p: 2, mt: 2, position: 'relative' }}>
          <Box sx={{ width: '100%', maxWidth: 500, mx: 'auto', position: 'relative' }}>
            <video
              ref={videoRef}
              style={{ width: '100%', height: 'auto' }}
              playsInline
            />
            {/* Scan line animation */}
            {isScanning && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent, #00ff00, transparent)',
                  animation: 'scan 2s linear infinite',
                  '@keyframes scan': {
                    '0%': {
                      transform: 'translateY(0)',
                    },
                    '50%': {
                      transform: 'translateY(100%)',
                    },
                    '100%': {
                      transform: 'translateY(0)',
                    },
                  },
                }}
              />
            )}
          </Box>

          {/* Controls Overlay */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              pointerEvents: 'none',
            }}
          >
            {/* Top Bar */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                p: 2,
                pointerEvents: 'auto',
              }}
            >
              {/* Flash Toggle - Only show on mobile if supported */}
              {hasFlashSupport && (
                <Tooltip title={isFlashOn ? "Turn Off Flash" : "Turn On Flash"}>
                  <IconButton
                    onClick={handleFlashToggle}
                    sx={{ 
                      color: 'white', 
                      bgcolor: 'rgba(0,0,0,0.5)',
                      '&:hover': {
                        bgcolor: 'rgba(0,0,0,0.7)',
                      },
                    }}
                  >
                    {isFlashOn ? <FlashOnIcon /> : <FlashOffIcon />}
                  </IconButton>
                </Tooltip>
              )}

              {/* Camera Switch - Only show if multiple cameras available */}
              {availableCameras.length > 1 && (
                <Tooltip title="Switch Camera">
                  <IconButton
                    onClick={handleCameraSwitch}
                    sx={{ 
                      color: 'white', 
                      bgcolor: 'rgba(0,0,0,0.5)',
                      '&:hover': {
                        bgcolor: 'rgba(0,0,0,0.7)',
                      },
                    }}
                  >
                    <FlipCameraIosIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>
        </Paper>

        {scanResult && (
          <Typography variant="body1" align="center" sx={{ mt: 2 }}>
            Scanned VIN: {scanResult}
          </Typography>
        )}
      </Box>
    </Container>
  );
};

export default Scanner; 