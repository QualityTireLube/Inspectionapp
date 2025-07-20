import { 
  Typography, 
  TextField, 
  Box, 
  Stack, 
  Chip, 
  IconButton
} from '@mui/material';
import { 
  Close as CloseIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { QuickCheckForm } from '../../../types/quickCheck';
import NotesField from './NotesField';
import { SafariImageUpload, ImageFieldRectangle } from '../../Image';
import { getFullImageUrl } from '../../../services/imageUpload';

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
  onImageUpload: (file: File, type: string) => Promise<void>;
  onImageClick: (photos: ImageUpload[], photoType?: string) => void;
  onInfoClick: (event: React.MouseEvent<HTMLElement>, content: string) => void;
  onFormUpdate: (updates: Partial<QuickCheckForm>) => void;
  onFieldNotesChange: (fieldName: string, noteText: string) => void;
  onDeleteImage: (photoType: string, index: number) => void;
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
  onDeleteImage
}) => {
  // Helper function to get display URL for images
  const getDisplayUrl = (photo: ImageUpload): string => {
    if (photo.url?.startsWith('blob:')) {
      return photo.url;
    }
    return photo.url ? getFullImageUrl(photo.url) : URL.createObjectURL(photo.file);
  };
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Dash Lights */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="body1" sx={{ flexGrow: 1 }}>
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
          onImageView={() => onImageClick(form.dash_lights_photos, 'dash_lights_photos')}
          uploadType="dashLights"
          disabled={loading}
          multiple={true}
          maxFiles={5}
        />
      </Box>

      {/* Mileage */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="body1" sx={{ flexGrow: 1 }}>
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

      {/* Windshield Condition */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="body1" sx={{ flexGrow: 1 }}>
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

      {/* Wiper Blades */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="body1" sx={{ flexGrow: 1 }}>
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

      {/* Washer Squirters */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="body1" sx={{ flexGrow: 1 }}>
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
    </Box>
  );
}; 