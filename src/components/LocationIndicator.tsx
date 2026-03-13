import React, { useState } from 'react';
import {
  Box,
  Chip,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  ExpandMore as ExpandIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';
import { LocationService } from '../services/locationService';
import { Location } from '../types/locations';

interface LocationIndicatorProps {
  selectedLocation?: Location | null;
  onLocationChange?: (location: Location | null) => void;
}

const LocationIndicator: React.FC<LocationIndicatorProps> = ({ 
  selectedLocation, 
  onLocationChange 
}) => {
  const { user, userLocation } = useUser();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  
  const isAdmin = user?.role === 'Admin';
  const displayLocation = selectedLocation || userLocation;
  const availableLocations = LocationService.getLocations().filter(loc => loc.enabled);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    if (isAdmin) {
      setMenuAnchor(event.currentTarget);
    }
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleLocationSelect = (location: Location | null) => {
    onLocationChange?.(location);
    handleMenuClose();
  };

  // Show warning if no location assigned and not admin
  if (!displayLocation && !isAdmin) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          icon={<LocationIcon />}
          label="No location assigned"
          color="warning"
          variant="outlined"
          size="small"
        />
        <Typography variant="caption" color="text.secondary">
          Contact admin to assign location
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Chip
        icon={isAdmin ? <AdminIcon /> : <LocationIcon />}
        label={displayLocation ? displayLocation.name : 'All Locations'}
        color={selectedLocation ? 'secondary' : 'primary'}
        variant="filled"
        size="small"
        onClick={isAdmin ? handleMenuOpen : undefined}
        deleteIcon={isAdmin ? <ExpandIcon /> : undefined}
        onDelete={isAdmin ? handleMenuOpen : undefined}
        sx={{ 
          cursor: isAdmin ? 'pointer' : 'default',
          '& .MuiChip-deleteIcon': {
            fontSize: '16px',
            ml: 0.5
          }
        }}
      />


      {/* Admin location selection menu */}
      {isAdmin && (
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
        >
          {/* All Locations option */}
          <MenuItem 
            onClick={() => handleLocationSelect(null)}
            selected={!selectedLocation}
          >
            <ListItemIcon>
              <AdminIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="All Locations"
              secondary="View data from all locations"
            />
          </MenuItem>
          
          {/* Divider */}
          <Box sx={{ borderTop: 1, borderColor: 'divider', my: 1 }} />
          
          {/* Show user's assigned location */}
          {userLocation && (
            <MenuItem 
              onClick={() => handleLocationSelect(userLocation)}
              selected={selectedLocation?.id === userLocation.id}
            >
              <ListItemIcon>
                <LocationIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary={userLocation.name}
                secondary="Your assigned location"
              />
            </MenuItem>
          )}
          
          {/* Show other available locations */}
          {availableLocations
            .filter(loc => loc.id !== userLocation?.id)
            .map((location) => (
              <MenuItem 
                key={location.id}
                onClick={() => handleLocationSelect(location)}
                selected={selectedLocation?.id === location.id}
              >
                <ListItemIcon>
                  <LocationIcon color="action" />
                </ListItemIcon>
                <ListItemText 
                  primary={location.name}
                  secondary={location.address}
                />
              </MenuItem>
            ))}
        </Menu>
      )}
    </Box>
  );
};

export default LocationIndicator;