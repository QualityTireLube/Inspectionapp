import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Divider,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Fab,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Slider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  RestartAlt as ResetIcon,
} from '@mui/icons-material';
import Grid from './CustomGrid';
import StickerPreview from './StickerPreview';
import ElementEditor from './ElementEditor';
import { StickerSettings, OilType, PaperSize, LayoutSettings, StickerElement } from '../types/stickers';
import { StickerStorageService } from '../services/stickerStorage';

const paperSizes: PaperSize[] = [
  { name: 'Dymo 200i Label', width: 46.1, height: 63.5 }, // 1.8125" x 2.5"
  { name: 'Dymo Standard Label', width: 25.4, height: 76.2 }, // 1" x 3"
  { name: 'Brother Small Label', width: 36, height: 89 }, // ~1.4" x 3.5"
  { name: 'Letter', width: 216, height: 279 },
  { name: 'A4', width: 210, height: 297 },
  { name: 'Legal', width: 216, height: 356 },
  { name: '4x6', width: 102, height: 152 },
  { name: '5x7', width: 127, height: 178 },
  { name: 'Custom', width: 100, height: 100 },
];

const fontOptions = ['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 'Calibri'];

const StickerSettingsContent: React.FC = () => {
  const [settings, setSettings] = useState<StickerSettings | null>(null);
  const [editedSettings, setEditedSettings] = useState<StickerSettings | null>(null);
  const [showOilTypeDialog, setShowOilTypeDialog] = useState(false);
  const [editingOilType, setEditingOilType] = useState<OilType | null>(null);
  const [oilTypeForm, setOilTypeForm] = useState<Omit<OilType, 'id'>>({
    name: '',
    durationInDays: 90,
    mileageInterval: 3000,
  });
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    const currentSettings = StickerStorageService.getSettings();
    setSettings(currentSettings);
    setEditedSettings({ ...currentSettings });
  };

  const handleSaveSettings = () => {
    if (!editedSettings) return;
    
    try {
      StickerStorageService.saveSettings(editedSettings);
      setSettings({ ...editedSettings });
      setSuccess('Settings saved successfully!');
    } catch (error) {
      setError('Failed to save settings');
    }
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      try {
        localStorage.removeItem('stickerSettings');
        loadSettings();
        setSuccess('Settings reset to defaults');
      } catch (error) {
        setError('Failed to reset settings');
      }
    }
  };

  const handlePaperSizeChange = (paperSize: PaperSize) => {
    if (!editedSettings) return;
    
    setEditedSettings({
      ...editedSettings,
      paperSize: { ...paperSize }
    });
  };

  const handleLayoutChange = (field: keyof LayoutSettings, value: any) => {
    if (!editedSettings) return;
    
    setEditedSettings({
      ...editedSettings,
      layout: {
        ...editedSettings.layout,
        [field]: value
      }
    });
  };

  const handleMarginChange = (field: string, value: number) => {
    if (!editedSettings) return;
    
    setEditedSettings({
      ...editedSettings,
      layout: {
        ...editedSettings.layout,
        margins: {
          ...editedSettings.layout.margins,
          [field]: value
        }
      }
    });
  };

  const handleQRPositionChange = (axis: 'x' | 'y', value: number) => {
    if (!editedSettings) return;
    
    setEditedSettings({
      ...editedSettings,
      layout: {
        ...editedSettings.layout,
        qrCodePosition: {
          ...editedSettings.layout.qrCodePosition,
          [axis]: value
        }
      }
    });
  };

  const handleElementChange = (index: number, element: StickerElement) => {
    if (!editedSettings) return;
    
    const newElements = [...editedSettings.layout.elements];
    newElements[index] = element;
    
    setEditedSettings({
      ...editedSettings,
      layout: {
        ...editedSettings.layout,
        elements: newElements
      }
    });
  };

  const handleAddElement = () => {
    if (!editedSettings) return;
    
    const newElement: StickerElement = {
      id: `custom_${Date.now()}`,
      label: 'Custom Element',
      content: 'Custom Text',
      visible: true,
      position: { x: 50, y: 50 },
      fontSize: 1.0,
      fontWeight: 'normal',
      textAlign: 'center'
    };
    
    setEditedSettings({
      ...editedSettings,
      layout: {
        ...editedSettings.layout,
        elements: [...editedSettings.layout.elements, newElement]
      }
    });
  };

  const handleDeleteElement = (index: number) => {
    if (!editedSettings) return;
    
    if (window.confirm('Are you sure you want to delete this element?')) {
      const newElements = editedSettings.layout.elements.filter((_, i) => i !== index);
      
      setEditedSettings({
        ...editedSettings,
        layout: {
          ...editedSettings.layout,
          elements: newElements
        }
      });
    }
  };

  const handleAddOilType = () => {
    setEditingOilType(null);
    setOilTypeForm({
      name: '',
      durationInDays: 90,
      mileageInterval: 3000,
    });
    setShowOilTypeDialog(true);
  };

  const handleEditOilType = (oilType: OilType) => {
    setEditingOilType(oilType);
    setOilTypeForm({
      name: oilType.name,
      durationInDays: oilType.durationInDays,
      mileageInterval: oilType.mileageInterval,
    });
    setShowOilTypeDialog(true);
  };

  const handleSaveOilType = () => {
    if (!editedSettings || !oilTypeForm.name.trim()) {
      setError('Please enter a valid oil type name');
      return;
    }

    const newOilTypes = [...editedSettings.oilTypes];
    
    if (editingOilType) {
      // Edit existing
      const index = newOilTypes.findIndex(type => type.id === editingOilType.id);
      if (index >= 0) {
        newOilTypes[index] = {
          ...editingOilType,
          ...oilTypeForm,
        };
      }
    } else {
      // Add new
      const newOilType: OilType = {
        id: Date.now().toString(),
        ...oilTypeForm,
      };
      newOilTypes.push(newOilType);
    }

    setEditedSettings({
      ...editedSettings,
      oilTypes: newOilTypes
    });

    setShowOilTypeDialog(false);
    setEditingOilType(null);
  };

  const handleDeleteOilType = (id: string) => {
    if (!editedSettings) return;
    
    if (editedSettings.oilTypes.length <= 1) {
      setError('You must have at least one oil type');
      return;
    }

    if (window.confirm('Are you sure you want to delete this oil type?')) {
      setEditedSettings({
        ...editedSettings,
        oilTypes: editedSettings.oilTypes.filter(type => type.id !== id)
      });
    }
  };

  if (!settings || !editedSettings) {
    return <div>Loading...</div>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Sticker Settings
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<ResetIcon />}
            onClick={handleResetToDefaults}
            color="warning"
          >
            Reset to Defaults
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSaveSettings}
            disabled={JSON.stringify(settings) === JSON.stringify(editedSettings)}
          >
            Save Changes
          </Button>
        </Box>
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

      <Grid container spacing={3}>
        {/* Main Content - All Settings */}
        <Grid item xs={12}>
          {/* Oil Types Management */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Oil Types
                </Typography>
                <Fab
                  size="small"
                  color="primary"
                  aria-label="add oil type"
                  onClick={handleAddOilType}
                >
                  <AddIcon />
                </Fab>
              </Box>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell align="right">Duration (Days)</TableCell>
                      <TableCell align="right">Mileage Interval</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {editedSettings.oilTypes.map((oilType) => (
                      <TableRow key={oilType.id}>
                        <TableCell>{oilType.name}</TableCell>
                        <TableCell align="right">{oilType.durationInDays}</TableCell>
                        <TableCell align="right">{oilType.mileageInterval.toLocaleString()}</TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => handleEditOilType(oilType)}
                            title="Edit"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteOilType(oilType.id)}
                            title="Delete"
                            color="error"
                            disabled={editedSettings.oilTypes.length <= 1}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Paper Size Settings */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Paper Size
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Paper Size</InputLabel>
                    <Select
                      value={editedSettings.paperSize.name}
                      onChange={(e) => {
                        const selectedSize = paperSizes.find(size => size.name === e.target.value);
                        if (selectedSize) handlePaperSizeChange(selectedSize);
                      }}
                      label="Paper Size"
                    >
                      {paperSizes.map((size) => (
                        <MenuItem key={size.name} value={size.name}>
                          {size.name} ({size.width}mm x {size.height}mm)
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {editedSettings.paperSize.name === 'Custom' && (
                  <>
                    <Grid item xs={6} md={3}>
                      <TextField
                        fullWidth
                        label="Width (mm)"
                        type="number"
                        value={editedSettings.paperSize.width}
                        onChange={(e) => handlePaperSizeChange({
                          ...editedSettings.paperSize,
                          width: parseInt(e.target.value) || 0
                        })}
                      />
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <TextField
                        fullWidth
                        label="Height (mm)"
                        type="number"
                        value={editedSettings.paperSize.height}
                        onChange={(e) => handlePaperSizeChange({
                          ...editedSettings.paperSize,
                          height: parseInt(e.target.value) || 0
                        })}
                      />
                    </Grid>
                  </>
                )}
              </Grid>
            </CardContent>
          </Card>

          {/* Basic Settings */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Basic Settings
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={4}>
                  <TextField
                    fullWidth
                    label="Base Font Size (px)"
                    type="number"
                    value={editedSettings.layout.fontSize}
                    onChange={(e) => handleLayoutChange('fontSize', parseInt(e.target.value) || 12)}
                  />
                </Grid>
                <Grid item xs={6} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Font Family</InputLabel>
                    <Select
                      value={editedSettings.layout.fontFamily}
                      onChange={(e) => handleLayoutChange('fontFamily', e.target.value)}
                      label="Font Family"
                    >
                      {fontOptions.map((font) => (
                        <MenuItem key={font} value={font}>
                          {font}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="QR Code Size (mm)"
                    type="number"
                    value={editedSettings.layout.qrCodeSize}
                    onChange={(e) => handleLayoutChange('qrCodeSize', parseInt(e.target.value) || 50)}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Margins */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Margins (mm)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <TextField
                    fullWidth
                    label="Top"
                    type="number"
                    value={editedSettings.layout.margins.top}
                    onChange={(e) => handleMarginChange('top', parseInt(e.target.value) || 0)}
                  />
                </Grid>
                <Grid item xs={6} md={3}>
                  <TextField
                    fullWidth
                    label="Bottom"
                    type="number"
                    value={editedSettings.layout.margins.bottom}
                    onChange={(e) => handleMarginChange('bottom', parseInt(e.target.value) || 0)}
                  />
                </Grid>
                <Grid item xs={6} md={3}>
                  <TextField
                    fullWidth
                    label="Left"
                    type="number"
                    value={editedSettings.layout.margins.left}
                    onChange={(e) => handleMarginChange('left', parseInt(e.target.value) || 0)}
                  />
                </Grid>
                <Grid item xs={6} md={3}>
                  <TextField
                    fullWidth
                    label="Right"
                    type="number"
                    value={editedSettings.layout.margins.right}
                    onChange={(e) => handleMarginChange('right', parseInt(e.target.value) || 0)}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* QR Code Position */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                QR Code Position
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography gutterBottom>X Position (%)</Typography>
                  <Slider
                    value={editedSettings.layout.qrCodePosition.x}
                    onChange={(_, value) => handleQRPositionChange('x', value as number)}
                    min={0}
                    max={100}
                    step={1}
                    valueLabelDisplay="auto"
                  />
                  <TextField
                    size="small"
                    type="number"
                    value={editedSettings.layout.qrCodePosition.x}
                    onChange={(e) => handleQRPositionChange('x', parseInt(e.target.value) || 0)}
                    inputProps={{ min: 0, max: 100 }}
                    sx={{ mt: 1, width: '100px' }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography gutterBottom>Y Position (%)</Typography>
                  <Slider
                    value={editedSettings.layout.qrCodePosition.y}
                    onChange={(_, value) => handleQRPositionChange('y', value as number)}
                    min={0}
                    max={100}
                    step={1}
                    valueLabelDisplay="auto"
                  />
                  <TextField
                    size="small"
                    type="number"
                    value={editedSettings.layout.qrCodePosition.y}
                    onChange={(e) => handleQRPositionChange('y', parseInt(e.target.value) || 0)}
                    inputProps={{ min: 0, max: 100 }}
                    sx={{ mt: 1, width: '100px' }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Dynamic Elements */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Sticker Elements
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAddElement}
                  size="small"
                >
                  Add Custom Element
                </Button>
              </Box>

              <Box sx={{ maxHeight: '500px', overflowY: 'auto' }}>
                {editedSettings.layout.elements.map((element, index) => (
                  <Box key={element.id} sx={{ mb: 1, position: 'relative' }}>
                    <ElementEditor
                      element={element}
                      onChange={(updatedElement) => handleElementChange(index, updatedElement)}
                      allElements={editedSettings.layout.elements}
                      settings={editedSettings}
                    />
                    {element.id.startsWith('custom_') && (
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteElement(index)}
                        color="error"
                        sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Live Preview */}
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: 3
            }}>
              <Typography variant="h6" sx={{ textAlign: 'center', mb: 0.5 }}>
                Live Preview
              </Typography>
              
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flex: '0 0 auto'
              }}>
                {editedSettings && (() => {
                  const previewSettings = {
                    ...editedSettings,
                    paperSize: {
                      ...editedSettings.paperSize,
                      height: editedSettings.paperSize.height * 1
                    },
                    layout: {
                      ...editedSettings.layout,
                      elements: editedSettings.layout.elements.map(element => ({
                        ...element,
                        position: {
                          ...element.position,
                          y: element.position.y * .92 + 2
                        }
                      }))
                    }
                  };
                  
                  return (
                    <StickerPreview 
                      settings={previewSettings}
                      scale={300 / Math.max(previewSettings.paperSize.width, previewSettings.paperSize.height)}
                      showTitle={false}
                      textScale={0.3}
                      data={{
                        serviceDate: '9/19/2025',
                        serviceMileage: '137,234',
                        oilType: 'Rotella',
                        companyName: 'Quality Lube Express',
                        address: '3617 Hwy 19 Zachary',
                        vin: '1HGBH41JXMN109186',
                        decodedDetails: '2018 Ford F-150 3.5L 6cyl'
                      }}
                    />
                  );
                })()}
              </Box>
              
              <Typography variant="caption" color="textSecondary" sx={{ textAlign: 'center', mt: 0.5 }}>
                Updates in real-time as you make changes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Oil Type Dialog */}
      <Dialog open={showOilTypeDialog} onClose={() => setShowOilTypeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingOilType ? 'Edit Oil Type' : 'Add New Oil Type'}
          <IconButton
            aria-label="close"
            onClick={() => setShowOilTypeDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Oil Type Name"
            fullWidth
            variant="outlined"
            value={oilTypeForm.name}
            onChange={(e) => setOilTypeForm({ ...oilTypeForm, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Duration (Days)"
            type="number"
            fullWidth
            variant="outlined"
            value={oilTypeForm.durationInDays}
            onChange={(e) => setOilTypeForm({ ...oilTypeForm, durationInDays: parseInt(e.target.value) || 0 })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Mileage Interval"
            type="number"
            fullWidth
            variant="outlined"
            value={oilTypeForm.mileageInterval}
            onChange={(e) => setOilTypeForm({ ...oilTypeForm, mileageInterval: parseInt(e.target.value) || 0 })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowOilTypeDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveOilType} variant="contained">
            {editingOilType ? 'Update' : 'Add'} Oil Type
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StickerSettingsContent; 