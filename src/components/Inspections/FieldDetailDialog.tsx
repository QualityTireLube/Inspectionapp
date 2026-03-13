import React, { useEffect, useMemo, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import DeleteIcon from '@mui/icons-material/Delete';
import Divider from '@mui/material/Divider';

import { Field, FieldOption, FieldType, UIControl } from './utils';
import FieldEditor from './FieldEditor';
import { FieldPreview } from './FieldPreview';

export interface FieldDetailDialogProps {
  open: boolean;
  field: Field | null;
  allTypes: FieldType[];
  onClose: () => void;
  onSave: (updates: { id: string; type: FieldType; options?: FieldOption[]; uiControl?: UIControl; tabs?: string[] }) => void;
  tabs?: { id: string; name: string }[];
  tabMembership?: string[];
}

const OPTION_TYPES: FieldType[] = ['select', 'multiselect', 'checklist'];

const FieldDetailDialog: React.FC<FieldDetailDialogProps> = ({ open, field, allTypes, onClose, onSave, tabs = [], tabMembership = [] }) => {
  const [type, setType] = useState<FieldType>('text');
  const [options, setOptions] = useState<FieldOption[]>([]);
  const [previewValue, setPreviewValue] = useState<any>('');
  const [uiControl, setUiControl] = useState<UIControl | undefined>(undefined);
  const [selectedTabs, setSelectedTabs] = useState<string[]>(tabMembership);

  useEffect(() => {
    if (field) {
      setType(field.type);
      setOptions((field.options || []).map((o, idx) => ({ id: o.id ?? String(idx), label: o.label, value: o.value })));
      setPreviewValue(field.sampleAnswer ?? '');
      setUiControl(field.uiControl);
      setSelectedTabs(tabMembership || []);
    }
  }, [field]);

  const showOptions = OPTION_TYPES.includes(type);

  const addOption = () => {
    setOptions(prev => [...prev, { id: String(Date.now()), label: '', value: '' }]);
  };
  const removeOption = (id: string) => setOptions(prev => prev.filter(o => o.id !== id));
  const updateOption = (id: string, key: 'label' | 'value', val: string) => {
    setOptions(prev => prev.map(o => (o.id === id ? { ...o, [key]: val } : o)));
  };

  const handleSave = () => {
    if (!field) return;
    const normalized = options.map((o, idx) => ({ id: String(idx), label: o.label || o.value, value: o.value || o.label }));
    onSave({ id: field.id, type, options: showOptions ? normalized : undefined, uiControl, tabs: selectedTabs });
  };

  const previewField: Field | null = field
    ? { ...field, type, options: showOptions ? options : undefined, uiControl }
    : null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="field-detail-title">
      <DialogTitle id="field-detail-title">Edit Field</DialogTitle>
      <DialogContent dividers>
        {!field ? (
          <Typography variant="body2" color="text.secondary">No field selected.</Typography>
        ) : (
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Name</Typography>
              <Typography variant="body1">{field.name}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Type</Typography>
              <Select fullWidth size="small" value={type} onChange={(e) => setType(e.target.value as FieldType)}>
                {allTypes.map(t => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </Select>
            </Box>
            {showOptions && (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="subtitle2">Options</Typography>
                  <Button onClick={addOption} size="small" variant="outlined">Add option</Button>
                </Stack>
                <Stack spacing={1}>
                  {options.length === 0 && (
                    <Typography variant="caption" color="text.secondary">No options yet.</Typography>
                  )}
                  {options.map((opt) => (
                    <Stack key={opt.id} direction="row" spacing={1} alignItems="center">
                      <TextField
                        size="small"
                        label="Label"
                        value={opt.label}
                        onChange={(e) => updateOption(opt.id, 'label', e.target.value)}
                        sx={{ flex: 1 }}
                        inputProps={{ 'aria-label': 'Option label' }}
                      />
                      <TextField
                        size="small"
                        label="Value"
                        value={opt.value}
                        onChange={(e) => updateOption(opt.id, 'value', e.target.value)}
                        sx={{ flex: 1 }}
                        inputProps={{ 'aria-label': 'Option value' }}
                      />
                      <IconButton aria-label="Remove option" onClick={() => removeOption(opt.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}

            {/* UI Control selector for supported types */}
            {(type === 'select' || type === 'boolean' || type === 'photo' || type === 'signature') && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>Control</Typography>
                <Select
                  fullWidth
                  size="small"
                  value={uiControl || ''}
                  displayEmpty
                  onChange={(e) => setUiControl((e.target.value || undefined) as UIControl | undefined)}
                >
                  <MenuItem value=""><em>Default</em></MenuItem>
                  {type === 'select' && <MenuItem value="dropdown">Dropdown</MenuItem>}
                  {type === 'select' && <MenuItem value="chips">Chips</MenuItem>}
                  {type === 'select' && <MenuItem value="radio">Radio</MenuItem>}
                  {type === 'boolean' && <MenuItem value="switch">Switch</MenuItem>}
                  {(type === 'photo' || type === 'signature') && <MenuItem value="upload">Upload</MenuItem>}
                </Select>
              </Box>
            )}

            {previewField && (
              <Box sx={{ mt: 2 }}>
                <Divider sx={{ my: 2 }} />
                {/* Tabs membership editor */}
                {tabs.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Tabs</Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                      {tabs.map(t => {
                        const active = selectedTabs.includes(t.id);
                        return (
                          <Button key={t.id} size="small" variant={active ? 'contained' : 'outlined'} onClick={() => setSelectedTabs(prev => active ? prev.filter(id => id !== t.id) : [...prev, t.id])} aria-pressed={active}>
                            {t.name}
                          </Button>
                        );
                      })}
                    </Stack>
                  </Box>
                )}

                <Typography variant="subtitle2" gutterBottom>
                  Fields View (This is how this field will be viewed in a form)
                </Typography>
                <Box sx={{ maxWidth: 460 }}>
                  <FieldEditor field={previewField} value={previewValue} onChange={setPreviewValue} />
                </Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>
                  Detail View (this is how this field will look in a Detail view)
                </Typography>
                <FieldPreview field={{ ...previewField, sampleAnswer: previewValue }} />
              </Box>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default FieldDetailDialog;


