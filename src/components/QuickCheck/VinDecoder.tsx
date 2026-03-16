import React, { useState, useRef, useCallback, useEffect } from 'react';
import { acquireCamera, releaseCamera } from '../../utils/cameraLock';
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
  InputAdornment,
  LinearProgress
} from '@mui/material';
import {
  Info as InfoIcon,
  QrCodeScanner as QrIcon,
  CameraAlt as CameraAltIcon,
  Close as CloseIcon,
  PhotoLibrary
} from '@mui/icons-material';
import { useVinDecoder } from '../../hooks/useVinDecoder';
import { extractVinFromImage } from '../../services/vinOcr';

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
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  // ── QR / Barcode scanner state ────────────────────────────────────────────
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const qrVideoRef = useRef<HTMLVideoElement>(null);
  const qrAnimFrameRef = useRef<number>(0);

  // ── In-browser OCR camera state ───────────────────────────────────────────
  const [ocrCameraOpen, setOcrCameraOpen] = useState(false);
  const ocrVideoRef = useRef<HTMLVideoElement>(null);
  const ocrTrackRef = useRef<MediaStreamTrack | null>(null);
  const ocrPendingStreamRef = useRef<MediaStream | null>(null);
  
  useEffect(() => {
    if (vin) {
      vinDecoder.decodeVin(vin);
    }
  }, [vin, vinDecoder.decodeVin]);

  const vehicleInfo = vinDecoder.getVehicleInfo();

  // ── Shared helper: run OCR on a file ──────────────────────────────────────
  const runOcr = useCallback(async (file: File) => {
    try {
      setIsProcessing(true);
      setOcrProgress(0);
      setOcrStatus('Preprocessing image…');
      setError(null);

      const result = await extractVinFromImage(file, (pct) => {
        setOcrProgress(pct);
        if (pct < 10) setOcrStatus('Preprocessing image…');
        else if (pct < 80) setOcrStatus('Running OCR (multiple passes)…');
        else if (pct < 95) setOcrStatus('Validating VIN check digit…');
        else setOcrStatus('Confirming with NHTSA…');
      });

      if (result.success && result.vin) {
        const syntheticEvent = { target: { name: 'vin', value: result.vin } } as React.ChangeEvent<HTMLInputElement>;
        onVinChange(syntheticEvent);
      } else {
        setError(result.message || 'Could not extract VIN from image. Try a clearer, closer photo.');
      }
    } finally {
      setIsProcessing(false);
      setOcrStatus('');
    }
  }, [onVinChange]);

  // ═══ QR / Barcode scanner ═══════════════════════════════════════════════
  const handleQrCodeClick = () => {
    if (!acquireCamera('vin-qr')) return;
    setQrScannerOpen(true);
    setError(null);
  };

  const stopQrScanner = useCallback(() => {
    if (qrAnimFrameRef.current) cancelAnimationFrame(qrAnimFrameRef.current);
    if (qrVideoRef.current?.srcObject) {
      (qrVideoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      qrVideoRef.current.srcObject = null;
    }
    setQrScannerOpen(false);
    releaseCamera('vin-qr');
  }, []);

  useEffect(() => {
    if (!qrScannerOpen) return;
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        if (qrVideoRef.current) {
          qrVideoRef.current.srcObject = stream;
          await qrVideoRef.current.play();
        }

        const hasBarcodeAPI = 'BarcodeDetector' in window;
        let detector: any = null;
        let zxingReader: any = null;

        if (hasBarcodeAPI) {
          detector = new (window as any).BarcodeDetector({ formats: ['qr_code', 'code_128', 'code_39', 'data_matrix'] });
        } else {
          const { BrowserMultiFormatReader } = await import('@zxing/browser');
          zxingReader = new BrowserMultiFormatReader();
        }

        const scan = async () => {
          if (cancelled || !qrVideoRef.current) return;

          try {
            if (detector) {
              const barcodes = await detector.detect(qrVideoRef.current);
              for (const b of barcodes) {
                const raw = (b.rawValue || '').toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
                if (raw.length === 17) {
                  onVinChange({ target: { name: 'vin', value: raw } } as React.ChangeEvent<HTMLInputElement>);
                  stopQrScanner();
                  return;
                }
              }
            } else if (zxingReader && qrVideoRef.current) {
              try {
                const canvas = document.createElement('canvas');
                canvas.width = qrVideoRef.current.videoWidth || 640;
                canvas.height = qrVideoRef.current.videoHeight || 480;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(qrVideoRef.current, 0, 0, canvas.width, canvas.height);
                const luminance = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const { BinaryBitmap, HybridBinarizer, RGBLuminanceSource, MultiFormatReader } = await import('@zxing/library');
                const source = new RGBLuminanceSource(new Uint8ClampedArray(luminance.data.buffer), canvas.width, canvas.height);
                const bitmap = new BinaryBitmap(new HybridBinarizer(source));
                const result = new MultiFormatReader().decode(bitmap);
                const raw = result.getText().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
                if (raw.length === 17) {
                  onVinChange({ target: { name: 'vin', value: raw } } as React.ChangeEvent<HTMLInputElement>);
                  stopQrScanner();
                  return;
                }
              } catch { /* no barcode in frame */ }
            }
          } catch { /* frame error */ }

          if (!cancelled) qrAnimFrameRef.current = requestAnimationFrame(scan);
        };

        qrAnimFrameRef.current = requestAnimationFrame(scan);
      } catch {
        if (!cancelled) setError('Camera access denied');
      }
    })();

    return () => { cancelled = true; stopQrScanner(); };
  }, [qrScannerOpen, onVinChange, stopQrScanner]);

  // ═══ In-browser OCR camera ══════════════════════════════════════════════
  const openOcrCamera = () => {
    if (!acquireCamera('vin-ocr-camera')) return;
    setOcrCameraOpen(true);
    setError(null);
  };

  const stopOcrCamera = useCallback(() => {
    if (ocrTrackRef.current) { ocrTrackRef.current.stop(); ocrTrackRef.current = null; }
    if (ocrPendingStreamRef.current) { ocrPendingStreamRef.current.getTracks().forEach(t => t.stop()); ocrPendingStreamRef.current = null; }
    if (ocrVideoRef.current) ocrVideoRef.current.srcObject = null;
  }, []);

  const closeOcrCamera = useCallback(() => {
    stopOcrCamera();
    setOcrCameraOpen(false);
    releaseCamera('vin-ocr-camera');
  }, [stopOcrCamera]);

  useEffect(() => {
    if (!ocrCameraOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 } } });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        ocrTrackRef.current = stream.getVideoTracks()[0];
        if (ocrVideoRef.current) {
          ocrVideoRef.current.srcObject = stream;
          ocrVideoRef.current.play().catch(() => {});
        } else {
          ocrPendingStreamRef.current = stream;
        }
      } catch {
        if (!cancelled) {
          closeOcrCamera();
          openGalleryForOcr();
        }
      }
    })();
    return () => { cancelled = true; };
  }, [ocrCameraOpen, closeOcrCamera]);

  const ocrVideoRefCallback = (el: HTMLVideoElement | null) => {
    (ocrVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
    if (el && ocrPendingStreamRef.current) {
      el.srcObject = ocrPendingStreamRef.current;
      el.play().catch(() => {});
      ocrPendingStreamRef.current = null;
    }
  };

  const captureForOcr = () => {
    if (!ocrVideoRef.current) return;
    const video = ocrVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `vin-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      closeOcrCamera();
      await runOcr(file);
    }, 'image/jpeg', 0.92);
  };

  const openGalleryForOcr = () => {
    closeOcrCamera();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,image/heic,image/heif,.heic,.heif';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) await runOcr(file);
      if (document.body.contains(input)) document.body.removeChild(input);
    };
    input.click();
    setTimeout(() => { if (document.body.contains(input)) document.body.removeChild(input); }, 60000);
  };

  useEffect(() => { return () => stopOcrCamera(); }, [stopOcrCamera]);

  return (
    <Box>
      {/* VIN Input Field with Camera Buttons */}
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
                onClick={openOcrCamera}
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

      {/* OCR progress */}
      {isProcessing && (
        <Box sx={{ mt: 1 }}>
          <LinearProgress variant="determinate" value={ocrProgress} sx={{ borderRadius: 1 }} />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {ocrStatus || 'Scanning…'} {ocrProgress > 0 ? `${ocrProgress}%` : ''}
          </Typography>
        </Box>
      )}

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mt: 1, fontSize: '14px', py: 0.5 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* ── In-browser OCR camera dialog ─────────────────────────────────────── */}
      <Dialog open={ocrCameraOpen} onClose={closeOcrCamera} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'black' } }}>
        <DialogContent sx={{ p: 0, bgcolor: 'black', position: 'relative' }}>
          <video
            ref={ocrVideoRefCallback}
            playsInline
            autoPlay
            muted
            style={{ width: '100%', minHeight: 300, objectFit: 'cover', display: 'block' }}
          />
          {/* Guide overlay */}
          <Box sx={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '85%', height: 48, border: '2px solid rgba(0,200,255,0.7)', borderRadius: 1,
            pointerEvents: 'none'
          }} />
          <Typography variant="caption" sx={{
            position: 'absolute', top: 8, left: 0, right: 0, textAlign: 'center',
            color: 'white', textShadow: '0 1px 3px black'
          }}>
            Line up the VIN in the blue box, then tap capture
          </Typography>
          <Box sx={{
            position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 2, alignItems: 'center'
          }}>
            <IconButton onClick={closeOcrCamera} sx={{ bgcolor: 'rgba(255,255,255,0.9)', color: 'black', '&:hover': { bgcolor: 'white' } }}>
              <CloseIcon />
            </IconButton>
            <Button
              variant="contained"
              onClick={captureForOcr}
              sx={{
                bgcolor: 'white', color: 'black', borderRadius: '50%',
                width: 64, height: 64, minWidth: 64,
                '&:hover': { bgcolor: 'grey.100' }
              }}
            >
              <CameraAltIcon sx={{ fontSize: 28 }} />
            </Button>
            <IconButton onClick={openGalleryForOcr} sx={{ bgcolor: 'rgba(255,255,255,0.9)', color: 'black', '&:hover': { bgcolor: 'white' } }}>
              <PhotoLibrary />
            </IconButton>
          </Box>
        </DialogContent>
      </Dialog>

      {/* ── QR / Barcode Scanner Dialog ──────────────────────────────────────── */}
      <Dialog open={qrScannerOpen} onClose={stopQrScanner} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'black' } }}>
        <DialogTitle sx={{ color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 0 }}>
          <Typography variant="h6" sx={{ color: 'white' }}>Scan VIN Barcode / QR</Typography>
          <IconButton onClick={stopQrScanner} sx={{ color: 'white' }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 1 }}>
          <Box sx={{ position: 'relative' }}>
            <video ref={qrVideoRef} playsInline muted style={{ width: '100%', borderRadius: 4 }} />
            <Box sx={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: '80%', height: '30%', border: '2px solid rgba(0,255,0,0.6)', borderRadius: 1,
              pointerEvents: 'none'
            }} />
          </Box>
          <Typography variant="caption" sx={{ color: 'grey.400', mt: 1, display: 'block', textAlign: 'center' }}>
            Point camera at the VIN barcode or QR code on the inspection sticker
          </Typography>
        </DialogContent>
      </Dialog>

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
                  <Box sx={{ minWidth: { xs: '100%', sm: '250px' }, flex: 1 }}>
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

                  <Box sx={{ minWidth: { xs: '100%', sm: '250px' }, flex: 1 }}>
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

                  <Box sx={{ minWidth: { xs: '100%', sm: '250px' }, flex: 1 }}>
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

                  <Box sx={{ minWidth: { xs: '100%', sm: '250px' }, flex: 1 }}>
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