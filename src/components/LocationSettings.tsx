import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  Chip,
  Tabs,
  Tab,
  Divider,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Fab,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Settings as SettingsIcon,
  LocalOffer as StickerIcon,
  Architecture as LabelIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import { Location, LocationFormData, LocationWithSettings } from '../types/locations';
import { LocationService } from '../services/locationService';
import LocationAwareStickerSettings from './LocationAwareStickerSettings';
import LabelManager from '../pages/LabelManager';
import LocationAwarePrinterSettings from './LocationAwarePrinterSettings';

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
      id={`location-detail-tabpanel-${index}`}
      aria-labelledby={`location-detail-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const LocationSettings: React.FC = () => {
  const [locations, setLocations] = useState<LocationWithSettings[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<LocationWithSettings | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);
  const [formData, setFormData] = useState<LocationFormData>({
    name: '',
    address: '',
    phone: '',
    email: '',
    enabled: true,
  });
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [detailTab, setDetailTab] = useState(0);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = () => {
    try {
      const locationsWithSettings = LocationService.getLocationsWithSettings();
      setLocations(locationsWithSettings);
      
      // If we have a selected location, refresh its data
      if (selectedLocation) {
        const refreshedLocation = locationsWithSettings.find(loc => loc.id === selectedLocation.id);
        setSelectedLocation(refreshedLocation || null);
      }
    } catch (error) {
      setError('Failed to load locations');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      phone: '',
      email: '',
      enabled: true,
    });
  };

  const handleAddLocation = () => {
    setShowAddDialog(true);
    resetForm();
  };

  const handleEditLocation = (location: Location) => {
    setFormData({
      name: location.name,
      address: location.address,
      phone: location.phone || '',
      email: location.email || '',
      enabled: location.enabled,
    });
    setShowEditDialog(true);
  };

  const handleDeleteLocation = (location: Location) => {
    setLocationToDelete(location);
    setShowDeleteDialog(true);
  };

  const handleSaveLocation = async () => {
    try {
      if (showAddDialog) {
        await LocationService.addLocation(formData);
        setSuccess('Location added successfully!');
        setShowAddDialog(false);
      } else if (showEditDialog && selectedLocation) {
        await LocationService.updateLocation(selectedLocation.id, formData);
        setSuccess('Location updated successfully!');
        setShowEditDialog(false);
      }
      loadLocations();
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to save location');
    }
  };

  const confirmDeleteLocation = async () => {
    if (!locationToDelete) return;
    
    try {
      await LocationService.deleteLocation(locationToDelete.id);
      setSuccess('Location deleted successfully!');
      
      // If deleted location was selected, clear selection
      if (selectedLocation?.id === locationToDelete.id) {
        setSelectedLocation(null);
      }
      
      loadLocations();
      setShowDeleteDialog(false);
      setLocationToDelete(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete location');
    }
  };

  const handleLocationSelect = (location: LocationWithSettings) => {
    setSelectedLocation(location);
    setDetailTab(0);
  };

  const handleSettingsChange = (settingsType: string) => {
    // Refresh location data when settings change
    loadLocations();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Location Management
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Manage your locations and their specific settings
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddLocation}
        >
          Add Location
        </Button>
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
        {/* Left Panel - Location List */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ height: 'fit-content' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6">Locations ({locations.length})</Typography>
            </Box>
            <List sx={{ maxHeight: 600, overflow: 'auto' }}>
              {locations.map((location) => (
                <ListItem key={location.id} disablePadding>
                  <ListItemButton
                    selected={selectedLocation?.id === location.id}
                    onClick={() => handleLocationSelect(location)}
                  >
                    <ListItemIcon>
                      <LocationIcon color={location.enabled ? 'primary' : 'disabled'} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {location.name}
                          {!location.enabled && (
                            <Chip label="Disabled" size="small" color="default" />
                          )}
                        </Box>
                      }
                      secondary={location.address}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditLocation(location);
                        }}
                        size="small"
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLocation(location);
                        }}
                        size="small"
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItemButton>
                </ListItem>
              ))}
              {locations.length === 0 && (
                <ListItem>
                  <ListItemText
                    primary="No locations found"
                    secondary="Click 'Add Location' to get started"
                    sx={{ textAlign: 'center' }}
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>

        {/* Right Panel - Location Details */}
        <Grid size={{ xs: 12, md: 8 }}>
          {selectedLocation ? (
            <Paper>
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h5">{selectedLocation.name}</Typography>
                  <Chip 
                    label={selectedLocation.enabled ? 'Active' : 'Disabled'} 
                    color={selectedLocation.enabled ? 'success' : 'default'}
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {selectedLocation.address}
                </Typography>
                
                {(selectedLocation.phone || selectedLocation.email) && (
                  <Box sx={{ mb: 2 }}>
                    {selectedLocation.phone && (
                      <Typography variant="body2">Phone: {selectedLocation.phone}</Typography>
                    )}
                    {selectedLocation.email && (
                      <Typography variant="body2">Email: {selectedLocation.email}</Typography>
                    )}
                  </Box>
                )}

                <Divider sx={{ my: 2 }} />

                {/* Settings Tabs */}
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tabs value={detailTab} onChange={(_, newValue) => setDetailTab(newValue)}>
                    <Tab 
                      icon={<StickerIcon />} 
                      label="Sticker Settings" 
                      iconPosition="start"
                    />
                    <Tab 
                      icon={<LabelIcon />} 
                      label="Label Management" 
                      iconPosition="start"
                    />
                    <Tab 
                      icon={<PrintIcon />} 
                      label="Printer Settings" 
                      iconPosition="start"
                    />
                  </Tabs>
                </Box>

                <TabPanel value={detailTab} index={0}>
                  <LocationAwareStickerSettings
                    locationId={selectedLocation.id}
                    locationName={selectedLocation.name}
                    onSettingsChange={() => handleSettingsChange('sticker')}
                  />
                </TabPanel>

                <TabPanel value={detailTab} index={1}>
                  <LabelManager />
                </TabPanel>

                <TabPanel value={detailTab} index={2}>
                  <LocationAwarePrinterSettings
                    locationId={selectedLocation.id}
                    locationName={selectedLocation.name}
                    onSettingsChange={() => handleSettingsChange('printer')}
                  />
                </TabPanel>
              </Box>
            </Paper>
          ) : (
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <LocationIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Select a location to view and edit its settings
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Add Location Dialog */}
      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Location</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Location Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              multiline
              rows={2}
              required
            />
            <TextField
              fullWidth
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                />
              }
              label="Enabled"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveLocation} 
            variant="contained"
            disabled={!formData.name.trim() || !formData.address.trim()}
          >
            Add Location
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Location Dialog */}
      <Dialog open={showEditDialog} onClose={() => setShowEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Location</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Location Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              multiline
              rows={2}
              required
            />
            <TextField
              fullWidth
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                />
              }
              label="Enabled"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEditDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveLocation} 
            variant="contained"
            disabled={!formData.name.trim() || !formData.address.trim()}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>Delete Location</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{locationToDelete?.name}"? 
            This will also remove all associated settings and cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button onClick={confirmDeleteLocation} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LocationSettings;