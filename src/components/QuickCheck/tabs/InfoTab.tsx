import React from 'react';
import { TextField } from '@mui/material';
import Grid from '../../CustomGrid';
import { QuickCheckForm } from '../../../types/quickCheck';

interface InfoTabProps {
  form: QuickCheckForm;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const InfoTab: React.FC<InfoTabProps> = ({ 
  form, 
  onChange
}) => {
  return (
    <Grid container spacing={3}>
      <Grid columns={{ xs: 12, sm: 6 }}>
        <TextField
          fullWidth
          label="User"
          name="user"
          value={form.user}
          disabled
        />
      </Grid>

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
    </Grid>
  );
}; 