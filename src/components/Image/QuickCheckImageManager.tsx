import React, { useRef } from 'react';
import { Box, IconButton, Typography, Button } from '@mui/material';
import { PhotoCamera, Delete } from '@mui/icons-material';
import { ImageUpload } from '../../types/quickCheck';
import { getFullImageUrl } from '../../services/imageUpload';

interface QuickCheckImageManagerProps {
  type: string;
  photos: ImageUpload[];
  onPhotosChange: (photos: ImageUpload[]) => void;
  onPhotoClick?: (photos: ImageUpload[]) => void;
  label?: string;
  multiple?: boolean;
  showLabel?: boolean;
  maxPhotos?: number;
  disabled?: boolean;
}

const QuickCheckImageManager: React.FC<QuickCheckImageManagerProps> = ({
  type,
  photos,
  onPhotosChange,
  onPhotoClick,
  label,
  multiple = true,
  showLabel = true,
  maxPhotos = 10,
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter out deleted photos for display
  const activePhotos = photos.filter(photo => !photo.isDeleted);

  // Validate image file
  const validateImage = (file: File): Promise<string | null> => {
    if (!file.type.match('image.*')) {
      return Promise.resolve('Please upload an image file (JPEG, PNG, HEIC, etc.)');
    }
    if (file.size > 25 * 1024 * 1024) {
      return Promise.resolve('File size should be less than 25MB');
    }
    
    // Check if it's a HEIC file (iPhone photos)
    const isHEIC = file.type === 'image/heic' || file.type === 'image/heif' || 
                   file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
    
    if (isHEIC) {
      // Skip dimension validation for HEIC files since browsers can't load them natively
      // The server will handle HEIC files properly
      return Promise.resolve(null);
    }
    
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        if (img.width < 200 || img.height < 200) {
          resolve('Image resolution should be at least 200x200 pixels');
        } else {
          resolve(null);
        }
      };
      img.onerror = () => resolve('Invalid image file');
      img.src = URL.createObjectURL(file);
    });
  };

  // Handle file selection
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newPhotos: ImageUpload[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Check if we're at max photos limit
      if (activePhotos.length + newPhotos.length >= maxPhotos) {
        break;
      }

      const validationError = await validateImage(file);
      if (validationError) {
        console.error(`Validation error for ${file.name}:`, validationError);
        continue;
      }

      const imageUpload: ImageUpload = {
        file: file,
        progress: 100,
        url: URL.createObjectURL(file)
      };

      newPhotos.push(imageUpload);
    }

    if (newPhotos.length > 0) {
      onPhotosChange([...photos, ...newPhotos]);
    }
  };

  // Handle photo removal
  const handleRemovePhoto = (index: number) => {
    // Map back to include deleted photos but with current active photos
    const allPhotos = [...photos];
    const activeIndices = photos
      .map((photo, i) => (!photo.isDeleted ? i : -1))
      .filter(i => i !== -1);
    
    // Mark the photo as deleted instead of removing it
    if (activeIndices[index] !== undefined) {
      allPhotos[activeIndices[index]] = { ...allPhotos[activeIndices[index]], isDeleted: true };
    }
    
    onPhotosChange(allPhotos);
  };

  // Handle camera button click
  const handleCameraClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  // Handle photo click for viewing
  const handlePhotoClick = () => {
    if (onPhotoClick && activePhotos.length > 0) {
      onPhotoClick(activePhotos);
    }
  };

  // Get display URL for image - use blob URL for preview or full URL for saved images
  const getDisplayUrl = (photo: ImageUpload): string => {
    if (photo.url?.startsWith('blob:')) {
      return photo.url;
    }
    return photo.url ? getFullImageUrl(photo.url) : '';
  };

  return (
    <Box sx={{ mb: 2 }}>
      {showLabel && (
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
          {label}
        </Typography>
      )}
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {activePhotos.map((photo, index) => (
          <Box
            key={index}
            sx={{
              position: 'relative',
              width: '100px',
              height: '100px',
              border: '1px solid #ddd',
              borderRadius: 1,
              overflow: 'hidden',
              cursor: 'pointer',
            }}
            onClick={handlePhotoClick}
          >
            <img
              src={getDisplayUrl(photo)}
              alt={`${type} ${index + 1}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleRemovePhoto(index);
              }}
              sx={{
                position: 'absolute',
                top: 2,
                right: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                },
              }}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Box>
        ))}
        
        {activePhotos.length < maxPhotos && (
          <Button
            variant="outlined"
            onClick={handleCameraClick}
            disabled={disabled}
            sx={{
              width: '100px',
              height: '100px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 'unset',
              border: '2px dashed #ccc',
              borderRadius: 1,
              '&:hover': {
                border: '2px dashed #999',
              },
            }}
          >
            <PhotoCamera sx={{ fontSize: 24, mb: 0.5 }} />
            <Typography variant="caption">Add Photo</Typography>
          </Button>
        )}
      </Box>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        style={{ display: 'none' }}
        onChange={(e) => handleFileSelect(e.target.files)}
      />
    </Box>
  );
};

export default QuickCheckImageManager; 