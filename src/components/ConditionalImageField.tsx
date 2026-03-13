import React from 'react';
import { Box, FormControl, FormLabel, Stack, Chip, IconButton } from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import { getFullImageUrl } from '../services/imageUpload';

interface ImageUpload {
  file: File;
  progress: number;
  url?: string;
  error?: string;
  position?: number;
  isDeleted?: boolean;
}

interface ConditionOption {
  value: string;
  label: string;
  color: 'success' | 'warning' | 'error' | 'info' | 'default';
}

interface ConditionalImageFieldProps {
  label: string;
  condition: string;
  conditionOptions: ConditionOption[];
  photos: ImageUpload[];
  onConditionChange: (value: string) => void;
  onImageClick: (photos: ImageUpload[]) => void;
  onCameraOpen: () => void;
  maxWidth?: string;
  maxHeight?: string;
}

const ConditionalImageField: React.FC<ConditionalImageFieldProps> = ({
  label,
  condition,
  conditionOptions,
  photos,
  onConditionChange,
  onImageClick,
  onCameraOpen,
  maxWidth = '100px',
  maxHeight = '100px'
}) => {
  // Filter out deleted photos for display
  const activePhotos = photos.filter(photo => !photo.isDeleted);
  
  // Helper function to get display URL for images
  const getDisplayUrl = (photo: ImageUpload): string => {
    if (photo.url?.startsWith('blob:')) {
      return photo.url;
    }
    return photo.url ? getFullImageUrl(photo.url) : URL.createObjectURL(photo.file);
  };

  return (
    <FormControl component="fieldset" sx={{ width: '100%', position: 'relative' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <FormLabel component="legend">{label}</FormLabel>
      </Box>
      <Stack 
        direction="row" 
        spacing={1} 
        sx={{ 
          mt: 1,
          flexWrap: 'wrap',
          gap: 1,
          '& .MuiChip-root': {
            mb: 1
          }
        }}
      >
        {conditionOptions.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            color={option.color}
            variant={condition === option.value ? 'filled' : 'outlined'}
            clickable
            onClick={() => onConditionChange(option.value)}
            sx={{ fontWeight: condition === option.value ? 'bold' : 'normal' }}
          />
        ))}
      </Stack>
      {activePhotos.length > 0 && (
        <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {activePhotos.map((photo, index) => (
            <img
              key={index}
              src={getDisplayUrl(photo)}
              alt={`${label} ${index + 1}`}
              style={{ 
                maxWidth, 
                maxHeight, 
                cursor: 'pointer',
                borderRadius: '4px',
                objectFit: 'cover'
              }}
              onClick={() => onImageClick(activePhotos)}
            />
          ))}
        </Box>
      )}
      <IconButton
        onClick={onCameraOpen}
        color="primary"
        size="small"
        sx={{
          position: 'absolute',
          right: 0,
          top: 0,
          bgcolor: 'background.paper',
          boxShadow: 1,
          '&:hover': {
            bgcolor: 'action.hover'
          }
        }}
      >
        <CameraAltIcon />
      </IconButton>
    </FormControl>
  );
};

export default ConditionalImageField; 