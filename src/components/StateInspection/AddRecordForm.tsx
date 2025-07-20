import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Autocomplete,
  Chip,
  FormLabel,
} from '@mui/material';
import Grid from '../CustomGrid';
import {
  CloudUpload as CloudUploadIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { CreateStateInspectionFormData, FleetAccount } from '../../types/stateInspection';
import { 
  createStateInspectionRecord, 
  createFleetAccount,
  updateFleetAccount,
  deleteFleetAccount 
} from '../../services/stateInspectionApi';
import { useStateInspectionStore } from '../../stores/stateInspectionStore';
import { lookupUserByPin, getUserProfile } from '../../services/api';

interface AddRecordFormProps {
  onRecordCreated: () => void;
  fleetAccounts: FleetAccount[];
}

interface FleetAccountFormData {
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  notes: string;
}

const AddRecordForm: React.FC<AddRecordFormProps> = ({ onRecordCreated, fleetAccounts }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fleetDialogOpen, setFleetDialogOpen] = useState(false);
  const [selectedFleetForEdit, setSelectedFleetForEdit] = useState<FleetAccount | null>(null);
  const [tintAffidavitFile, setTintAffidavitFile] = useState<File | null>(null);
  
  // PIN-related state
  const [pin, setPin] = useState('');
  const [pinUser, setPinUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState<string>('');
  const { addRecord, addFleetAccount, updateFleetAccount: updateStoreFleetAccount, removeFleetAccount } = useStateInspectionStore();

  const effectiveUserName = pinUser?.name || '';



  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors }
  } = useForm<CreateStateInspectionFormData>({
    defaultValues: {
      createdBy: '',
      createdDate: '',
      stickerNumber: '',
      lastName: '',
      paymentType: undefined,
      paymentAmount: undefined,
      status: undefined,
      fleetAccount: '',
      notes: '',
    }
  });

  const {
    control: fleetControl,
    handleSubmit: handleFleetSubmit,
    reset: resetFleet,
    formState: { errors: fleetErrors }
  } = useForm<FleetAccountFormData>({
    defaultValues: {
      name: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      address: '',
      notes: '',
    }
  });

  const paymentType = watch('paymentType');

  const handleFormSubmit = async (data: CreateStateInspectionFormData) => {
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!data.paymentType) {
        setError('Please select a payment type');
        return;
      }
      if (data.paymentAmount === undefined) {
        setError('Please select a payment amount');
        return;
      }
      if (!data.status) {
        setError('Please select an inspection status');
        return;
      }

      const formData = {
        ...data,
        createdBy: effectiveUserName, // Use PIN user if available, otherwise current user
        createdDate: new Date().toISOString().split('T')[0], // Set current date when saving
        paymentType: data.paymentType,
        paymentAmount: data.paymentAmount,
        status: data.status,
        tintAffidavit: tintAffidavitFile || undefined,
      };

      console.log('Submitting form data:', formData);
      const newRecord = await createStateInspectionRecord(formData);
      console.log('Created record response:', newRecord);
      addRecord(newRecord);
      
      // Reset form completely including PIN
      reset({
        createdBy: '',
        createdDate: '',
        stickerNumber: '',
        lastName: '',
        paymentType: undefined,
        paymentAmount: undefined,
        status: undefined,
        fleetAccount: '',
        notes: '',
      });
      setTintAffidavitFile(null);
      
      // Reset PIN state
      setPin('');
      setPinUser(null);
      setPinError('');
      
      onRecordCreated();
    } catch (err: any) {
      console.error('Error creating record:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to create record. Please try again.';
      setError(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate image file
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      
      setTintAffidavitFile(file);
      setError(null);
    }
  };

  const handleRemoveFile = () => {
    setTintAffidavitFile(null);
  };

  const handleOpenFleetDialog = (fleet?: FleetAccount) => {
    if (fleet) {
      setSelectedFleetForEdit(fleet);
      resetFleet({
        name: fleet.name,
        contactName: fleet.contactName || '',
        contactEmail: fleet.contactEmail || '',
        contactPhone: fleet.contactPhone || '',
        address: fleet.address || '',
        notes: fleet.notes || '',
      });
    } else {
      setSelectedFleetForEdit(null);
      resetFleet();
    }
    setFleetDialogOpen(true);
  };

  const handleCloseFleetDialog = () => {
    setFleetDialogOpen(false);
    setSelectedFleetForEdit(null);
    resetFleet();
  };

  const handleFleetFormSubmit = async (data: FleetAccountFormData) => {
    try {
      if (selectedFleetForEdit) {
        const updatedAccount = await updateFleetAccount(selectedFleetForEdit.id, {
          ...data,
          active: true,
        });
        updateStoreFleetAccount(selectedFleetForEdit.id, updatedAccount);
      } else {
        const newAccount = await createFleetAccount({
          ...data,
          active: true,
        });
        addFleetAccount(newAccount);
      }
      handleCloseFleetDialog();
    } catch (err) {
      console.error('Error saving fleet account:', err);
      setError('Failed to save fleet account');
    }
  };

  const handleDeleteFleetAccount = async (id: string) => {
    try {
      await deleteFleetAccount(id);
      removeFleetAccount(id);
      handleCloseFleetDialog();
    } catch (err) {
      console.error('Error deleting fleet account:', err);
      setError('Failed to delete fleet account');
    }
  };

  // Handle PIN lookup
  const handlePinLookup = async (enteredPin: string) => {
    if (enteredPin.length !== 4) return;
    
    setPinLoading(true);
    setPinError('');
    
    try {
      const user = await lookupUserByPin(enteredPin);
      setPinUser(user);
      setValue('createdBy', user.name);
      setPinError('');
    } catch (err: any) {
      setPinError(err.response?.data?.error || 'Invalid PIN or user not found');
      setPinUser(null);
      setValue('createdBy', '');
    } finally {
      setPinLoading(false);
    }
  };

  const activeFleetAccounts = fleetAccounts.filter(account => account.active);

  return (
    <Box sx={{ p: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}



      {/* Info Chips */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        <Chip 
          label={`Created by: ${effectiveUserName || 'Enter PIN'}`}
          variant="outlined"
          size="small"
          sx={{ fontWeight: 500 }}
        />
        <Chip 
          label={`Date created: ${new Date().toLocaleDateString()}`}
          variant="outlined"
          size="small"
          sx={{ fontWeight: 500 }}
        />
      </Box>

      {/* PIN Input Field */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <TextField
          label="Enter 4-Digit PIN"
          type="password"
          value={pin}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '').slice(0, 4);
            setPin(value);
            if (value.length === 4) {
              handlePinLookup(value);
            } else {
              setPinUser(null);
              setPinError('');
              setValue('createdBy', '');
            }
          }}
          size="small"
          inputProps={{
            maxLength: 4,
            pattern: '[0-9]*',
            inputMode: 'numeric',
            style: { textAlign: 'center', fontSize: '1.2em', letterSpacing: '0.3em' }
          }}
          error={!!pinError}
          helperText={pinError || 'Enter your 4-digit PIN'}
          disabled={pinLoading}
          sx={{ width: 160 }}
        />
        {pinLoading && <CircularProgress size={20} sx={{ ml: 1 }} />}
      </Box>

      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <Grid container spacing={3}>

          <Grid xs={12} md={6}>
            <Controller
              name="stickerNumber"
              control={control}
              rules={{ required: 'Sticker number is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Sticker Number"
                  fullWidth
                  error={!!errors.stickerNumber}
                  helperText={errors.stickerNumber?.message}
                />
              )}
            />
          </Grid>

          <Grid xs={12} md={6}>
            <Controller
              name="lastName"
              control={control}
              rules={{ required: 'Last name is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Last Name"
                  fullWidth
                  error={!!errors.lastName}
                  helperText={errors.lastName?.message}
                />
              )}
            />
          </Grid>

          <Grid xs={12} md={6}>
            <Controller
              name="paymentType"
              control={control}
              render={({ field }) => (
                <Box>
                  <FormLabel component="legend" sx={{ mb: 1, fontSize: '0.875rem', color: 'text.secondary' }}>
                    Payment Type
                  </FormLabel>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {['Cash', 'Check', 'Fleet'].map((type) => (
                      <Chip
                        key={type}
                        label={type}
                        clickable
                        color={field.value === type ? 'primary' : 'default'}
                        onClick={() => field.onChange(type)}
                        sx={{
                          borderRadius: 2,
                          fontWeight: field.value === type ? 600 : 400,
                          '&:hover': {
                            backgroundColor: field.value === type ? 'primary.dark' : 'action.hover',
                          }
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            />
          </Grid>

          <Grid xs={12} md={6}>
            <Controller
              name="paymentAmount"
              control={control}
              render={({ field }) => (
                <Box>
                  <FormLabel component="legend" sx={{ mb: 1, fontSize: '0.875rem', color: 'text.secondary' }}>
                    Payment Amount
                  </FormLabel>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {[0, 10, 18, 20].map((amount) => (
                      <Chip
                        key={amount}
                        label={`$${amount}`}
                        clickable
                        color={field.value === amount ? 'primary' : 'default'}
                        onClick={() => field.onChange(amount)}
                        sx={{
                          borderRadius: 2,
                          fontWeight: field.value === amount ? 600 : 400,
                          '&:hover': {
                            backgroundColor: field.value === amount ? 'primary.dark' : 'action.hover',
                          }
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            />
          </Grid>

          <Grid xs={12} md={6}>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Box>
                  <FormLabel component="legend" sx={{ mb: 1, fontSize: '0.875rem', color: 'text.secondary' }}>
                    Inspection Status
                  </FormLabel>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {(['Pass', 'Retest', 'Fail'] as const).map((status) => (
                      <Chip
                        key={status}
                        label={status}
                        clickable
                        color={
                          field.value === status 
                            ? status === 'Pass' 
                              ? 'success' 
                              : status === 'Retest' 
                                ? 'warning' 
                                : 'error'
                            : 'default'
                        }
                        onClick={() => field.onChange(status)}
                        sx={{
                          borderRadius: 2,
                          fontWeight: field.value === status ? 600 : 400,
                          '&:hover': {
                            backgroundColor: field.value === status 
                              ? status === 'Pass' 
                                ? 'success.dark' 
                                : status === 'Retest' 
                                  ? 'warning.dark' 
                                  : 'error.dark'
                              : 'action.hover',
                          }
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            />
          </Grid>

          {paymentType === 'Fleet' && (
            <Grid xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Controller
                    name="fleetAccount"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        {...field}
                        options={activeFleetAccounts}
                        getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
                        value={activeFleetAccounts.find(account => account.id === field.value) || null}
                        onChange={(_, value) => field.onChange(value?.id || '')}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Fleet Account"
                            error={!!errors.fleetAccount}
                            helperText={errors.fleetAccount?.message}
                          />
                        )}
                      />
                    )}
                  />
                </Box>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenFleetDialog()}
                  sx={{ minWidth: 120 }}
                >
                  Manage
                </Button>
              </Box>
            </Grid>
          )}

          <Grid xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="subtitle2">
                Tint Affidavit:
              </Typography>
              {tintAffidavitFile ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {tintAffidavitFile.name}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleRemoveFile}
                    startIcon={<DeleteIcon />}
                  >
                    Remove
                  </Button>
                </Box>
              ) : (
                <Box>
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="tint-affidavit-upload"
                    type="file"
                    onChange={handleFileUpload}
                  />
                  <label htmlFor="tint-affidavit-upload">
                    <Button variant="contained" component="span" startIcon={<CloudUploadIcon />}>
                      Upload Image
                    </Button>
                  </label>
                </Box>
              )}
            </Box>
          </Grid>

          <Grid xs={12}>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Notes (Optional)"
                  multiline
                  rows={3}
                  fullWidth
                />
              )}
            />
          </Grid>

          <Grid xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                type="button"
                variant="outlined"
                onClick={() => {
                  reset({
                    createdBy: '',
                    createdDate: '',
                    stickerNumber: '',
                    lastName: '',
                    paymentType: undefined,
                    paymentAmount: undefined,
                    status: undefined,
                    fleetAccount: '',
                    notes: '',
                  });
                  setTintAffidavitFile(null);
                  setPin('');
                  setPinUser(null);
                  setPinError('');
                }}
              >
                Clear
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
              >
                {loading ? 'Saving...' : 'Save Record'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>

      {/* Fleet Account Management Dialog */}
      <Dialog 
        open={fleetDialogOpen} 
        onClose={handleCloseFleetDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {selectedFleetForEdit ? 'Edit Fleet Account' : 'Add Fleet Account'}
            <IconButton onClick={handleCloseFleetDialog}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <form onSubmit={handleFleetSubmit(handleFleetFormSubmit)}>
              <Grid container spacing={2}>
                <Grid xs={12}>
                  <Controller
                    name="name"
                    control={fleetControl}
                    rules={{ required: 'Fleet account name is required' }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Fleet Account Name"
                        fullWidth
                        error={!!fleetErrors.name}
                        helperText={fleetErrors.name?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid xs={12} md={6}>
                  <Controller
                    name="contactName"
                    control={fleetControl}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Contact Name"
                        fullWidth
                      />
                    )}
                  />
                </Grid>

                <Grid xs={12} md={6}>
                  <Controller
                    name="contactEmail"
                    control={fleetControl}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Contact Email"
                        type="email"
                        fullWidth
                      />
                    )}
                  />
                </Grid>

                <Grid xs={12} md={6}>
                  <Controller
                    name="contactPhone"
                    control={fleetControl}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Contact Phone"
                        fullWidth
                      />
                    )}
                  />
                </Grid>

                <Grid xs={12}>
                  <Controller
                    name="address"
                    control={fleetControl}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Address"
                        multiline
                        rows={2}
                        fullWidth
                      />
                    )}
                  />
                </Grid>

                <Grid xs={12}>
                  <Controller
                    name="notes"
                    control={fleetControl}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Notes"
                        multiline
                        rows={2}
                        fullWidth
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </form>
          </Box>
        </DialogContent>
        <DialogActions>
          {selectedFleetForEdit && (
            <Button
              color="error"
              onClick={() => handleDeleteFleetAccount(selectedFleetForEdit.id)}
              startIcon={<DeleteIcon />}
            >
              Delete
            </Button>
          )}
          <Button onClick={handleCloseFleetDialog}>
            Cancel
          </Button>
          <Button 
            onClick={handleFleetSubmit(handleFleetFormSubmit)}
            variant="contained"
          >
            {selectedFleetForEdit ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AddRecordForm; 