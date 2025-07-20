import React, { useState } from 'react';
import {
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  Stack,
  Typography,
  IconButton
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { BrakePadCondition } from '../types/quickCheck';

interface BrakePadConditionSelectorProps {
  innerCondition: BrakePadCondition;
  outerCondition: BrakePadCondition;
  onConditionChange: (type: 'inner' | 'outer', condition: BrakePadCondition) => void;
  side: 'driver' | 'passenger';
  axle: 'front' | 'rear';
  onDrumsNotChecked?: () => void;
}

const conditionOptions: { value: BrakePadCondition; label: string; color: 'success' | 'warning' | 'error' | 'default' }[] = [
  { value: 'good', label: '✅', color: 'success' },
  { value: 'warning', label: '⚠️', color: 'warning' },
  { value: 'bad', label: '❌', color: 'error' },
  { value: 'critical', label: '🚨', color: 'error' },
  { value: 'metal_to_metal', label: 'Metal to Metal', color: 'error' },
  { value: 'off', label: '🛞 Off', color: 'default' },
  { value: 'drums_not_checked', label: 'Drums not checked', color: 'default' }
];

export const BrakePadConditionSelector: React.FC<BrakePadConditionSelectorProps> = ({
  innerCondition,
  outerCondition,
  onConditionChange,
  side,
  axle,
  onDrumsNotChecked
}) => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedPadType, setSelectedPadType] = useState<'inner' | 'outer' | null>(null);

  const handleChipClick = (padType: 'inner' | 'outer') => {
    setSelectedPadType(padType);
    setIsPopupOpen(true);
  };

  const handleConditionSelect = (condition: BrakePadCondition) => {
    if (selectedPadType) {
      onConditionChange(selectedPadType, condition);
      
      // If drums_not_checked is selected on rear axle, update all rear brake pads
      if (condition === 'drums_not_checked' && axle === 'rear' && onDrumsNotChecked) {
        onDrumsNotChecked();
      }
    }
    setIsPopupOpen(false);
    setSelectedPadType(null);
  };

  const handleClose = () => {
    setIsPopupOpen(false);
    setSelectedPadType(null);
  };

  const getChipColor = (condition: BrakePadCondition) => {
    const option = conditionOptions.find(opt => opt.value === condition);
    return option?.color || 'default';
  };

  const getChipLabel = (condition: BrakePadCondition) => {
    const option = conditionOptions.find(opt => opt.value === condition);
    return option?.label || condition;
  };

  // Filter condition options based on axle type
  const getFilteredConditionOptions = () => {
    if (axle === 'front') {
      return conditionOptions.filter(option => option.value !== 'drums_not_checked');
    }
    return conditionOptions;
  };

  return (
    <Box>
      <Stack direction="column" spacing={1} sx={{ mb: 1 }}>
        <Chip
          label={`Inner: ${getChipLabel(innerCondition)}`}
          color={getChipColor(innerCondition)}
          variant="filled"
          clickable
          onClick={() => handleChipClick('inner')}
          sx={{ 
            minWidth: '100px',
            '& .MuiChip-label': {
              fontWeight: 'bold'
            }
          }}
        />
        <Chip
          label={`Outer: ${getChipLabel(outerCondition)}`}
          color={getChipColor(outerCondition)}
          variant="filled"
          clickable
          onClick={() => handleChipClick('outer')}
          sx={{ 
            minWidth: '100px',
            '& .MuiChip-label': {
              fontWeight: 'bold'
            }
          }}
        />
      </Stack>

      <Dialog
        open={isPopupOpen}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              {`Select ${selectedPadType?.charAt(0).toUpperCase()}${selectedPadType?.slice(1)} Pad Condition`}
            </Typography>
            <IconButton onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {`${side.charAt(0).toUpperCase()}${side.slice(1)} ${axle.charAt(0).toUpperCase()}${axle.slice(1)} Brake Pad`}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ 
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            justifyContent: 'center'
          }}>
            {getFilteredConditionOptions().map((option) => (
              <Box
                key={option.value}
                sx={{ 
                  width: 'calc(50% - 8px)',
                  minWidth: '140px'
                }}
              >
                <Chip
                  label={option.label}
                  color={option.color}
                  variant="outlined"
                  clickable
                  onClick={() => handleConditionSelect(option.value)}
                  sx={{
                    width: '100%',
                    height: '48px',
                    fontSize: '14px',
                    '& .MuiChip-label': {
                      fontWeight: 'bold',
                      textAlign: 'center',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      lineHeight: 1.2,
                      padding: '4px 8px'
                    },
                    '&:hover': {
                      transform: 'scale(1.02)',
                      transition: 'transform 0.2s'
                    }
                  }}
                />
              </Box>
            ))}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}; 