import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Modal,
  Button,
  Stack,
  useTheme,
  useMediaQuery,
  Tooltip,
  IconButton,
  Chip,
} from '@mui/material';

interface TPMSLayoutProps {
  tpmsStatuses: {
    driver_front: boolean | null;
    passenger_front: boolean | null;
    driver_rear_outer: boolean | null;
    driver_rear_inner: boolean | null;
    passenger_rear_inner: boolean | null;
    passenger_rear_outer: boolean | null;
    spare: boolean | null;
  };
  tpmsSensorTypes?: {
    driver_front: string;
    passenger_front: string;
    driver_rear_outer: string;
    driver_rear_inner: string;
    passenger_rear_inner: string;
    passenger_rear_outer: string;
    spare: string;
  };
  onTPMSStatusChange: (position: string, status: boolean | null) => void;
  onTPMSSensorTypeChange?: (position: string, sensorType: string) => void;
  // Dually state management
  showDually?: boolean;
  onDuallyToggle?: (show: boolean) => void;
  // Read-only mode for detail view
  readOnly?: boolean;
}

const TPMSLayout: React.FC<TPMSLayoutProps> = ({
  tpmsStatuses,
  tpmsSensorTypes,
  onTPMSStatusChange,
  onTPMSSensorTypeChange,
  showDually = false,
  onDuallyToggle,
  readOnly = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [modalOpen, setModalOpen] = useState(false);
  const [sensorTypeModalOpen, setSensorTypeModalOpen] = useState(false);
  const [selectedTire, setSelectedTire] = useState<string | null>(null);

  const handleTireClick = (event: React.MouseEvent<HTMLElement>, tire: string) => {
    if (readOnly) return; // Don't open popup in read-only mode
    setSelectedTire(tire);
    setModalOpen(true);
  };

  const handleClose = () => {
    setModalOpen(false);
    setSelectedTire(null);
  };

  const handleStatusSelect = (status: boolean | null) => {
    if (selectedTire) {
      onTPMSStatusChange(selectedTire, status);
      
      // If Bad Sensor is selected, show sensor type selection modal
      if (status === true && onTPMSSensorTypeChange) {
        setModalOpen(false);
        setSensorTypeModalOpen(true);
        return;
      }
    }
    handleClose();
  };

  const handleSensorTypeSelect = (sensorType: string) => {
    if (selectedTire && onTPMSSensorTypeChange) {
      onTPMSSensorTypeChange(selectedTire, sensorType);
    }
    setSensorTypeModalOpen(false);
    setSelectedTire(null);
  };

  const handleSensorTypeClose = () => {
    setSensorTypeModalOpen(false);
    setSelectedTire(null);
  };

  const getTireColor = (status: boolean | null) => {
    switch (status) {
      case true:
        return theme.palette.error.main;
      default:
        return theme.palette.grey[400];
    }
  };

  const getTirePositionName = (position: string): string => {
    const positionNames: { [key: string]: string } = {
      'driver_front': 'Driver Front',
      'passenger_front': 'Passenger Front',
      'driver_rear_outer': 'Driver Rear Outer',
      'driver_rear_inner': 'Driver Rear Inner',
      'passenger_rear_inner': 'Passenger Rear Inner',
      'passenger_rear_outer': 'Passenger Rear Outer',
      'spare': 'Spare'
    };
    return positionNames[position] || position.replace('_', ' ').toUpperCase();
  };

  const getTireIcon = (position: string, status: boolean | null) => {
    const sensorType = tpmsSensorTypes?.[position as keyof typeof tpmsSensorTypes];
    
    if (sensorType === 'metal') {
      return (
        <img 
          src="/tpms-metal-sensor.svg" 
          alt="Metal TPMS Sensor"
          style={{ 
            width: isMobile ? '24px' : '32px', 
            height: isMobile ? '24px' : '32px',
            filter: status === true ? 'brightness(0.3)' : 'brightness(1)'
          }}
        />
      );
    } else if (sensorType === 'rubber') {
      return (
        <img 
          src="/tpms-rubber-sensor.svg" 
          alt="Rubber TPMS Sensor"
          style={{ 
            width: isMobile ? '24px' : '32px', 
            height: isMobile ? '24px' : '32px',
            filter: status === true ? 'brightness(0.3)' : 'brightness(1)'
          }}
        />
      );
    }
    
    // Fallback to emoji if no sensor type is specified
    return '🛞';
  };

  const TireButton = ({ position, label }: { position: string; label: string }) => (
    <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Tooltip title={readOnly ? `${label} - Read Only` : `${label} - Click to mark as bad sensor`}>
        <Button
          onClick={(e) => handleTireClick(e, position)}
          disabled={readOnly}
          sx={{
            minWidth: isMobile ? 48 : 64,
            height: isMobile ? 48 : 64,
            borderRadius: '50%',
            p: 0,
            bgcolor: getTireColor(tpmsStatuses[position as keyof typeof tpmsStatuses]),
            '&:hover': {
              bgcolor: getTireColor(tpmsStatuses[position as keyof typeof tpmsStatuses]),
              opacity: readOnly ? 1 : 0.8,
            },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isMobile ? '1.5rem' : '2rem',
            color: 'white',
            transition: 'all 0.2s ease-in-out',
            '&:active': {
              transform: readOnly ? 'none' : 'scale(0.95)',
            },
            '& svg': {
              width: isMobile ? '24px' : '32px',
              height: isMobile ? '24px' : '32px',
            },
            cursor: readOnly ? 'default' : 'pointer',
          }}
        >
          {getTireIcon(position, tpmsStatuses[position as keyof typeof tpmsStatuses])}
        </Button>
      </Tooltip>
      <Typography
        variant="caption"
        sx={{
          mt: 0.5,
          color: 'text.secondary',
          fontSize: isMobile ? '0.7rem' : '0.75rem',
          fontWeight: 500,
        }}
      >
        {label}
      </Typography>
    </Box>
  );

  const handleDuallyToggle = () => {
    if (onDuallyToggle) {
      onDuallyToggle(!showDually);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        bgcolor: 'background.default',
        borderRadius: 2,
      }}
    >
      {/* Dually Toggle Chip */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <Chip
          label="Dually"
          color={showDually ? 'primary' : 'default'}
          variant={showDually ? 'filled' : 'outlined'}
          clickable
          onClick={handleDuallyToggle}
          sx={{
            fontWeight: showDually ? 'bold' : 'normal',
            '&:hover': {
              transform: 'scale(1.05)',
            },
            transition: 'all 0.2s ease-in-out',
          }}
        />
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
        }}
      >
        {/* Front Tires */}
        <Box 
          sx={{ 
            display: 'flex', 
            gap: 4,
            justifyContent: 'center',
            width: '100%',
          }}
        >
          <TireButton position="driver_front" label="DF" />
          <TireButton position="passenger_front" label="PF" />
        </Box>

        {/* Rear Tires */}
        <Box 
          sx={{ 
            display: 'flex', 
            gap: 2,
            justifyContent: 'center',
            width: '100%',
            position: 'relative',
          }}
        >
          <TireButton position="driver_rear_outer" label="DR" />
          {showDually && <TireButton position="driver_rear_inner" label="DRI" />}
          {showDually && <TireButton position="passenger_rear_inner" label="PRI" />}
          <TireButton position="passenger_rear_outer" label="PR" />
        </Box>

        {/* Spare Tire */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 0.5 }}>
          <TireButton position="spare" label="Spare" />
        </Box>
      </Box>

      <Modal
        open={modalOpen}
        onClose={handleClose}
        aria-labelledby="tpms-modal"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper
          sx={{
            p: 2,
            maxWidth: 400,
            width: '90%',
            mx: 2,
          }}
        >
          <Typography variant="h6" gutterBottom align="center">
            {getTirePositionName(selectedTire || '')} Status
          </Typography>
          <Stack direction="row" spacing={2} sx={{ mt: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="error"
              onClick={() => handleStatusSelect(true)}
              startIcon={<span>❌</span>}
              size="large"
              sx={{ fontSize: '0.875rem' }}
            >
              Bad Sensor
            </Button>
            <Button
              variant="outlined"
              onClick={() => handleStatusSelect(null)}
              startIcon={<span>⚪</span>}
              size="large"
              sx={{ fontSize: '0.875rem' }}
            >
              Clear
            </Button>
          </Stack>
        </Paper>
      </Modal>

      {/* Sensor Type Selection Modal */}
      <Modal
        open={sensorTypeModalOpen}
        onClose={handleSensorTypeClose}
        aria-labelledby="sensor-type-modal"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper
          sx={{
            p: 2,
            maxWidth: 400,
            width: '90%',
            mx: 2,
          }}
        >
          <Typography variant="h6" gutterBottom align="center">
            {getTirePositionName(selectedTire || '')} Sensor Type
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
            Select the sensor type for this tire position
          </Typography>
          <Stack direction="row" spacing={2} sx={{ mt: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleSensorTypeSelect('metal')}
              startIcon={<img src="/tpms-metal-sensor.svg" alt="Metal" style={{ width: '20px', height: '20px' }} />}
              size="large"
              sx={{ fontSize: '0.875rem' }}
            >
              Metal
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleSensorTypeSelect('rubber')}
              startIcon={<img src="/tpms-rubber-sensor.svg" alt="Rubber" style={{ width: '20px', height: '20px' }} />}
              size="large"
              sx={{ fontSize: '0.875rem' }}
            >
              Rubber
            </Button>
          </Stack>
        </Paper>
      </Modal>
    </Paper>
  );
};

export default TPMSLayout; 