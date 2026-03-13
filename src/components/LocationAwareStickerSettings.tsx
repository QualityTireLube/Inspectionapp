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
  Alert,
  Card,
  CardContent,
  Grid,
  Slider,
} from '@mui/material';
import {
  Save as SaveIcon,
  RestartAlt as ResetIcon,
} from '@mui/icons-material';
import StickerPreview from './StickerPreview';
import ElementEditor from './ElementEditor';
import { StickerSettings, OilType, PaperSize, LayoutSettings, StickerElement } from '../types/stickers';
import { StickerStorageService } from '../services/stickerStorage';
import { LocationService } from '../services/locationService';

interface LocationAwareStickerSettingsProps {
  locationId: string;
  locationName: string;
  onSettingsChange?: (settings: StickerSettings) => void;
}

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

const LocationAwareStickerSettings: React.FC<LocationAwareStickerSettingsProps> = ({
  locationId,
  locationName,
  onSettingsChange
}) => {
  const [settings, setSettings] = useState<StickerSettings | null>(null);
  const [editedSettings, setEditedSettings] = useState<StickerSettings | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    loadSettings();
  }, [locationId]);

  const loadSettings = () => {
    try {
      let currentSettings = LocationService.getStickerSettingsForLocation(locationId);
      
      // If no settings exist for this location, create default ones
      if (!currentSettings) {
        currentSettings = StickerStorageService.getSettings();
        // Customize for location
        const customized = JSON.parse(JSON.stringify(currentSettings));
        customized.layout.elements = customized.layout.elements.map((element: any) => {
          if (element.id === 'companyName') {
            return { ...element, content: locationName };
          }
          return element;
        });
        currentSettings = customized;
        LocationService.saveStickerSettingsForLocation(locationId, currentSettings);
      }
      
      setSettings(currentSettings);
      setEditedSettings(JSON.parse(JSON.stringify(currentSettings)));
    } catch (error) {
      setError('Failed to load sticker settings');
    }
  };

  const handleSaveSettings = () => {
    if (!editedSettings) return;
    
    try {
      LocationService.saveStickerSettingsForLocation(locationId, editedSettings);
      setSettings(JSON.parse(JSON.stringify(editedSettings)));
      setSuccess(`Sticker settings saved for ${locationName}!`);
      
      if (onSettingsChange) {
        onSettingsChange(editedSettings);
      }
    } catch (error) {
      setError('Failed to save sticker settings');
    }
  };

  const handleResetToDefaults = () => {
    if (window.confirm(`Are you sure you want to reset ${locationName} sticker settings to defaults? This cannot be undone.`)) {
      try {
        const defaultSettings = StickerStorageService.getSettings();
        // Customize for location
        const customized = JSON.parse(JSON.stringify(defaultSettings));
        customized.layout.elements = customized.layout.elements.map((element: any) => {
          if (element.id === 'companyName') {
            return { ...element, content: locationName };
          }
          return element;
        });
        
        LocationService.saveStickerSettingsForLocation(locationId, customized);
        loadSettings();
        setSuccess(`${locationName} sticker settings reset to defaults`);
      } catch (error) {
        setError('Failed to reset sticker settings');
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

  const handleElementChange = (elementId: string, updates: Partial<StickerElement>) => {
    if (!editedSettings) return;
    
    const updatedElements = editedSettings.layout.elements.map(element =>
      element.id === elementId ? { ...element, ...updates } : element
    );
    
    setEditedSettings({
      ...editedSettings,
      layout: {
        ...editedSettings.layout,
        elements: updatedElements
      }
    });
  };

  const hasChanges = settings && editedSettings && JSON.stringify(settings) !== JSON.stringify(editedSettings);

  if (!settings || !editedSettings) {
    return <div>Loading sticker settings...</div>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Sticker Settings for {locationName}
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
            disabled={!hasChanges}
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
        {/* Left Column - Settings */}
        <Grid size={{ xs: 12, lg: 6 }}>
          {/* Paper Size Settings */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Paper Size
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Paper Size</InputLabel>
              <Select
                value={paperSizes.findIndex(p => p.name === editedSettings.paperSize.name)}
                label="Paper Size"
                onChange={(e) => handlePaperSizeChange(paperSizes[e.target.value as number])}
              >
                {paperSizes.map((size, idx) => (
                  <MenuItem key={idx} value={idx}>
                    {size.name} ({size.width}mm x {size.height}mm)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {editedSettings.paperSize.name === 'Custom' && (
              <Grid container spacing={2}>
                <Grid size={6}>
                  <TextField
                    fullWidth
                    label="Width (mm)"
                    type="number"
                    value={editedSettings.paperSize.width}
                    onChange={(e) => handlePaperSizeChange({
                      ...editedSettings.paperSize,
                      width: parseFloat(e.target.value)
                    })}
                  />
                </Grid>
                <Grid size={6}>
                  <TextField
                    fullWidth
                    label="Height (mm)"
                    type="number"
                    value={editedSettings.paperSize.height}
                    onChange={(e) => handlePaperSizeChange({
                      ...editedSettings.paperSize,
                      height: parseFloat(e.target.value)
                    })}
                  />
                </Grid>
              </Grid>
            )}
          </Paper>

          {/* Layout Settings */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Layout Settings
            </Typography>
            
            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField
                  fullWidth
                  label="Base Font Size"
                  type="number"
                  value={editedSettings.layout.fontSize}
                  onChange={(e) => handleLayoutChange('fontSize', parseInt(e.target.value))}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid size={6}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Font Family</InputLabel>
                  <Select
                    value={editedSettings.layout.fontFamily}
                    label="Font Family"
                    onChange={(e) => handleLayoutChange('fontFamily', e.target.value)}
                  >
                    {fontOptions.map(font => (
                      <MenuItem key={font} value={font}>{font}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <FormControlLabel
              control={
                <Switch
                  checked={editedSettings.layout.includeLogo}
                  onChange={(e) => handleLayoutChange('includeLogo', e.target.checked)}
                />
              }
              label="Include Logo"
              sx={{ mb: 2 }}
            />

            <Typography variant="subtitle2" gutterBottom>
              QR Code Size: {editedSettings.layout.qrCodeSize}
            </Typography>
            <Slider
              value={editedSettings.layout.qrCodeSize}
              onChange={(_, value) => handleLayoutChange('qrCodeSize', value)}
              min={5}
              max={30}
              step={1}
              marks
              sx={{ mb: 2 }}
            />

            <Typography variant="subtitle2" gutterBottom>
              Margins
            </Typography>
            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField
                  fullWidth
                  label="Top"
                  type="number"
                  value={editedSettings.layout.margins.top}
                  onChange={(e) => handleMarginChange('top', parseFloat(e.target.value))}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  fullWidth
                  label="Bottom"
                  type="number"
                  value={editedSettings.layout.margins.bottom}
                  onChange={(e) => handleMarginChange('bottom', parseFloat(e.target.value))}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  fullWidth
                  label="Left"
                  type="number"
                  value={editedSettings.layout.margins.left}
                  onChange={(e) => handleMarginChange('left', parseFloat(e.target.value))}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  fullWidth
                  label="Right"
                  type="number"
                  value={editedSettings.layout.margins.right}
                  onChange={(e) => handleMarginChange('right', parseFloat(e.target.value))}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Text Elements */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Text Elements
            </Typography>
            
            {editedSettings.layout.elements.map((element) => (
              <Card key={element.id} sx={{ mb: 2 }}>
                <CardContent>
                  <ElementEditor
                    element={element}
                    onChange={(updates) => handleElementChange(element.id, updates)}
                    settings={editedSettings}
                  />
                </CardContent>
              </Card>
            ))}
          </Paper>
        </Grid>

        {/* Right Column - Preview */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
            <Typography variant="h6" gutterBottom>
              Live Preview - {locationName}
            </Typography>
            <Box sx={{ 
              border: '1px solid #ccc', 
              borderRadius: 1, 
              p: 2, 
              backgroundColor: '#f9f9f9',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 400
            }}>
              <StickerPreview
                settings={editedSettings}
                sampleData={{
                  id: 'preview',
                  dateCreated: new Date().toISOString(),
                  vin: 'SAMPLE123456789',
                  decodedDetails: {
                    make: 'Toyota',
                    model: 'Camry',
                    year: '2020'
                  },
                  date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString(),
                  oilType: { id: '1', name: 'Conventional Oil', durationInDays: 90, mileageInterval: 3000 },
                  mileage: 45000,
                  companyName: locationName,
                  address: editedSettings.layout.elements.find(e => e.id === 'address')?.content || '',
                  message: 'THANK YOU',
                  qrCode: 'sample-qr-code',
                  printed: false,
                  lastUpdated: new Date().toISOString(),
                  archived: false
                }}
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LocationAwareStickerSettings;