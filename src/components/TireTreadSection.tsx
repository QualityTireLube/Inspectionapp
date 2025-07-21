import React, { useEffect } from 'react';
import { Box, Stack, Typography, TextField, IconButton, Chip } from '@mui/material';
import TireTreadSideView from './TireTreadSideView';
import CloseIcon from '@mui/icons-material/Close';

export interface TireTreadData {
  inner_edge_depth: string;
  inner_depth: string;
  center_depth: string;
  outer_depth: string;
  outer_edge_depth: string;
  // 🧠 Cursor: TreadCondition allows empty string '' for initial values before measurement
  // This is intentional for the blank slate approach - users must make conscious choices
  inner_edge_condition: '' | 'green' | 'yellow' | 'red';
  inner_condition: '' | 'green' | 'yellow' | 'red';
  center_condition: '' | 'green' | 'yellow' | 'red';
  outer_condition: '' | 'green' | 'yellow' | 'red';
  outer_edge_condition: '' | 'green' | 'yellow' | 'red';
}

interface TireTreadSectionProps {
  label: string;
  fieldPrefix?: string; // Optional prop for field naming to enable focus logic
  value: TireTreadData;
  onChange: (field: keyof TireTreadData, newValue: string) => void;
  onConditionChange: (field: keyof TireTreadData, condition: '' | 'green' | 'yellow' | 'red') => void;
  onPhotoClick: () => void;
  onDeletePhoto: (index: number) => void;
  tireDate: string;
  onTireDateChange: (date: string) => void;
  tireComments: string[];
  onTireCommentToggle: (comment: string) => void;
  photos: { file: File; progress: number; url?: string; error?: string; }[];
}

