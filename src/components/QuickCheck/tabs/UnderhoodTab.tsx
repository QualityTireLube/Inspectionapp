import React, { useState, useRef } from 'react';
import {
  Typography,
  TextField,
  Button,
  Box,
  FormControl,
  FormLabel,
  Stack,
  Chip,
  IconButton,
  InputAdornment,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  QrCodeScanner as QrCodeScannerIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  PhotoCamera as PhotoCameraIcon
} from '@mui/icons-material';
import Grid from '../../CustomGrid';
import {
  QuickCheckForm,
  ImageUpload,
  StateInspectionStatus,
  WasherFluidCondition,
  EngineAirFilterCondition,
  BatteryCondition,
  BatteryTerminalCondition,
  PhotoType
} from '../../../types/quickCheck';
import NotesField from './NotesField';
import { ImageFieldDisplay, SafariImageUpload, ImageFieldRectangle, GuidedVisuals, GuidedVisualField, GuidedVisualsRef } from '../../Image';
import { VinDecoder } from '../VinDecoder';
import { getFullImageUrl } from '../../../services/imageUpload';

interface UnderhoodTabProps {
  form: QuickCheckForm;
  loading: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRadioChange: (name: string, value: string) => void;
  onImageUpload: (file: File, type: PhotoType) => Promise<void>;
  onImageClick: (photos: ImageUpload[], photoType?: string) => void;
  onInfoClick: (event: React.MouseEvent<HTMLElement>, content: string) => void;
  onScannerOpen: () => void;
  onFormUpdate: (updates: Partial<QuickCheckForm>) => void;
  onBatteryConditionToggle: (condition: BatteryCondition) => void;
  onBatteryConditionChange: (type: 'main' | 'terminals', value: string) => void;
  onBatteryTerminalsToggle: (condition: BatteryTerminalCondition) => void;
  onVehicleDetailsOpen: () => void;
  onFieldNotesChange: (fieldName: string, noteText: string) => void;
  onDeleteImage: (photoType: string, index: number) => void;
  vinDecodeLoading: boolean;
  vinDecodeError: string | null;
  vehicleDetails: any;
  enabledFields?: readonly string[];
}

