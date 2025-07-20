import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  CardActions,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Fab,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Archive as ArchiveIcon,
  Delete as DeleteIcon,
  Print as PrintIcon,
  QrCode as QrCodeIcon,
  Edit as EditIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import QRCode from 'react-qr-code';
import Grid from '../components/CustomGrid';
import { StaticSticker, CreateStickerFormData, OilType } from '../types/stickers';
import { StickerStorageService } from '../services/stickerStorage';
import { VinDecoderService } from '../services/vinDecoder';
import { decodeVinCached } from '../services/api';
import { PDFGeneratorService } from '../services/pdfGenerator';
import StickerPreview from '../components/StickerPreview';

const ActiveStickers: React.FC = () => {
  const [activeStickers, setActiveStickers] = useState<StaticSticker[]>([]);
  const [oilTypes, setOilTypes] = useState<OilType[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<CreateStickerFormData>({
    vin: '',
    oilTypeId: '',
    mileage: 0,
  });
  const [isDecoding, setIsDecoding] = useState(false);
  const [decodedVin, setDecodedVin] = useState<any>(null);
  const [selectedSticker, setSelectedSticker] = useState<StaticSticker | null>(null);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showDecodedDialog, setShowDecodedDialog] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setActiveStickers(StickerStorageService.getActiveStickers());
    setOilTypes(StickerStorageService.getOilTypes());
  };

  const handleVinChange = async (vin: string) => {
    setFormData(prev => ({ ...prev, vin }));
    
    if (vin.length === 17) {
      setIsDecoding(true);
      try {
        const decoded = await decodeVinCached(vin);
        setDecodedVin(decoded);
      } catch (error) {
        console.error('VIN decoding failed:', error);
      } finally {
        setIsDecoding(false);
      }
    } else {
      setDecodedVin(null);
    }
  };

  const calculateNextServiceDate = (oilTypeId: string): string => {
    const oilType = oilTypes.find(type => type.id === oilTypeId);
    if (!oilType) return '';
    
    const today = new Date();
    const nextDate = new Date(today.getTime() + (oilType.durationInDays * 24 * 60 * 60 * 1000));
    return nextDate.toISOString().split('T')[0];
  };

  const generateQRCode = (sticker: Omit<StaticSticker, 'qrCode'>): string => {
    // Only include VIN in QR code as requested
    return sticker.vin;
  };

  const handleCreateSticker = async () => {
    try {
      setError('');
      
      if (!formData.vin || !formData.oilTypeId) {
        setError('Please fill in all required fields');
        return;
      }

      if (!VinDecoderService.validateVin(formData.vin)) {
        setError('Please enter a valid 17-character VIN');
        return;
      }

      const oilType = oilTypes.find(type => type.id === formData.oilTypeId);
      if (!oilType) {
        setError('Please select a valid oil type');
        return;
      }

      const nextServiceDate = formData.dateOverride || calculateNextServiceDate(formData.oilTypeId);
      const settings = StickerStorageService.getSettings();
      
      // Get company info from settings elements
      const companyElement = settings.layout.elements.find(el => el.id === 'companyName');
      const addressElement = settings.layout.elements.find(el => el.id === 'address');
      const messageElement = settings.layout.elements.find(el => el.id === 'message');
      
      // Transform NHTSA data to match VinDecodedDetails interface
      let transformedDecodedDetails = { error: 'VIN not decoded' };
      if (decodedVin && decodedVin.Results && Array.isArray(decodedVin.Results)) {
        const getValue = (variable: string) => {
          const result = decodedVin.Results.find((r: any) => r.Variable === variable);
          return result && result.Value && result.Value !== 'Not Available' ? result.Value : null;
        };
        
        transformedDecodedDetails = {
          year: getValue('Model Year'),
          make: getValue('Make'),
          model: getValue('Model'),
          engine: getValue('Engine Configuration'),
          engineL: getValue('Displacement (L)'),
          engineCylinders: getValue('Engine Number of Cylinders'),
          trim: getValue('Trim'),
          bodyType: getValue('Body Class'),
          bodyClass: getValue('Body Class'),
          driveType: getValue('Drive Type'),
          transmission: getValue('Transmission Style'),
          fuelType: getValue('Fuel Type - Primary'),
          manufacturer: getValue('Manufacturer Name'),
          plant: getValue('Plant Company Name'),
          vehicleType: getValue('Vehicle Type'),
          // Keep raw NHTSA data for PDF generation
          ...decodedVin
        };
      }
      
      const newSticker: StaticSticker = {
        id: Date.now().toString(),
        dateCreated: new Date().toISOString(),
        vin: VinDecoderService.formatVin(formData.vin),
        decodedDetails: transformedDecodedDetails,
        date: nextServiceDate,
        oilType,
        mileage: formData.mileage,
        companyName: companyElement?.content.replace('{companyName}', '') || '',
        address: addressElement?.content.replace('{address}', '') || '',
        message: messageElement?.content || '',
        qrCode: '',
        printed: false,
        lastUpdated: new Date().toISOString(),
        archived: false,
      };

      newSticker.qrCode = generateQRCode(newSticker);

      StickerStorageService.saveSticker(newSticker);
      
      // Automatically generate and open PDF after creation
      try {
        const settings = StickerStorageService.getSettings();
        await PDFGeneratorService.openStickerPDF(newSticker, settings);
        
        // Update the sticker as printed
        StickerStorageService.saveSticker({ ...newSticker, printed: true });
        setSuccess('Sticker created and PDF opened in new tab successfully!');
      } catch (pdfError) {
        console.error('Error generating PDF:', pdfError);
        setSuccess('Sticker created successfully! (PDF generation failed - you can use the print button to try again)');
      }
      
      setShowCreateForm(false);
      setFormData({
        vin: '',
        oilTypeId: '',
        mileage: 0,
      });
      setDecodedVin(null);
      loadData();
    } catch (error) {
      console.error('Error creating sticker:', error);
      setError('Failed to create sticker');
    }
  };

  const handleArchiveSticker = (id: string) => {
    try {
      StickerStorageService.archiveSticker(id);
      setSuccess('Sticker archived successfully!');
      loadData();
    } catch (error) {
      setError('Failed to archive sticker');
    }
  };

  const handleDeleteSticker = (id: string) => {
    if (window.confirm('Are you sure you want to delete this sticker? This action cannot be undone.')) {
      try {
        StickerStorageService.deleteSticker(id);
        setSuccess('Sticker deleted successfully!');
        loadData();
      } catch (error) {
        setError('Failed to delete sticker');
      }
    }
  };

  const handlePrintSticker = async (sticker: StaticSticker) => {
    try {
      const settings = StickerStorageService.getSettings();
      
      // Automatically open PDF in new tab
      await PDFGeneratorService.openStickerPDF(sticker, settings);
      
      // Update the sticker as printed
      StickerStorageService.saveSticker({ ...sticker, printed: true });
      setSuccess('PDF opened in new tab successfully!');
      loadData();
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Failed to generate PDF');
    }
  };

  const handleShowQR = (sticker: StaticSticker) => {
    setSelectedSticker(sticker);
    setShowQRDialog(true);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Active Oil Change Stickers
          </Typography>
          <Fab
            color="primary"
            aria-label="add"
            onClick={() => setShowCreateForm(true)}
          >
            <AddIcon />
          </Fab>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {activeStickers.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="textSecondary">
              No active stickers found
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Click the + button to create your first oil change sticker
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {activeStickers.map((sticker) => (
              <Grid item xs={12} sm={6} md={4} key={sticker.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {sticker.decodedDetails.year || 'Unknown'} {sticker.decodedDetails.make || 'Unknown'} {sticker.decodedDetails.model || 'Unknown'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      VIN: {sticker.vin}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      Current Mileage: {sticker.mileage.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      Oil Type: {sticker.oilType.name}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      Next Service: {format(new Date(sticker.date), 'MM/dd/yyyy')}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      Next Mileage: {(sticker.mileage + sticker.oilType.mileageInterval).toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      {sticker.companyName}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Chip
                        label={sticker.printed ? 'Printed' : 'Not Printed'}
                        color={sticker.printed ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                  </CardContent>
                  <CardActions>
                    <IconButton
                      size="small"
                      onClick={() => handleShowQR(sticker)}
                      title="Show QR Code"
                    >
                      <QrCodeIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handlePrintSticker(sticker)}
                      title="Generate PDF"
                    >
                      <PrintIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleArchiveSticker(sticker.id)}
                      title="Archive"
                    >
                      <ArchiveIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteSticker(sticker.id)}
                      title="Delete"
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Create Sticker Dialog */}
        <Dialog open={showCreateForm} onClose={() => setShowCreateForm(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            Create New Oil Change Sticker
            <IconButton
              aria-label="close"
              onClick={() => setShowCreateForm(false)}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 1 }}>
              {/* Form Inputs - Vertical Layout */}
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="VIN"
                    value={formData.vin}
                    onChange={(e) => handleVinChange(e.target.value.toUpperCase())}
                    helperText="17-character Vehicle Identification Number"
                    InputProps={{
                      endAdornment: isDecoding && <CircularProgress size={20} />
                    }}
                  />
                </Grid>

                {decodedVin && decodedVin.Results && !decodedVin.error && (() => {
                  // Helper to get value by variable name (same as QuickCheck)
                  const getValue = (variable: string) => {
                    const found = decodedVin.Results.find((r: any) => r.Variable === variable);
                    return found && found.Value && found.Value !== 'Not Applicable' && found.Value !== '0' ? found.Value : '';
                  };
                  const year = getValue('Model Year');
                  const make = getValue('Make');
                  const model = getValue('Model');
                  const engine = getValue('Displacement (L)');
                  const cylinders = getValue('Engine Number of Cylinders');
                  
                  // Format engine displacement to max 2 decimal places
                  const formattedEngine = engine ? parseFloat(engine).toFixed(2).replace(/\.?0+$/, '') + 'L' : '';
                  
                  const label = [year, make, model, formattedEngine, cylinders ? cylinders + ' cyl' : ''].filter(Boolean).join(' ');
                  
                  if (!label) return null;
                  
                  return (
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Chip
                          label={label}
                          color="success"
                          variant="filled"
                          clickable
                          onClick={() => setShowDecodedDialog(true)}
                          sx={{
                            height: 'auto',
                            py: 1,
                            px: 2,
                            fontSize: '0.9rem',
                            fontWeight: 'medium',
                            '& .MuiChip-label': {
                              display: 'block',
                              whiteSpace: 'normal',
                              textAlign: 'center',
                              lineHeight: 1.3,
                            },
                            boxShadow: 2,
                            '&:hover': {
                              boxShadow: 4,
                              transform: 'scale(1.02)',
                            },
                            transition: 'all 0.2s ease-in-out',
                          }}
                        />
                      </Box>
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
                        Click to view full details
                      </Typography>
                    </Grid>
                  );
                })()}

                <Grid item xs={12}>
                  <Box>
                    <Typography variant="body1" gutterBottom sx={{ fontWeight: 'medium', mb: 2 }}>
                      Select Oil Type
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {oilTypes.map((type) => (
                        <Chip
                          key={type.id}
                          label={`${type.name} (${type.durationInDays} days / ${type.mileageInterval.toLocaleString()} miles)`}
                          clickable
                          color={formData.oilTypeId === type.id ? 'primary' : 'default'}
                          variant={formData.oilTypeId === type.id ? 'filled' : 'outlined'}
                          onClick={() => setFormData(prev => ({ ...prev, oilTypeId: type.id }))}
                          sx={{
                            height: 'auto',
                            py: 1,
                            px: 2,
                            '& .MuiChip-label': {
                              display: 'block',
                              whiteSpace: 'normal',
                              textAlign: 'center',
                              lineHeight: 1.2,
                            },
                            ...(formData.oilTypeId === type.id && {
                              boxShadow: 2,
                              transform: 'scale(1.02)',
                            }),
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                              transform: 'scale(1.05)',
                              boxShadow: 3,
                            }
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Current Mileage"
                    value={formData.mileage ? formData.mileage.toLocaleString() : ''}
                    onChange={(e) => {
                      const numericValue = e.target.value.replace(/,/g, '');
                      const parsedValue = parseInt(numericValue) || 0;
                      setFormData(prev => ({ ...prev, mileage: parsedValue }));
                    }}
                    helperText="Enter the current vehicle mileage"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Next Service Date (Override)"
                    type="date"
                    value={formData.dateOverride || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateOverride: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    helperText="Leave blank to auto-calculate based on oil type"
                  />
                </Grid>

                {/* Preview Section - Bottom */}
                <Grid item xs={12}>
                  <Box sx={{ mt: 3, mb: 2 }}>
                    <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', color: 'primary.main' }}>
                      Sticker Preview
                    </Typography>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      {(() => {
                        const settings = StickerStorageService.getSettings();
                        const selectedOilType = oilTypes.find(type => type.id === formData.oilTypeId);
                        const nextServiceDate = formData.dateOverride || 
                          (selectedOilType ? calculateNextServiceDate(formData.oilTypeId) : '');
                        const nextServiceMileage = selectedOilType ? 
                          (formData.mileage + selectedOilType.mileageInterval).toLocaleString() : '';
                        
                        // Get company info from settings elements
                        const companyElement = settings.layout.elements.find(el => el.id === 'companyName');
                        const addressElement = settings.layout.elements.find(el => el.id === 'address');
                        
                        const companyName = companyElement?.content.replace('{companyName}', '') || '';
                        const address = addressElement?.content.replace('{address}', '') || '';
                        
                        // Generate decoded details string from NHTSA data
                        let decodedDetailsString = '';
                        if (decodedVin && decodedVin.Results && !decodedVin.error) {
                          const getValue = (variable: string) => {
                            const found = decodedVin.Results.find((r: any) => r.Variable === variable);
                            return found && found.Value && found.Value !== 'Not Applicable' && found.Value !== '0' ? found.Value : '';
                          };
                          const year = getValue('Model Year');
                          const make = getValue('Make');
                          const model = getValue('Model');
                          const engine = getValue('Displacement (L)');
                          const cylinders = getValue('Engine Number of Cylinders');
                          decodedDetailsString = [year, make, model, engine ? engine + 'L' : '', cylinders ? cylinders + ' cyl' : ''].filter(Boolean).join(' ');
                        }
                        
                        // Create modified settings with compressed Y positions for better spacing match
                        const previewSettings = {
                          ...settings,
                          paperSize: {
                            ...settings.paperSize,
                            height: settings.paperSize.height * 1
                          },
                          layout: {
                            ...settings.layout,
                            elements: settings.layout.elements.map(element => ({
                              ...element,
                              position: {
                                ...element.position,
                                y: element.position.y * .92 + 2 // Compress Y positions and shift up
                              }
                            }))
                          }
                        };
                        
                        return (
                          <StickerPreview 
                            settings={previewSettings}
                            data={{
                              serviceDate: nextServiceDate ? new Date(nextServiceDate).toLocaleDateString() : '',
                              serviceMileage: nextServiceMileage || '',
                              oilType: selectedOilType?.name || '',
                              companyName: companyName,
                              address: address,
                              vin: formData.vin,
                              decodedDetails: decodedDetailsString,
                              formMode: true
                            }}
                            scale={300 / Math.max(previewSettings.paperSize.width, previewSettings.paperSize.height)}
                            showTitle={false}
                            textScale={0.3}
                          />
                        );
                      })()}
                    </Box>

                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
                      Live preview updates as you type
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowCreateForm(false)}>Cancel</Button>
            <Button onClick={handleCreateSticker} variant="contained">
              Create Sticker
            </Button>
          </DialogActions>
        </Dialog>

        {/* QR Code Dialog */}
        <Dialog open={showQRDialog} onClose={() => setShowQRDialog(false)} maxWidth="sm">
          <DialogTitle>QR Code</DialogTitle>
          <DialogContent sx={{ textAlign: 'center', p: 3 }}>
            {selectedSticker && (
              <>
                <Typography variant="h6" gutterBottom>
                  {selectedSticker.decodedDetails.year || 'Unknown'} {selectedSticker.decodedDetails.make || 'Unknown'} {selectedSticker.decodedDetails.model || 'Unknown'}
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  VIN: {selectedSticker.vin}
                </Typography>
                <Box sx={{ mt: 2, mb: 2 }}>
                  <QRCode value={selectedSticker.qrCode} size={200} />
                </Box>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowQRDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Decoded VIN Details Dialog */}
        <Dialog open={showDecodedDialog} onClose={() => setShowDecodedDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            VIN Decoder Details
            <IconButton
              aria-label="close"
              onClick={() => setShowDecodedDialog(false)}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {decodedVin && decodedVin.Results && !decodedVin.error && (() => {
              // Helper to get value by variable name
              const getValue = (variable: string) => {
                const found = decodedVin.Results.find((r: any) => r.Variable === variable);
                return found && found.Value && found.Value !== 'Not Applicable' && found.Value !== '0' ? found.Value : '';
              };

              return (
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom color="primary">
                      Vehicle Information
                    </Typography>
                  </Grid>
                  
                  {/* Basic Vehicle Info */}
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="caption" color="textSecondary">Year</Typography>
                      <Typography variant="body1" fontWeight="medium">{getValue('Model Year') || 'N/A'}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="caption" color="textSecondary">Make</Typography>
                      <Typography variant="body1" fontWeight="medium">{getValue('Make') || 'N/A'}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="caption" color="textSecondary">Model</Typography>
                      <Typography variant="body1" fontWeight="medium">{getValue('Model') || 'N/A'}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="caption" color="textSecondary">Body Class</Typography>
                      <Typography variant="body1" fontWeight="medium">{getValue('Body Class') || 'N/A'}</Typography>
                    </Paper>
                  </Grid>

                  {/* Engine Info */}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
                      Engine Specifications
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="caption" color="textSecondary">Engine Size</Typography>
                      <Typography variant="body1" fontWeight="medium">{getValue('Displacement (L)') ? getValue('Displacement (L)') + ' L' : 'N/A'}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="caption" color="textSecondary">Cylinders</Typography>
                      <Typography variant="body1" fontWeight="medium">{getValue('Engine Number of Cylinders') ? getValue('Engine Number of Cylinders') + ' cyl' : 'N/A'}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="caption" color="textSecondary">Fuel Type</Typography>
                      <Typography variant="body1" fontWeight="medium">{getValue('Fuel Type - Primary') || 'N/A'}</Typography>
                    </Paper>
                  </Grid>

                  {/* Additional Details */}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
                      Additional Details
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="caption" color="textSecondary">Manufacturer</Typography>
                      <Typography variant="body1" fontWeight="medium">{getValue('Manufacturer Name') || 'N/A'}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="caption" color="textSecondary">Plant</Typography>
                      <Typography variant="body1" fontWeight="medium">{getValue('Plant Company Name') || 'N/A'}</Typography>
                    </Paper>
                  </Grid>

                  {/* All Fields */}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
                      All Decoded Fields
                    </Typography>
                    <Paper sx={{ p: 2, bgcolor: 'grey.100', maxHeight: 300, overflow: 'auto' }}>
                      {decodedVin.Results.filter((r: any) => r.Value && r.Value !== 'Not Applicable' && r.Value !== '0').map((r: any) => (
                        <Box key={r.Variable} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid #eee' }}>
                          <Typography variant="body2" color="textSecondary">{r.Variable}:</Typography>
                          <Typography variant="body2" fontWeight={500}>{r.Value}</Typography>
                        </Box>
                      ))}
                    </Paper>
                  </Grid>

                  {/* Raw Data Section */}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
                      Raw NHTSA Response
                    </Typography>
                    <Paper sx={{ p: 2, bgcolor: 'grey.100', maxHeight: 200, overflow: 'auto' }}>
                      <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>
                        {JSON.stringify(decodedVin, null, 2)}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              );
            })()}
            
            {decodedVin && decodedVin.error && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="body1" color="error">
                  {decodedVin.error}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowDecodedDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default ActiveStickers; 