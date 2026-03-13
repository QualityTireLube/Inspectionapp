/**
 * Chip Field Component
 * 
 * Single and multi-select chip interface
 * Used for: condition assessments, status selections, etc.
 */

import React, { useState } from 'react';
import {
  Box,
  Chip,
  Typography,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { NormalizedFieldTemplate } from '../base/NormalizedFieldTemplate';
import { BaseFieldProps, FieldOption } from '../base/FieldProps';

export interface ChipFieldProps extends BaseFieldProps {
  options: FieldOption[];
  multiple?: boolean;
  allowCustom?: boolean;
  chipColor?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  chipVariant?: 'filled' | 'outlined';
  maxSelection?: number;
  showCount?: boolean;
  enableAddCustom?: boolean;
  customOptionTemplate?: string;
}

export const ChipField: React.FC<ChipFieldProps> = ({
  value,
  onChange,
  options = [],
  multiple = false,
  allowCustom = false,
  chipColor = 'primary',
  chipVariant = 'filled',
  maxSelection,
  showCount = false,
  enableAddCustom = false,
  customOptionTemplate = 'Custom: ',
  ...templateProps
}) => {
  const [selectedValues, setSelectedValues] = useState<string[]>(
    multiple 
      ? (Array.isArray(value) ? value : value ? [value] : [])
      : (value ? [value as string] : [])
  );
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [editMode, setEditMode] = useState(false);

  const handleChipClick = (optionValue: string) => {
    let newValues: string[];

    if (multiple) {
      if (selectedValues.includes(optionValue)) {
        // Remove if already selected
        newValues = selectedValues.filter(v => v !== optionValue);
      } else {
        // Add if not selected (respect maxSelection)
        if (maxSelection && selectedValues.length >= maxSelection) {
          return; // Don't add if at limit
        }
        newValues = [...selectedValues, optionValue];
      }
    } else {
      // Single select
      newValues = selectedValues.includes(optionValue) ? [] : [optionValue];
    }

    setSelectedValues(newValues);
    onChange(multiple ? newValues : (newValues[0] || null));
  };

  const handleChipDelete = (optionValue: string) => {
    const newValues = selectedValues.filter(v => v !== optionValue);
    setSelectedValues(newValues);
    onChange(multiple ? newValues : (newValues[0] || null));
  };

  const handleAddCustom = () => {
    if (customValue.trim()) {
      const newValue = `${customOptionTemplate}${customValue.trim()}`;
      handleChipClick(newValue);
      setCustomValue('');
      setCustomDialogOpen(false);
    }
  };

  const getChipColor = (optionValue: string, isSelected: boolean) => {
    if (!isSelected) return 'default';
    
    // Special color mapping for common inspection values
    const lowerValue = optionValue.toLowerCase();
    if (lowerValue.includes('good') || lowerValue.includes('pass')) return 'success';
    if (lowerValue.includes('warning') || lowerValue.includes('caution')) return 'warning';
    if (lowerValue.includes('bad') || lowerValue.includes('fail') || lowerValue.includes('error')) return 'error';
    if (lowerValue.includes('info') || lowerValue.includes('note')) return 'info';
    
    return chipColor;
  };

  const getOptionLabel = (option: FieldOption) => {
    return option.label || option.value;
  };

  const isSelected = (optionValue: string) => selectedValues.includes(optionValue);

  const canAddMore = !maxSelection || selectedValues.length < maxSelection;

  return (
    <NormalizedFieldTemplate
      {...templateProps}
      showDuallyButton={editMode}
      duallyLabel="Edit"
      duallyColor="secondary"
      onDuallyClick={() => setEditMode(!editMode)}
      onTextboxClick={() => setCustomDialogOpen(true)}
    >
      <Box>
        {/* Selection Count */}
        {showCount && multiple && (
          <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
            Selected: {selectedValues.length}
            {maxSelection && ` / ${maxSelection}`}
          </Typography>
        )}

        {/* Chips Grid */}
        <Grid container spacing={1}>
          {options.map((option) => {
            const selected = isSelected(option.value);
            
            return (
              <Grid key={option.value}>
                <Chip
                  label={getOptionLabel(option)}
                  onClick={() => handleChipClick(option.value)}
                  onDelete={selected && editMode ? () => handleChipDelete(option.value) : undefined}
                  color={getChipColor(option.value, selected)}
                  variant={selected ? chipVariant : 'outlined'}
                  size="medium"
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      boxShadow: 2
                    }
                  }}
                />
              </Grid>
            );
          })}

          {/* Add Custom Chip */}
          {enableAddCustom && canAddMore && (
            <Grid>
              <Chip
                label="Add Custom"
                icon={<AddIcon />}
                onClick={() => setCustomDialogOpen(true)}
                color="secondary"
                variant="outlined"
                sx={{
                  cursor: 'pointer',
                  borderStyle: 'dashed',
                  '&:hover': {
                    borderStyle: 'solid'
                  }
                }}
              />
            </Grid>
          )}
        </Grid>

        {/* Selected Values Display */}
        {selectedValues.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="textSecondary">
              {multiple ? 'Selected:' : 'Current:'}
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              {selectedValues.map((value) => {
                const option = options.find(opt => opt.value === value);
                return (
                  <Chip
                    key={value}
                    label={option ? getOptionLabel(option) : value}
                    size="small"
                    color={getChipColor(value, true)}
                    onDelete={() => handleChipDelete(value)}
                    sx={{ mr: 0.5, mb: 0.5 }}
                  />
                );
              })}
            </Box>
          </Box>
        )}

        {/* Max Selection Warning */}
        {multiple && maxSelection && selectedValues.length >= maxSelection && (
          <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block' }}>
            Maximum {maxSelection} selections reached
          </Typography>
        )}
      </Box>

      {/* Custom Value Dialog */}
      <Dialog
        open={customDialogOpen}
        onClose={() => setCustomDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Custom Option</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Custom Value"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder="Enter custom option..."
            sx={{ mt: 1 }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddCustom();
              }
            }}
          />
          
          <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
            Will be saved as: "{customOptionTemplate}{customValue}"
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleAddCustom} 
            variant="contained"
            disabled={!customValue.trim()}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </NormalizedFieldTemplate>
  );
};

export default ChipField;
