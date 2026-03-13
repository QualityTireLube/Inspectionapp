import React from 'react';
import Grid from './CustomGrid';
import { Box, Typography, IconButton } from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';

interface ImageUpload {
  file: File;
  progress: number;
  url?: string;
  error?: string;
  position?: number;
  isDeleted?: boolean;
}

interface TPMSToolFieldProps {
  photos: ImageUpload[];
  onImageClick: (photos: ImageUpload[]) => void;
  onCameraOpen: () => void;
}

const TPMSToolField: React.FC<TPMSToolFieldProps> = ({
  photos,
  onImageClick,
  onCameraOpen
}) => {
  // Filter out deleted photos for display
  const activePhotos = photos.filter(photo => !photo.isDeleted);

  return (
    <Grid columns={{ xs: 12 }}>
      <Box sx={{ position: 'relative' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
            TPMS Tool Bad Sensors
          </Typography>
          <IconButton
            onClick={onCameraOpen}
            color="primary"
            size="small"
          >
            <CameraAltIcon />
          </IconButton>
        </Box>
        
        {activePhotos.length > 0 && (
          <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {activePhotos.map((photo, index) => (
              <img
                key={index}
                src={photo.url || URL.createObjectURL(photo.file)}
                alt={`TPMS Tool Bad Sensors ${index + 1}`}
                style={{ 
                  maxWidth: '120px', 
                  maxHeight: '120px', 
                  cursor: 'pointer',
                  borderRadius: '4px',
                  objectFit: 'cover'
                }}
                onClick={() => onImageClick(activePhotos)}
              />
            ))}
          </Box>
        )}
      </Box>
    </Grid>
  );
};

export default TPMSToolField; 