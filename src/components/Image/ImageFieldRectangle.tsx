import React, { useState, useRef } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { PhotoCamera, Delete } from '@mui/icons-material';

interface ImageFieldRectangleProps {
  label: string;
  images: string[];
  onImageUpload: (file: File, type: any) => Promise<void>;
  onImageRemove: (index: number) => void;
  onImageView: (imageUrl: string) => void;
  uploadType: any;
  disabled?: boolean;
  multiple?: boolean;
  maxFiles?: number;
}

const ImageFieldRectangle: React.FC<ImageFieldRectangleProps> = ({
  label,
  images,
  onImageUpload,
  onImageRemove,
  onImageView,
  uploadType,
  disabled = false,
  multiple = true,
  maxFiles = 5
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File, type: any) => {
    try {
      setIsUploading(true);
      await onImageUpload(file, type);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCameraClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        handleImageUpload(file, uploadType);
      });
    }
    // Reset the input value so the same file can be selected again
    event.target.value = '';
  };

  const hasImages = images && Array.isArray(images) && images.length > 0;

  return (
    <Box sx={{ mb: 3 }}>
      {/* Label */}
      {label && (
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          {label}
        </Typography>
      )}

      {/* Main Rectangle Upload Area */}
      {!hasImages && (
        <Box
          onClick={handleCameraClick}
          sx={{
            width: '100%',
            aspectRatio: '3 / 1', // 3:1 ratio - 3 units wide, 1 unit tall
            border: '2px dashed #ccc',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.paper',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: 'action.hover',
            },
            position: 'relative',
            minHeight: 120,
          }}
        >
          {/* Camera Icon in Center */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              opacity: isUploading ? 0.5 : 1,
            }}
          >
            <PhotoCamera 
              sx={{ 
                fontSize: 48, 
                color: 'text.secondary',
                transition: 'color 0.3s ease',
              }} 
            />
            <Typography variant="body2" color="text.secondary">
              {isUploading ? 'Uploading...' : 'Tap to take photo'}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Hidden file input for camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        multiple={multiple}
        disabled={disabled || isUploading}
      />

      {/* Show first image in place of dashed box when images exist */}
      {hasImages && (
        <Box
          sx={{
            width: '100%',
            aspectRatio: '3 / 1',
            borderRadius: 2,
            overflow: 'hidden',
            cursor: 'pointer',
            position: 'relative',
            '&:hover .overlay, &:hover .delete-main': {
              opacity: 1,
            },
          }}
          onClick={() => onImageView(images[0])}
        >
          <img
            src={images[0]}
            alt="Dashboard lights"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          {/* Delete button for main image */}
          <IconButton
            className="delete-main"
            onClick={(e) => {
              e.stopPropagation();
              onImageRemove(0);
            }}
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              bgcolor: 'rgba(0, 0, 0, 0.6)',
              color: 'white',
              opacity: 0,
              transition: 'opacity 0.3s ease',
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.8)',
              },
            }}
            size="small"
          >
            <Delete fontSize="small" />
          </IconButton>
          {/* Overlay for additional images count */}
          {images.length > 1 && (
            <Box
              className="overlay"
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                bgcolor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontSize: '0.875rem',
                opacity: 0.8,
                transition: 'opacity 0.3s ease',
              }}
            >
              +{images.length - 1} more
            </Box>
          )}
        </Box>
      )}



      {/* Additional Images Display - Show remaining images as thumbnails */}
      {hasImages && images.length > 1 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Additional images ({images.length - 1}):
          </Typography>
          <Box 
            sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
              gap: 1
            }}
          >
            {images.slice(1).map((imageUrl, index) => (
              <Box
                key={index + 1}
                sx={{
                  position: 'relative',
                  aspectRatio: '1',
                  borderRadius: 1,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  '&:hover .delete-btn': {
                    opacity: 1,
                  },
                }}
              >
                <img
                  src={imageUrl}
                  alt={`${label} ${index + 2}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                  onClick={() => onImageView(imageUrl)}
                />
                <IconButton
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onImageRemove(index + 1);
                  }}
                  sx={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    bgcolor: 'rgba(0, 0, 0, 0.6)',
                    color: 'white',
                    opacity: 0,
                    transition: 'opacity 0.3s ease',
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.8)',
                    },
                    padding: '2px',
                  }}
                  size="small"
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Max Files Reached Message */}
      {maxFiles && images.length >= maxFiles && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Maximum {maxFiles} images uploaded
        </Typography>
      )}
    </Box>
  );
};

export default ImageFieldRectangle; 