export const UnderhoodTab: React.FC<UnderhoodTabProps> = ({
  form,
  loading,
  onChange,
  onRadioChange,
  onImageUpload,
  onImageClick,
  onInfoClick,
  onScannerOpen,
  onFormUpdate,
  onBatteryConditionToggle,
  onBatteryConditionChange,
  onBatteryTerminalsToggle,
  onVehicleDetailsOpen,
  onFieldNotesChange,
  onDeleteImage,
  vinDecodeLoading,
  vinDecodeError,
  vehicleDetails,
  enabledFields
}) => {
  const isEnabled = (k: string) => !enabledFields || enabledFields.includes(k);
  const [terminalDamageDialogOpen, setTerminalDamageDialogOpen] = useState(false);
  const guidedVisualsRef = useRef<GuidedVisualsRef>(null);
  
  // Helper function to get display URL for images
  const getDisplayUrl = (photo: ImageUpload): string => {
    if (photo.url?.startsWith('blob:')) {
      return photo.url;
    }
    return photo.url ? getFullImageUrl(photo.url) : URL.createObjectURL(photo.file);
  };

  const handleTerminalDamageClick = () => {
    onBatteryTerminalsToggle('terminal_damaged');
    setTerminalDamageDialogOpen(true);
  };

  const handleTerminalDamageLocationToggle = (location: 'positive' | 'negative') => {
    try {
      // Ensure we always work with an array
      const currentLocations = Array.isArray(form.battery_terminal_damage_location) 
        ? form.battery_terminal_damage_location 
        : [];
      
      // Toggle the location in the array
      const isSelected = currentLocations.includes(location);
      const newLocations = isSelected 
        ? currentLocations.filter(l => l !== location)
        : [...currentLocations, location];
      
      onFormUpdate({ battery_terminal_damage_location: newLocations });
    } catch (error) {
      console.error('Error toggling terminal damage location:', error);
      // Fallback: just set the single location
      onFormUpdate({ battery_terminal_damage_location: [location] });
    }
  };

  const handleTerminalDamageDialogClose = () => {
    setTerminalDamageDialogOpen(false);
    
    // Start terminal damage photo sequence if locations are selected
    const damageLocations = Array.isArray(form.battery_terminal_damage_location) 
      ? form.battery_terminal_damage_location 
      : [];
      
    if (damageLocations.length > 0 && guidedVisualsRef.current) {
      // Small delay to ensure dialog is closed before triggering camera
      setTimeout(() => {
        if (guidedVisualsRef.current) {
          guidedVisualsRef.current.startTerminalDamageSequence(damageLocations);
        }
      }, 300);
    }
  };

  // Configure guided visual fields for UnderhoodTab (respect enabledFields)
  const guidedVisualFields: GuidedVisualField[] = [
    {
      fieldName: 'tpms_placard',
      prompt: 'Take a photo of the TPMS placard (usually located on the driver door or door jamb).',
      guidedVisualType: 'tpms_placard',
      triggerConditions: { vinReaches17: true },
      uploadType: 'tpms_placard'
    },
    // Only include Engine Air Filter guided visual when that field is enabled
    ...(isEnabled('engine_air_filter') ? [{
      fieldName: 'engine_air_filter',
      prompt: 'Take a photo of the engine air filter in its current condition.',
      guidedVisualType: 'engine_air_filter',
      triggerConditions: { chipSelected: true },
      uploadType: 'engine_air_filter'
    } as GuidedVisualField] : []),
    // Include battery-related guided visuals only if the battery section is enabled
    ...(isEnabled('battery_condition') ? [
      {
        fieldName: 'battery_terminals_cleaning',
        prompt: 'Take a photo clearly showing the battery terminals before cleaning.',
        guidedVisualType: 'battery_terminals_cleaning',
        triggerConditions: { terminalCleaning: true },
        uploadType: 'battery'
      },
      {
        fieldName: 'battery_terminals_positive',
        prompt: 'Take a photo of the damaged positive terminal.',
        guidedVisualType: 'battery_terminals_positive',
        triggerConditions: { terminalDamaged: 'positive' },
        uploadType: 'battery_positive_terminal'
      },
      {
        fieldName: 'battery_terminals_negative',
        prompt: 'Take a photo of the damaged negative terminal.',
        guidedVisualType: 'battery_terminals_negative',
        triggerConditions: { terminalDamaged: 'negative' },
        uploadType: 'battery_negative_terminal'
      }
    ] as GuidedVisualField[] : [])
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Guided Visuals Component */}
      <GuidedVisuals
        ref={guidedVisualsRef}
        onImageUpload={onImageUpload}
        fieldConfigurations={guidedVisualFields}
        currentTab="Underhood"
        formData={form}
        disabled={loading}
        multiple={true}
        maxFiles={5}
        resize1080p={true}
        cameraFacing="environment"
      />

      {isEnabled('vin') && (
        <Box>
          <VinDecoder
            vin={form.vin}
            onVinChange={onChange}
            required={true}
            disabled={loading}
          />
        </Box>
      )}

      {/* TPMS Placard */}
      {isEnabled('tpms_placard') && (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
          <SafariImageUpload
            onImageUpload={onImageUpload}
            uploadType="tpms_placard"
            disabled={loading}
            multiple={true}
            size="small"
            showCameraButton={true}
            showGalleryButton={false}
          />
          <Typography variant="body1" sx={{ flexGrow: 1, ml: 1 }}>
            TPMS Placard
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <SafariImageUpload
              onImageUpload={onImageUpload}
              uploadType="tpms_placard"
              disabled={loading}
              multiple={true}
              size="small"
              showCameraButton={false}
              showGalleryButton={true}
            />
            <NotesField
              fieldName="tpms_placard"
              fieldLabel="TPMS Placard"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
            <IconButton
              size="small"
              onClick={(e) => onInfoClick(e, "Take a photo of the TPMS placard showing recommended tire pressures - usually located on the driver's side door jamb or glove compartment.")}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        
        <ImageFieldRectangle
          label=""
          images={form.tpms_placard
            .filter(photo => photo && !photo.isDeleted)
            .map(photo => getDisplayUrl(photo))
            .filter(url => url && url.length > 0)}
          onImageUpload={onImageUpload}
          onImageRemove={(index) => onFormUpdate({
            tpms_placard: form.tpms_placard.filter((_, i) => i !== index)
          })}
          onImageView={(imageUrl) => onImageClick(form.tpms_placard, 'tpms_placard')}
          uploadType="tpms_placard"
          disabled={loading}
          multiple={true}
          maxFiles={5}
        />
      </Box>
      )}

      {isEnabled('state_inspection') && (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
          <SafariImageUpload
            onImageUpload={onImageUpload}
            uploadType="state_inspection_status"
            disabled={loading}
            multiple={true}
            size="small"
            showCameraButton={true}
            showGalleryButton={false}
          />
          <Typography variant="subtitle1" sx={{ flexGrow: 1, ml: 1 }}>
            State Inspection Status
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <SafariImageUpload
              onImageUpload={onImageUpload}
              uploadType="state_inspection_status"
              disabled={loading}
              multiple={true}
              size="small"
              showCameraButton={false}
              showGalleryButton={true}
            />
            <NotesField
              fieldName="state_inspection_status"
              fieldLabel="State Inspection Status"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
            <IconButton
              size="small"
              onClick={(e) => onInfoClick(e, "Check state inspection status and enter date if applicable. Format: MM/YY (e.g., 12/25 for December 2025)")}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <TextField
              size="small"
              label="State Inspection Date"
              placeholder="MM/YY"
              value={form.state_inspection_date_code || ''}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                if (value.length === 4) {
                  const month = value.slice(0, 2);
                  const year = value.slice(2, 4);
                  const formatted = `${month}/${year}`;
                  onFormUpdate({ state_inspection_date_code: formatted });
                } else {
                  onFormUpdate({ state_inspection_date_code: value });
                }
              }}
              inputProps={{
                maxLength: 4,
                pattern: '[0-9]*',
                inputMode: 'numeric',
                style: { textAlign: 'center' }
              }}
              sx={{
                width: { xs: '100%', sm: '120px' },
                '& .MuiInputBase-input::placeholder': {
                  opacity: 1,
                  color: 'text.secondary'
                },
                '& .MuiOutlinedInput-root': {
                  backgroundColor: (() => {
                    if (form.state_inspection_status === 'no_sticker') return '#f5f5f5';
                    if (form.state_inspection_date_code && form.state_inspection_date_code.length === 5) {
                      const [month, year] = form.state_inspection_date_code.split('/');
                      const inspectionDate = new Date(2000 + parseInt(year), parseInt(month) - 1, 1);
                      const currentDate = new Date();
                      const isExpired = inspectionDate < currentDate;
                      return isExpired ? '#ffebee' : '#e8f5e8';
                    }
                    return 'transparent';
                  })(),
                  '&:hover': {
                    backgroundColor: (() => {
                      if (form.state_inspection_status === 'no_sticker') return '#f0f0f0';
                      if (form.state_inspection_date_code && form.state_inspection_date_code.length === 5) {
                        const [month, year] = form.state_inspection_date_code.split('/');
                        const inspectionDate = new Date(2000 + parseInt(year), parseInt(month) - 1, 1);
                        const currentDate = new Date();
                        const isExpired = inspectionDate < currentDate;
                        return isExpired ? '#ffcdd2' : '#c8e6c9';
                      }
                      return 'rgba(0, 0, 0, 0.04)';
                    })()
                  }
                }
              }}
              disabled={form.state_inspection_status === 'no_sticker'}
            />
          </Box>
          
          <Chip
            label="❌ No Sticker"
            color="error"
            variant={form.state_inspection_status === 'no_sticker' ? 'filled' : 'outlined'}
            clickable
            onClick={() => {
              // Toggle the "No Sticker" selection - if already selected, deselect it
              if (form.state_inspection_status === 'no_sticker') {
                onRadioChange('state_inspection_status', '');
              } else {
                onRadioChange('state_inspection_status', 'no_sticker');
              }
            }}
            sx={{ fontWeight: form.state_inspection_status === 'no_sticker' ? 'bold' : 'normal' }}
          />
        </Box>
        
        {/* State Inspection Status Photos Display */}
        {form.state_inspection_status_photos.length > 0 && (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
            gap: 2,
            mt: 2 
          }}>
            {form.state_inspection_status_photos.map((photo, index) => (
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
                  alt={`State Inspection Status ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onClick={() => onImageClick(form.state_inspection_status_photos, 'state_inspection_status_photos')}
                />
                <IconButton
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteImage('state_inspection_status_photos', index);
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



      {isEnabled('washer_fluid') && (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
          <SafariImageUpload
            onImageUpload={onImageUpload}
            uploadType="washer_fluid"
            disabled={loading}
            multiple={true}
            size="small"
            showCameraButton={true}
            showGalleryButton={false}
          />
          <Typography variant="subtitle1" sx={{ flexGrow: 1, ml: 1 }}>
            Washer Fluid
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <SafariImageUpload
              onImageUpload={onImageUpload}
              uploadType="washer_fluid"
              disabled={loading}
              multiple={true}
              size="small"
              showCameraButton={false}
              showGalleryButton={true}
            />
            <NotesField
              fieldName="washer_fluid"
              fieldLabel="Washer Fluid"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
            <IconButton
              size="small"
              onClick={(e) => onInfoClick(e, "Check washer fluid level and test washer functionality. Note any leaks or pump issues.")}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Box>
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
          <Chip
            label="✅ Full"
            color="success"
            variant={form.washer_fluid === 'full' ? 'filled' : 'outlined'}
            clickable
            onClick={() => onRadioChange('washer_fluid', 'full')}
            sx={{ fontWeight: form.washer_fluid === 'full' ? 'bold' : 'normal' }}
          />
          <Chip
            label="❌ Leaking"
            color="error"
            variant={form.washer_fluid === 'leaking' ? 'filled' : 'outlined'}
            clickable
            onClick={() => onRadioChange('washer_fluid', 'leaking')}
            sx={{ fontWeight: form.washer_fluid === 'leaking' ? 'bold' : 'normal' }}
          />
          <Chip
            label="❌ Not Working"
            color="error"
            variant={form.washer_fluid === 'not_working' ? 'filled' : 'outlined'}
            clickable
            onClick={() => onRadioChange('washer_fluid', 'not_working')}
            sx={{ fontWeight: form.washer_fluid === 'not_working' ? 'bold' : 'normal' }}
          />
          <Chip
            label="❌ No Pump Sound"
            color="error"
            variant={form.washer_fluid === 'no_pump_sound' ? 'filled' : 'outlined'}
            clickable
            onClick={() => onRadioChange('washer_fluid', 'no_pump_sound')}
            sx={{ fontWeight: form.washer_fluid === 'no_pump_sound' ? 'bold' : 'normal' }}
          />
        </Stack>
        
        {form.washer_fluid_photo.length > 0 && (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', 
            gap: 1,
            maxWidth: { xs: '100%', sm: '300px' }
          }}>
            {form.washer_fluid_photo.map((photo, index) => (
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
                  alt={`Washer Fluid ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onClick={() => onImageClick(form.washer_fluid_photo, 'washer_fluid_photo')}
                />
                <IconButton
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFormUpdate({
                      washer_fluid_photo: form.washer_fluid_photo.filter((_, i) => i !== index)
                    });
                  }}
                  sx={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    bgcolor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    '&:hover': {
                      bgcolor: 'rgba(0,0,0,0.9)',
                    },
                    padding: '2px',
                  }}
                  size="small"
                >
                  <CloseIcon sx={{ fontSize: '12px' }} />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}
      </Box>
      )}

      {isEnabled('engine_air_filter') && (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
          <SafariImageUpload
            onImageUpload={onImageUpload}
            uploadType="engine_air_filter"
            disabled={loading}
            size="small"
            showCameraButton={true}
            showGalleryButton={false}
          />
          <Typography variant="subtitle1" sx={{ flexGrow: 1, ml: 1 }}>
            Engine Air Filter
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <SafariImageUpload
              onImageUpload={onImageUpload}
              uploadType="engine_air_filter"
              disabled={loading}
              size="small"
              showCameraButton={false}
              showGalleryButton={true}
            />
            <NotesField
              fieldName="engine_air_filter"
              fieldLabel="Engine Air Filter"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
            <IconButton
              size="small"
              onClick={(e) => onInfoClick(e, "Inspect the engine air filter for dirt, debris, or damage. Consider replacement recommendations based on condition.")}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Box>
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
          <Chip
            label="✅ Good"
            color="success"
            variant={form.engine_air_filter === 'good' ? 'filled' : 'outlined'}
            clickable
            onClick={() => onRadioChange('engine_air_filter', 'good')}
            sx={{ fontWeight: form.engine_air_filter === 'good' ? 'bold' : 'normal' }}
          />
          <Chip
            label="⚠️ Next Oil Change"
            color="warning"
            variant={form.engine_air_filter === 'next_oil_change' ? 'filled' : 'outlined'}
            clickable
            onClick={() => onRadioChange('engine_air_filter', 'next_oil_change')}
            sx={{ fontWeight: form.engine_air_filter === 'next_oil_change' ? 'bold' : 'normal' }}
          />
          <Chip
            label="❌ Highly Recommended"
            color="warning"
            variant={form.engine_air_filter === 'highly_recommended' ? 'filled' : 'outlined'}
            clickable
            onClick={() => onRadioChange('engine_air_filter', 'highly_recommended')}
            sx={{ fontWeight: form.engine_air_filter === 'highly_recommended' ? 'bold' : 'normal' }}
          />
          <Chip
            label="🚨 Today"
            color="error"
            variant={form.engine_air_filter === 'today' ? 'filled' : 'outlined'}
            clickable
            onClick={() => onRadioChange('engine_air_filter', 'today')}
            sx={{ fontWeight: form.engine_air_filter === 'today' ? 'bold' : 'normal' }}
          />
          <Chip
            label="🐀 Animal Related"
            color="error"
            variant={form.engine_air_filter === 'animal_related' ? 'filled' : 'outlined'}
            clickable
            onClick={() => onRadioChange('engine_air_filter', 'animal_related')}
            sx={{ fontWeight: form.engine_air_filter === 'animal_related' ? 'bold' : 'normal' }}
          />
        </Stack>
        
        {form.engine_air_filter_photo.length > 0 && (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', 
            gap: 1,
            maxWidth: { xs: '100%', sm: '300px' }
          }}>
            {form.engine_air_filter_photo.map((photo, index) => (
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
                  alt={`Engine Air Filter ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onClick={() => onImageClick(form.engine_air_filter_photo, 'engine_air_filter_photo')}
                />
                <IconButton
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFormUpdate({
                      engine_air_filter_photo: form.engine_air_filter_photo.filter((_, i) => i !== index)
                    });
                  }}
                  sx={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    bgcolor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    '&:hover': {
                      bgcolor: 'rgba(0,0,0,0.9)',
                    },
                    padding: '2px',
                  }}
                  size="small"
                >
                  <CloseIcon sx={{ fontSize: '12px' }} />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}
      </Box>
      )}

      {isEnabled('battery_condition') && (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
          <SafariImageUpload
            onImageUpload={onImageUpload}
            uploadType="battery"
            disabled={loading}
            size="small"
            showCameraButton={true}
            showGalleryButton={false}
          />
          <Typography variant="subtitle1" sx={{ flexGrow: 1, ml: 1 }}>
            Battery Condition
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <SafariImageUpload
              onImageUpload={onImageUpload}
              uploadType="battery"
              disabled={loading}
              size="small"
              showCameraButton={false}
              showGalleryButton={true}
            />
            <NotesField
              fieldName="battery_condition"
              fieldLabel="Battery Condition"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
            <IconButton
              size="small"
              onClick={(e) => onInfoClick(e, "Inspect battery condition, terminals, and check date code. Look for corrosion, cracks, or other signs of wear.")}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        {/* Battery Condition */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Battery
          </Typography>
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
            <Chip
              label="✅ Good"
              color="success"
              variant={form.battery_condition_main === 'good' ? 'filled' : 'outlined'}
              clickable
              onClick={() => onBatteryConditionChange('main', 'good')}
              sx={{ fontWeight: form.battery_condition_main === 'good' ? 'bold' : 'normal', mb: 1 }}
            />
            <Chip
              label="⚠️ Warning"
              color="warning"
              variant={form.battery_condition_main === 'warning' ? 'filled' : 'outlined'}
              clickable
              onClick={() => onBatteryConditionChange('main', 'warning')}
              sx={{ fontWeight: form.battery_condition_main === 'warning' ? 'bold' : 'normal', mb: 1 }}
            />
            <Chip
              label="❌ Bad"
              color="error"
              variant={form.battery_condition_main === 'bad' ? 'filled' : 'outlined'}
              clickable
              onClick={() => onBatteryConditionChange('main', 'bad')}
              sx={{ fontWeight: form.battery_condition_main === 'bad' ? 'bold' : 'normal', mb: 1 }}
            />
            <Chip
              label="N/A"
              color="default"
              variant={form.battery_condition_main === 'na' ? 'filled' : 'outlined'}
              clickable
              onClick={() => onBatteryConditionChange('main', 'na')}
              sx={{ 
                fontWeight: form.battery_condition_main === 'na' ? 'bold' : 'normal',
                fontSize: form.battery_condition_main === 'na' ? '1.1em' : '1em',
                transform: form.battery_condition_main === 'na' ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.2s ease-in-out',
                boxShadow: form.battery_condition_main === 'na' ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                bgcolor: form.battery_condition_main === 'na' ? '#d0d0d0' : 'transparent',
                color: form.battery_condition_main === 'na' ? '#333333' : 'inherit',
                mb: 1
              }}
            />
          </Stack>
          
          {/* Battery Date Code - moved here under Battery sub-field */}
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <TextField
                size="small"
                label="Battery Date Code"
                placeholder="MM/YY"
                value={form.battery_date_code || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                  if (value.length === 4) {
                    const month = value.slice(0, 2);
                    const year = value.slice(2, 4);
                    const formatted = `${month}/${year}`;
                    onFormUpdate({ battery_date_code: formatted });
                  } else {
                    onFormUpdate({ battery_date_code: value });
                  }
                }}
                inputProps={{
                  maxLength: 4,
                  pattern: '[0-9]*',
                  inputMode: 'numeric',
                  style: { textAlign: 'center' }
                }}
                sx={{
                  width: { xs: '100%', sm: '100px' },
                  '& .MuiInputBase-input::placeholder': {
                    opacity: 1,
                    color: 'text.secondary'
                  }
                }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              Format: MM/YY (e.g., 12/25 for December 2025)
            </Typography>
          </Box>
        </Box>

        {/* Battery Terminals */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Terminals
          </Typography>
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
            <Chip
              label="✅ Good"
              color="success"
              variant={form.battery_terminals?.includes('good') ? 'filled' : 'outlined'}
              clickable
              onClick={() => onBatteryTerminalsToggle('good')}
              sx={{ fontWeight: form.battery_terminals?.includes('good') ? 'bold' : 'normal', mb: 1 }}
            />
            <Chip
              label="🔧 Terminal Cleaning"
              color="info"
              variant={form.battery_terminals?.includes('terminal_cleaning') ? 'filled' : 'outlined'}
              clickable
              onClick={() => onBatteryTerminalsToggle('terminal_cleaning')}
              sx={{ fontWeight: form.battery_terminals?.includes('terminal_cleaning') ? 'bold' : 'normal', mb: 1 }}
            />
            <Chip
              label={(() => {
                try {
                  const locations = Array.isArray(form.battery_terminal_damage_location) 
                    ? form.battery_terminal_damage_location 
                    : [];
                  
                  if (form.battery_terminals?.includes('terminal_damaged') && locations.length > 0) {
                    return `❌ Terminal Damaged (${locations.join(', ')})`;
                  }
                  return "❌ Terminal Damaged";
                } catch (error) {
                  console.error('Error rendering terminal damage label:', error);
                  return "❌ Terminal Damaged";
                }
              })()}
              color="error"
              variant={form.battery_terminals?.includes('terminal_damaged') ? 'filled' : 'outlined'}
              clickable
              onClick={handleTerminalDamageClick}
              sx={{ fontWeight: form.battery_terminals?.includes('terminal_damaged') ? 'bold' : 'normal', mb: 1 }}
            />
          </Stack>
        </Box>

        {/* Battery Photos Section - All battery-related photos grouped together */}
        {(form.battery_photos.length > 0 || 
          (form.battery_positive_terminal_photos && form.battery_positive_terminal_photos.length > 0) ||
          (form.battery_negative_terminal_photos && form.battery_negative_terminal_photos.length > 0) ||
          form.battery_terminals?.includes('terminal_cleaning') ||
          form.battery_terminals?.includes('terminal_damaged')) && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
              🔋 Battery Photos
              {(form.battery_terminals?.includes('terminal_cleaning') || form.battery_terminals?.includes('terminal_damaged')) && 
               (!form.battery_photos.length && 
                (!form.battery_positive_terminal_photos || !form.battery_positive_terminal_photos.length) &&
                (!form.battery_negative_terminal_photos || !form.battery_negative_terminal_photos.length)) && (
                <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                  (Waiting for photos)
                </Typography>
              )}
            </Typography>

            {/* Combined photo grid showing all battery-related photos */}
            {(form.battery_photos.length > 0 || 
              (form.battery_positive_terminal_photos && form.battery_positive_terminal_photos.length > 0) ||
              (form.battery_negative_terminal_photos && form.battery_negative_terminal_photos.length > 0)) ? (
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', 
                gap: 1,
                maxWidth: { xs: '100%', sm: '300px' }
              }}>
                {/* General Battery Photos */}
                {form.battery_photos.map((photo, index) => (
                  <Box
                    key={`battery-${index}`}
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
                      alt={`Battery ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      onClick={() => onImageClick(form.battery_photos, 'battery_photos')}
                    />
                    {/* Battery type badge */}
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 2,
                        left: 2,
                        bgcolor: 'rgba(33, 150, 243, 0.9)',
                        color: 'white',
                        px: 0.5,
                        py: 0.25,
                        borderRadius: 0.5,
                        fontSize: '10px',
                        fontWeight: 'bold'
                      }}
                    >
                      🔋
                    </Box>
                    <IconButton
                      className="delete-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFormUpdate({
                          battery_photos: form.battery_photos.filter((_, i) => i !== index)
                        });
                      }}
                      sx={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        bgcolor: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        '&:hover': {
                          bgcolor: 'rgba(0,0,0,0.9)',
                        },
                        padding: '2px',
                      }}
                      size="small"
                    >
                      <CloseIcon sx={{ fontSize: '12px' }} />
                    </IconButton>
                  </Box>
                ))}

                {/* Positive Terminal Damage Photos */}
                {form.battery_positive_terminal_photos && form.battery_positive_terminal_photos.map((photo, index) => (
                  <Box
                    key={`positive-${index}`}
                    sx={{
                      position: 'relative',
                      aspectRatio: '1',
                      borderRadius: 1,
                      overflow: 'hidden',
                      border: '2px solid #f44336',
                      cursor: 'pointer',
                      '&:hover .delete-button': {
                        opacity: 1
                      }
                    }}
                  >
                    <img
                      src={getDisplayUrl(photo)}
                      alt={`Positive Terminal ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      onClick={() => onImageClick(form.battery_positive_terminal_photos, 'battery_positive_terminal_photos')}
                    />
                    {/* Positive terminal badge */}
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 2,
                        left: 2,
                        bgcolor: 'rgba(244, 67, 54, 0.9)',
                        color: 'white',
                        px: 0.5,
                        py: 0.25,
                        borderRadius: 0.5,
                        fontSize: '10px',
                        fontWeight: 'bold'
                      }}
                    >
                      ➕
                    </Box>
                    <IconButton
                      className="delete-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFormUpdate({
                          battery_positive_terminal_photos: form.battery_positive_terminal_photos.filter((_, i) => i !== index)
                        });
                      }}
                      sx={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        bgcolor: 'rgba(244,67,54,0.9)',
                        color: 'white',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        '&:hover': {
                          bgcolor: 'rgba(244,67,54,1)',
                        },
                        padding: '2px',
                      }}
                      size="small"
                    >
                      <CloseIcon sx={{ fontSize: '12px' }} />
                    </IconButton>
                  </Box>
                ))}

                {/* Negative Terminal Damage Photos */}
                {form.battery_negative_terminal_photos && form.battery_negative_terminal_photos.map((photo, index) => (
                  <Box
                    key={`negative-${index}`}
                    sx={{
                      position: 'relative',
                      aspectRatio: '1',
                      borderRadius: 1,
                      overflow: 'hidden',
                      border: '2px solid #000000',
                      cursor: 'pointer',
                      '&:hover .delete-button': {
                        opacity: 1
                      }
                    }}
                  >
                    <img
                      src={getDisplayUrl(photo)}
                      alt={`Negative Terminal ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      onClick={() => onImageClick(form.battery_negative_terminal_photos, 'battery_negative_terminal_photos')}
                    />
                    {/* Negative terminal badge */}
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 2,
                        left: 2,
                        bgcolor: 'rgba(0, 0, 0, 0.9)',
                        color: 'white',
                        px: 0.5,
                        py: 0.25,
                        borderRadius: 0.5,
                        fontSize: '10px',
                        fontWeight: 'bold'
                      }}
                    >
                      ➖
                    </Box>
                    <IconButton
                      className="delete-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFormUpdate({
                          battery_negative_terminal_photos: form.battery_negative_terminal_photos.filter((_, i) => i !== index)
                        });
                      }}
                      sx={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        bgcolor: 'rgba(0,0,0,0.8)',
                        color: 'white',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        '&:hover': {
                          bgcolor: 'rgba(0,0,0,1)',
                        },
                        padding: '2px',
                      }}
                      size="small"
                    >
                      <CloseIcon sx={{ fontSize: '12px' }} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                No battery photos yet. Use guided visual or camera button above.
              </Typography>
            )}
          </Box>
        )}
      </Box>
      )}

      {/* VSI-Specific Underhood Fields */}
      
      {/* Drive Belt */}
      {isEnabled('drive_belt') && (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
          <SafariImageUpload
            onImageUpload={onImageUpload}
            uploadType="drive_belt_photos"
            disabled={loading}
            multiple={true}
            size="small"
            resize1080p={true}
            showCameraButton={true}
            showGalleryButton={false}
          />
          <Typography variant="body1" sx={{ flexGrow: 1, ml: 1 }}>
            Drive Belt
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <SafariImageUpload
              onImageUpload={onImageUpload}
              uploadType="drive_belt_photos"
              disabled={loading}
              multiple={true}
              size="small"
              resize1080p={true}
              showCameraButton={false}
              showGalleryButton={true}
            />
            <NotesField
              fieldName="drive_belt"
              fieldLabel="Drive Belt"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
            <IconButton
              size="small"
              onClick={(e) => onInfoClick(e, "Inspect drive belt for cracks, fraying, or wear.")}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label="✅ Good"
            clickable
            variant={form.drive_belt === 'good' ? 'filled' : 'outlined'}
            color={form.drive_belt === 'good' ? 'success' : 'default'}
            onClick={() => onRadioChange('drive_belt', 'good')}
          />
          <Chip
            label="⚠️ Warning"
            clickable
            variant={form.drive_belt === 'warning' ? 'filled' : 'outlined'}
            color={form.drive_belt === 'warning' ? 'warning' : 'default'}
            onClick={() => onRadioChange('drive_belt', 'warning')}
          />
          <Chip
            label="❌ Bad"
            clickable
            variant={form.drive_belt === 'bad' ? 'filled' : 'outlined'}
            color={form.drive_belt === 'bad' ? 'error' : 'default'}
            onClick={() => onRadioChange('drive_belt', 'bad')}
          />
        </Box>
      </Box>
      )}

      {/* Engine Mounts */}
      {isEnabled('engine_mounts') && (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
          <SafariImageUpload
            onImageUpload={onImageUpload}
            uploadType="engine_mounts_photos"
            disabled={loading}
            multiple={true}
            size="small"
            resize1080p={true}
            showCameraButton={true}
            showGalleryButton={false}
          />
          <Typography variant="body1" sx={{ flexGrow: 1, ml: 1 }}>
            Engine Mounts
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <SafariImageUpload
              onImageUpload={onImageUpload}
              uploadType="engine_mounts_photos"
              disabled={loading}
              multiple={true}
              size="small"
              resize1080p={true}
              showCameraButton={false}
              showGalleryButton={true}
            />
            <NotesField
              fieldName="engine_mounts"
              fieldLabel="Engine Mounts"
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
            variant={form.engine_mounts?.includes('good') ? 'filled' : 'outlined'}
            color={form.engine_mounts?.includes('good') ? 'success' : 'default'}
            onClick={() => {
              const current = form.engine_mounts || '';
              const values = current ? current.split(',') : [];
              const newValues = values.includes('good')
                ? values.filter(v => v !== 'good')
                : [...values, 'good'];
              onRadioChange('engine_mounts', newValues.join(','));
            }}
          />
          <Chip
            label="Left"
            clickable
            variant={form.engine_mounts?.includes('left') ? 'filled' : 'outlined'}
            color={form.engine_mounts?.includes('left') ? 'warning' : 'default'}
            onClick={() => {
              const current = form.engine_mounts || '';
              const values = current ? current.split(',') : [];
              const newValues = values.includes('left')
                ? values.filter(v => v !== 'left')
                : [...values, 'left'];
              onRadioChange('engine_mounts', newValues.join(','));
            }}
          />
          <Chip
            label="Right"
            clickable
            variant={form.engine_mounts?.includes('right') ? 'filled' : 'outlined'}
            color={form.engine_mounts?.includes('right') ? 'warning' : 'default'}
            onClick={() => {
              const current = form.engine_mounts || '';
              const values = current ? current.split(',') : [];
              const newValues = values.includes('right')
                ? values.filter(v => v !== 'right')
                : [...values, 'right'];
              onRadioChange('engine_mounts', newValues.join(','));
            }}
          />
          <Chip
            label="Frontward"
            clickable
            variant={form.engine_mounts?.includes('frontward') ? 'filled' : 'outlined'}
            color={form.engine_mounts?.includes('frontward') ? 'warning' : 'default'}
            onClick={() => {
              const current = form.engine_mounts || '';
              const values = current ? current.split(',') : [];
              const newValues = values.includes('frontward')
                ? values.filter(v => v !== 'frontward')
                : [...values, 'frontward'];
              onRadioChange('engine_mounts', newValues.join(','));
            }}
          />
          <Chip
            label="Rearward"
            clickable
            variant={form.engine_mounts?.includes('rearward') ? 'filled' : 'outlined'}
            color={form.engine_mounts?.includes('rearward') ? 'warning' : 'default'}
            onClick={() => {
              const current = form.engine_mounts || '';
              const values = current ? current.split(',') : [];
              const newValues = values.includes('rearward')
                ? values.filter(v => v !== 'rearward')
                : [...values, 'rearward'];
              onRadioChange('engine_mounts', newValues.join(','));
            }}
          />
          <Chip
            label="Torque Mount"
            clickable
            variant={form.engine_mounts?.includes('torque_mount') ? 'filled' : 'outlined'}
            color={form.engine_mounts?.includes('torque_mount') ? 'error' : 'default'}
            onClick={() => {
              const current = form.engine_mounts || '';
              const values = current ? current.split(',') : [];
              const newValues = values.includes('torque_mount')
                ? values.filter(v => v !== 'torque_mount')
                : [...values, 'torque_mount'];
              onRadioChange('engine_mounts', newValues.join(','));
            }}
          />
        </Box>
      </Box>
      )}

      {/* Fluids Section Header */}
      <Typography variant="h6" sx={{ mt: 3, mb: 2, fontWeight: 'bold' }}>
        Fluids
      </Typography>

      {/* Brake Fluid */}
      {isEnabled('brake_fluid') && (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
          <SafariImageUpload
            onImageUpload={onImageUpload}
            uploadType="brake_fluid_photos"
            disabled={loading}
            multiple={true}
            size="small"
            resize1080p={true}
            showCameraButton={true}
            showGalleryButton={false}
          />
          <Typography variant="body1" sx={{ flexGrow: 1, ml: 1 }}>
            Brake Fluid
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <SafariImageUpload
              onImageUpload={onImageUpload}
              uploadType="brake_fluid_photos"
              disabled={loading}
              multiple={true}
              size="small"
              resize1080p={true}
              showCameraButton={false}
              showGalleryButton={true}
            />
            <NotesField
              fieldName="brake_fluid"
              fieldLabel="Brake Fluid"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
            <IconButton
              size="small"
              onClick={(e) => onInfoClick(e, "Check brake fluid level and color for contamination.")}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label="✅ Good"
            clickable
            variant={form.brake_fluid === 'good' ? 'filled' : 'outlined'}
            color={form.brake_fluid === 'good' ? 'success' : 'default'}
            onClick={() => onRadioChange('brake_fluid', 'good')}
          />
          <Chip
            label="⚠️ Warning"
            clickable
            variant={form.brake_fluid === 'warning' ? 'filled' : 'outlined'}
            color={form.brake_fluid === 'warning' ? 'warning' : 'default'}
            onClick={() => onRadioChange('brake_fluid', 'warning')}
          />
          <Chip
            label="❌ Bad"
            clickable
            variant={form.brake_fluid === 'bad' ? 'filled' : 'outlined'}
            color={form.brake_fluid === 'bad' ? 'error' : 'default'}
            onClick={() => onRadioChange('brake_fluid', 'bad')}
          />
          <Chip
            label="Flush"
            clickable
            variant={form.brake_fluid === 'flush' ? 'filled' : 'outlined'}
            color={form.brake_fluid === 'flush' ? 'secondary' : 'default'}
            onClick={() => onRadioChange('brake_fluid', 'flush')}
          />
        </Box>
      </Box>
      )}

      {/* Power Steering Fluid */}
      {isEnabled('powersteering_fluid') && (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
          <SafariImageUpload
            onImageUpload={onImageUpload}
            uploadType="powersteering_fluid_photos"
            disabled={loading}
            multiple={true}
            size="small"
            resize1080p={true}
            showCameraButton={true}
            showGalleryButton={false}
          />
          <Typography variant="body1" sx={{ flexGrow: 1, ml: 1 }}>
            Power Steering Fluid
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <SafariImageUpload
              onImageUpload={onImageUpload}
              uploadType="powersteering_fluid_photos"
              disabled={loading}
              multiple={true}
              size="small"
              resize1080p={true}
              showCameraButton={false}
              showGalleryButton={true}
            />
            <NotesField
              fieldName="powersteering_fluid"
              fieldLabel="Power Steering Fluid"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
            <IconButton
              size="small"
              onClick={(e) => onInfoClick(e, "Check power steering fluid level and condition.")}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label="✅ Good"
            clickable
            variant={form.powersteering_fluid === 'good' ? 'filled' : 'outlined'}
            color={form.powersteering_fluid === 'good' ? 'success' : 'default'}
            onClick={() => onRadioChange('powersteering_fluid', 'good')}
          />
          <Chip
            label="⚠️ Warning"
            clickable
            variant={form.powersteering_fluid === 'warning' ? 'filled' : 'outlined'}
            color={form.powersteering_fluid === 'warning' ? 'warning' : 'default'}
            onClick={() => onRadioChange('powersteering_fluid', 'warning')}
          />
          <Chip
            label="❌ Bad"
            clickable
            variant={form.powersteering_fluid === 'bad' ? 'filled' : 'outlined'}
            color={form.powersteering_fluid === 'bad' ? 'error' : 'default'}
            onClick={() => onRadioChange('powersteering_fluid', 'bad')}
          />
          <Chip
            label="Flush"
            clickable
            variant={form.powersteering_fluid === 'flush' ? 'filled' : 'outlined'}
            color={form.powersteering_fluid === 'flush' ? 'secondary' : 'default'}
            onClick={() => onRadioChange('powersteering_fluid', 'flush')}
          />
        </Box>
      </Box>
      )}

      {/* Coolant */}
      {isEnabled('coolant') && (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
          <SafariImageUpload
            onImageUpload={onImageUpload}
            uploadType="coolant_photos"
            disabled={loading}
            multiple={true}
            size="small"
            resize1080p={true}
            showCameraButton={true}
            showGalleryButton={false}
          />
          <Typography variant="body1" sx={{ flexGrow: 1, ml: 1 }}>
            Coolant
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <SafariImageUpload
              onImageUpload={onImageUpload}
              uploadType="coolant_photos"
              disabled={loading}
              multiple={true}
              size="small"
              resize1080p={true}
              showCameraButton={false}
              showGalleryButton={true}
            />
            <NotesField
              fieldName="coolant"
              fieldLabel="Coolant"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
            <IconButton
              size="small"
              onClick={(e) => onInfoClick(e, "Check coolant level and condition for contamination.")}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label="✅ Good"
            clickable
            variant={form.coolant === 'good' ? 'filled' : 'outlined'}
            color={form.coolant === 'good' ? 'success' : 'default'}
            onClick={() => onRadioChange('coolant', 'good')}
          />
          <Chip
            label="⚠️ Warning"
            clickable
            variant={form.coolant === 'warning' ? 'filled' : 'outlined'}
            color={form.coolant === 'warning' ? 'warning' : 'default'}
            onClick={() => onRadioChange('coolant', 'warning')}
          />
          <Chip
            label="❌ Bad"
            clickable
            variant={form.coolant === 'bad' ? 'filled' : 'outlined'}
            color={form.coolant === 'bad' ? 'error' : 'default'}
            onClick={() => onRadioChange('coolant', 'bad')}
          />
          <Chip
            label="Flush"
            clickable
            variant={form.coolant === 'flush' ? 'filled' : 'outlined'}
            color={form.coolant === 'flush' ? 'secondary' : 'default'}
            onClick={() => onRadioChange('coolant', 'flush')}
          />
        </Box>
      </Box>
      )}

      {/* Radiator End Caps */}
      {isEnabled('radiator_end_caps') && (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
          <SafariImageUpload
            onImageUpload={onImageUpload}
            uploadType="radiator_end_caps_photos"
            disabled={loading}
            multiple={true}
            size="small"
            resize1080p={true}
            showCameraButton={true}
            showGalleryButton={false}
          />
          <Typography variant="body1" sx={{ flexGrow: 1, ml: 1 }}>
            Radiator End Caps
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <SafariImageUpload
              onImageUpload={onImageUpload}
              uploadType="radiator_end_caps_photos"
              disabled={loading}
              multiple={true}
              size="small"
              resize1080p={true}
              showCameraButton={false}
              showGalleryButton={true}
            />
            <NotesField
              fieldName="radiator_end_caps"
              fieldLabel="Radiator End Caps"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
            <IconButton
              size="small"
              onClick={(e) => onInfoClick(e, "Inspect radiator end caps for damage or leaks.")}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label="✅ Good"
            clickable
            variant={form.radiator_end_caps === 'good' ? 'filled' : 'outlined'}
            color={form.radiator_end_caps === 'good' ? 'success' : 'default'}
            onClick={() => onRadioChange('radiator_end_caps', 'good')}
          />
          <Chip
            label="⚠️ Warning"
            clickable
            variant={form.radiator_end_caps === 'warning' ? 'filled' : 'outlined'}
            color={form.radiator_end_caps === 'warning' ? 'warning' : 'default'}
            onClick={() => onRadioChange('radiator_end_caps', 'warning')}
          />
          <Chip
            label="❌ Bad"
            clickable
            variant={form.radiator_end_caps === 'bad' ? 'filled' : 'outlined'}
            color={form.radiator_end_caps === 'bad' ? 'error' : 'default'}
            onClick={() => onRadioChange('radiator_end_caps', 'bad')}
          />
          <Chip
            label="Leaking"
            clickable
            variant={form.radiator_end_caps === 'leaking' ? 'filled' : 'outlined'}
            color={form.radiator_end_caps === 'leaking' ? 'error' : 'default'}
            onClick={() => onRadioChange('radiator_end_caps', 'leaking')}
          />
        </Box>
      </Box>
      )}

      {/* Cooling Hoses */}
      {isEnabled('cooling_hoses') && (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
          <SafariImageUpload
            onImageUpload={onImageUpload}
            uploadType="cooling_hoses_photos"
            disabled={loading}
            multiple={true}
            size="small"
            resize1080p={true}
            showCameraButton={true}
            showGalleryButton={false}
          />
          <Typography variant="body1" sx={{ flexGrow: 1, ml: 1 }}>
            Cooling Hoses
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <SafariImageUpload
              onImageUpload={onImageUpload}
              uploadType="cooling_hoses_photos"
              disabled={loading}
              multiple={true}
              size="small"
              resize1080p={true}
              showCameraButton={false}
              showGalleryButton={true}
            />
            <NotesField
              fieldName="cooling_hoses"
              fieldLabel="Cooling Hoses"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
            <IconButton
              size="small"
              onClick={(e) => onInfoClick(e, "Inspect cooling hoses for cracks, leaks, or soft spots.")}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label="✅ Good"
            clickable
            variant={form.cooling_hoses?.includes('good') ? 'filled' : 'outlined'}
            color={form.cooling_hoses?.includes('good') ? 'success' : 'default'}
            onClick={() => {
              const current = form.cooling_hoses || '';
              const values = current ? current.split(',') : [];
              const next = values.includes('good') ? values.filter(v => v !== 'good') : [...values, 'good'];
              onRadioChange('cooling_hoses', next.join(','));
            }}
          />
          <Chip
            label="⚠️ Warning"
            clickable
            variant={form.cooling_hoses?.includes('warning') ? 'filled' : 'outlined'}
            color={form.cooling_hoses?.includes('warning') ? 'warning' : 'default'}
            onClick={() => {
              const current = form.cooling_hoses || '';
              const values = current ? current.split(',') : [];
              const next = values.includes('warning') ? values.filter(v => v !== 'warning') : [...values, 'warning'];
              onRadioChange('cooling_hoses', next.join(','));
            }}
          />
          <Chip
            label="❌ Bad"
            clickable
            variant={form.cooling_hoses?.includes('bad') ? 'filled' : 'outlined'}
            color={form.cooling_hoses?.includes('bad') ? 'error' : 'default'}
            onClick={() => {
              const current = form.cooling_hoses || '';
              const values = current ? current.split(',') : [];
              const next = values.includes('bad') ? values.filter(v => v !== 'bad') : [...values, 'bad'];
              onRadioChange('cooling_hoses', next.join(','));
            }}
          />
          <Chip
            label="Heater Hoses"
            clickable
            variant={form.cooling_hoses?.includes('heater_hoses') ? 'filled' : 'outlined'}
            color={form.cooling_hoses?.includes('heater_hoses') ? 'warning' : 'default'}
            onClick={() => {
              const current = form.cooling_hoses || '';
              const values = current ? current.split(',') : [];
              const next = values.includes('heater_hoses') ? values.filter(v => v !== 'heater_hoses') : [...values, 'heater_hoses'];
              onRadioChange('cooling_hoses', next.join(','));
            }}
          />
          <Chip
            label="Radiator Hoses"
            clickable
            variant={form.cooling_hoses?.includes('radiator_hoses') ? 'filled' : 'outlined'}
            color={form.cooling_hoses?.includes('radiator_hoses') ? 'warning' : 'default'}
            onClick={() => {
              const current = form.cooling_hoses || '';
              const values = current ? current.split(',') : [];
              const next = values.includes('radiator_hoses') ? values.filter(v => v !== 'radiator_hoses') : [...values, 'radiator_hoses'];
              onRadioChange('cooling_hoses', next.join(','));
            }}
          />
        </Box>
      </Box>
      )}

      {/* Terminal Damage Location Dialog */}
      <Dialog
        open={terminalDamageDialogOpen}
        onClose={handleTerminalDamageDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Which terminal is damaged?
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2, alignItems: 'center' }}>
            <Chip
              label="➕ Positive Terminal"
              clickable
              onClick={() => handleTerminalDamageLocationToggle('positive')}
              variant={(() => {
                try {
                  const locations = Array.isArray(form.battery_terminal_damage_location) 
                    ? form.battery_terminal_damage_location 
                    : [];
                  return locations.includes('positive') ? 'filled' : 'outlined';
                } catch {
                  return 'outlined';
                }
              })()}
              sx={{ 
                fontSize: '1.1rem',
                padding: '8px 16px',
                height: 'auto',
                backgroundColor: (() => {
                  try {
                    const locations = Array.isArray(form.battery_terminal_damage_location) 
                      ? form.battery_terminal_damage_location 
                      : [];
                    return locations.includes('positive') ? '#f44336' : 'transparent';
                  } catch {
                    return 'transparent';
                  }
                })(),
                color: (() => {
                  try {
                    const locations = Array.isArray(form.battery_terminal_damage_location) 
                      ? form.battery_terminal_damage_location 
                      : [];
                    return locations.includes('positive') ? 'white' : '#f44336';
                  } catch {
                    return '#f44336';
                  }
                })(),
                borderColor: '#f44336',
                '&:hover': {
                  backgroundColor: '#f44336',
                  color: 'white',
                }
              }}
            />
            <Chip
              label="➖ Negative Terminal"
              clickable
              onClick={() => handleTerminalDamageLocationToggle('negative')}
              variant={(() => {
                try {
                  const locations = Array.isArray(form.battery_terminal_damage_location) 
                    ? form.battery_terminal_damage_location 
                    : [];
                  return locations.includes('negative') ? 'filled' : 'outlined';
                } catch {
                  return 'outlined';
                }
              })()}
              sx={{ 
                fontSize: '1.1rem',
                padding: '8px 16px',
                height: 'auto',
                backgroundColor: (() => {
                  try {
                    const locations = Array.isArray(form.battery_terminal_damage_location) 
                      ? form.battery_terminal_damage_location 
                      : [];
                    return locations.includes('negative') ? '#000000' : 'transparent';
                  } catch {
                    return 'transparent';
                  }
                })(),
                color: (() => {
                  try {
                    const locations = Array.isArray(form.battery_terminal_damage_location) 
                      ? form.battery_terminal_damage_location 
                      : [];
                    return locations.includes('negative') ? 'white' : '#000000';
                  } catch {
                    return '#000000';
                  }
                })(),
                borderColor: '#000000',
                '&:hover': {
                  backgroundColor: '#000000',
                  color: 'white',
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleTerminalDamageDialogClose} color="primary">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 