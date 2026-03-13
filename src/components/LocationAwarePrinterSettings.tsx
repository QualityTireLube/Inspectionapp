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
  CardHeader,
  Grid,
  Divider,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Save as SaveIcon,
  RestartAlt as ResetIcon,
  Print as PrintIcon,
  Computer as ComputerIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { PrinterSettings } from '../types/locations';
import { LocationService } from '../services/locationService';
import PrintClientManager from './PrintClientManager';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`print-settings-tabpanel-${index}`}
      aria-labelledby={`print-settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

interface LocationAwarePrinterSettingsProps {
  locationId: string;
  locationName: string;
  onSettingsChange?: (settings: PrinterSettings) => void;
}

const paperSizeOptions = [
  'A4',
  'Letter',
  'Legal',
  'A5',
  'A3',
  'Tabloid',
  'Custom'
];

const printMethodOptions = [
  { value: 'pdf', label: 'PDF Download' },
  { value: 'queue', label: 'Print Queue' },
  { value: 'queue-fallback', label: 'Queue with PDF Fallback' }
];

const LocationAwarePrinterSettings: React.FC<LocationAwarePrinterSettingsProps> = ({
  locationId,
  locationName,
  onSettingsChange
}) => {
  const [settings, setSettings] = useState<PrinterSettings | null>(null);
  const [editedSettings, setEditedSettings] = useState<PrinterSettings | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  useEffect(() => {
    loadSettings();
  }, [locationId]);

  const loadSettings = () => {
    try {
      let currentSettings = LocationService.getPrinterSettingsForLocation(locationId);
      
      // If no settings exist for this location, create default ones
      if (!currentSettings) {
        currentSettings = LocationService.getDefaultPrinterSettings();
        LocationService.savePrinterSettingsForLocation(locationId, currentSettings);
      }
      
      setSettings(currentSettings);
      setEditedSettings(JSON.parse(JSON.stringify(currentSettings)));
    } catch (error) {
      setError('Failed to load printer settings');
    }
  };

  const handleSaveSettings = () => {
    if (!editedSettings) return;
    
    try {
      LocationService.savePrinterSettingsForLocation(locationId, editedSettings);
      setSettings(JSON.parse(JSON.stringify(editedSettings)));
      setSuccess(`Printer settings saved for ${locationName}!`);
      
      if (onSettingsChange) {
        onSettingsChange(editedSettings);
      }
    } catch (error) {
      setError('Failed to save printer settings');
    }
  };

  const handleResetToDefaults = () => {
    if (window.confirm(`Are you sure you want to reset ${locationName} printer settings to defaults? This cannot be undone.`)) {
      try {
        const defaultSettings = LocationService.getDefaultPrinterSettings();
        LocationService.savePrinterSettingsForLocation(locationId, defaultSettings);
        loadSettings();
        setSuccess(`${locationName} printer settings reset to defaults`);
      } catch (error) {
        setError('Failed to reset printer settings');
      }
    }
  };

  const handleSettingChange = (field: keyof PrinterSettings, value: any) => {
    if (!editedSettings) return;
    
    setEditedSettings({
      ...editedSettings,
      [field]: value
    });
  };

  const handleMarginChange = (field: string, value: number) => {
    if (!editedSettings) return;
    
    setEditedSettings({
      ...editedSettings,
      margins: {
        ...editedSettings.margins!,
        [field]: value
      }
    });
  };

  const hasChanges = settings && editedSettings && JSON.stringify(settings) !== JSON.stringify(editedSettings);

  if (!settings || !editedSettings) {
    return <div>Loading printer settings...</div>;
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Print Settings for {locationName}
      </Typography>

      {/* Tabs for Print Clients and General Settings */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab 
            icon={<ComputerIcon />} 
            iconPosition="start" 
            label="Print Clients" 
          />
          <Tab 
            icon={<SettingsIcon />} 
            iconPosition="start" 
            label="Print Settings" 
          />
        </Tabs>
      </Paper>

      {/* Print Clients Tab */}
      <TabPanel value={activeTab} index={0}>
        <PrintClientManager 
          locationId={locationId}
          showLocationFilter={false}
        />
      </TabPanel>

      {/* General Print Settings Tab */}
      <TabPanel value={activeTab} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
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
          {/* General Print Settings */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader 
                title="General Print Settings" 
                avatar={<PrintIcon />}
              />
              <CardContent>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Print Method</InputLabel>
                  <Select
                    value={editedSettings.printMethod || 'pdf'}
                    label="Print Method"
                    onChange={(e) => handleSettingChange('printMethod', e.target.value)}
                  >
                    {printMethodOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Default Printer"
                  value={editedSettings.defaultPrinter || ''}
                  onChange={(e) => handleSettingChange('defaultPrinter', e.target.value)}
                  sx={{ mb: 2 }}
                  placeholder="Enter printer name or leave blank for system default"
                />

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Paper Size</InputLabel>
                  <Select
                    value={editedSettings.paperSize || 'A4'}
                    label="Paper Size"
                    onChange={(e) => handleSettingChange('paperSize', e.target.value)}
                  >
                    {paperSizeOptions.map((size) => (
                      <MenuItem key={size} value={size}>
                        {size}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Orientation</InputLabel>
                  <Select
                    value={editedSettings.orientation || 'portrait'}
                    label="Orientation"
                    onChange={(e) => handleSettingChange('orientation', e.target.value)}
                  >
                    <MenuItem value="portrait">Portrait</MenuItem>
                    <MenuItem value="landscape">Landscape</MenuItem>
                  </Select>
                </FormControl>

                <FormControlLabel
                  control={
                    <Switch
                      checked={editedSettings.autoPrint || false}
                      onChange={(e) => handleSettingChange('autoPrint', e.target.checked)}
                    />
                  }
                  label="Auto Print"
                  sx={{ mb: 2 }}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Margin Settings */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Page Margins (mm)" />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Top"
                      type="number"
                      value={editedSettings.margins?.top || 10}
                      onChange={(e) => handleMarginChange('top', parseFloat(e.target.value))}
                      inputProps={{ min: 0, step: 0.5 }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Bottom"
                      type="number"
                      value={editedSettings.margins?.bottom || 10}
                      onChange={(e) => handleMarginChange('bottom', parseFloat(e.target.value))}
                      inputProps={{ min: 0, step: 0.5 }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Left"
                      type="number"
                      value={editedSettings.margins?.left || 10}
                      onChange={(e) => handleMarginChange('left', parseFloat(e.target.value))}
                      inputProps={{ min: 0, step: 0.5 }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Right"
                      type="number"
                      value={editedSettings.margins?.right || 10}
                      onChange={(e) => handleMarginChange('right', parseFloat(e.target.value))}
                      inputProps={{ min: 0, step: 0.5 }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Printer Information */}
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Printer Information" />
              <CardContent>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Printer settings are specific to this location ({locationName}). 
                  Different locations can have different default printers and print configurations.
                </Alert>
                
                <Typography variant="body2" color="text.secondary">
                  <strong>Print Method Descriptions:</strong>
                </Typography>
                <Box sx={{ ml: 2, mt: 1 }}>
                  <Typography variant="body2" gutterBottom>
                    • <strong>PDF Download:</strong> Generate and download PDF files for manual printing
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    • <strong>Print Queue:</strong> Send directly to printer queue (requires print client)
                  </Typography>
                  <Typography variant="body2">
                    • <strong>Queue with PDF Fallback:</strong> Try print queue first, fallback to PDF if unavailable
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
};

export default LocationAwarePrinterSettings;