const TireTreadSection: React.FC<TireTreadSectionProps> = ({
  label, fieldPrefix, value, onChange, onConditionChange, onPhotoClick, onDeletePhoto, tireDate, onTireDateChange, tireComments, onTireCommentToggle, photos
}) => {
  // Updated to mirror the layout: outer edge, outer, center, inner, inner edge
  const parts = ['outer_edge', 'outer', 'center', 'inner', 'inner_edge'] as const;

  // Function to determine condition based on tread depth
  const getConditionFromDepth = (depth: string): 'green' | 'yellow' | 'red' => {
    const numDepth = parseInt(depth) || 0;
    if (numDepth >= 6) return 'green';
    if (numDepth >= 4) return 'yellow';
    return 'red';
  };

  // Update conditions when depths change
  useEffect(() => {
    parts.forEach(part => {
      const depth = value[`${part}_depth`];
      const newCondition = getConditionFromDepth(depth);
      if (value[`${part}_condition`] !== newCondition) {
        onConditionChange(`${part}_condition`, newCondition);
      }
    });
  }, [value.outer_edge_depth, value.outer_depth, value.center_depth, value.inner_depth, value.inner_edge_depth]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  // Function to format the label text
  const formatLabel = (part: string) => {
    return part.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <Stack spacing={2} sx={{ mb: 4 }}>
      {label && <Typography variant="h6">{label}</Typography>}

      {/* Tire Tread Inputs */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        {parts.map((part, index) => (
          <Box key={part} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <TextField
              label={formatLabel(part)}
              placeholder="e.g. 8"
              value={value[`${part}_depth`]}
              type="tel"
              inputProps={{ 
                inputMode: 'numeric', 
                pattern: '[0-9]*',
                onFocus: handleFocus,
                style: { textAlign: 'center' }
              }}
              InputLabelProps={{
                style: { textAlign: 'center', width: '100%' }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  marginTop: '8px',
                  '& fieldset': {
                    borderRadius: '4px'
                  }
                }
              }}
              onChange={(e) => {
                const num = e.target.value.replace(/\D/g, '');
                onChange(`${part}_depth`, num);
                // If a value was entered and there's a next field, focus it
                if (num && index < parts.length - 1 && fieldPrefix) {
                  const nextInput = document.querySelector(`input[name="${fieldPrefix}_${parts[index + 1]}_depth"]`);
                  if (nextInput) {
                    (nextInput as HTMLElement).focus();
                  }
                }
                // If this is the inner edge input (last input) and a value was entered, focus the tire date input
                if (num && part === 'inner_edge' && fieldPrefix) {
                  const tireDateInput = document.querySelector(`input[name="${fieldPrefix}_tire_date"]`) as HTMLElement;
                  if (tireDateInput) {
                    tireDateInput.focus();
                  }
                }
              }}
              name={fieldPrefix ? `${fieldPrefix}_${part}_depth` : `${label.replace(/\s+/g, '_').toLowerCase()}_${part}_depth`}
            />
          </Box>
        ))}
      </Box>

      {/* SVG Visualization */}
      <TireTreadSideView
        innerEdgeCondition={value.inner_edge_condition}
        innerCondition={value.inner_condition}
        centerCondition={value.center_condition}
        outerCondition={value.outer_condition}
        outerEdgeCondition={value.outer_edge_condition}
        innerEdgeDepth={parseInt(value.inner_edge_depth) || 0}
        innerDepth={parseInt(value.inner_depth) || 0}
        centerDepth={parseInt(value.center_depth) || 0}
        outerDepth={parseInt(value.outer_depth) || 0}
        outerEdgeDepth={parseInt(value.outer_edge_depth) || 0}
      />

      {/* Tire Comments and Date - Date on the left side */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
        {/* Tire Date Input - moved to the left side */}
        <TextField
          label="Tire Date"
          placeholder="WW/YY"
          value={tireDate}
          onChange={(e) => {
            const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
            if (value.length === 4) {
              const week = value.slice(0, 2);
              const year = value.slice(2, 4);
              // Validate week is between 01-52
              const weekNum = parseInt(week);
              if (weekNum >= 1 && weekNum <= 52) {
                const formatted = `${week.padStart(2, '0')}/${year}`;
                onTireDateChange(formatted);
              } else {
                // If invalid week, just store the raw input
                onTireDateChange(value);
              }
            } else {
              onTireDateChange(value);
            }
          }}
          type="tel"
          inputProps={{
            maxLength: 4,
            pattern: '[0-9]*',
            inputMode: 'numeric',
            onFocus: handleFocus,
            style: { textAlign: 'center' }
          }}
          InputLabelProps={{
            style: { textAlign: 'center', width: '100%' }
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              marginTop: '8px',
              '& fieldset': {
                borderRadius: '4px'
              }
            },
            width: '120px',
            '& .MuiInputBase-input::placeholder': {
              opacity: 1,
              color: 'text.secondary'
            }
          }}
          name={fieldPrefix ? `${fieldPrefix}_tire_date` : `${label.replace(/\s+/g, '_').toLowerCase()}_tire_date`}
        />
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Chip
            label="Separated"
            color="error"
            variant={tireComments.includes('separated') ? 'filled' : 'outlined'}
            clickable
            onClick={() => onTireCommentToggle('separated')}
            sx={{ fontWeight: tireComments.includes('separated') ? 'bold' : 'normal' }}
          />
          <Chip
            label="Dry-Rotted"
            color="error"
            variant={tireComments.includes('dry_rotted') ? 'filled' : 'outlined'}
            clickable
            onClick={() => onTireCommentToggle('dry_rotted')}
            sx={{ fontWeight: tireComments.includes('dry_rotted') ? 'bold' : 'normal' }}
          />
          <Chip
            label="Choppy"
            color="warning"
            variant={tireComments.includes('choppy') ? 'filled' : 'outlined'}
            clickable
            onClick={() => onTireCommentToggle('choppy')}
            sx={{ fontWeight: tireComments.includes('choppy') ? 'bold' : 'normal' }}
          />
          <Chip
            label="Cupped"
            color="warning"
            variant={tireComments.includes('cupped') ? 'filled' : 'outlined'}
            clickable
            onClick={() => onTireCommentToggle('cupped')}
            sx={{ fontWeight: tireComments.includes('cupped') ? 'bold' : 'normal' }}
          />
        </Box>
      </Box>

      {/* Display Photos */}
      {photos && photos.length > 0 && (
        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {photos.map((photo, index) => {
            const imageUrl = photo.url || URL.createObjectURL(photo.file);
            
            return (
              <Box
                key={index}
                sx={{
                  position: 'relative',
                  width: '100px',
                  height: '100px',
                  borderRadius: 1,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  '&:hover': {
                    '& .delete-button': {
                      opacity: 1
                    }
                  }
                }}
              >
                <img
                  src={imageUrl}
                  alt={`${label} ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onClick={() => onPhotoClick()}
                />
                <IconButton
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePhoto(index);
                  }}
                  sx={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.7)',
                    }
                  }}
                  size="small"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            );
          })}
        </Box>
      )}
    </Stack>
  );
};

export default TireTreadSection; 