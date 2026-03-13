import React from 'react';
import { 
  Typography, 
  TextField, 
  Button, 
  Box, 
  Stack, 
  Chip, 
  IconButton,
  CircularProgress
} from '@mui/material';
import { 
  PhotoCamera as PhotoCameraIcon, 
  Close as CloseIcon,
  Info as InfoIcon,
  PhotoLibrary as PhotoLibraryIcon
} from '@mui/icons-material';
import Grid from '../../CustomGrid';
import { QuickCheckForm } from '../../../types/quickCheck';
import NotesField from './NotesField';
import { ImageFieldDisplay, SafariImageUpload, ImageFieldRectangle, GuidedVisuals, GuidedVisualField } from '../../Image';
import { getFullImageUrl } from '../../../services/imageUpload';

type ImageUploadType = 'passenger_front' | 'driver_front' | 'driver_rear' | 'passenger_rear' | 'spare' | 'undercarriage_photos' | 'front_brakes' | 'rear_brakes' | 'tpms_placard' | 'washer_fluid' | 'engine_air_filter' | 'battery' | 'tpms_tool' | 'dashLights' | 'mileage' | 'windshield_condition' | 'wiper_blades' | 'washer_squirters' | 'check_engine_mounts_photos' | 'exterior_lights_photos';

interface ImageUpload {
  file: File;
  progress: number;
  url?: string;
  error?: string;
  position?: number;
  isDeleted?: boolean;
}

interface PullingIntoBayTabProps {
  form: QuickCheckForm;
  loading: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRadioChange: (name: string, value: string) => void;
  onImageUpload: (file: File, type: ImageUploadType) => Promise<void>;
  onImageClick: (photos: ImageUpload[], photoType?: string) => void;
  onInfoClick: (event: React.MouseEvent<HTMLElement>, content: string) => void;
  onFormUpdate: (updates: Partial<QuickCheckForm>) => void;
  onFieldNotesChange: (fieldName: string, noteText: string) => void;
  onDeleteImage: (photoType: string, index: number) => void;
  enabledFields?: readonly string[];
}

