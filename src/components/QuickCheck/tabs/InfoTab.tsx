import React from 'react';
import { TextField } from '@mui/material';
import Grid from '../../CustomGrid';
import { QuickCheckForm } from '../../../types/quickCheck';

interface InfoTabProps {
  form: QuickCheckForm;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  enabledFields?: string[];
}

export const InfoTab: React.FC<InfoTabProps> = ({ 
  form, 
  onChange,
  enabledFields
}) => {
  const isEnabled = (name: string) => {
    if (!enabledFields) return true;
    if (enabledFields.includes(name)) return true;
    // Allow schema to specify 'datetime' to show the existing 'date' field
    if (name === 'date' && enabledFields.includes('datetime')) return true;
    return false;
  };
  return (
    <Grid container spacing={3}>
      {isEnabled('user') && (
        <Grid columns={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="User"
            name="user"
            value={form.user}
            disabled
          />
        </Grid>
      )}

      {isEnabled('date') && (
        <Grid columns={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Date"
            name="date"
            type="date"
            value={form.date}
            disabled
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
      )}

      {isEnabled('mileage') && (
        <Grid columns={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Mileage"
            name="mileage"
            value={(form as any).mileage || ''}
            onChange={onChange}
            inputProps={{ inputMode: 'numeric', pattern: '[0-9,]*' }}
          />
        </Grid>
      )}
    </Grid>
  );
}; 