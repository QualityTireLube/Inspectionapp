/**
 * Photo Field Component
 * 
 * Advanced photo upload field with:
 * - Multiple file upload
 * - Image preview grid
 * - HEIC conversion
 * - Drag & drop support
 * - Safari iOS compatibility
 */

import React from 'react';
import { Box, IconButton, Typography, Card, CardContent } from '@mui/material';
import Grid from '../../CustomGrid';
import { PhotoCamera, Delete, Visibility } from '@mui/icons-material';
import { BaseFieldProps } from '../base/FieldProps';
import { withBaseField } from '../base/BaseField';
import SafariImageUpload from '../../Image/SafariImageUpload';

interface PhotoData {
  id: string;
  file?: File;
  url?: string;
  name: string;
  size: number;
  type: string;
  uploaded?: boolean;
  progress?: number;
}

interface PhotoFieldProps extends BaseFieldProps<PhotoData[]> {
  maxFiles?: number;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
  showPreview?: boolean;
  allowReorder?: boolean;
  resize1080p?: boolean;
  uploadType?: string;
}

const PhotoFieldCore: React.FC<PhotoFieldProps> = ({
  id,
  value = [],
  onChange,
  disabled,
  readOnly,
  maxFiles = 10,
  maxSize = 10,
  acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic'],
  showPreview = true,
  allowReorder = false,
  resize1080p = true,
  uploadType = 'photos'
}) => {
  const handleImageUpload = async (file: File, type: any) => {
    if (value.length >= maxFiles) {
      return; // Max files reached
    }

    const photoData: PhotoData = {
      id: `${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      uploaded: false,
      progress: 0
    };

    onChange([...value, photoData]);
  };

  const handleDelete = (photoId: string) => {
    onChange(value.filter(photo => photo.id !== photoId));
  };

  const handleView = (photo: PhotoData) => {
    if (photo.url || photo.file) {
      // Open image in modal or new tab
      const url = photo.url || (photo.file ? URL.createObjectURL(photo.file) : '');
      window.open(url, '_blank');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box>
      {/* Upload area */}
      <Box sx={{ mb: 2 }}>
        <SafariImageUpload
          onImageUpload={handleImageUpload}
          uploadType={uploadType}
          disabled={disabled || readOnly || value.length >= maxFiles}
          multiple={true}
          maxFiles={maxFiles}
          resize1080p={resize1080p}
          showCameraButton={true}
          showGalleryButton={true}
        />
        
        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
          {value.length} of {maxFiles} photos • Max {maxSize}MB each
        </Typography>
      </Box>

      {/* Photo preview grid */}
      {showPreview && value.length > 0 && (
        <Grid container spacing={1}>
          {value.map((photo) => (
            <Grid item xs={6} sm={4} md={3} key={photo.id}>
              <Card 
                variant="outlined" 
                sx={{ 
                  position: 'relative',
                  aspectRatio: '1',
                  overflow: 'hidden'
                }}
              >
                {/* Image preview */}
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    backgroundImage: photo.url || (photo.file ? `url(${URL.createObjectURL(photo.file)})` : ''),
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundColor: '#f5f5f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {!photo.url && !photo.file && (
                    <PhotoCamera sx={{ fontSize: 40, color: 'text.secondary' }} />
                  )}
                </Box>

                {/* Action overlay */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    borderRadius: '0 0 0 8px',
                    display: 'flex'
                  }}
                >
                  <IconButton
                    size="small"
                    onClick={() => handleView(photo)}
                    sx={{ color: 'white' }}
                  >
                    <Visibility fontSize="small" />
                  </IconButton>
                  
                  {!readOnly && (
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(photo.id)}
                      disabled={disabled}
                      sx={{ color: 'white' }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  )}
                </Box>

                {/* File info overlay */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    p: 0.5
                  }}
                >
                  <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem' }}>
                    {photo.name.length > 20 ? `${photo.name.substring(0, 17)}...` : photo.name}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.6rem', opacity: 0.8 }}>
                    {formatFileSize(photo.size)}
                  </Typography>
                </Box>

                {/* Upload progress */}
                {photo.progress !== undefined && photo.progress < 100 && (
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 4,
                      backgroundColor: 'rgba(255,255,255,0.3)'
                    }}
                  >
                    <Box
                      sx={{
                        height: '100%',
                        backgroundColor: 'primary.main',
                        width: `${photo.progress}%`,
                        transition: 'width 0.3s'
                      }}
                    />
                  </Box>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export const PhotoField = withBaseField(PhotoFieldCore);

// Field definition for registry
export const PhotoFieldDefinition = {
  id: 'photo',
  name: 'Photo Field',
  category: 'media' as const,
  description: 'Multiple photo upload with preview grid and HEIC support',
  configurable: {
    validation: true,
    layout: true
  }
};