export const PullingIntoBayTab: React.FC<PullingIntoBayTabProps> = ({
  form,
  loading,
  onChange,
  onRadioChange,
  onImageUpload,
  onImageClick,
  onInfoClick,
  onFormUpdate,
  onFieldNotesChange,
  onDeleteImage,
  enabledFields
}) => {
  const isEnabled = (k: string) => !enabledFields || enabledFields.includes(k);
  // Helper function to get display URL for images
  const getDisplayUrl = (photo: ImageUpload): string => {
    if (photo.url?.startsWith('blob:')) {
      return photo.url;
    }
    return photo.url ? getFullImageUrl(photo.url) : URL.createObjectURL(photo.file);
  };

  // Configure guided visual fields
  const guidedVisualFields: GuidedVisualField[] = [
    {
      fieldName: 'dashimage',
      prompt: 'With Vehicle Running what lights are on before we perform any services?',
      guidedVisualType: 'vehicle_instrument_cluster',
      triggerConditions: {
        tabName: 'Pulling Into Bay',
        fieldEmpty: true,
      },
      uploadType: 'dashLights'
    }
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Guided Visuals Component */}
      <GuidedVisuals
        onImageUpload={onImageUpload}
        fieldConfigurations={guidedVisualFields}
        currentTab="Pulling Into Bay"
        formData={form}
        disabled={loading}
        multiple={true}
        maxFiles={5}
        resize1080p={true}
        cameraFacing="environment"
      />

      {/* Dash Lights */}
      {isEnabled('dash_lights_photos') && (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <SafariImageUpload
            onImageUpload={onImageUpload}
            uploadType="dashLights"
            disabled={loading}
            multiple={true}
            size="small"
            resize1080p={true}
            showCameraButton={true}
            showGalleryButton={false}
          />
          <Typography variant="body1" sx={{ flexGrow: 1, ml: 1 }}>
            With Vehicle Running what lights are on before we perform any services?
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <SafariImageUpload
              onImageUpload={onImageUpload}
              uploadType="dashLights"
              disabled={loading}
              multiple={true}
              size="small"
              resize1080p={true}
              showCameraButton={false}
              showGalleryButton={true}
            />
            <NotesField
              fieldName="dash_lights"
              fieldLabel="Dash Lights"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
            <IconButton
              size="small"
              onClick={(e) => onInfoClick(e, "Document any warning lights or indicators on the dashboard while the vehicle is running before performing services.")}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        
        <ImageFieldRectangle
          label=""
          images={form.dash_lights_photos
            .filter(photo => photo && !photo.isDeleted)
            .map(photo => getDisplayUrl(photo))
            .filter(url => url && url.length > 0)}
          onImageUpload={onImageUpload}
          onImageRemove={(index) => onFormUpdate({
            dash_lights_photos: form.dash_lights_photos.filter((_, i) => i !== index)
          })}
          onImageView={(imageUrl) => onImageClick(form.dash_lights_photos, 'dash_lights_photos')}
          uploadType="dashLights"
          disabled={loading}
          multiple={true}
          maxFiles={5}
        />
      </Box>
      )}

      {/* Mileage */}
      {isEnabled('mileage') && (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <SafariImageUpload
            onImageUpload={onImageUpload}
            uploadType="mileage"
            disabled={loading}
            multiple={true}
            size="small"
            resize1080p={true}
            showCameraButton={true}
            showGalleryButton={false}
          />
          <Typography variant="body1" sx={{ flexGrow: 1, ml: 1 }}>
            Mileage<span style={{ color: 'red' }}>*</span>
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <SafariImageUpload
              onImageUpload={onImageUpload}
              uploadType="mileage"
              disabled={loading}
              multiple={true}
              size="small"
              resize1080p={true}
              showCameraButton={false}
              showGalleryButton={true}
            />
            <NotesField
              fieldName="mileage"
              fieldLabel="Mileage"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
            <IconButton
              size="small"
              onClick={(e) => onInfoClick(e, "What is the Current Mileage")}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        <TextField
          fullWidth
          name="mileage"
          value={form.mileage}
          onChange={onChange}
          inputProps={{
            inputMode: 'numeric',
            pattern: '[0-9,]*',
          }}
        />
        
        {/* Mileage Photos Display */}
        {form.mileage_photos.length > 0 && (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
            gap: 2,
            mt: 2 
          }}>
            {form.mileage_photos.map((photo, index) => (
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
                  alt={`Mileage ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onClick={() => onImageClick(form.mileage_photos, 'mileage_photos')}
                />
                <IconButton
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteImage('mileage_photos', index);
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
      </Box>
      )}

      {/* Windshield Condition */}
      {isEnabled('windshield_condition') && (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <SafariImageUpload
            onImageUpload={onImageUpload}
            uploadType="windshield_condition"
            disabled={loading}
            multiple={true}
            size="small"
            resize1080p={true}
            showCameraButton={true}
            showGalleryButton={false}
          />
          <Typography variant="body1" sx={{ flexGrow: 1, ml: 1 }}>
            Windshield Condition
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <SafariImageUpload
              onImageUpload={onImageUpload}
              uploadType="windshield_condition"
              disabled={loading}
              multiple={true}
              size="small"
              resize1080p={true}
              showCameraButton={false}
              showGalleryButton={true}
            />
            <NotesField
              fieldName="windshield_condition"
              fieldLabel="Windshield Condition"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
            <IconButton
              size="small"
              onClick={(e) => onInfoClick(e, "Does the Windshield have any cracks larger than 8in? Are there any Star Cracks larger than 1in?")}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
          <Chip
            label="✅ Good"
            color="success"
            variant={form.windshield_condition === 'good' ? 'filled' : 'outlined'}
            clickable
            onClick={() => onRadioChange('windshield_condition', 'good')}
            sx={{ fontWeight: form.windshield_condition === 'good' ? 'bold' : 'normal' }}
          />
          <Chip
            label="❌ Bad"
            color="error"
            variant={form.windshield_condition === 'bad' ? 'filled' : 'outlined'}
            clickable
            onClick={() => onRadioChange('windshield_condition', 'bad')}
            sx={{ fontWeight: form.windshield_condition === 'bad' ? 'bold' : 'normal' }}
          />
        </Stack>
        
        {/* Windshield Condition Photos Display */}
        {form.windshield_condition_photos.length > 0 && (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
            gap: 2,
            mt: 2 
          }}>
            {form.windshield_condition_photos.map((photo, index) => (
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
                  alt={`Windshield Condition ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onClick={() => onImageClick(form.windshield_condition_photos, 'windshield_condition_photos')}
                />
                <IconButton
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteImage('windshield_condition_photos', index);
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
      </Box>
      )}

      {/* Wiper Blades */}
      {isEnabled('wiper_blades') && (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <SafariImageUpload
            onImageUpload={onImageUpload}
            uploadType="wiper_blades"
            disabled={loading}
            multiple={true}
            size="small"
            resize1080p={true}
            showCameraButton={true}
            showGalleryButton={false}
          />
          <Typography variant="body1" sx={{ flexGrow: 1, ml: 1 }}>
            Wiper Blades<span style={{ color: 'red' }}>*</span>
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <SafariImageUpload
              onImageUpload={onImageUpload}
              uploadType="wiper_blades"
              disabled={loading}
              multiple={true}
              size="small"
              resize1080p={true}
              showCameraButton={false}
              showGalleryButton={true}
            />
            <NotesField
              fieldName="wiper_blades"
              fieldLabel="Wiper Blades"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
            <IconButton
              size="small"
              onClick={(e) => onInfoClick(e, "Inspect front and rear wiper blades for wear, streaking, or damage. Test wiper functionality and note any issues.")}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        
        {/* Front Wiper Blades */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Front
          </Typography>
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
            <Chip
              label="✅ Good"
              color="success"
              variant={form.wiper_blades_front === 'good' ? 'filled' : 'outlined'}
              clickable
              onClick={() => onRadioChange('wiper_blades_front', 'good')}
              sx={{ fontWeight: form.wiper_blades_front === 'good' ? 'bold' : 'normal', mb: 1 }}
            />
            <Chip
              label="⚠️ Minor"
              color="warning"
              variant={form.wiper_blades_front === 'minor' ? 'filled' : 'outlined'}
              clickable
              onClick={() => onRadioChange('wiper_blades_front', 'minor')}
              sx={{ fontWeight: form.wiper_blades_front === 'minor' ? 'bold' : 'normal', mb: 1 }}
            />
            <Chip
              label="❌ Moderate"
              color="error"
              variant={form.wiper_blades_front === 'moderate' ? 'filled' : 'outlined'}
              clickable
              onClick={() => onRadioChange('wiper_blades_front', 'moderate')}
              sx={{ fontWeight: form.wiper_blades_front === 'moderate' ? 'bold' : 'normal', mb: 1 }}
            />
            <Chip
              label="🚨 Major"
              color="error"
              variant={form.wiper_blades_front === 'major' ? 'filled' : 'outlined'}
              clickable
              onClick={() => onRadioChange('wiper_blades_front', 'major')}
              sx={{ fontWeight: form.wiper_blades_front === 'major' ? 'bold' : 'normal', mb: 1 }}
            />
          </Stack>
        </Box>

        {/* Rear Wiper Blades */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Rear
          </Typography>
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
            <Chip
              label="✅ Good"
              color="success"
              variant={form.wiper_blades_rear === 'good' ? 'filled' : 'outlined'}
              clickable
              onClick={() => onRadioChange('wiper_blades_rear', 'good')}
              sx={{ fontWeight: form.wiper_blades_rear === 'good' ? 'bold' : 'normal', mb: 1 }}
            />
            <Chip
              label="⚠️ Minor"
              color="warning"
              variant={form.wiper_blades_rear === 'minor' ? 'filled' : 'outlined'}
              clickable
              onClick={() => onRadioChange('wiper_blades_rear', 'minor')}
              sx={{ fontWeight: form.wiper_blades_rear === 'minor' ? 'bold' : 'normal', mb: 1 }}
            />
            <Chip
              label="❌ Moderate"
              color="error"
              variant={form.wiper_blades_rear === 'moderate' ? 'filled' : 'outlined'}
              clickable
              onClick={() => onRadioChange('wiper_blades_rear', 'moderate')}
              sx={{ fontWeight: form.wiper_blades_rear === 'moderate' ? 'bold' : 'normal', mb: 1 }}
            />
            <Chip
              label="🚨 Major"
              color="error"
              variant={form.wiper_blades_rear === 'major' ? 'filled' : 'outlined'}
              clickable
              onClick={() => onRadioChange('wiper_blades_rear', 'major')}
              sx={{ fontWeight: form.wiper_blades_rear === 'major' ? 'bold' : 'normal', mb: 1 }}
            />
          </Stack>
        </Box>
        
        {/* Wiper Blades Photos Display */}
        {form.wiper_blades_photos.length > 0 && (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
            gap: 2,
            mt: 2 
          }}>
            {form.wiper_blades_photos.map((photo, index) => (
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
                  alt={`Wiper Blades ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onClick={() => onImageClick(form.wiper_blades_photos, 'wiper_blades_photos')}
                />
                <IconButton
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteImage('wiper_blades_photos', index);
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
      </Box>
      )}

      {/* Washer Squirters */}
      {isEnabled('washer_squirters') && (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <SafariImageUpload
            onImageUpload={onImageUpload}
            uploadType="washer_squirters"
            disabled={loading}
            multiple={true}
            size="small"
            resize1080p={true}
            showCameraButton={true}
            showGalleryButton={false}
          />
          <Typography variant="body1" sx={{ flexGrow: 1, ml: 1 }}>
            Washer Squirters<span style={{ color: 'red' }}>*</span>
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <SafariImageUpload
              onImageUpload={onImageUpload}
              uploadType="washer_squirters"
              disabled={loading}
              multiple={true}
              size="small"
              resize1080p={true}
              showCameraButton={false}
              showGalleryButton={true}
            />
            <NotesField
              fieldName="washer_squirters"
              fieldLabel="Washer Squirters"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
            <IconButton
              size="small"
              onClick={(e) => onInfoClick(e, "1. Is the washer Fluid full\n2. Are the washer sprayers working correctly?\n3. Are the washer squirters leaking?\n4. Do you hear the Washer Pump Turn on?")}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        <Stack direction="row" spacing={2} sx={{ mt: 1, flexWrap: 'wrap' }}>
          <Chip
            label="✅ Good"
            color="success"
            variant={form.washer_squirters === 'good' ? 'filled' : 'outlined'}
            clickable
            onClick={() => onRadioChange('washer_squirters', 'good')}
            sx={{ fontWeight: form.washer_squirters === 'good' ? 'bold' : 'normal', mb: 1 }}
          />
          <Chip
            label="❌ Leaking"
            color="error"
            variant={form.washer_squirters === 'leaking' ? 'filled' : 'outlined'}
            clickable
            onClick={() => onRadioChange('washer_squirters', 'leaking')}
            sx={{ fontWeight: form.washer_squirters === 'leaking' ? 'bold' : 'normal', mb: 1 }}
          />
          <Chip
            label="❌ Not Working"
            color="error"
            variant={form.washer_squirters === 'not_working' ? 'filled' : 'outlined'}
            clickable
            onClick={() => onRadioChange('washer_squirters', 'not_working')}
            sx={{ fontWeight: form.washer_squirters === 'not_working' ? 'bold' : 'normal', mb: 1 }}
          />
          <Chip
            label="❌ Didn't Hear the Pump"
            color="error"
            variant={form.washer_squirters === 'no_pump_sound' ? 'filled' : 'outlined'}
            clickable
            onClick={() => onRadioChange('washer_squirters', 'no_pump_sound')}
            sx={{ fontWeight: form.washer_squirters === 'no_pump_sound' ? 'bold' : 'normal', mb: 1 }}
          />
        </Stack>
        
        {/* Washer Squirters Photos Display */}
        {form.washer_squirters_photos.length > 0 && (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
            gap: 2,
            mt: 2 
          }}>
            {form.washer_squirters_photos.map((photo, index) => (
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
                  alt={`Washer Squirters ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onClick={() => onImageClick(form.washer_squirters_photos, 'washer_squirters_photos')}
                />
                <IconButton
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteImage('washer_squirters_photos', index);
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
      </Box>
      )}

      {/* Check Engine Mounts - VSI Field */}
      {isEnabled('check_engine_mounts') && (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <SafariImageUpload
            onImageUpload={onImageUpload}
            uploadType="check_engine_mounts_photos"
            disabled={loading}
            multiple={true}
            size="small"
            resize1080p={true}
            showCameraButton={true}
            showGalleryButton={false}
          />
          <Typography variant="body1" sx={{ flexGrow: 1, ml: 1 }}>
            Check Engine Mounts
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <SafariImageUpload
              onImageUpload={onImageUpload}
              uploadType="check_engine_mounts_photos"
              disabled={loading}
              multiple={true}
              size="small"
              resize1080p={true}
              showCameraButton={false}
              showGalleryButton={true}
            />
            <NotesField
              fieldName="check_engine_mounts"
              fieldLabel="Check Engine Mounts"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
            <IconButton
              size="small"
              onClick={(e) => onInfoClick(e, "Inspect engine mounts for wear, movement, or damage.")}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label="✅ Good"
            clickable
            variant={form.check_engine_mounts === 'good' ? 'filled' : 'outlined'}
            color={form.check_engine_mounts === 'good' ? 'success' : 'default'}
            onClick={() => onRadioChange('check_engine_mounts', 'good')}
          />
          <Chip
            label="Felt Movement"
            clickable
            variant={form.check_engine_mounts === 'felt_movement' ? 'filled' : 'outlined'}
            color={form.check_engine_mounts === 'felt_movement' ? 'error' : 'default'}
            onClick={() => onRadioChange('check_engine_mounts', 'felt_movement')}
          />
        </Box>
      </Box>
      )}

      {/* Exterior Lights Front - VSI Field */}
      {isEnabled('exterior_lights_front') && (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <SafariImageUpload
            onImageUpload={onImageUpload}
            uploadType="exterior_lights_photos"
            disabled={loading}
            multiple={true}
            size="small"
            resize1080p={true}
            showCameraButton={true}
            showGalleryButton={false}
          />
          <Typography variant="body1" sx={{ flexGrow: 1, ml: 1 }}>
            Exterior Lights (Front)
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <SafariImageUpload
              onImageUpload={onImageUpload}
              uploadType="exterior_lights_photos"
              disabled={loading}
              multiple={true}
              size="small"
              resize1080p={true}
              showCameraButton={false}
              showGalleryButton={true}
            />
            <NotesField
              fieldName="exterior_lights_front"
              fieldLabel="Exterior Lights (Front)"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
            <IconButton
              size="small"
              onClick={(e) => onInfoClick(e, "Check all front exterior lights including headlights, turn signals, and markers.")}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label="(L) Low Beam"
            clickable
            variant={form.exterior_lights_front?.includes('l_low_beam') ? 'filled' : 'outlined'}
            color={form.exterior_lights_front?.includes('l_low_beam') ? 'primary' : 'default'}
            onClick={() => {
              const current = form.exterior_lights_front || '';
              const values = current ? current.split(',') : [];
              const newValues = values.includes('l_low_beam') 
                ? values.filter(v => v !== 'l_low_beam')
                : [...values, 'l_low_beam'];
              onRadioChange('exterior_lights_front', newValues.join(','));
            }}
          />
          <Chip
            label="(R) Low Beam"
            clickable
            variant={form.exterior_lights_front?.includes('r_low_beam') ? 'filled' : 'outlined'}
            color={form.exterior_lights_front?.includes('r_low_beam') ? 'primary' : 'default'}
            onClick={() => {
              const current = form.exterior_lights_front || '';
              const values = current ? current.split(',') : [];
              const newValues = values.includes('r_low_beam') 
                ? values.filter(v => v !== 'r_low_beam')
                : [...values, 'r_low_beam'];
              onRadioChange('exterior_lights_front', newValues.join(','));
            }}
          />
          <Chip
            label="(L) Fog Light"
            clickable
            variant={form.exterior_lights_front?.includes('l_fog_light') ? 'filled' : 'outlined'}
            color={form.exterior_lights_front?.includes('l_fog_light') ? 'primary' : 'default'}
            onClick={() => {
              const current = form.exterior_lights_front || '';
              const values = current ? current.split(',') : [];
              const newValues = values.includes('l_fog_light') 
                ? values.filter(v => v !== 'l_fog_light')
                : [...values, 'l_fog_light'];
              onRadioChange('exterior_lights_front', newValues.join(','));
            }}
          />
          <Chip
            label="(R) Fog Light"
            clickable
            variant={form.exterior_lights_front?.includes('r_fog_light') ? 'filled' : 'outlined'}
            color={form.exterior_lights_front?.includes('r_fog_light') ? 'primary' : 'default'}
            onClick={() => {
              const current = form.exterior_lights_front || '';
              const values = current ? current.split(',') : [];
              const newValues = values.includes('r_fog_light') 
                ? values.filter(v => v !== 'r_fog_light')
                : [...values, 'r_fog_light'];
              onRadioChange('exterior_lights_front', newValues.join(','));
            }}
          />
          <Chip
            label="(L) High Beam"
            clickable
            variant={form.exterior_lights_front?.includes('l_high_beam') ? 'filled' : 'outlined'}
            color={form.exterior_lights_front?.includes('l_high_beam') ? 'primary' : 'default'}
            onClick={() => {
              const current = form.exterior_lights_front || '';
              const values = current ? current.split(',') : [];
              const newValues = values.includes('l_high_beam') 
                ? values.filter(v => v !== 'l_high_beam')
                : [...values, 'l_high_beam'];
              onRadioChange('exterior_lights_front', newValues.join(','));
            }}
          />
          <Chip
            label="(R) High Beam"
            clickable
            variant={form.exterior_lights_front?.includes('r_high_beam') ? 'filled' : 'outlined'}
            color={form.exterior_lights_front?.includes('r_high_beam') ? 'primary' : 'default'}
            onClick={() => {
              const current = form.exterior_lights_front || '';
              const values = current ? current.split(',') : [];
              const newValues = values.includes('r_high_beam') 
                ? values.filter(v => v !== 'r_high_beam')
                : [...values, 'r_high_beam'];
              onRadioChange('exterior_lights_front', newValues.join(','));
            }}
          />
          <Chip
            label="(L) Turn Signal"
            clickable
            variant={form.exterior_lights_front?.includes('l_turn_signal') ? 'filled' : 'outlined'}
            color={form.exterior_lights_front?.includes('l_turn_signal') ? 'primary' : 'default'}
            onClick={() => {
              const current = form.exterior_lights_front || '';
              const values = current ? current.split(',') : [];
              const newValues = values.includes('l_turn_signal') 
                ? values.filter(v => v !== 'l_turn_signal')
                : [...values, 'l_turn_signal'];
              onRadioChange('exterior_lights_front', newValues.join(','));
            }}
          />
          <Chip
            label="(R) Turn Signal"
            clickable
            variant={form.exterior_lights_front?.includes('r_turn_signal') ? 'filled' : 'outlined'}
            color={form.exterior_lights_front?.includes('r_turn_signal') ? 'primary' : 'default'}
            onClick={() => {
              const current = form.exterior_lights_front || '';
              const values = current ? current.split(',') : [];
              const newValues = values.includes('r_turn_signal') 
                ? values.filter(v => v !== 'r_turn_signal')
                : [...values, 'r_turn_signal'];
              onRadioChange('exterior_lights_front', newValues.join(','));
            }}
          />
          <Chip
            label="(L) Marker"
            clickable
            variant={form.exterior_lights_front?.includes('l_marker') ? 'filled' : 'outlined'}
            color={form.exterior_lights_front?.includes('l_marker') ? 'primary' : 'default'}
            onClick={() => {
              const current = form.exterior_lights_front || '';
              const values = current ? current.split(',') : [];
              const newValues = values.includes('l_marker') 
                ? values.filter(v => v !== 'l_marker')
                : [...values, 'l_marker'];
              onRadioChange('exterior_lights_front', newValues.join(','));
            }}
          />
          <Chip
            label="(R) Marker"
            clickable
            variant={form.exterior_lights_front?.includes('r_marker') ? 'filled' : 'outlined'}
            color={form.exterior_lights_front?.includes('r_marker') ? 'primary' : 'default'}
            onClick={() => {
              const current = form.exterior_lights_front || '';
              const values = current ? current.split(',') : [];
              const newValues = values.includes('r_marker') 
                ? values.filter(v => v !== 'r_marker')
                : [...values, 'r_marker'];
              onRadioChange('exterior_lights_front', newValues.join(','));
            }}
          />
        </Box>
      </Box>
      )}

      {/* Exterior Lights Rear - VSI Field */}
      {isEnabled('exterior_lights_rear') && (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="body1" sx={{ flexGrow: 1, ml: 1 }}>
            Exterior Lights (Rear)
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <NotesField
              fieldName="exterior_lights_rear"
              fieldLabel="Exterior Lights (Rear)"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
            <IconButton
              size="small"
              onClick={(e) => onInfoClick(e, "Check all rear exterior lights including taillights, brake lights, and turn signals.")}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label="(L) Stop"
            clickable
            variant={form.exterior_lights_rear?.includes('l_stop') ? 'filled' : 'outlined'}
            color={form.exterior_lights_rear?.includes('l_stop') ? 'error' : 'default'}
            onClick={() => {
              const current = form.exterior_lights_rear || '';
              const values = current ? current.split(',') : [];
              const newValues = values.includes('l_stop') 
                ? values.filter(v => v !== 'l_stop')
                : [...values, 'l_stop'];
              onRadioChange('exterior_lights_rear', newValues.join(','));
            }}
          />
          <Chip
            label="(3rd) Stop"
            clickable
            variant={form.exterior_lights_rear?.includes('3rd_stop') ? 'filled' : 'outlined'}
            color={form.exterior_lights_rear?.includes('3rd_stop') ? 'error' : 'default'}
            onClick={() => {
              const current = form.exterior_lights_rear || '';
              const values = current ? current.split(',') : [];
              const newValues = values.includes('3rd_stop') 
                ? values.filter(v => v !== '3rd_stop')
                : [...values, '3rd_stop'];
              onRadioChange('exterior_lights_rear', newValues.join(','));
            }}
          />
          <Chip
            label="(R) Stop"
            clickable
            variant={form.exterior_lights_rear?.includes('r_stop') ? 'filled' : 'outlined'}
            color={form.exterior_lights_rear?.includes('r_stop') ? 'error' : 'default'}
            onClick={() => {
              const current = form.exterior_lights_rear || '';
              const values = current ? current.split(',') : [];
              const newValues = values.includes('r_stop') 
                ? values.filter(v => v !== 'r_stop')
                : [...values, 'r_stop'];
              onRadioChange('exterior_lights_rear', newValues.join(','));
            }}
          />
          <Chip
            label="(L) Turn Signal"
            clickable
            variant={form.exterior_lights_rear?.includes('l_turn_signal') ? 'filled' : 'outlined'}
            color={form.exterior_lights_rear?.includes('l_turn_signal') ? 'warning' : 'default'}
            onClick={() => {
              const current = form.exterior_lights_rear || '';
              const values = current ? current.split(',') : [];
              const newValues = values.includes('l_turn_signal') 
                ? values.filter(v => v !== 'l_turn_signal')
                : [...values, 'l_turn_signal'];
              onRadioChange('exterior_lights_rear', newValues.join(','));
            }}
          />
          <Chip
            label="(R) Turn Signal"
            clickable
            variant={form.exterior_lights_rear?.includes('r_turn_signal') ? 'filled' : 'outlined'}
            color={form.exterior_lights_rear?.includes('r_turn_signal') ? 'warning' : 'default'}
            onClick={() => {
              const current = form.exterior_lights_rear || '';
              const values = current ? current.split(',') : [];
              const newValues = values.includes('r_turn_signal') 
                ? values.filter(v => v !== 'r_turn_signal')
                : [...values, 'r_turn_signal'];
              onRadioChange('exterior_lights_rear', newValues.join(','));
            }}
          />
          <Chip
            label="(L) Tail Light"
            clickable
            variant={form.exterior_lights_rear?.includes('l_tail_light') ? 'filled' : 'outlined'}
            color={form.exterior_lights_rear?.includes('l_tail_light') ? 'info' : 'default'}
            onClick={() => {
              const current = form.exterior_lights_rear || '';
              const values = current ? current.split(',') : [];
              const newValues = values.includes('l_tail_light') 
                ? values.filter(v => v !== 'l_tail_light')
                : [...values, 'l_tail_light'];
              onRadioChange('exterior_lights_rear', newValues.join(','));
            }}
          />
          <Chip
            label="(R) Tail Light"
            clickable
            variant={form.exterior_lights_rear?.includes('r_tail_light') ? 'filled' : 'outlined'}
            color={form.exterior_lights_rear?.includes('r_tail_light') ? 'info' : 'default'}
            onClick={() => {
              const current = form.exterior_lights_rear || '';
              const values = current ? current.split(',') : [];
              const newValues = values.includes('r_tail_light') 
                ? values.filter(v => v !== 'r_tail_light')
                : [...values, 'r_tail_light'];
              onRadioChange('exterior_lights_rear', newValues.join(','));
            }}
          />
          <Chip
            label="(L) Reverse Light"
            clickable
            variant={form.exterior_lights_rear?.includes('l_reverse_light') ? 'filled' : 'outlined'}
            color={form.exterior_lights_rear?.includes('l_reverse_light') ? 'secondary' : 'default'}
            onClick={() => {
              const current = form.exterior_lights_rear || '';
              const values = current ? current.split(',') : [];
              const newValues = values.includes('l_reverse_light') 
                ? values.filter(v => v !== 'l_reverse_light')
                : [...values, 'l_reverse_light'];
              onRadioChange('exterior_lights_rear', newValues.join(','));
            }}
          />
          <Chip
            label="(R) Reverse Light"
            clickable
            variant={form.exterior_lights_rear?.includes('r_reverse_light') ? 'filled' : 'outlined'}
            color={form.exterior_lights_rear?.includes('r_reverse_light') ? 'secondary' : 'default'}
            onClick={() => {
              const current = form.exterior_lights_rear || '';
              const values = current ? current.split(',') : [];
              const newValues = values.includes('r_reverse_light') 
                ? values.filter(v => v !== 'r_reverse_light')
                : [...values, 'r_reverse_light'];
              onRadioChange('exterior_lights_rear', newValues.join(','));
            }}
          />
          <Chip
            label="(L) License Plate"
            clickable
            variant={form.exterior_lights_rear?.includes('l_license_plate') ? 'filled' : 'outlined'}
            color={form.exterior_lights_rear?.includes('l_license_plate') ? 'primary' : 'default'}
            onClick={() => {
              const current = form.exterior_lights_rear || '';
              const values = current ? current.split(',') : [];
              const newValues = values.includes('l_license_plate') 
                ? values.filter(v => v !== 'l_license_plate')
                : [...values, 'l_license_plate'];
              onRadioChange('exterior_lights_rear', newValues.join(','));
            }}
          />
          <Chip
            label="(R) License Plate"
            clickable
            variant={form.exterior_lights_rear?.includes('r_license_plate') ? 'filled' : 'outlined'}
            color={form.exterior_lights_rear?.includes('r_license_plate') ? 'primary' : 'default'}
            onClick={() => {
              const current = form.exterior_lights_rear || '';
              const values = current ? current.split(',') : [];
              const newValues = values.includes('r_license_plate') 
                ? values.filter(v => v !== 'r_license_plate')
                : [...values, 'r_license_plate'];
              onRadioChange('exterior_lights_rear', newValues.join(','));
            }}
          />
        </Box>
      </Box>
      )}

    </Box>
  );
}; 