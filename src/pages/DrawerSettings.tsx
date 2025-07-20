import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Chip,
  Divider,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import Grid from '../components/CustomGrid';
import DenominationInput from '../components/CashManagement/DenominationInput';
import {
  getDrawerSettings,
  createDrawerSettings,
  updateDrawerSettings,
  deleteDrawerSettings,
  calculateTotalCash,
} from '../services/cashManagementApi';
import { useCashManagementStore, initializeDefaultDrawers } from '../stores/cashManagementStore';
import { DrawerSettings as DrawerSettingsType, DenominationCount } from '../types/cashManagement';

const DrawerSettings: React.FC = () => {
  const { 
    drawerSettings, 
    setDrawerSettings, 
    addDrawerSettings, 
    updateDrawerSettings: updateStoreSettings, 
    removeDrawerSettings 
  } = useCashManagementStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDrawer, setEditingDrawer] = useState<DrawerSettingsType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [drawerToDelete, setDrawerToDelete] = useState<DrawerSettingsType | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    isActive: true,
    totalAmount: 0,
    showDetailedCalculations: false,
    targetDenominations: {
      pennies: 50,
      nickels: 40,
      dimes: 50,
      quarters: 40,
      ones: 50,
      fives: 10,
      tens: 5,
      twenties: 3,
      hundreds: 0,
    } as DenominationCount,
  });

  // Initialize default drawers and load from API
  useEffect(() => {
    initializeDefaultDrawers();
    loadDrawerSettings();
  }, []);

  const loadDrawerSettings = async () => {
    setLoading(true);
    try {
      const settings = await getDrawerSettings();
      setDrawerSettings(settings);
    } catch (error) {
      console.error('Error loading drawer settings:', error);
      setError('Failed to load drawer settings');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (drawer?: DrawerSettingsType) => {
    if (drawer) {
      setEditingDrawer(drawer);
      setFormData({
        name: drawer.name,
        isActive: drawer.isActive,
        totalAmount: drawer.totalAmount,
        showDetailedCalculations: drawer.showDetailedCalculations,
        targetDenominations: { ...drawer.targetDenominations },
      });
    } else {
      setEditingDrawer(null);
      setFormData({
        name: '',
        isActive: true,
        totalAmount: 0,
        showDetailedCalculations: false,
        targetDenominations: {
          pennies: 50,
          nickels: 40,
          dimes: 50,
          quarters: 40,
          ones: 50,
          fives: 10,
          tens: 5,
          twenties: 3,
          hundreds: 0,
        },
      });
    }
    setDialogOpen(true);
    setError(null);
    setSuccess(false);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingDrawer(null);
  };

  const handleSaveDrawer = async () => {
    if (!formData.name.trim()) {
      setError('Drawer name is required');
      return;
    }

    // Check for duplicate names (excluding current drawer when editing)
    const duplicateName = drawerSettings.some(d => 
      d.name.toLowerCase() === formData.name.trim().toLowerCase() &&
      d.id !== editingDrawer?.id
    );
    
    if (duplicateName) {
      setError('A drawer with this name already exists');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (editingDrawer) {
        // Update existing drawer
        const updated = await updateDrawerSettings(editingDrawer.id, {
          name: formData.name.trim(),
          isActive: formData.isActive,
          totalAmount: formData.totalAmount,
          showDetailedCalculations: formData.showDetailedCalculations,
          targetDenominations: formData.targetDenominations,
        });
        updateStoreSettings(editingDrawer.id, updated);
      } else {
        // Create new drawer
        const newDrawer = await createDrawerSettings({
          id: `drawer-${Date.now()}`,
          name: formData.name.trim(),
          isActive: formData.isActive,
          totalAmount: formData.totalAmount,
          showDetailedCalculations: formData.showDetailedCalculations,
          targetDenominations: formData.targetDenominations,
        });
        addDrawerSettings(newDrawer);
      }

      setSuccess(true);
      handleCloseDialog();
      
      // Reload to ensure consistency
      await loadDrawerSettings();
      
    } catch (error) {
      console.error('Error saving drawer:', error);
      setError('Failed to save drawer settings');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDrawer = async () => {
    if (!drawerToDelete) return;

    setLoading(true);
    setError(null);

    try {
      await deleteDrawerSettings(drawerToDelete.id);
      removeDrawerSettings(drawerToDelete.id);
      setSuccess(true);
      setDeleteDialogOpen(false);
      setDrawerToDelete(null);
    } catch (error) {
      console.error('Error deleting drawer:', error);
      setError('Failed to delete drawer');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <SettingsIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
            <Typography variant="h4" component="h1">
              Drawer Settings
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            disabled={loading}
          >
            Add Drawer
          </Button>
        </Box>

        {/* Success Alert */}
        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(false)}>
            Drawer settings updated successfully!
          </Alert>
        )}

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Drawers List */}
        <Paper elevation={2}>
          <List>
            {drawerSettings.length === 0 ? (
              <ListItem>
                <ListItemText
                  primary="No drawers configured"
                  secondary="Click 'Add Drawer' to create your first drawer"
                />
              </ListItem>
            ) : (
              drawerSettings.map((drawer, index) => {
                return (
                  <React.Fragment key={drawer.id}>
                    {index > 0 && <Divider />}
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="h6">{drawer.name}</Typography>
                            <Chip 
                              label={drawer.isActive ? 'Active' : 'Inactive'} 
                              color={drawer.isActive ? 'success' : 'default'}
                              size="small"
                            />
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              Total Amount: {formatCurrency(drawer.totalAmount)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Created: {new Date(drawer.createdAt).toLocaleDateString()}
                            </Typography>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => handleOpenDialog(drawer)}
                          disabled={loading}
                          sx={{ mr: 1 }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          edge="end"
                          onClick={() => {
                            setDrawerToDelete(drawer);
                            setDeleteDialogOpen(true);
                          }}
                          disabled={loading}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  </React.Fragment>
                );
              })
            )}
          </List>
        </Paper>

        {/* Add/Edit Drawer Dialog */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingDrawer ? 'Edit Drawer' : 'Add New Drawer'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Drawer Name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    fullWidth
                    required
                    placeholder="e.g., State Inspector Drawer"
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="Total Amount"
                    type="number"
                    value={formData.totalAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, totalAmount: parseFloat(e.target.value) || 0 }))}
                    fullWidth
                    inputProps={{
                      min: 0,
                      step: 0.01,
                    }}
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                    }}
                    placeholder="0.00"
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.isActive}
                        onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                      />
                    }
                    label="Active"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.showDetailedCalculations}
                        onChange={(e) => setFormData(prev => ({ ...prev, showDetailedCalculations: e.target.checked }))}
                      />
                    }
                    label="Show Detailed Calculations (4-column breakdown in drawer count)"
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 3 }}>
                <DenominationInput
                  values={formData.targetDenominations}
                  onChange={(denominations) => 
                    setFormData(prev => ({ ...prev, targetDenominations: denominations }))
                  }
                  label="Target Denominations"
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} disabled={loading}>
              <CancelIcon sx={{ mr: 1 }} />
              Cancel
            </Button>
            <Button
              onClick={handleSaveDrawer}
              variant="contained"
              disabled={loading || !formData.name.trim()}
            >
              <SaveIcon sx={{ mr: 1 }} />
              {editingDrawer ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Drawer</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete "{drawerToDelete?.name}"? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteDrawer}
              color="error"
              variant="contained"
              disabled={loading}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default DrawerSettings; 