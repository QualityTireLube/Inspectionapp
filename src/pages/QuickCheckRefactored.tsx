import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  Tabs,
  Tab,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Popover,
  Snackbar,
  Chip,
  Grid
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { submitQuickCheck, logout } from '../services/api';
import { useQuickCheckForm } from '../hooks/useQuickCheckForm';
import { usePhotoManager } from '../hooks/usePhotoManager';
import { TabPanel } from '../components/QuickCheck/TabPanel';
import { InfoTab } from '../components/QuickCheck/tabs/InfoTab';
import { PullingIntoBayTab } from '../components/QuickCheck/tabs/PullingIntoBayTab';
import VirtualTabTimer, { VirtualTabTimerAPI } from '../components/VirtualTabTimer';
import { PhotoType } from '../types/quickCheck';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
  },
});

const tabNames = ['Info', 'Pulling Into Bay', 'Underhood', 'Tires & Brakes'];

const QuickCheckRefactored: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get user from localStorage or navigation state
  const user = localStorage.getItem('username') || 'Unknown User';
  
  // Custom hooks
  const formManager = useQuickCheckForm(user);
  const photoManager = usePhotoManager();
  
  // Local state
  const [tabValue, setTabValue] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [infoAnchorEl, setInfoAnchorEl] = useState<HTMLElement | null>(null);
  const [infoContent, setInfoContent] = useState('');
  const [isPageVisible, setIsPageVisible] = useState(true);
  
  // Refs
  const timerAPI = useRef<VirtualTabTimerAPI | null>(null);
  
  // Info popover state
  const open = Boolean(infoAnchorEl);

  // Page visibility handling
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Tab change handler
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Tab timing update handler
  const handleTabTimingUpdate = (timings: any) => {
    formManager.setForm(prev => ({
      ...prev,
      tab_timings: timings
    }));
  };

  // Tab change from timer handler
  const handleTabChangeFromTimer = (newTabIndex: number) => {
    setTabValue(newTabIndex);
  };

  // Info handlers
  const handleInfoClick = (event: React.MouseEvent<HTMLElement>, content: string) => {
    setInfoAnchorEl(event.currentTarget);
    setInfoContent(content);
  };

  const handleInfoClose = () => {
    setInfoAnchorEl(null);
  };

  // Photo upload handler
  const handlePhotoUpload = async (files: FileList | null, type: PhotoType) => {
    if (!files) return;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      await photoManager.handleImageUpload(file, type, (photoType, photos) => {
        formManager.updatePhotoField(photoType, photos);
      });
    }
  };

  // Form submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!formManager.form.vin.trim()) {
      setError('VIN is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await submitQuickCheck(
        `Quick Check - ${formManager.form.vin}`,
        formManager.form
      );
      setSuccess('Quick check submitted successfully!');
      
      // Clear form and redirect after a delay
      setTimeout(() => {
        formManager.resetForm();
        navigate('/quick-check-records');
      }, 2000);
    } catch (error) {
      console.error('Error submitting form:', error);
      setError('Failed to submit quick check. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Cancel handlers
  const handleCancel = () => {
    setShowCancelDialog(true);
  };

  const cancelCancel = () => {
    setShowCancelDialog(false);
  };

  const confirmCancel = () => {
    formManager.resetForm();
    setShowCancelDialog(false);
    navigate('/home');
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await logout();
      localStorage.removeItem('username');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="lg">
        <Box sx={{ py: 4, pb: 12 }}>
          {/* Virtual Tab Timer Component */}
          <VirtualTabTimer
            tabNames={tabNames}
            currentTabIndex={tabValue}
            initialTimings={formManager.form.tab_timings}
            onTabTimingUpdate={handleTabTimingUpdate}
            onTabChange={handleTabChangeFromTimer}
            showDebugPanel={false}
            isPageVisible={isPageVisible}
          >
            {(api) => {
              timerAPI.current = api;
              return null;
            }}
          </VirtualTabTimer>

          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" component="h1">
              Quick Check Form
            </Typography>
            <Button onClick={handleLogout} color="secondary">
              Logout
            </Button>
          </Box>

          <Paper sx={{ width: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                aria-label="quick check tabs"
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab label="Info" />
                <Tab label="Pulling Into Bay" />
                <Tab label="Underhood" />
                <Tab label="Tires & Brakes" />
              </Tabs>
            </Box>

            <form onSubmit={handleSubmit}>
              {/* Error Display */}
              {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}
              
              {/* Info Tab */}
              <TabPanel value={tabValue} index={0}>
                <InfoTab
                  form={formManager.form}
                  onChange={formManager.handleChange}
                />
              </TabPanel>
                
              {/* Pulling Into Bay Tab */}
              <TabPanel value={tabValue} index={1}>
                <PullingIntoBayTab
                  form={formManager.form}
                  onChange={formManager.handleChange}
                  onRadioChange={formManager.handleRadioChange}
                  onPhotoUpload={handlePhotoUpload}
                  onPhotoClick={photoManager.handleImageClick}
                  onInfoClick={handleInfoClick}
                />
              </TabPanel>

              {/* Underhood Tab - Placeholder */}
              <TabPanel value={tabValue} index={2}>
                <Typography>Underhood content - To be implemented</Typography>
              </TabPanel>

              {/* Tires & Brakes Tab - Placeholder */}
              <TabPanel value={tabValue} index={3}>
                <Typography>Tires & Brakes content - To be implemented</Typography>
              </TabPanel>

              {/* Form Actions */}
              <Box sx={{ p: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                >
                  {loading ? 'Submitting...' : 'Submit Quick Check'}
                </Button>
              </Box>
            </form>
          </Paper>
        </Box>

        {/* Cancel Confirmation Dialog */}
        <Dialog open={showCancelDialog} onClose={cancelCancel}>
          <DialogTitle>Cancel Quick Check?</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to cancel? All entered data will be lost.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelCancel}>No, Continue</Button>
            <Button onClick={confirmCancel} color="error" variant="contained">
              Yes, Cancel
            </Button>
          </DialogActions>
        </Dialog>

        {/* Info Popover */}
        <Popover
          open={open}
          anchorEl={infoAnchorEl}
          onClose={handleInfoClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          PaperProps={{
            sx: {
              p: 2,
              maxWidth: 300,
              bgcolor: 'background.paper',
              boxShadow: 3,
            },
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {infoContent}
          </Typography>
        </Popover>

        {/* Success Snackbar */}
        <Snackbar
          open={!!success}
          autoHideDuration={6000}
          onClose={() => setSuccess(null)}
          message={success}
        />
      </Container>
    </ThemeProvider>
  );
};

export default QuickCheckRefactored; 