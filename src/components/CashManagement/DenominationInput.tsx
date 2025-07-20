import React from 'react';
import {
  TextField,
  Typography,
  Box,
  Paper,
} from '@mui/material';
import Grid from '../CustomGrid';
import { DENOMINATIONS, DenominationCount, DenominationKey } from '../../types/cashManagement';

interface DenominationInputProps {
  values: DenominationCount;
  onChange: (values: DenominationCount) => void;
  label?: string;
  disabled?: boolean;
  showTotal?: boolean;
}

const DenominationInput: React.FC<DenominationInputProps> = ({
  values,
  onChange,
  label,
  disabled = false,
  showTotal = true,
}) => {
  const [focusedField, setFocusedField] = React.useState<string | null>(null);

  const handleChange = (denomination: DenominationKey, quantity: number) => {
    onChange({
      ...values,
      [denomination]: Math.max(0, quantity),
    });
  };

  const handleFocus = (denomination: DenominationKey) => {
    setFocusedField(denomination);
  };

  const handleBlur = () => {
    setFocusedField(null);
  };

  const calculateTotal = (): number => {
    return DENOMINATIONS.reduce((total, denom) => {
      const key = denom.name as DenominationKey;
      return total + (denom.value * (values[key] || 0));
    }, 0);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 2 }}>
      {label && (
        <Typography variant="h6" gutterBottom>
          {label}
        </Typography>
      )}
      
      <Grid container spacing={2}>
        {DENOMINATIONS.map((denom) => {
          const key = denom.name as DenominationKey;
          const quantity = values[key] || 0;
          const subtotal = denom.value * quantity;
          
          // Show empty string when focused and value is 0, otherwise show the actual value
          const displayValue = focusedField === key && quantity === 0 ? '' : quantity;
          
          return (
            <Grid item xs={12} sm={6} md={4} key={denom.name}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  label={denom.label}
                  type="number"
                  value={displayValue}
                  onChange={(e) => handleChange(key, parseInt(e.target.value) || 0)}
                  onFocus={() => handleFocus(key)}
                  onBlur={handleBlur}
                  disabled={disabled}
                  size="small"
                  inputProps={{ min: 0, step: 1 }}
                  sx={{ flex: 1 }}
                />
                <Typography variant="body2" sx={{ minWidth: 60, textAlign: 'right' }}>
                  {formatCurrency(subtotal)}
                </Typography>
              </Box>
            </Grid>
          );
        })}
        
        {showTotal && (
          <Grid item xs={12}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              mt: 2,
              pt: 2,
              borderTop: 1,
              borderColor: 'divider'
            }}>
              <Typography variant="h6">Total:</Typography>
              <Typography variant="h6" color="primary">
                {formatCurrency(calculateTotal())}
              </Typography>
            </Box>
          </Grid>
        )}
      </Grid>
    </Paper>
  );
};

export default DenominationInput; 