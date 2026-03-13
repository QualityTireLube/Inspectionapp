import React from 'react';
import { Box, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { ImageUpload } from '../../types/quickCheck';
import { getFullImageUrl } from '../../services/imageUpload';
import SafariImageUpload from './SafariImageUpload';

interface ImageFieldDisplayProps {
  fieldName: string;
  images: ImageUpload[];
  loading: boolean;
  onImageUpload: (file: File, type: any) => Promise<void>;
  onImageClick: (photos: ImageUpload[], photoType?: string) => void;
  onDeleteImage: (photoType: string, index: number) => void;
}

export const ImageFieldDisplay: React.FC<ImageFieldDisplayProps> = ({
  fieldName,
  images,
  loading,
  onImageUpload,
  onImageClick,
  onDeleteImage
}) => {
  // Get display URL for image - use blob URL for preview or full URL for saved images
  const getDisplayUrl = (photo: ImageUpload): string => {
    if (photo.url?.startsWith('blob:')) {
      return photo.url;
    }
    return photo.url ? getFullImageUrl(photo.url) : URL.createObjectURL(photo.file);
  };

  return (
    <>
      {/* Safari Compatible Image Upload */}
      <Box sx={{ display: 'flex', gap: 1, ml: 1 }}>
        <SafariImageUpload
          onImageUpload={onImageUpload}
          uploadType={fieldName as any}
          disabled={loading}
          multiple={true}
          size="small"
        />
      </Box>

      {/* Image Grid */}
      {images.length > 0 && (
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
          gap: 2,
          maxWidth: '400px',
          mt: 2
        }}>
          {images.map((photo, index) => (
            <Box
              key={index}
              sx={{
                position: 'relative',
                aspectRatio: '1',
                borderRadius: 1,
                overflow: 'hidden',
                border: '1px solid #ddd',
                cursor: 'pointer',
                '&:hover .delete-button': {
                  opacity: 1
                }
              }}
            >
              <img
                src={getDisplayUrl(photo)}
                alt={`${fieldName} ${index + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                onClick={() => onImageClick(images, `${fieldName}_photos`)}
              />
              <IconButton
                className="delete-button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteImage(`${fieldName}_photos`, index);
                }}
                sx={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  bgcolor: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  '&:hover': {
                    bgcolor: 'rgba(0,0,0,0.9)',
                  },
                  padding: '4px',
                }}
                size="small"
              >
                <CloseIcon sx={{ fontSize: '16px' }} />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}
    </>
  );
}; 