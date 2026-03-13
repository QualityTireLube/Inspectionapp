import React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';
import FormControlLabel from '@mui/material/FormControlLabel';
import Rating from '@mui/material/Rating';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';

import { Field } from './utils';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Switch from '@mui/material/Switch';

export interface FieldEditorProps {
  field: Field;
  value: any;
  onChange: (value: any) => void;
}

const FieldEditor: React.FC<FieldEditorProps> = ({ field, value, onChange }) => {
  const control = field.uiControl;
  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
    case 'url':
    case 'currency':
      return (
        <TextField
          fullWidth
          size="small"
          label="Value"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          inputProps={{ 'aria-label': `${field.name} value` }}
        />
      );
    case 'number':
      return (
        <TextField
          fullWidth
          size="small"
          type="number"
          label="Value"
          value={typeof value === 'number' || typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          inputProps={{ 'aria-label': `${field.name} number`, min: field.min, max: field.max }}
        />
      );
    case 'date':
      return (
        <TextField
          fullWidth
          size="small"
          type="date"
          label="Date"
          value={typeof value === 'string' ? value.split('T')[0] : ''}
          onChange={(e) => onChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
          inputProps={{ 'aria-label': `${field.name} date` }}
        />
      );
    case 'datetime':
      return (
        <TextField
          fullWidth
          size="small"
          type="datetime-local"
          label="Date & Time"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
          inputProps={{ 'aria-label': `${field.name} datetime` }}
        />
      );
    case 'time':
      return (
        <TextField
          fullWidth
          size="small"
          type="time"
          label="Time"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
          inputProps={{ 'aria-label': `${field.name} time` }}
        />
      );
    case 'select': {
      if (field.multiple || control === 'chips') {
        const arr = Array.isArray(value)
          ? value
          : typeof value === 'string' && value
            ? value.split(',')
            : [];
        const toggle = (val: string) => {
          const has = arr.includes(val);
          const next = has ? arr.filter((v: string) => v !== val) : [...arr, val];
          onChange(next);
        };
        return (
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }} role="group" aria-label={`${field.name} options`}>
            {(field.options || []).map(o => (
              <Chip
                key={o.id}
                label={o.label}
                clickable
                color={arr.includes(o.value) ? 'primary' : 'default'}
                variant={arr.includes(o.value) ? 'filled' : 'outlined'}
                onClick={() => toggle(o.value)}
                aria-pressed={arr.includes(o.value)}
              />
            ))}
          </Stack>
        );
      }
      if (control === 'radio') {
        return (
          <RadioGroup row value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)}>
            {(field.options || []).map(o => (
              <FormControlLabel key={o.id} value={o.value} control={<Radio />} label={o.label} />
            ))}
          </RadioGroup>
        );
      }
      return (
        <Select
          fullWidth
          size="small"
          displayEmpty
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          inputProps={{ 'aria-label': `${field.name} select` }}
        >
          {(field.options || []).map(o => (
            <MenuItem key={o.id} value={o.value}>{o.label}</MenuItem>
          ))}
        </Select>
      );
    }
    case 'multiselect':
    case 'checklist': {
      const arr = Array.isArray(value) ? value : [];
      const toggle = (val: string) => {
        const has = arr.includes(val);
        const next = has ? arr.filter((v: string) => v !== val) : [...arr, val];
        onChange(next);
      };
      return (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }} role="group" aria-label={`${field.name} options`}>
          {(field.options || []).map(o => (
            <Chip
              key={o.id}
              label={o.label}
              clickable
              color={arr.includes(o.value) ? 'primary' : 'default'}
              variant={arr.includes(o.value) ? 'filled' : 'outlined'}
              onClick={() => toggle(o.value)}
              aria-pressed={arr.includes(o.value)}
            />
          ))}
        </Stack>
      );
    }
    
    case 'boolean':
      if (control === 'switch') {
        return (
          <FormControlLabel control={<Switch checked={!!value} onChange={(e) => onChange(e.target.checked)} />} label="Enabled" />
        );
      }
      return (
        <FormControlLabel
          control={<Checkbox checked={!!value} onChange={(e) => onChange(e.target.checked)} />}
          label="Yes"
        />
      );
    case 'rating': {
      const max = field.maxRating || 5;
      const current = typeof value === 'number' ? value : 0;
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Rating value={current} max={max} onChange={(_, newVal) => onChange(newVal || 0)} />
          <Typography variant="caption">{current}/{max}</Typography>
        </Box>
      );
    }
    case 'photo':
    case 'signature': {
      return (
        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="outlined" size="small" component="label" aria-label={`Upload ${field.type}`}>
            Upload
            <input hidden type="file" accept="image/*" onChange={() => onChange('uploaded')} />
          </Button>
          <Typography variant="caption" color="text.secondary">Stub upload</Typography>
        </Stack>
      );
    }
    case 'location':
      return (
        <TextField
          fullWidth
          size="small"
          label="lat,lon"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          inputProps={{ 'aria-label': `${field.name} location` }}
        />
      );
    case 'complex':
    default:
      return <Typography variant="caption" color="text.secondary">Editing not available</Typography>;
  }
};

export default FieldEditor;


