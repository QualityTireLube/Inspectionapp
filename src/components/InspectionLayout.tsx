import React, { useState } from 'react';
import { Box, Paper, Tabs, Tab, Typography, Stack, LinearProgress, CircularProgress, IconButton, Popover, Divider } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import TimerIcon from '@mui/icons-material/Timer';

export interface InspectionLayoutProps {
  title: string;
  tabNames: string[];
  currentTab: number;
  onChangeTab: (i: number) => void;
  loading?: boolean;
  onOpenHistory?: () => void; // unused now (icons removed)
  onSave?: () => void; // unused now (icons removed)
  children: React.ReactNode;
  draftStatus?: 'idle' | 'loading' | 'creating' | 'updating' | 'error';
  lastSave?: Date | null;
  draftError?: string | null;
  showBottomNav?: boolean;
  disablePrev?: boolean;
  disableNext?: boolean;
  isLastTab?: boolean;
  onPrev?: () => void;
  onCancel?: () => void;
  onNext?: () => void;
  onSaveBottom?: () => void;
  saveLoading?: boolean;
  // Timer functionality
  onShowTiming?: () => void;
  currentTabDuration?: number;
  totalDuration?: number;
  tabTimings?: { [key: string]: number };
}

const InspectionLayout: React.FC<InspectionLayoutProps> = ({
  title,
  tabNames,
  currentTab,
  onChangeTab,
  loading = false,
  children,
  draftStatus,
  lastSave,
  draftError,
  showBottomNav = false,
  disablePrev = false,
  disableNext = false,
  isLastTab = false,
  onPrev,
  onCancel,
  onNext,
  onSaveBottom,
  saveLoading = false,
  onShowTiming,
  currentTabDuration,
  totalDuration,
  tabTimings
}) => {
  const [timerAnchorEl, setTimerAnchorEl] = useState<HTMLElement | null>(null);
  const timerPopoverOpen = Boolean(timerAnchorEl);

  const handleTimerClick = (event: React.MouseEvent<HTMLElement>) => {
    setTimerAnchorEl(event.currentTarget);
  };

  const handleTimerClose = () => {
    setTimerAnchorEl(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const getTabDisplayName = (tabName: string) => {
    const displayNames: { [key: string]: string } = {
      'info': 'Info',
      'pulling': 'Pulling Into Bay',
      'underhood': 'Under Hood',
      'tires': 'Tires & Brakes'
    };
    return displayNames[tabName] || tabName.charAt(0).toUpperCase() + tabName.slice(1);
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Sticky blue top bar (Quick Check style) */}
      <Box sx={{ backgroundColor: '#024FFF', color: 'white', py: { xs: 1.5, sm: 2 }, px: { xs: 1.5, sm: 3 }, position: 'sticky', top: 0, zIndex: 1000, boxShadow: 2, mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 0.5 }}>
          <Typography variant="h6" component="h1">{title}</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            {/* Timer icon - click to show timing details dropdown */}
            {(totalDuration !== undefined || currentTabDuration !== undefined) && (
              <IconButton
                onClick={handleTimerClick}
                sx={{ 
                  color: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
                  width: 36,
                  height: 36
                }}
                size="small"
              >
                <TimerIcon fontSize="small" />
              </IconButton>
            )}
            {/* Draft autosave indicators */}
            {draftStatus === 'loading' && (
              <>
                <Box sx={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CircularProgress size={16} sx={{ color: 'white' }} />
                </Box>
                <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Loading...</Typography>
              </>
            )}
            {draftStatus === 'creating' && (
              <>
                <Box sx={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CircularProgress size={16} sx={{ color: 'white' }} />
                </Box>
                <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Creating...</Typography>
              </>
            )}
            {draftStatus === 'updating' && lastSave && (
              <>
                <Box sx={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CircularProgress size={16} sx={{ color: 'white' }} />
                </Box>
                <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Saved</Typography>
                <Typography variant="body2" sx={{ fontSize: '0.75rem', opacity: 0.8 }}>
                  {lastSave.toLocaleTimeString()}
                </Typography>
              </>
            )}
            {draftStatus === 'updating' && !lastSave && (
              <>
                <Box sx={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CircularProgress size={16} sx={{ color: 'white' }} />
                </Box>
                <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Saving...</Typography>
              </>
            )}
            {draftStatus === 'idle' && lastSave && !draftError && (
              <>
                <Box sx={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircleIcon sx={{ fontSize: 16, color: 'success.light' }} />
                </Box>
                <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Saved</Typography>
                <Typography variant="body2" sx={{ fontSize: '0.75rem', opacity: 0.8 }}>
                  {lastSave.toLocaleTimeString()}
                </Typography>
              </>
            )}
            {draftError && (
              <>
                <Box sx={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CancelIcon sx={{ fontSize: 16, color: 'error.light' }} />
                </Box>
                <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Save Error</Typography>
              </>
            )}
            {/* History/Save icons removed (autosave enabled) */}
          </Stack>
        </Box>
      </Box>

      {/* Loading indicator */}
      {loading && <LinearProgress sx={{ mb: 1 }} />}

      {/* Tabs */}
      <Paper sx={{ width: '100%', pb: showBottomNav ? 8 : 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={(_e, i) => onChangeTab(i)} variant="scrollable" scrollButtons="auto">
            {tabNames.map((name, idx) => (
              <Tab key={idx} label={name} />
            ))}
          </Tabs>
        </Box>

        {children}
      </Paper>

      {showBottomNav && (
        <Box
          sx={{
            position: 'fixed',
            left: 0,
            bottom: 0,
            width: '100%',
            zIndex: 1200,
            bgcolor: 'background.paper',
            borderTop: 1,
            borderColor: 'divider',
            boxShadow: 3,
            display: 'flex',
            justifyContent: 'center',
            pb: 'env(safe-area-inset-bottom, 10px)'
          }}
        >
          <Box sx={{ width: '100%', maxWidth: 1200, display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%', p: 1.5 }}>
            <Box component="button" onClick={onPrev} disabled={disablePrev} style={{ background: 'none', border: 'none', color: disablePrev ? '#999' : 'black', cursor: disablePrev ? 'default' : 'pointer', fontSize: '16px', fontWeight: '500' }}>Prev</Box>
            <Box>
              <Box component="button" onClick={onCancel} style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer', fontSize: '16px', fontWeight: '500' }}>Cancel</Box>
            </Box>
            {isLastTab ? (
              <Box component="button" onClick={onSaveBottom} style={{ background: 'none', border: 'none', color: '#1042D8', cursor: saveLoading ? 'default' : 'pointer', fontSize: '16px', fontWeight: '500' }}>
                {saveLoading ? 'Submitting…' : 'Save'}
              </Box>
            ) : (
              <Box component="button" onClick={onNext} disabled={disableNext} style={{ background: 'none', border: 'none', color: '#1042D8', cursor: disableNext ? 'default' : 'pointer', fontSize: '16px', fontWeight: '500' }}>Next</Box>
            )}
          </Box>
        </Box>
      )}

      {/* Timer Details Popover */}
      <Popover
        open={timerPopoverOpen}
        anchorEl={timerAnchorEl}
        onClose={handleTimerClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        sx={{ mt: 1 }}
      >
        <Box sx={{ p: 2, minWidth: 250 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
            Timing Details
          </Typography>
          
          {/* Current Tab Time */}
          <Box sx={{ mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Current Tab ({getTabDisplayName(tabNames[currentTab] || '')}):
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              {formatTime(currentTabDuration || 0)}
            </Typography>
          </Box>

          <Divider sx={{ my: 1 }} />

          {/* Individual Tab Times */}
          {tabTimings && Object.keys(tabTimings).length > 0 && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Tab Breakdown:
              </Typography>
              {Object.entries(tabTimings).map(([tabName, duration]) => (
                <Box key={tabName} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.25 }}>
                  <Typography variant="body2">
                    {getTabDisplayName(tabName)}:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {formatTime(duration)}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          <Divider sx={{ my: 1 }} />

          {/* Total Time */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Total Time:
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'success.main' }}>
              {formatTime(totalDuration || 0)}
            </Typography>
          </Box>

          {/* Action button to show full timing dialog if available */}
          {onShowTiming && (
            <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography
                variant="body2"
                sx={{ 
                  color: 'primary.main', 
                  cursor: 'pointer', 
                  textAlign: 'center',
                  '&:hover': { textDecoration: 'underline' }
                }}
                onClick={() => {
                  handleTimerClose();
                  onShowTiming();
                }}
              >
                View Full Timing Report
              </Typography>
            </Box>
          )}
        </Box>
      </Popover>
    </Box>
  );
};

export default InspectionLayout;


