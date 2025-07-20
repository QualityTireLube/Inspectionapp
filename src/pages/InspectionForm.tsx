import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Paper,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import Grid from '../components/CustomGrid';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Html5QrcodeScanner } from 'html5-qrcode';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';

interface InspectionFormData {
  vehicleId: string;
  date: string;
  inspector: string;
  mileage: string;
  exterior: {
    body: boolean;
    lights: boolean;
    tires: boolean;
    windows: boolean;
  };
  interior: {
    seats: boolean;
    dashboard: boolean;
    controls: boolean;
    airConditioning: boolean;
  };
  mechanical: {
    engine: boolean;
    transmission: boolean;
    brakes: boolean;
    suspension: boolean;
  };
  notes: string;
}

interface LocationState {
  scannedVIN: string;
}

const InspectionForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { scannedVIN } = (location.state as LocationState) || { scannedVIN: '' };

  const [formData, setFormData] = useState<InspectionFormData>({
    vehicleId: scannedVIN,
    date: new Date().toISOString().split('T')[0],
    inspector: '',
    mileage: '',
    exterior: {
      body: false,
      lights: false,
      tires: false,
      windows: false,
    },
    interior: {
      seats: false,
      dashboard: false,
      controls: false,
      airConditioning: false,
    },
    mechanical: {
      engine: false,
      transmission: false,
      brakes: false,
      suspension: false,
    },
    notes: '',
  });

  const [vin, setVin] = useState(scannedVIN || '');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanError, setScanError] = useState<string>('');
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (scannerOpen) {
      const newScanner = new Html5QrcodeScanner('qr-reader', {
        qrbox: {
          width: 250,
          height: 250,
        },
        fps: 10,
      });

      newScanner.render(
        (decodedText) => {
          // Handle successful scan
          setVin(decodedText);
          setFormData(prev => ({ ...prev, vehicleId: decodedText }));
          setScannerOpen(false);
          newScanner.clear();
        },
        (errorMessage) => {
          console.error('QR Scan error:', errorMessage);
          setScanError(errorMessage);
        }
      );

      setScanner(newScanner);
    }

    return () => {
      if (scanner) {
        scanner.clear();
      }
    };
  }, [scannerOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      const [category, field] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [category]: {
          ...prev[category as keyof InspectionFormData],
          [field]: checked,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically save the inspection data to your database
    console.log('Inspection Data:', formData);
    navigate('/inspection-records');
  };

  const handleCloseScanner = () => {
    setScannerOpen(false);
    setScanError('');
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4">New Inspection</Typography>
        </Box>

        <Paper sx={{ p: 3 }}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="VIN"
                  name="vehicleId"
                  value={vin}
                  onChange={handleChange}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setScannerOpen(true)}>
                          <QrCodeScannerIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Inspector"
                  name="inspector"
                  value={formData.inspector}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Mileage"
                  name="mileage"
                  value={formData.mileage}
                  onChange={handleChange}
                  required
                  inputProps={{
                    type: 'tel',
                    inputMode: 'numeric',
                    pattern: '[0-9]*'
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Exterior Inspection
                </Typography>
                <Grid container spacing={2}>
                  {Object.entries(formData.exterior).map(([key, value]) => (
                    <Grid item xs={6} sm={3} key={key}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={value}
                            onChange={handleChange}
                            name={`exterior.${key}`}
                          />
                        }
                        label={key.charAt(0).toUpperCase() + key.slice(1)}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Interior Inspection
                </Typography>
                <Grid container spacing={2}>
                  {Object.entries(formData.interior).map(([key, value]) => (
                    <Grid item xs={6} sm={3} key={key}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={value}
                            onChange={handleChange}
                            name={`interior.${key}`}
                          />
                        }
                        label={key.charAt(0).toUpperCase() + key.slice(1)}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Mechanical Inspection
                </Typography>
                <Grid container spacing={2}>
                  {Object.entries(formData.mechanical).map(([key, value]) => (
                    <Grid item xs={6} sm={3} key={key}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={value}
                            onChange={handleChange}
                            name={`mechanical.${key}`}
                          />
                        }
                        label={key.charAt(0).toUpperCase() + key.slice(1)}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  multiline
                  rows={4}
                />
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    size="large"
                  >
                    Save Inspection
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Paper>

        <Dialog 
          open={scannerOpen} 
          onClose={handleCloseScanner}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Scan VIN Barcode</DialogTitle>
          <DialogContent>
            <Box
              id="qr-reader"
              sx={{
                width: '100%',
                minHeight: 300,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            />
            {scanError && (
              <Typography color="error" sx={{ mt: 2 }}>
                {scanError}
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseScanner}>Cancel</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default InspectionForm; 