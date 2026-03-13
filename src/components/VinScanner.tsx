import React, { useEffect, useRef, useState } from 'react';
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
  TextField,
  Stack,
} from '@mui/material';
import {
  Close as CloseIcon,
  FlipCameraIos as FlipCameraIcon,
  Edit as EditIcon,
  PhotoCamera as PhotoCameraIcon,
  Upload as UploadIcon,
  CameraAlt as ScannerIcon,
} from '@mui/icons-material';
import { BrowserMultiFormatReader, IScannerControls, BarcodeFormat } from '@zxing/browser';
import { Html5QrcodeScanner, Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

// Type declaration for Quagga
declare const Quagga: any;

interface VinScannerProps {
  open: boolean;
  onClose: () => void;
  onScanResult: (vin: string) => void;
}

const VinScanner: React.FC<VinScannerProps> = ({ open, onClose, onScanResult }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [codeReader, setCodeReader] = useState<BrowserMultiFormatReader | null>(null);
  const [scannerControls, setScannerControls] = useState<IScannerControls | null>(null);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualVin, setManualVin] = useState('');
  const [scanAttempts, setScanAttempts] = useState(0);
  const [lastScanTime, setLastScanTime] = useState(Date.now());
  const [html5Scanner, setHtml5Scanner] = useState<Html5Qrcode | null>(null);
  const quaggaRef = useRef<HTMLDivElement>(null);
  const [scannersActive, setScannersActive] = useState<string[]>([]);
  const [scannerFound, setScannerFound] = useState(false);
  const html5VideoRef = useRef<HTMLVideoElement>(null);
  const [detectedCodes, setDetectedCodes] = useState<string[]>([]);
  const [showDetected, setShowDetected] = useState(false);

  useEffect(() => {
    if (open) {
      initializeScanner();
    } else {
      stopScanner();
    }
    
    return () => {
      stopScanner();
    };
  }, [open]);

  const initializeScanner = async () => {
    try {
      setError(null);
      
      // Get available cameras first
      const cameras = await BrowserMultiFormatReader.listVideoInputDevices();
      setAvailableCameras(cameras);
      
      if (cameras.length === 0) {
        setError('No cameras found');
        return;
      }
      
      // Initialize multiple scanners simultaneously for best detection
      setScannerFound(false);
      const activeScannersArray: string[] = [];
      
      // Start ZXing scanner
      try {
        await initializeZxingScanner(cameras[currentCameraIndex].deviceId);
        activeScannersArray.push('ZXing');
      } catch (err) {
        console.error('ZXing failed to initialize:', err);
      }
      
      // Start Html5QrCode scanner simultaneously
      try {
        await initializeHtml5Scanner(cameras[currentCameraIndex].deviceId);
        activeScannersArray.push('Html5QrCode');
      } catch (err) {
        console.error('Html5QrCode failed to initialize:', err);
      }
      
      setScannersActive(activeScannersArray);
      
      if (activeScannersArray.length === 0) {
        setError('Failed to initialize any scanners');
      }
    } catch (err) {
      console.error('Error initializing scanner:', err);
      setError('Failed to initialize camera. Please check permissions.');
    }
  };

  const initializeZxingScanner = async (deviceId: string) => {
    const reader = new BrowserMultiFormatReader();
    setCodeReader(reader);
    await startScanning(reader, deviceId);
  };

  const initializeHtml5Scanner = async (deviceId: string) => {
    try {
      const scanner = new Html5Qrcode("html5-scanner");
      setHtml5Scanner(scanner);
      
      const config = {
        fps: 10,
        qrbox: { width: 400, height: 150 }, // Larger box for better detection
        aspectRatio: 1.777778,
        supportedScanTypes: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.PDF_417
        ]
      };
      
      await scanner.start(
        deviceId,
        config,
        (decodedText) => {
          if (scannerFound) return; // Another scanner already found it
          
          console.log('🔍 Html5Qrcode detected something:', decodedText);
          const scannedText = decodedText.trim().toUpperCase();
          console.log('📝 Cleaned text:', scannedText, 'Length:', scannedText.length);
          
          const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/;
          const vinLikePattern = /^[A-HJ-NPR-Z0-9]{10,}$/;
          const anyAlphaNumeric = /^[A-Z0-9]+$/;
          
          if (vinPattern.test(scannedText)) {
            setScannerFound(true);
            console.log('✅ Html5QrCode found valid 17-char VIN!');
            onScanResult(scannedText);
            stopScanner();
            onClose();
          } else if (vinLikePattern.test(scannedText)) {
            setScannerFound(true);
            console.log('✅ Html5QrCode found VIN-like code!');
            onScanResult(scannedText);
            stopScanner();
            onClose();
          } else if (anyAlphaNumeric.test(scannedText) && scannedText.length >= 5) {
            console.log('🤔 Html5QrCode found alphanumeric code, not typical VIN format:', scannedText);
            setDetectedCodes(prev => [...prev.slice(-4), `Html5QrCode: ${scannedText}`]);
            setShowDetected(true);
          } else {
            console.log('❌ Html5QrCode found non-VIN text:', scannedText);
            if (scannedText.length >= 3) {
              setDetectedCodes(prev => [...prev.slice(-4), `Html5QrCode: ${scannedText}`]);
              setShowDetected(true);
            }
          }
        },
        (errorMessage) => {
          // Handle scan error - don't log common errors
          if (!errorMessage.includes('No MultiFormat Readers') && 
              !errorMessage.includes('NotFoundException') &&
              !errorMessage.includes('No code found')) {
            console.log('⚠️ Html5Qrcode scan error:', errorMessage);
          }
        }
      );
      
      setIsScanning(true);
    } catch (err) {
      console.error('Html5Qrcode initialization error:', err);
      throw err; // Let the caller handle the error
    }
  };

  // Removed Quagga scanner to focus on dual ZXing + Html5QrCode approach

  const startScanning = async (reader: BrowserMultiFormatReader, deviceId: string) => {
    if (!videoRef.current) return;
    
    try {
      setIsScanning(true);
      setError(null);
      setScanAttempts(0);
      
      // Enhanced camera constraints for better barcode scanning
      const constraints = {
        video: {
          deviceId: deviceId,
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          focusMode: 'continuous',
          exposureMode: 'continuous',
          whiteBalanceMode: 'continuous'
        }
      };
      
      const controls = await reader.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result, error) => {
          if (scannerFound) return; // Another scanner already found it
          
          if (result) {
            const scannedText = result.getText().trim().toUpperCase();
            const formatName = result.getBarcodeFormat();
            console.log('🔍 ZXing detected:', scannedText, 'Format:', formatName);
            console.log('📝 Cleaned text:', scannedText, 'Length:', scannedText.length);
            
            // Enhanced VIN validation - accept various formats
            const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/;
            const vinLikePattern = /^[A-HJ-NPR-Z0-9]{10,}$/; // At least 10 characters
            const anyAlphaNumeric = /^[A-Z0-9]+$/;
            
            if (vinPattern.test(scannedText)) {
              setScannerFound(true);
              console.log('✅ ZXing found valid 17-char VIN!', formatName);
              onScanResult(scannedText);
              stopScanner();
              onClose();
            } else if (vinLikePattern.test(scannedText)) {
              setScannerFound(true);
              console.log('✅ ZXing found VIN-like code!', formatName);
              onScanResult(scannedText);
              stopScanner();
              onClose();
            } else if (anyAlphaNumeric.test(scannedText) && scannedText.length >= 5) {
              console.log('🤔 ZXing found alphanumeric code, not typical VIN format:', scannedText, formatName);
              setDetectedCodes(prev => [...prev.slice(-4), `ZXing: ${scannedText} (${formatName})`]);
              setShowDetected(true);
            } else {
              console.log('❌ ZXing found non-VIN text:', scannedText, formatName);
              if (scannedText.length >= 3) {
                setDetectedCodes(prev => [...prev.slice(-4), `ZXing: ${scannedText} (${formatName})`]);
                setShowDetected(true);
              }
            }
          }
          
          // Count scan attempts to provide helpful feedback
          if (error && error.name === 'NotFoundException') {
            const now = Date.now();
            if (now - lastScanTime > 1000) { // Only count once per second
              setScanAttempts(prev => prev + 1);
              setLastScanTime(now);
            }
          } else if (error) {
            console.error('Scan error:', error);
          }
        }
      );
      
      setScannerControls(controls);
    } catch (err) {
      console.error('Error starting scanner:', err);
      setError('Failed to start camera scanning. Please check camera permissions.');
      setIsScanning(false);
    }
  };

  const stopScanner = () => {
    try {
      if (scannerControls) {
        scannerControls.stop();
        setScannerControls(null);
      }
      
      if (html5Scanner) {
        html5Scanner.stop();
        setHtml5Scanner(null);
      }
      
      if (typeof window !== 'undefined' && (window as any).Quagga) {
        (window as any).Quagga.stop();
      }
    } catch (err) {
      console.error('Error stopping scanner:', err);
    }
    
    setIsScanning(false);
  };

  const switchCamera = async () => {
    if (availableCameras.length <= 1 || !codeReader) return;
    
    stopScanner();
    const nextIndex = (currentCameraIndex + 1) % availableCameras.length;
    setCurrentCameraIndex(nextIndex);
    
    setTimeout(() => {
      startScanning(codeReader, availableCameras[nextIndex].deviceId);
    }, 100);
  };

  const handleClose = () => {
    stopScanner();
    setShowManualInput(false);
    setManualVin('');
    onClose();
  };

  const handleManualSubmit = () => {
    if (manualVin.trim()) {
      onScanResult(manualVin.trim().toUpperCase());
      handleClose();
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      
      // Try to decode from the captured image
      if (codeReader) {
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => {
              codeReader.decodeFromImageUrl(url)
                .then((result) => {
                  const scannedText = result.getText().trim().toUpperCase();
                  console.log('Photo scan result:', scannedText);
                  
                  const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/;
                  const vinLikePattern = /^[A-HJ-NPR-Z0-9]{10,}$/;
                  
                  if (vinPattern.test(scannedText) || vinLikePattern.test(scannedText)) {
                    onScanResult(scannedText);
                    stopScanner();
                    onClose();
                  } else {
                    setError('Could not find a valid VIN in the captured photo. Try manual entry.');
                  }
                })
                .catch((err) => {
                  console.error('Photo decode error:', err);
                  setError('Could not scan the captured photo. Try manual entry.');
                })
                .finally(() => {
                  URL.revokeObjectURL(url);
                });
            };
            img.src = url;
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && codeReader) {
        try {
          const url = URL.createObjectURL(file);
          const result = await codeReader.decodeFromImageUrl(url);
          const scannedText = result.getText().trim().toUpperCase();
          console.log('Uploaded image scan result:', scannedText);
          
          const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/;
          const vinLikePattern = /^[A-HJ-NPR-Z0-9]{10,}$/;
          
          if (vinPattern.test(scannedText) || vinLikePattern.test(scannedText)) {
            onScanResult(scannedText);
            stopScanner();
            onClose();
          } else {
            setError('Could not find a valid VIN in the uploaded image. Try manual entry.');
          }
          URL.revokeObjectURL(url);
        } catch (err) {
          console.error('Image upload scan error:', err);
          setError('Could not scan the uploaded image. Try manual entry.');
        }
      }
    };
    input.click();
  };

  const restartScanners = async () => {
    stopScanner();
    setScanAttempts(0);
    setError(null);
    
    // Wait a bit for cleanup
    setTimeout(() => {
      initializeScanner();
    }, 500);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'black',
          color: 'white',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: 'rgba(0,0,0,0.8)',
          color: 'white',
        }}
      >
        <Box>
          <Typography variant="h6">Scan VIN/QR Code</Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Scanners: {scannersActive.join(' + ')}
          </Typography>
        </Box>
        <Box>
          <IconButton
            onClick={restartScanners}
            sx={{ color: 'white', mr: 1 }}
            title="Restart Scanners"
          >
            <ScannerIcon />
          </IconButton>
          <IconButton
            onClick={handleImageUpload}
            sx={{ color: 'white', mr: 1 }}
            title="Upload Image"
          >
            <UploadIcon />
          </IconButton>
          <IconButton
            onClick={() => setShowManualInput(!showManualInput)}
            sx={{ color: 'white', mr: 1 }}
            title="Manual VIN Entry"
          >
            <EditIcon />
          </IconButton>
          {availableCameras.length > 1 && (
            <IconButton
              onClick={switchCamera}
              sx={{ color: 'white', mr: 1 }}
              disabled={!isScanning}
            >
              <FlipCameraIcon />
            </IconButton>
          )}
          <IconButton onClick={handleClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0, position: 'relative', bgcolor: 'black' }}>
        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            aspectRatio: '4/3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'black',
          }}
        >
          {/* ZXing video element */}
          <video
            ref={videoRef}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              position: 'absolute',
              top: 0,
              left: 0,
            }}
            playsInline
            muted
          />
          
          {/* Html5QrCode scanner element - overlaid */}
          <div
            id="html5-scanner"
            style={{
              width: '100%',
              height: '100%',
              position: 'absolute',
              top: 0,
              left: 0,
              opacity: 0.8,
            }}
          />
          
                     {/* Clear viewfinder overlay */}
           <Box
             sx={{
               position: 'absolute',
               top: 0,
               left: 0,
               right: 0,
               bottom: 0,
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               pointerEvents: 'none',
             }}
           >
            
                                      {/* Unified viewfinder for both barcodes and QR codes */}
             <Box
               sx={{
                 width: '85%',
                 aspectRatio: '3/2',
                 border: '2px solid #00ff00',
                 borderRadius: 2,
                 position: 'relative',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 flexDirection: 'column',
               }}
             >
               {/* Corner brackets */}
               <Box
                 sx={{
                   position: 'absolute',
                   top: -2,
                   left: -2,
                   width: 25,
                   height: 25,
                   borderTop: '4px solid #00ff00',
                   borderLeft: '4px solid #00ff00',
                 }}
               />
               <Box
                 sx={{
                   position: 'absolute',
                   top: -2,
                   right: -2,
                   width: 25,
                   height: 25,
                   borderTop: '4px solid #00ff00',
                   borderRight: '4px solid #00ff00',
                 }}
               />
               <Box
                 sx={{
                   position: 'absolute',
                   bottom: -2,
                   left: -2,
                   width: 25,
                   height: 25,
                   borderBottom: '4px solid #00ff00',
                   borderLeft: '4px solid #00ff00',
                 }}
               />
               <Box
                 sx={{
                   position: 'absolute',
                   bottom: -2,
                   right: -2,
                   width: 25,
                   height: 25,
                   borderBottom: '4px solid #00ff00',
                   borderRight: '4px solid #00ff00',
                 }}
               />
               
               {/* Horizontal barcode guide line */}
               <Box
                 sx={{
                   position: 'absolute',
                   top: '40%',
                   left: '10%',
                   right: '10%',
                   height: '20%',
                   border: '1px dashed rgba(0, 255, 0, 0.6)',
                   borderRadius: 1,
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center',
                 }}
               >
                 <Typography 
                   variant="caption" 
                   sx={{ 
                     color: 'rgba(0, 255, 0, 0.8)',
                     fontSize: '8px',
                     backgroundColor: 'rgba(0, 0, 0, 0.5)',
                     padding: '2px 4px',
                     borderRadius: '2px',
                   }}
                 >
                   VIN Barcode
                 </Typography>
               </Box>
               
               {/* QR code guide square */}
               <Box
                 sx={{
                   position: 'absolute',
                   top: '60%',
                   right: '15%',
                   width: '25%',
                   aspectRatio: '1/1',
                   border: '1px dashed rgba(0, 255, 0, 0.6)',
                   borderRadius: 1,
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center',
                 }}
               >
                 <Typography 
                   variant="caption" 
                   sx={{ 
                     color: 'rgba(0, 255, 0, 0.8)',
                     fontSize: '7px',
                     backgroundColor: 'rgba(0, 0, 0, 0.5)',
                     padding: '1px 2px',
                     borderRadius: '2px',
                     textAlign: 'center',
                   }}
                 >
                   QR
                 </Typography>
               </Box>
               
               {!isScanning && (
                 <CircularProgress sx={{ color: '#00ff00' }} />
               )}
               
               <Typography 
                 variant="caption" 
                 sx={{ 
                   position: 'absolute', 
                   bottom: -25, 
                   left: '50%', 
                   transform: 'translateX(-50%)',
                   color: '#00ff00',
                   fontSize: '11px',
                   whiteSpace: 'nowrap',
                   textAlign: 'center',
                 }}
               >
                 VIN Barcode or QR Code
               </Typography>
             </Box>
          </Box>
        </Box>
        
        <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(0,0,0,0.8)' }}>
          <Typography variant="body2" sx={{ color: 'white', mb: 1 }}>
            Position the VIN barcode or QR code within the frame
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            {scanAttempts > 3 && (
              <Button
                variant="contained"
                size="small"
                startIcon={<PhotoCameraIcon />}
                onClick={capturePhoto}
                disabled={!isScanning}
                sx={{
                  bgcolor: '#2196f3',
                  color: 'white',
                  '&:hover': { bgcolor: '#1976d2' },
                  '&:disabled': { bgcolor: 'rgba(255,255,255,0.2)' }
                }}
              >
                Photo
              </Button>
            )}
            
            {scanAttempts > 5 && (
              <Button
                variant="contained"
                size="small"
                startIcon={<UploadIcon />}
                onClick={handleImageUpload}
                sx={{
                  bgcolor: '#4caf50',
                  color: 'white',
                  '&:hover': { bgcolor: '#388e3c' }
                }}
              >
                Upload
              </Button>
            )}
            
            {scanAttempts > 8 && (
              <Button
                variant="contained"
                size="small"
                startIcon={<ScannerIcon />}
                onClick={restartScanners}
                sx={{
                  bgcolor: '#ff9800',
                  color: 'white',
                  '&:hover': { bgcolor: '#f57c00' }
                }}
              >
                Restart
              </Button>
            )}
          </Stack>
          
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            {isScanning ? `Scanning with multiple engines...` : 'Initializing cameras...'}
            {scanAttempts > 0 && ` (${scanAttempts} attempts)`}
          </Typography>
          
          {scanAttempts > 10 && (
            <Typography variant="caption" sx={{ color: '#ffaa00', display: 'block', mt: 1 }}>
              Having trouble? Try different lighting, get closer, or use manual entry.
            </Typography>
          )}
        </Box>

        {/* Debugging Section */}
        {showDetected && detectedCodes.length > 0 && (
          <Box sx={{ p: 2, bgcolor: 'rgba(255,165,0,0.1)', borderTop: '1px solid rgba(255,165,0,0.3)' }}>
            <Typography variant="subtitle2" sx={{ color: '#ff9800', mb: 1 }}>
              🔍 Codes Detected (not VIN format):
            </Typography>
            {detectedCodes.map((code, idx) => (
              <Typography 
                key={idx} 
                variant="caption" 
                display="block" 
                sx={{ 
                  color: 'white',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  mb: 0.5,
                  wordBreak: 'break-all'
                }}
              >
                {code}
              </Typography>
            ))}
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Button
                size="small"
                onClick={() => setShowDetected(false)}
                sx={{ color: '#ff9800' }}
              >
                Hide
              </Button>
              <Button
                size="small"
                onClick={() => setDetectedCodes([])}
                sx={{ color: '#ff9800' }}
              >
                Clear
              </Button>
            </Stack>
          </Box>
        )}

        {/* Manual VIN Input Section */}
        {showManualInput && (
          <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.9)', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
            <Typography variant="subtitle2" sx={{ color: 'white', mb: 2 }}>
              Manual VIN Entry
            </Typography>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Enter VIN"
                value={manualVin}
                onChange={(e) => setManualVin(e.target.value.toUpperCase())}
                placeholder="17-character VIN"
                inputProps={{ maxLength: 17 }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': {
                      borderColor: 'rgba(255,255,255,0.5)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255,255,255,0.7)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#00ff00',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255,255,255,0.7)',
                  },
                }}
              />
              <Button
                fullWidth
                variant="contained"
                onClick={handleManualSubmit}
                disabled={!manualVin.trim()}
                sx={{
                  bgcolor: '#00ff00',
                  color: 'black',
                  '&:hover': {
                    bgcolor: '#00cc00',
                  },
                  '&:disabled': {
                    bgcolor: 'rgba(255,255,255,0.2)',
                    color: 'rgba(255,255,255,0.5)',
                  },
                }}
              >
                Use This VIN
              </Button>
            </Stack>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VinScanner; 