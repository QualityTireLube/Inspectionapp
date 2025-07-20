import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Switch,
  FormControlLabel,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardHeader
} from '@mui/material';
import Grid from './CustomGrid';
import SaveIcon from '@mui/icons-material/Save';
import RestoreIcon from '@mui/icons-material/Restore';

interface SettingsData {
  autoSaveEnabled: boolean;
  autoSaveInterval: number;
  showSaveNotifications: boolean;
  enableDraftManagement: boolean;
  enableReviewMode: boolean;
  enableHistoryView: boolean;
  mobileViewEnabled: boolean;
  showDebugTimerPanel: boolean;
}

const GeneralSettings: React.FC = () => {
  const userRole = localStorage.getItem('userRole') || '';
  
  const [settings, setSettings] = useState<SettingsData>({
    autoSaveEnabled: false,
    autoSaveInterval: 30,
    showSaveNotifications: true,
    enableDraftManagement: true,
    enableReviewMode: true,
    enableHistoryView: true,
    mobileViewEnabled: userRole === 'Technician', // Default to true for Technicians
    showDebugTimerPanel: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('quickCheckSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsedSettings }));
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, []);

  const handleSettingChange = (setting: keyof SettingsData, value: boolean | number) => {
    setSettings(prev => ({ ...prev, [setting]: value }));
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Save settings to localStorage
      localStorage.setItem('quickCheckSettings', JSON.stringify(settings));
      
      // Dispatch custom event for same-tab updates
      window.dispatchEvent(new CustomEvent('quickCheckSettingsChanged', {
        detail: settings
      }));
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess('Settings saved successfully!');
    } catch (err) {
      setError('Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSettings = () => {
    const defaultSettings: SettingsData = {
      autoSaveEnabled: false,
      autoSaveInterval: 30,
      showSaveNotifications: true,
      enableDraftManagement: true,
      enableReviewMode: true,
      enableHistoryView: true,
      mobileViewEnabled: userRole === 'Technician',
      showDebugTimerPanel: false,
    };
    setSettings(defaultSettings);
    localStorage.removeItem('quickCheckSettings');
    
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('quickCheckSettingsChanged', {
      detail: defaultSettings
    }));
    
    setSuccess('Settings reset to defaults!');
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        General Settings
      </Typography>

      <Grid container spacing={4}>
        {/* Auto-Save Settings */}
        <Grid columns={{ xs: 12, md: 6 }}>
          <Card elevation={3}>
            <CardHeader 
              title="Auto-Save Settings" 
              subheader="Configure automatic saving behavior"
            />
            <CardContent>
              <Stack spacing={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.autoSaveEnabled}
                      onChange={(e) => handleSettingChange('autoSaveEnabled', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Enable Auto-Save"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.showSaveNotifications}
                      onChange={(e) => handleSettingChange('showSaveNotifications', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Show Save Notifications"
                />
                
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Auto-Save Interval: {settings.autoSaveInterval} seconds
                  </Typography>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    value={settings.autoSaveInterval}
                    onChange={(e) => handleSettingChange('autoSaveInterval', parseInt(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Feature Settings */}
        <Grid columns={{ xs: 12, md: 6 }}>
          <Card elevation={3}>
            <CardHeader 
              title="Feature Settings" 
              subheader="Enable or disable specific features"
            />
            <CardContent>
              <Stack spacing={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enableDraftManagement}
                      onChange={(e) => handleSettingChange('enableDraftManagement', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Draft Management"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enableReviewMode}
                      onChange={(e) => handleSettingChange('enableReviewMode', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Review Mode"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enableHistoryView}
                      onChange={(e) => handleSettingChange('enableHistoryView', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="History View"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.mobileViewEnabled}
                      onChange={(e) => handleSettingChange('mobileViewEnabled', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Mobile View (Bottom Navigation)"
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', ml: 4 }}>
                  Enable bottom navigation menu optimized for mobile devices
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.showDebugTimerPanel}
                      onChange={(e) => handleSettingChange('showDebugTimerPanel', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Show Debug Timer Panel"
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', ml: 4 }}>
                  Display timing debug information in Quick Check forms
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Actions */}
        <Grid columns={{ xs: 12 }}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Actions
            </Typography>
            
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}

            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                onClick={handleSaveSettings}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<RestoreIcon />}
                onClick={handleResetSettings}
                disabled={loading}
              >
                Reset to Defaults
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default GeneralSettings; 