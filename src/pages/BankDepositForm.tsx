import React, { useState } from 'react';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Paper,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  AccountBalance as BankIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import Grid from '../components/CustomGrid';
import MultipleImageUploadField from '../components/CashManagement/MultipleImageUploadField';
import SingleImageUploadField from '../components/CashManagement/SingleImageUploadField';
import { submitBankDeposit } from '../services/cashManagementApi';
import { useCashManagementStore } from '../stores/cashManagementStore';
import { useNotification } from '../hooks/useNotification';
import NotificationSnackbar from '../components/NotificationSnackbar';

const BankDepositForm: React.FC = () => {
  const [formData, setFormData] = useState({
    totalCash: '',
    totalChecks: '',
    cashDepositSlip: null as string | null,
    checkDepositSlip: null as string | null,
    individualCheckImages: [] as string[],
    smsPaymentTypes: null as string | null,
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { addBankDeposit } = useCashManagementStore();
  const { notification, hideNotification, handleApiCall } = useNotification();

  const handleInputChange = (field: string, value: string | string[] | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear success/error when user starts typing
    if (success) setSuccess(false);
    if (error) setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.totalCash && !formData.totalChecks) {
      setError('Please enter either cash amount or check amount');
      return false;
    }

    const cashAmount = parseFloat(formData.totalCash) || 0;
    const checkAmount = parseFloat(formData.totalChecks) || 0;

    if (cashAmount < 0 || checkAmount < 0) {
      setError('Amounts cannot be negative');
      return false;
    }

    if (cashAmount === 0 && checkAmount === 0) {
      setError('Total deposit amount cannot be zero');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSubmitting(true);
    setError(null);

    const depositData = {
      totalCash: parseFloat(formData.totalCash) || 0,
      totalChecks: parseFloat(formData.totalChecks) || 0,
      images: [
        ...(formData.cashDepositSlip ? [formData.cashDepositSlip] : []),
        ...(formData.checkDepositSlip ? [formData.checkDepositSlip] : []),
        ...formData.individualCheckImages,
        ...(formData.smsPaymentTypes ? [formData.smsPaymentTypes] : []),
      ],
      notes: formData.notes.trim(),
    };

    const totalAmount = depositData.totalCash + depositData.totalChecks;

    const result = await handleApiCall(
      async () => {
        const savedDeposit = await submitBankDeposit(depositData);
        addBankDeposit(savedDeposit);
        return savedDeposit;
      },
      {
        successMessage: `Bank deposit of $${totalAmount.toFixed(2)} submitted successfully!`,
        errorMessage: 'Failed to submit bank deposit',
      }
    );

    if (result) {
      setSuccess(true);
      
      // Reset form
      setFormData({
        totalCash: '',
        totalChecks: '',
        cashDepositSlip: null,
        checkDepositSlip: null,
        individualCheckImages: [],
        smsPaymentTypes: null,
        notes: '',
      });

      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    setSubmitting(false);
  };

  const handleReset = () => {
    setFormData({
      totalCash: '',
      totalChecks: '',
      cashDepositSlip: null,
      checkDepositSlip: null,
      individualCheckImages: [],
      smsPaymentTypes: null,
      notes: '',
    });
    setSuccess(false);
    setError(null);
  };

  const totalDeposit = (parseFloat(formData.totalCash) || 0) + (parseFloat(formData.totalChecks) || 0);

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <BankIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
          <Typography variant="h4" component="h1">
            Bank Deposit Form
          </Typography>
        </Box>

        {/* Success Alert */}
        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Bank deposit submitted successfully!
          </Alert>
        )}

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          {/* Deposit Amounts */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Deposit Amounts
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Total Cash"
                  type="number"
                  value={formData.totalCash}
                  onChange={(e) => handleInputChange('totalCash', e.target.value)}
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
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Total Checks"
                  type="number"
                  value={formData.totalChecks}
                  onChange={(e) => handleInputChange('totalChecks', e.target.value)}
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
              
              {totalDeposit > 0 && (
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">Total Deposit:</Typography>
                    <Typography variant="h6" color="primary">
                      ${totalDeposit.toFixed(2)}
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Paper>

          {/* Image Upload Sections */}
          <SingleImageUploadField
            label="Cash Deposit Slip"
            image={formData.cashDepositSlip}
            onChange={(image) => handleInputChange('cashDepositSlip', image)}
            disabled={submitting}
          />

          <SingleImageUploadField
            label="Check Deposit Slip"
            image={formData.checkDepositSlip}
            onChange={(image) => handleInputChange('checkDepositSlip', image)}
            disabled={submitting}
          />

          <MultipleImageUploadField
            label="All Check Images (Individually)"
            images={formData.individualCheckImages}
            onChange={(images) => handleInputChange('individualCheckImages', images)}
            maxImages={20}
            disabled={submitting}
          />

          <SingleImageUploadField
            label="SMS Payment Types"
            image={formData.smsPaymentTypes}
            onChange={(image) => handleInputChange('smsPaymentTypes', image)}
            disabled={submitting}
          />

          {/* Notes */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Notes (Optional)
            </Typography>
            <TextField
              label="Additional notes about this deposit"
              multiline
              rows={4}
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              fullWidth
              placeholder="Enter any additional information about this deposit..."
            />
          </Paper>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              type="button"
              variant="outlined"
              onClick={handleReset}
              disabled={submitting}
            >
              Clear Form
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting || totalDeposit === 0}
              startIcon={submitting ? <CircularProgress size={20} /> : <SaveIcon />}
            >
              {submitting ? 'Submitting...' : 'Submit Deposit'}
            </Button>
          </Box>
        </form>
      </Box>

      {/* Notification Snackbar */}
      <NotificationSnackbar
        notification={notification}
        onClose={hideNotification}
      />
    </Container>
  );
};

export default BankDepositForm; 