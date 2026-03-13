import React from 'react';
import {
  Box,
  Alert,
  Typography,
  Chip,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';

interface LocationFormAssignmentProps {
  formType: 'QuickCheck' | 'Sticker' | 'Label';
}

const LocationFormAssignment: React.FC<LocationFormAssignmentProps> = ({ formType }) => {
  const { userLocation } = useUser();

  if (!userLocation) {
    return (
      <Box sx={{ mb: 2 }}>
        <Alert 
          severity="warning" 
          icon={<WarningIcon />}
          sx={{ 
            '& .MuiAlert-message': {
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }
          }}
        >
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              No Location Assigned
            </Typography>
            <Typography variant="body2">
              Contact your administrator to assign you to a location before creating {formType.toLowerCase()}s.
              Your {formType.toLowerCase()}s will be automatically assigned to your location.
            </Typography>
          </Box>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Alert 
        severity="info" 
        icon={<LocationIcon />}
        sx={{ 
          backgroundColor: 'primary.50',
          '& .MuiAlert-icon': { color: 'primary.main' },
          '& .MuiAlert-message': {
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2">
            This {formType.toLowerCase()} will be assigned to:
          </Typography>
          <Chip
            icon={<LocationIcon />}
            label={userLocation.name}
            color="primary"
            size="small"
            variant="filled"
          />
        </Box>
      </Alert>
    </Box>
  );
};

export default LocationFormAssignment;