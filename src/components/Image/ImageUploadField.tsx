import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';

interface ImageUpload {
  file: File;
  progress: number;
  url?: string;
  error?: string;
  position?: number;
  isDeleted?: boolean;
}

interface ImageUploadFieldProps {
  photos: ImageUpload[];
  onImageUpload: (file: File) => void;
  onImageClick: (photos: ImageUpload[]) => void;
  onCameraOpen: () => void;
  label?: string;
  maxWidth?: string;
  maxHeight?: string;
}

const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  photos,
  onImageUpload,
  onImageClick,
  onCameraOpen,
  label = 'Photos',
  maxWidth = '100px',
  maxHeight = '100px'
}) => {
  // Filter out deleted photos for display
  const activePhotos = photos.filter(photo => !photo.isDeleted);

  return (
    <Box sx={{ position: 'relative' }}>
      {activePhotos.length > 0 && (
        <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {activePhotos.map((photo, index) => (
            <img
              key={index}
              src={URL.createObjectURL(photo.file)}
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
    </Box>
  );
};

export default ImageUploadField; 