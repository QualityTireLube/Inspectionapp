import React from 'react';
import { Box, Stack, Typography, TextField, Chip, IconButton } from '@mui/material';
import BrakePadSideView from './BrakePadSideView';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CloseIcon from '@mui/icons-material/Close';

const ROTOR_CONDITIONS = [
  { value: 'good', label: 'Good' },
  { value: 'grooves', label: 'Grooves' },
  { value: 'overheated', label: 'Overheated' },
  { value: 'scared', label: 'Scared/Grinded' },
];

type RotorCondition = 'good' | 'grooves' | 'overheated' | 'scared';

interface BrakePadSectionProps {
  label?: string;
  onCameraClick?: () => void;
  onChooseFile?: () => void;
  photos?: { file: File; progress: number; url?: string; error?: string; }[];
  onPhotoClick?: (photos: { file: File; progress: number; url?: string; error?: string; }[]) => void;
  onDeletePhoto?: (index: number) => void;
  innerPad?: number;
  outerPad?: number;
  rotorCondition?: RotorCondition;
  onInnerPadChange?: (value: string) => void;
  onOuterPadChange?: (value: string) => void;
  onRotorConditionChange?: (condition: RotorCondition) => void;
}

const BrakePadSection: React.FC<BrakePadSectionProps> = ({ 
  label = 'Brake Pads',
  onCameraClick,
  onChooseFile,
  photos = [],
  onPhotoClick,
  onDeletePhoto,
  innerPad = '',
  outerPad = '',
  rotorCondition = 'good',
  onInnerPadChange,
  onOuterPadChange,
  onRotorConditionChange
}) => {
  const handleCameraClick = () => {
    if (onChooseFile) {
      onChooseFile();
    } else if (onCameraClick) {
      onCameraClick();
    }
  };

  return (
    <Stack spacing={2} sx={{ mb: 4, position: 'relative' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>{label}</Typography>
        <IconButton
          onClick={handleCameraClick}
          color="primary"
          size="small"
        >
          <CameraAltIcon />
        </IconButton>
      </Box>
      <Box sx={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
        <TextField
          label="Outer (mm)"
          placeholder="e.g. 8"
          value={outerPad}
          type="tel"
          inputProps={{ 
            inputMode: 'numeric', 
            pattern: '[0-9]*', 
            style: { textAlign: 'center' },
            onFocus: (e) => e.target.select()
          }}
          onChange={e => {
            const num = e.target.value.replace(/\D/g, '');
            onOuterPadChange?.(num);
            // If a value was entered, focus the inner pad input
            if (num) {
              const innerInput = document.querySelector(`input[name="${label.replace(/\s+/g, '_').toLowerCase()}_inner_pad"]`);
              if (innerInput) {
                (innerInput as HTMLElement).focus();
              }
            }
          }}
          name={`${label.replace(/\s+/g, '_').toLowerCase()}_outer_pad`}
        />
        <TextField
          label="Inner (mm)"
          placeholder="e.g. 8"
          value={innerPad}
          type="tel"
          inputProps={{ 
            inputMode: 'numeric', 
            pattern: '[0-9]*', 
            style: { textAlign: 'center' },
            onFocus: (e) => e.target.select()
          }}
          onChange={e => onInnerPadChange?.(e.target.value.replace(/\D/g, ''))}
          name={`${label.replace(/\s+/g, '_').toLowerCase()}_inner_pad`}
        />
      </Box>
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 1 }}>
        {ROTOR_CONDITIONS.map(opt => (
          <Chip
            key={opt.value}
            label={opt.label}
            color={rotorCondition === opt.value ? 'primary' : 'default'}
            variant={rotorCondition === opt.value ? 'filled' : 'outlined'}
            clickable
            onClick={() => onRotorConditionChange?.(opt.value as RotorCondition)}
            sx={{ fontWeight: rotorCondition === opt.value ? 'bold' : 'normal' }}
          />
        ))}
      </Box>
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
        <BrakePadSideView
          innerPad={innerPad ? Number(innerPad) : 0}
          outerPad={outerPad ? Number(outerPad) : 0}
          rotorCondition={rotorCondition}
          width={500}
          height={375}
        />
      </Box>
      {photos && photos.length > 0 && (
        <Box sx={{ 
          mt: 4,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
          gap: 1,
          width: '100%',
          maxWidth: '400px',
          mx: 'auto',
          borderTop: '1px solid',
          borderColor: 'divider',
          pt: 2,
          position: 'relative',
          zIndex: 1
        }}>
          {photos.map((photo, index) => (
            <Box
              key={index}
              sx={{
                position: 'relative',
                width: '100%',
                paddingTop: '100%',
                borderRadius: 1,
                overflow: 'hidden',
                cursor: 'pointer',
                boxShadow: 1,
                '&:hover': {
                  '& .delete-button': {
                    opacity: 1
                  }
                }
              }}
            >
              <img
                src={photo.url}
                alt={`${label} ${index + 1}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                onClick={() => onPhotoClick?.(photos)}
              />
              <IconButton
                className="delete-button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeletePhoto?.(index);
                }}
                sx={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  bgcolor: 'rgba(0, 0, 0, 0.5)',
                  color: 'white',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  padding: '2px',
                  '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.7)',
                  }
                }}
                size="small"
              >
                <CloseIcon sx={{ fontSize: '0.875rem' }} />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}
    </Stack>
  );
};

export default BrakePadSection; 