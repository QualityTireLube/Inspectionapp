import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import Avatar from '@mui/material/Avatar';
import Link from '@mui/material/Link';
import StarIcon from '@mui/icons-material/Star';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

export type FieldType =
  | 'text' | 'number' | 'date' | 'datetime' | 'time'
  | 'select' | 'multiselect' | 'boolean'
  | 'photo' | 'signature' | 'rating' | 'checklist'
  | 'location' | 'currency' | 'email' | 'phone' | 'url' | 'complex';

export type FieldOption = { id: string; label: string; value: string };

export type Field = {
  id: string;
  name: string;
  type: FieldType;
  required?: boolean;
  options?: FieldOption[];
  placeholder?: string;
  min?: number; max?: number;
  mask?: string;
  helpText?: string;
  sampleAnswer?: string | number | boolean | string[] | null;
  maxRating?: number;
  multiple?: boolean;
};

export interface FieldPreviewProps {
  field: Field;
}

function formatNumber(value: number): string {
  try {
    return new Intl.NumberFormat().format(value);
  } catch {
    return String(value);
  }
}

function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(d);
  } catch {
    return d.toISOString().split('T')[0];
  }
}

function formatTime(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(d);
  } catch {
    return d.toTimeString().slice(0, 5);
  }
}

export function getDetailPreviewText(field: Field): string {
  const value = field.sampleAnswer ?? field.placeholder ?? '';
  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
    case 'url':
    case 'currency':
      return String(value ?? '');
    case 'number':
      return typeof value === 'number' ? formatNumber(value) : String(value ?? '');
    case 'date':
      return typeof value === 'string' || value instanceof Date ? formatDate(value) : '';
    case 'datetime':
      return typeof value === 'string' || value instanceof Date ? `${formatDate(value)} ${formatTime(value)}`.trim() : '';
    case 'time':
      return typeof value === 'string' || value instanceof Date ? formatTime(value) : '';
    case 'select': {
      const opt = field.options?.find(o => o.value === value || o.label === value);
      return opt?.label ?? String(value ?? '');
    }
    case 'multiselect':
    case 'checklist': {
      const arr = Array.isArray(value) ? value : [];
      const labels = arr.map(v => field.options?.find(o => o.value === v || o.label === v)?.label || String(v));
      return labels.join(', ');
    }
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'rating': {
      const max = field.maxRating || 5;
      const stars = typeof value === 'number' ? value : 0;
      return `${stars}/${max}`;
    }
    case 'photo':
    case 'signature':
      return '[media]';
    case 'location':
      return typeof value === 'string' ? value : '';
    case 'complex':
    default:
      return String(value ?? '');
  }
}

const MediaThumb: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <Avatar
    variant="rounded"
    sx={{ width: 64, height: 64, cursor: onClick ? 'pointer' : 'default' }}
    aria-label="thumbnail placeholder"
    onClick={onClick}
  />
);

const StarRow: React.FC<{ count: number; max: number }> = ({ count, max }) => (
  <Box aria-label={`rating ${count} out of ${max}`} role="img">
    {Array.from({ length: max }).map((_, i) => (
      <StarIcon key={i} fontSize="small" color={i < count ? 'warning' : 'disabled'} />
    ))}
  </Box>
);

export const FieldPreview: React.FC<FieldPreviewProps> = ({ field }) => {
  const [open, setOpen] = useState(false);
  const value = field.sampleAnswer ?? field.placeholder ?? '';
  switch (field.type) {
    case 'text':
    case 'currency':
      return <Typography variant="body2" noWrap title={String(value)}>{String(value)}</Typography>;
    case 'email':
      return <Link href={`mailto:${value}`} underline="hover">{String(value)}</Link>;
    case 'phone':
      return <Link href={`tel:${value}`} underline="hover">{String(value)}</Link>;
    case 'url':
      return <Link href={String(value)} target="_blank" rel="noreferrer" underline="hover">{String(value)}</Link>;
    case 'number':
      return <Typography variant="body2">{typeof value === 'number' ? formatNumber(value) : String(value)}</Typography>;
    case 'date':
      return <Typography variant="body2">{typeof value === 'string' || value instanceof Date ? formatDate(value) : ''}</Typography>;
    case 'datetime':
      return <Typography variant="body2">{typeof value === 'string' || value instanceof Date ? `${formatDate(value)} ${formatTime(value)}`.trim() : ''}</Typography>;
    case 'time':
      return <Typography variant="body2">{typeof value === 'string' || value instanceof Date ? formatTime(value) : ''}</Typography>;
    case 'select': {
      if (field.multiple) {
        const arr = Array.isArray(value) ? value : typeof value === 'string' && value ? value.split(',') : [];
        const labels = arr.map(v => field.options?.find(o => o.value === v || o.label === v)?.label || String(v));
        const displayed = labels.slice(0, 3);
        const overflow = labels.length - displayed.length;
        return (
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
            {displayed.map((l, i) => (<Chip key={i} size="small" label={l} />))}
            {overflow > 0 && <Chip size="small" label={`+${overflow} more`} />}
          </Stack>
        );
      }
      const opt = field.options?.find(o => o.value === value || o.label === value);
      return <Chip size="small" label={opt?.label ?? String(value)} />;
    }
    case 'multiselect':
    case 'checklist': {
      const arr = Array.isArray(value) ? value : [];
      const labels = arr.map(v => field.options?.find(o => o.value === v || o.label === v)?.label || String(v));
      const displayed = labels.slice(0, 3);
      const overflow = labels.length - displayed.length;
      return (
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
          {displayed.map((l, i) => (<Chip key={i} size="small" label={l} />))}
          {overflow > 0 && <Chip size="small" label={`+${overflow} more`} />}
        </Stack>
      );
    }
    case 'boolean':
      return <Chip size="small" color={value ? 'success' : 'default'} label={value ? 'Yes' : 'No'} />;
    case 'rating': {
      const max = field.maxRating || 5;
      const stars = typeof value === 'number' ? value : 0;
      return <StarRow count={stars} max={max} />;
    }
    case 'photo':
    case 'signature':
      return (
        <>
          <MediaThumb onClick={() => setOpen(true)} />
          <Dialog open={open} onClose={() => setOpen(false)} aria-labelledby="media-dialog-title">
            <DialogTitle id="media-dialog-title">Preview</DialogTitle>
            <DialogContent>
              <Box sx={{ width: 256, height: 256, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" color="text.secondary">Media preview (stub)</Typography>
              </Box>
            </DialogContent>
          </Dialog>
        </>
      );
    case 'location':
      return (
        <Tooltip title="Open Map (stub)">
          <Link href="#" underline="hover" aria-label="Open Map">{String(value || '0,0')}</Link>
        </Tooltip>
      );
    case 'complex':
    default:
      return <Typography variant="body2" color="text.secondary">Preview not available</Typography>;
  }
};

export default FieldPreview;


