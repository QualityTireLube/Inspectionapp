/**
 * Mileage Field Component
 * 
 * Comma-separated number field with numpad interface
 * Formats and validates mileage input
 */

import React, { useState } from 'react';
import {
  Box,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
  IconButton,
  Paper
} from '@mui/material';
import {
  Dialpad as NumpadIcon,
  Backspace as BackspaceIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { NormalizedFieldTemplate } from '../base/NormalizedFieldTemplate';
import { BaseFieldProps } from '../base/FieldProps';

export interface MileageFieldProps extends BaseFieldProps {
  maxValue?: number;
  showNumpad?: boolean;
  autoFormat?: boolean;
  placeholder?: string;
}

export const MileageField: React.FC<MileageFieldProps> = ({
  value = '',
  onChange,
  maxValue = 999999,
  showNumpad = true,
  autoFormat = true,
  placeholder = "000,000",
  ...templateProps
}) => {
  const [mileage, setMileage] = useState<string>(typeof value === 'string' ? value : String(value || ''));
  const [numpadOpen, setNumpadOpen] = useState(false);
  const [numpadValue, setNumpadValue] = useState('');

  const formatMileage = (input: string): string => {
    // Remove all non-digits
    const digits = input.replace(/\D/g, '');
    
    // Add commas for thousands
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const parseMileage = (formatted: string): number => {
    return parseInt(formatted.replace(/,/g, ''), 10) || 0;
  };

  const validateMileage = (input: string): string | null => {
    const numericValue = parseMileage(input);
    
    if (numericValue > maxValue) {
      return `Mileage cannot exceed ${formatMileage(String(maxValue))}`;
    }
    
    if (numericValue < 0) {
      return 'Mileage cannot be negative';
    }
    
    return null;
  };

  const handleMileageChange = (newValue: string) => {
    const formatted = autoFormat ? formatMileage(newValue) : newValue;
    setMileage(formatted);
    onChange(formatted);
  };

  const handleNumpadClick = (digit: string) => {
    const newValue = numpadValue + digit;
    setNumpadValue(newValue);
  };

  const handleNumpadBackspace = () => {
    setNumpadValue(numpadValue.slice(0, -1));
  };

  const handleNumpadClear = () => {
    setNumpadValue('');
  };

  const handleNumpadConfirm = () => {
    handleMileageChange(numpadValue);
    setNumpadOpen(false);
    setNumpadValue('');
  };

  const openNumpad = () => {
    setNumpadValue(mileage.replace(/,/g, ''));
    setNumpadOpen(true);
  };

  const renderNumpadButton = (label: string, onClick: () => void, variant: 'number' | 'action' = 'number') => (
    <Grid size={{ xs: 4 }} key={label}>
      <Button
        variant={variant === 'action' ? 'outlined' : 'contained'}
        color={variant === 'action' ? 'secondary' : 'primary'}
        fullWidth
        sx={{
          height: 60,
          fontSize: '1.2rem',
          fontWeight: 'bold'
        }}
        onClick={onClick}
      >
        {label}
      </Button>
    </Grid>
  );

  const currentMileage = parseMileage(mileage);
  const validationError = validateMileage(mileage);

  return (
    <NormalizedFieldTemplate
      {...templateProps}
      error={validationError}
      showDuallyButton={showNumpad}
      duallyLabel="Numpad"
      duallyColor="primary"
      onDuallyClick={openNumpad}
    >
      <Box>
        <TextField
          fullWidth
          value={mileage}
          onChange={(e) => handleMileageChange(e.target.value)}
          placeholder={placeholder}
          type="text"
          inputMode="numeric"
          sx={{
            '& .MuiOutlinedInput-input': {
              fontSize: '1.1rem',
              fontWeight: 'bold',
              textAlign: 'center',
              letterSpacing: '1px'
            }
          }}
          InputProps={{
            endAdornment: showNumpad && (
              <IconButton onClick={openNumpad} color="primary">
                <NumpadIcon />
              </IconButton>
            )
          }}
        />
        
        {mileage && !validationError && (
          <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}>
            Numeric value: {currentMileage.toLocaleString()} miles
          </Typography>
        )}
        
        {/* Mileage Categories */}
        {currentMileage > 0 && (
          <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>
            {currentMileage < 25000 && (
              <Typography variant="caption" color="success.main">
                Low Mileage
              </Typography>
            )}
            {currentMileage >= 25000 && currentMileage < 100000 && (
              <Typography variant="caption" color="primary.main">
                Average Mileage
              </Typography>
            )}
            {currentMileage >= 100000 && currentMileage < 200000 && (
              <Typography variant="caption" color="warning.main">
                High Mileage
              </Typography>
            )}
            {currentMileage >= 200000 && (
              <Typography variant="caption" color="error.main">
                Very High Mileage
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Numpad Dialog */}
      <Dialog
        open={numpadOpen}
        onClose={() => setNumpadOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ textAlign: 'center' }}>
          Enter Mileage
        </DialogTitle>
        <DialogContent>
          <Paper sx={{ p: 2, mb: 2, textAlign: 'center', backgroundColor: '#f5f5f5' }}>
            <Typography variant="h4" sx={{ fontFamily: 'monospace', minHeight: '1.5em' }}>
              {formatMileage(numpadValue) || '0'}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {parseMileage(numpadValue).toLocaleString()} miles
            </Typography>
          </Paper>
          
          <Grid container spacing={1}>
            {/* Number buttons */}
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) =>
              renderNumpadButton(String(num), () => handleNumpadClick(String(num)), 'number')
            )}
            
            {/* Bottom row */}
            <Grid size={{ xs: 4 }} key="clear">
              <Button
                variant="outlined"
                color="error"
                fullWidth
                sx={{ height: 60 }}
                onClick={handleNumpadClear}
                startIcon={<ClearIcon />}
              >
                Clear
              </Button>
            </Grid>
            
            {renderNumpadButton('0', () => handleNumpadClick('0'))}
            
            <Grid size={{ xs: 4 }} key="backspace">
              <Button
                variant="outlined"
                color="warning"
                fullWidth
                sx={{ height: 60 }}
                onClick={handleNumpadBackspace}
                startIcon={<BackspaceIcon />}
              >
                Back
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNumpadOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleNumpadConfirm} 
            variant="contained"
            disabled={!numpadValue}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </NormalizedFieldTemplate>
  );
};

export default MileageField;
