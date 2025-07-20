// MIGRATION EXAMPLE: How to replace complex image code with QuickCheckImageManager
// This file shows the BEFORE and AFTER for easy comparison

import React from 'react';
import { QuickCheckImageManager } from './Image';
import { ImageUpload, PhotoType } from '../types/quickCheck';

// ===== BEFORE: Complex implementation (lines 1450-1650 in QuickCheck.tsx) =====
/*
<Grid item xs={12}>
  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
    <Typography variant="body1" sx={{ flexGrow: 1 }}>
      Dash Lights
    </Typography>
    <IconButton
      size="small"
      onClick={(e) => handleInfoClick(e, "With Vehicle Running what lights are on before we perform any services?")}
      sx={{ ml: 1 }}
    >
      <InfoIcon fontSize="small" />
    </IconButton>
  </Box>
  <Box
    sx={{
      border: '1px dashed #ccc',
      borderRadius: 2,
      width: '100%',
      aspectRatio: '4/1',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      mb: 2,
      overflow: 'hidden',
      bgcolor: 'grey.50',
    }}
  >
    {!form.dash_lights_photos.length ? (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          p: 2,
          width: '100%',
          height: '100%',
        }}
        onClick={() => dashLightsInputRef.current?.click()}
      >
        <CameraAltIcon sx={{ fontSize: 32, color: '#888', mb: 1 }} />
        <Typography variant="body2" color="text.secondary">
          Click to upload dash light photos
        </Typography>
      </Box>
    ) : (
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            width: '100%',
            height: '100%',
            p: 2,
            overflowX: 'auto',
            '&::-webkit-scrollbar': {
              height: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: '#f1f1f1',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#888',
              borderRadius: '4px',
              '&:hover': {
                background: '#555',
              },
            },
          }}
        >
          {form.dash_lights_photos
            .filter(photo => !photo.isDeleted)
            .map((photo, index) => {
              console.log(`Rendering dash light photo ${index}:`, photo);
              return (
                <Box
                  key={index}
                  sx={{
                    position: 'relative',
                    flex: '0 0 auto',
                    width: 'calc(25% - 12px)',
                    height: '100%',
                    cursor: 'pointer',
                    '&:hover': {
                      '& .overlay': {
                        opacity: 1,
                      },
                    },
                  }}
                  onClick={() => handleImageClick(form.dash_lights_photos.filter(p => !p.isDeleted), 'dash_lights_photos')}
                >
                  <Tooltip title="Click to view full size">
                    <img
                      src={photo.url || URL.createObjectURL(photo.file)}
                      alt={`Dash Light ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: 4,
                      }}
                      onLoad={() => console.log(`Dash light image ${index} loaded successfully:`, photo.url)}
                      onError={(e) => {
                        console.error(`Failed to load dash light image ${index}:`, photo.url, e);
                        if (photo.url && !photo.url.startsWith('http') && !photo.url.startsWith('/uploads/')) {
                          const newUrl = `/uploads/${photo.url}`;
                          console.log(`Trying alternative URL for image ${index}:`, newUrl);
                          e.currentTarget.src = newUrl;
                        }
                      }}
                    />
                  </Tooltip>
                  <Box
                    className="overlay"
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      bgcolor: 'rgba(0,0,0,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveDashLightsPhoto(index);
                      }}
                      sx={{
                        color: 'white',
                        bgcolor: 'rgba(0,0,0,0.5)',
                        '&:hover': {
                          bgcolor: 'rgba(0,0,0,0.7)',
                        },
                      }}
                    >
                      <CloseIcon />
                    </IconButton>
                  </Box>
                </Box>
              );
            })}
        </Box>
        <IconButton
          onClick={() => dashLightsInputRef.current?.click()}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            bgcolor: 'rgba(255,255,255,0.9)',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,1)',
            },
            boxShadow: 1,
          }}
        >
          <CameraAltIcon sx={{ fontSize: 24, color: '#888' }} />
        </IconButton>
      </Box>
    )}
    <input
      type="file"
      accept="image/*"
      multiple
      hidden
      ref={dashLightsInputRef}
      onChange={e => handleDashLightsPhotoUpload(e.target.files)}
    />
  </Box>
</Grid>
*/

// ===== AFTER: Simplified implementation =====
interface MigrationExampleProps {
  form: {
    dash_lights_photos: ImageUpload[];
  };
  handlePhotosChange: (type: string, photos: ImageUpload[]) => void;
  handleImageClick: (photos: ImageUpload[], type?: string) => void;
}

const DashLightsSimplified: React.FC<MigrationExampleProps> = ({
  form,
  handlePhotosChange,
  handleImageClick
}) => {
  return (
    <>
      {/* Info icon can still be added separately if needed */}
      <QuickCheckImageManager
        type="dash_lights_photos"
        photos={form.dash_lights_photos}
        onPhotosChange={(photos) => handlePhotosChange('dash_lights_photos', photos)}
        onPhotoClick={(photos) => handleImageClick(photos, 'dash_lights_photos')}
        label="Dash Lights"
        showLabel={true}
        aspectRatio="4/1"
        maxPhotos={8}
      />
    </>
  );
};

// ===== COMPARISON =====
/*
BEFORE: 200+ lines of complex code
AFTER:  10 lines of simple code

REMOVED:
- Complex Box layouts
- Manual file input handling  
- Custom overlay effects
- Repetitive photo mapping
- Error-prone state management
- Inconsistent styling

GAINED:
- Consistent UX across all image types
- Built-in validation and error handling
- Responsive design
- Cleaner, more maintainable code
- Type safety
- Easy testing
*/

export default DashLightsSimplified; 