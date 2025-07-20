import React from 'react';
import {
  Typography,
  TextField,
  Box,
  FormControl,
  FormLabel,
  Stack,
  Chip,
  IconButton,
  Divider
} from '@mui/material';
import {
  Close as CloseIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import Grid from '../../CustomGrid';
import {
  QuickCheckForm,
  ImageUpload,
  PhotoType,
  RotorCondition,
  BrakePadCondition
} from '../../../types/quickCheck';
import TireTreadSection from '../../TireTreadSection';
import BrakePadSideView from '../../BrakePadSideView';
import BrakePadFrontAxleView from '../../BrakePadFrontAxleView';
import TireRepairLayout from '../../TireRepairLayout';
import TPMSLayout from '../../TPMSLayout';
import NotesField from './NotesField';
import { SafariImageUpload, ImageFieldRectangle } from '../../Image';
import { BrakePadConditionSelector } from '../../BrakePadConditionSelector';
import { getFullImageUrl } from '../../../services/imageUpload';

interface TiresBrakesTabProps {
  form: QuickCheckForm;
  loading: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRadioChange: (name: string, value: string) => void;
  onImageUpload: (file: File, type: PhotoType) => Promise<void>;
  onImageClick: (photos: ImageUpload[], photoType?: string) => void;
  onInfoClick: (event: React.MouseEvent<HTMLElement>, content: string) => void;
  onTreadChange: (position: string, field: string, value: string) => void;
  onTreadConditionChange: (position: string, field: string, condition: 'green' | 'yellow' | 'red') => void;
  onTirePhotoClick: (position: string) => void;
  onDeleteTirePhoto: (position: string, index: number) => void;
  onTireDateChange: (position: string, date: string) => void;
  onTireCommentToggle: (position: string, comment: string) => void;
  onTireStatusChange: (position: string, status: 'repairable' | 'non_repairable' | null) => void;
  onTireImageUpload: (position: string, imageType: 'not_repairable' | 'tire_size_brand' | 'repairable_spot', file: File) => Promise<void>;
  onTireImageDelete: (position: string, imageType: 'not_repairable' | 'tire_size_brand' | 'repairable_spot', index: number) => void;
  onTPMSStatusChange: (position: string, status: boolean | null) => void;
  onFieldNotesChange: (fieldName: string, noteText: string) => void;
  onDeleteImage: (photoType: string, index: number) => void;
  setForm: React.Dispatch<React.SetStateAction<QuickCheckForm>>;
}

export const TiresBrakesTab: React.FC<TiresBrakesTabProps> = ({
  form,
  loading,
  onChange,
  onRadioChange,
  onImageUpload,
  onImageClick,
  onInfoClick,
  onTreadChange,
  onTreadConditionChange,
  onTirePhotoClick,
  onDeleteTirePhoto,
  onTireDateChange,
  onTireCommentToggle,
  onTireStatusChange,
  onTireImageUpload,
  onTireImageDelete,
  onTPMSStatusChange,
  onFieldNotesChange,
  onDeleteImage,
  setForm
}) => {
  // State for dually selection
  const [isDuallySelected, setIsDuallySelected] = React.useState(false);
  
  // Helper function to get display URL for images
  const getDisplayUrl = (photo: ImageUpload): string => {
    if (photo.url?.startsWith('blob:')) {
      return photo.url;
    }
    return photo.url ? getFullImageUrl(photo.url) : URL.createObjectURL(photo.file);
  };
  
  // Default tire tread data
  const defaultTireTread = {
    inner_edge_depth: '',
    inner_depth: '',
    center_depth: '',
    outer_depth: '',
    outer_edge_depth: '',
    inner_edge_condition: 'green' as 'green' | 'yellow' | 'red',
    inner_condition: 'green' as 'green' | 'yellow' | 'red',
    center_condition: 'green' as 'green' | 'yellow' | 'red',
    outer_condition: 'green' as 'green' | 'yellow' | 'red',
    outer_edge_condition: 'green' as 'green' | 'yellow' | 'red',
  };

  // Ensure consistent tire tread values
  const getDriverRearInnerTread = () => {
    if (!form.tire_tread.driver_rear_inner) {
      return defaultTireTread;
    }
    return {
      ...defaultTireTread,
      ...form.tire_tread.driver_rear_inner
    };
  };

  const getPassengerRearInnerTread = () => {
    if (!form.tire_tread.passenger_rear_inner) {
      return defaultTireTread;
    }
    return {
      ...defaultTireTread,
      ...form.tire_tread.passenger_rear_inner
    };
  };
  
  // Helper function to convert TireTread to TireTreadData
  const convertToTireTreadData = (tireTread: any): any => {
    if (!tireTread) return defaultTireTread;
    return {
      ...defaultTireTread,
      ...tireTread,
      inner_edge_condition: tireTread.inner_edge_condition || 'green',
      inner_condition: tireTread.inner_condition || 'green',
      center_condition: tireTread.center_condition || 'green',
      outer_condition: tireTread.outer_condition || 'green',
      outer_edge_condition: tireTread.outer_edge_condition || 'green',
    };
  };

  // Helper function to render brake pad section
  const renderFrontBrakePadSection = (
    title: string,
    frontBrakePadData: { driver: { inner: BrakePadCondition; outer: BrakePadCondition; rotor_condition: RotorCondition }, passenger: { inner: BrakePadCondition; outer: BrakePadCondition; rotor_condition: RotorCondition } },
    updateHandler: (side: 'driver' | 'passenger', updates: any) => void,
    photos: ImageUpload[],
    photoType: PhotoType
  ) => {
    const renderSideSection = (side: 'driver' | 'passenger', sideData: { inner: BrakePadCondition; outer: BrakePadCondition; rotor_condition: RotorCondition }) => {
      const sideTitle = side.charAt(0).toUpperCase() + side.slice(1);

      return (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
            {sideTitle} Side
          </Typography>
          
          {/* Brake Pad Condition Selector */}
          <BrakePadConditionSelector
            innerCondition={sideData.inner}
            outerCondition={sideData.outer}
            onConditionChange={(type, condition) => {
              updateHandler(side, {
                [type]: condition
              });
            }}
            side={side}
            axle={title.toLowerCase().includes('front') ? 'front' : 'rear'}
          />

          {/* Rotor Condition */}
          <FormControl component="fieldset" sx={{ mb: 2 }}>
            <FormLabel component="legend" sx={{ fontWeight: 'normal' }}>Rotor Condition</FormLabel>
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
              {(['good', 'grooves', 'overheated', 'scared'] as RotorCondition[]).map((condition) => (
                <Chip
                  key={condition}
                  label={condition.charAt(0).toUpperCase() + condition.slice(1)}
                  color={sideData.rotor_condition === condition ? 'primary' : 'default'}
                  variant={sideData.rotor_condition === condition ? 'filled' : 'outlined'}
                  clickable
                  onClick={() => updateHandler(side, {
                    rotor_condition: condition
                  })}
                  sx={{ mb: 1 }}
                />
              ))}
            </Stack>
          </FormControl>

          {/* Individual brake pad visualization removed - now using combined front axle view */}
        </Box>
      );
    };

    return (
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <FormLabel component="legend" sx={{ flexGrow: 1, fontWeight: 'normal' }}>
            {title}
          </FormLabel>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <SafariImageUpload
              onImageUpload={onImageUpload}
              uploadType={photoType}
              disabled={loading}
              multiple={true}
              size="small"
            />
            <NotesField
              fieldName={photoType === 'front_brakes' ? 'front_brake_pads' : 'rear_brake_pads'}
              fieldLabel={title}
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
          </Box>
        </Box>

        {/* Driver and Passenger Sections - Side by Side */}
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 3 }}>
          {/* Passenger Section - Left Side */}
          <Box sx={{ flex: 1 }}>
            {renderSideSection('passenger', frontBrakePadData.passenger || { inner: '', outer: '', rotor_condition: '' })}
          </Box>
          
          {/* Driver Section - Right Side */}
          <Box sx={{ flex: 1 }}>
            {renderSideSection('driver', frontBrakePadData.driver || { inner: '', outer: '', rotor_condition: '' })}
          </Box>
        </Box>

        {/* Combined Front Axle Brake Visualization */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <BrakePadFrontAxleView
            driverInnerPad={frontBrakePadData.driver?.inner || ''}
            driverOuterPad={frontBrakePadData.driver?.outer || ''}
            driverRotorCondition={frontBrakePadData.driver?.rotor_condition as RotorCondition}
            passengerInnerPad={frontBrakePadData.passenger?.inner || ''}
            passengerOuterPad={frontBrakePadData.passenger?.outer || ''}
            passengerRotorCondition={frontBrakePadData.passenger?.rotor_condition as RotorCondition}
          />
        </Box>

        {/* Display Photos */}
        {photos.length > 0 && (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
            gap: 2,
            maxWidth: '400px'
          }}>
            {photos.map((photo, index) => (
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
                  src={photo.url || URL.createObjectURL(photo.file)}
                  alt={`${title} ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onClick={() => onImageClick(photos, photoType)}
                />
                <IconButton
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setForm(f => ({
                      ...f,
                      [photoType === 'front_brakes' ? 'front_brakes' : 'rear_brakes']: 
                        (f as any)[photoType === 'front_brakes' ? 'front_brakes' : 'rear_brakes'].filter((_: any, i: number) => i !== index)
                    }));
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
    );
  };

  // Helper function to render rear brake pad section (split into driver/passenger)
  const renderRearBrakePadSection = (
    title: string,
    rearBrakePadData: { driver: { inner: BrakePadCondition; outer: BrakePadCondition; rotor_condition: RotorCondition }, passenger: { inner: BrakePadCondition; outer: BrakePadCondition; rotor_condition: RotorCondition } },
    updateHandler: (side: 'driver' | 'passenger', updates: any) => void,
    photos: ImageUpload[],
    photoType: PhotoType
  ) => {
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.select();
    };

    const renderSideSection = (side: 'driver' | 'passenger', sideData: { inner: BrakePadCondition; outer: BrakePadCondition; rotor_condition: RotorCondition }) => {
      const fieldPrefix = `${title.replace(/\s+/g, '_').toLowerCase()}_${side}`;
      const sideTitle = side.charAt(0).toUpperCase() + side.slice(1);

      return (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
            {sideTitle} Side
          </Typography>
          
          {/* Brake Pad Condition Selector */}
          <BrakePadConditionSelector
            innerCondition={sideData.inner}
            outerCondition={sideData.outer}
            onConditionChange={(type, condition) => {
              updateHandler(side, {
                [type]: condition
              });
            }}
            side={side}
            axle={title.toLowerCase().includes('front') ? 'front' : 'rear'}
            onDrumsNotChecked={title.toLowerCase().includes('rear') ? () => {
              // Set all rear brake pads to drums_not_checked
              setForm(prev => ({
                ...prev,
                rear_brake_pads: {
                  ...prev.rear_brake_pads,
                  driver: {
                    inner: 'drums_not_checked',
                    outer: 'drums_not_checked',
                    rotor_condition: prev.rear_brake_pads?.driver?.rotor_condition || ''
                  },
                  passenger: {
                    inner: 'drums_not_checked',
                    outer: 'drums_not_checked',
                    rotor_condition: prev.rear_brake_pads?.passenger?.rotor_condition || ''
                  }
                }
              }));
            } : undefined}
          />

          {/* Rotor Condition */}
          <FormControl component="fieldset" sx={{ mb: 2 }}>
            <FormLabel component="legend" sx={{ fontWeight: 'normal' }}>Rotor Condition</FormLabel>
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
              {(['good', 'grooves', 'overheated', 'scared'] as RotorCondition[]).map((condition) => (
                <Chip
                  key={condition}
                  label={condition.charAt(0).toUpperCase() + condition.slice(1)}
                  color={sideData.rotor_condition === condition ? 'primary' : 'default'}
                  variant={sideData.rotor_condition === condition ? 'filled' : 'outlined'}
                  clickable
                  onClick={() => updateHandler(side, {
                    rotor_condition: condition
                  })}
                  sx={{ mb: 1 }}
                />
              ))}
            </Stack>
          </FormControl>

          {/* Individual brake pad visualization removed - now using combined rear axle view */}
        </Box>
      );
    };

    return (
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <FormLabel component="legend" sx={{ flexGrow: 1, fontWeight: 'normal' }}>
            {title}
          </FormLabel>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <SafariImageUpload
              onImageUpload={onImageUpload}
              uploadType={photoType}
              disabled={loading}
              multiple={true}
              size="small"
            />
            <NotesField
              fieldName={photoType === 'front_brakes' ? 'front_brake_pads' : 'rear_brake_pads'}
              fieldLabel={title}
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
          </Box>
        </Box>

        {/* Driver and Passenger Sections - Side by Side (Mirrored for Rear) */}
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 3 }}>
          {/* Driver Section - Left Side */}
          <Box sx={{ flex: 1 }}>
            {renderSideSection('driver', rearBrakePadData.driver || { inner: '', outer: '', rotor_condition: '' })}
          </Box>
          
          {/* Passenger Section - Right Side */}
          <Box sx={{ flex: 1 }}>
            {renderSideSection('passenger', rearBrakePadData.passenger || { inner: '', outer: '', rotor_condition: '' })}
          </Box>
        </Box>

        {/* Combined Rear Axle Brake Visualization */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <BrakePadFrontAxleView
            driverInnerPad={rearBrakePadData.driver?.inner || ''}
            driverOuterPad={rearBrakePadData.driver?.outer || ''}
            driverRotorCondition={rearBrakePadData.driver?.rotor_condition || ''}
            passengerInnerPad={rearBrakePadData.passenger?.inner || ''}
            passengerOuterPad={rearBrakePadData.passenger?.outer || ''}
            passengerRotorCondition={rearBrakePadData.passenger?.rotor_condition || ''}
            title="Rear Brakes"
            isRearAxle={true}
          />
        </Box>

        {/* Display Photos */}
        {photos.length > 0 && (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
            gap: 2,
            maxWidth: '400px'
          }}>
            {photos.map((photo, index) => (
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
                  src={photo.url || URL.createObjectURL(photo.file)}
                  alt={`${title} ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onClick={() => onImageClick(photos, photoType)}
                />
                <IconButton
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteImage(photoType, index);
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
    );
  };

  const renderBrakePadSection = (
    title: string,
    brakePadData: { inner: number; outer: number; rotor_condition: RotorCondition },
    updateHandler: (updates: any) => void,
    photos: ImageUpload[],
    photoType: PhotoType
  ) => {
    // Create a unique field prefix for this brake section
    const fieldPrefix = title.replace(/\s+/g, '_').toLowerCase();
    
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.select();
    };

    return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <FormLabel component="legend" sx={{ flexGrow: 1, fontWeight: 'normal' }}>
          {title}
        </FormLabel>
        <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
          <SafariImageUpload
            onImageUpload={onImageUpload}
            uploadType={photoType}
            disabled={loading}
            multiple={true}
            size="small"
          />
          <NotesField
            fieldName={photoType === 'front_brakes' ? 'front_brake_pads' : 'rear_brake_pads'}
            fieldLabel={title}
            notes={form.field_notes}
            onNotesChange={onFieldNotesChange}
          />
        </Box>
      </Box>
      
      {/* Brake Pad Measurements */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="Inner Pad (mm)"
            type="number"
            value={brakePadData.inner}
            onChange={(e) => {
              updateHandler({
                inner: Number(e.target.value)
              });
              // If a value was entered, focus the outer pad field
              if (e.target.value) {
                const outerPadInput = document.querySelector(`input[name="${fieldPrefix}_outer_pad"]`);
                if (outerPadInput) {
                  (outerPadInput as HTMLElement).focus();
                }
              }
            }}
            inputProps={{ 
              min: 0, 
              max: 20, 
              step: 0.1,
              onFocus: handleFocus,
              name: `${fieldPrefix}_inner_pad`
            }}
            size="small"
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="Outer Pad (mm)"
            type="number"
            value={brakePadData.outer}
            onChange={(e) => {
              updateHandler({
                outer: Number(e.target.value)
              });
            }}
            inputProps={{ 
              min: 0, 
              max: 20, 
              step: 0.1,
              onFocus: handleFocus,
              name: `${fieldPrefix}_outer_pad`
            }}
            size="small"
          />
        </Grid>
      </Grid>

      {/* Rotor Condition */}
      <FormControl component="fieldset" sx={{ mb: 2 }}>
        <FormLabel component="legend" sx={{ fontWeight: 'normal' }}>Rotor Condition</FormLabel>
        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
          {(['good', 'grooves', 'overheated', 'scared'] as RotorCondition[]).map((condition) => (
            <Chip
              key={condition}
              label={condition.charAt(0).toUpperCase() + condition.slice(1)}
              color={brakePadData.rotor_condition === condition ? 'primary' : 'default'}
              variant={brakePadData.rotor_condition === condition ? 'filled' : 'outlined'}
              clickable
              onClick={() => updateHandler({
                rotor_condition: condition
              })}
              sx={{ mb: 1 }}
            />
          ))}
        </Stack>
      </FormControl>

      {/* Brake Pad Visualization */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <BrakePadSideView
          innerPad={brakePadData.inner}
          outerPad={brakePadData.outer}
          rotorCondition={brakePadData.rotor_condition}
        />
      </Box>


      
      {photos.length > 0 && (
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
          gap: 2,
          maxWidth: '400px'
        }}>
          {photos.map((photo, index) => (
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
                src={photo.url || URL.createObjectURL(photo.file)}
                alt={`${title} ${index + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                onClick={() => onImageClick(photos, photoType)}
              />
              <IconButton
                className="delete-button"
                onClick={(e) => {
                  e.stopPropagation();
                  setForm(f => ({
                    ...f,
                    [photoType === 'front_brakes' ? 'front_brakes' : 'rear_brakes']: 
                      (f as any)[photoType === 'front_brakes' ? 'front_brakes' : 'rear_brakes'].filter((_: any, i: number) => i !== index)
                  }));
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
  );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Front Axle Section */}
      <Box>
        <Typography variant="h6" gutterBottom>
          Front Axle
        </Typography>
        <Divider sx={{ mb: 2 }} />
      </Box>

      {/* Passenger Front */}
      <Box>
        <Box>
          {/* Title with inline camera, photo library, and notes icons */}
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <FormLabel component="legend" sx={{ flexGrow: 1, fontWeight: 'normal' }}>
                Passenger Front Tire Tread
              </FormLabel>
              <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
              <SafariImageUpload
                onImageUpload={onImageUpload}
                uploadType="passenger_front"
                disabled={loading}
                multiple={true}
                size="small"
              />
              <NotesField
                fieldName="passenger_front_tire_tread"
                fieldLabel="Passenger Front Tire Tread"
                notes={form.field_notes}
                onNotesChange={onFieldNotesChange}
              />
            </Box>
          </Box>
          
          <TireTreadSection
            label=""
            fieldPrefix="passenger_front_tire_tread"
            value={form.tire_tread.passenger_front}
            onChange={(field, value) => onTreadChange('passenger_front', field, value)}
            onConditionChange={(field, condition) => onTreadConditionChange('passenger_front', field, condition)}
            onPhotoClick={() => onTirePhotoClick('passenger_front')}
            onDeletePhoto={(index) => onDeleteTirePhoto('passenger_front', index)}
            tireDate={form.tire_dates.passenger_front || ''}
            onTireDateChange={(date) => onTireDateChange('passenger_front', date)}
            tireComments={form.tire_comments.passenger_front || []}
            onTireCommentToggle={(comment) => onTireCommentToggle('passenger_front', comment)}
            photos={[]}
          />
          
          {/* Display Photos */}
          {(() => {
            const tirePhotos = form.tire_photos.find(p => p.type === 'passenger_front')?.photos || [];
            return tirePhotos.length > 0 ? (
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
                gap: 2,
                maxWidth: '400px',
                mt: 2
              }}>
                {tirePhotos.map((photo, index) => (
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
                      src={photo.url || URL.createObjectURL(photo.file)}
                      alt={`Passenger Front Tire ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      onClick={() => onImageClick(tirePhotos, 'passenger_front_tire')}
                    />
                    <IconButton
                      className="delete-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTirePhoto('passenger_front', index);
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
            ) : null;
          })()}
        </Box>
      </Box>

      {/* Front Brake Pads */}
      <Box>
        {renderFrontBrakePadSection(
          'Front Brake Pads',
          {
            driver: form.front_brake_pads?.driver || { inner: '', outer: '', rotor_condition: '' },
            passenger: form.front_brake_pads?.passenger || { inner: '', outer: '', rotor_condition: '' }
          },
          (side: 'driver' | 'passenger', updates) => setForm(prev => ({
            ...prev,
            front_brake_pads: { 
              ...prev.front_brake_pads, 
              driver: prev.front_brake_pads?.driver || { inner: '', outer: '', rotor_condition: '' },
              passenger: prev.front_brake_pads?.passenger || { inner: '', outer: '', rotor_condition: '' },
              [side]: { 
                ...(prev.front_brake_pads?.[side] || { inner: '', outer: '', rotor_condition: '' }), 
                ...updates 
              }
            }
          })),
          form.front_brakes,
          'front_brakes'
        )}
      </Box>

      {/* Driver Front */}
      <Box>
        <Box>
          {/* Title with camera, photo library, and notes icons */}
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <FormLabel component="legend" sx={{ flexGrow: 1, fontWeight: 'normal' }}>
                Driver Front Tire Tread
              </FormLabel>
              <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
              <SafariImageUpload
                onImageUpload={onImageUpload}
                uploadType="driver_front"
                disabled={loading}
                multiple={true}
                size="small"
              />
              <NotesField
                fieldName="driver_front_tire_tread"
                fieldLabel="Driver Front Tire Tread"
                notes={form.field_notes}
                onNotesChange={onFieldNotesChange}
              />
            </Box>
          </Box>
          
          <TireTreadSection
            label=""
            fieldPrefix="driver_front_tire_tread"
            value={form.tire_tread.driver_front}
            onChange={(field, value) => onTreadChange('driver_front', field, value)}
            onConditionChange={(field, condition) => onTreadConditionChange('driver_front', field, condition)}
            onPhotoClick={() => onTirePhotoClick('driver_front')}
            onDeletePhoto={(index) => onDeleteTirePhoto('driver_front', index)}
            tireDate={form.tire_dates.driver_front || ''}
            onTireDateChange={(date) => onTireDateChange('driver_front', date)}
            tireComments={form.tire_comments.driver_front || []}
            onTireCommentToggle={(comment) => onTireCommentToggle('driver_front', comment)}
            photos={[]}
          />
          
          {/* Display Photos */}
          {(() => {
            const tirePhotos = form.tire_photos.find(p => p.type === 'driver_front')?.photos || [];
            return tirePhotos.length > 0 ? (
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
                gap: 2,
                maxWidth: '400px',
                mt: 2
              }}>
                {tirePhotos.map((photo, index) => (
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
                      src={photo.url || URL.createObjectURL(photo.file)}
                      alt={`Driver Front Tire ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      onClick={() => onImageClick(tirePhotos, 'driver_front_tire')}
                    />
                    <IconButton
                      className="delete-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTirePhoto('driver_front', index);
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
            ) : null;
          })()}
        </Box>
      </Box>

      {/* Rear Axle Section */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 4, mb: 2 }}>
          <Typography variant="h6">
            Rear Axle
          </Typography>
          <Chip
            label="Dually"
            color={isDuallySelected ? 'primary' : 'default'}
            variant={isDuallySelected ? 'filled' : 'outlined'}
            clickable
            onClick={() => setIsDuallySelected(!isDuallySelected)}
            sx={{ fontWeight: isDuallySelected ? 'bold' : 'normal' }}
          />
        </Box>
        <Divider sx={{ mb: 2 }} />
      </Box>

      {/* Driver Rear */}
      <Box>
        <Box>
          {/* Title with camera, photo library, and notes icons */}
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <FormLabel component="legend" sx={{ flexGrow: 1, fontWeight: 'normal' }}>
                Driver Rear Tire Tread
              </FormLabel>
              <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
              <SafariImageUpload
                onImageUpload={onImageUpload}
                uploadType="driver_rear"
                disabled={loading}
                multiple={true}
                size="small"
              />
              <NotesField
                fieldName="driver_rear_tire_tread"
                fieldLabel="Driver Rear Tire Tread"
                notes={form.field_notes}
                onNotesChange={onFieldNotesChange}
              />
            </Box>
          </Box>
          
          <TireTreadSection
            label=""
            fieldPrefix="driver_rear_tire_tread"
            value={form.tire_tread.driver_rear}
            onChange={(field, value) => onTreadChange('driver_rear', field, value)}
            onConditionChange={(field, condition) => onTreadConditionChange('driver_rear', field, condition)}
            onPhotoClick={() => onTirePhotoClick('driver_rear')}
            onDeletePhoto={(index) => onDeleteTirePhoto('driver_rear', index)}
            tireDate={form.tire_dates.driver_rear || ''}
            onTireDateChange={(date) => onTireDateChange('driver_rear', date)}
            tireComments={form.tire_comments.driver_rear || []}
            onTireCommentToggle={(comment) => onTireCommentToggle('driver_rear', comment)}
            photos={[]}
          />
          
          {/* Display Photos */}
          {(() => {
            const tirePhotos = form.tire_photos.find(p => p.type === 'driver_rear')?.photos || [];
            return tirePhotos.length > 0 ? (
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
                gap: 2,
                maxWidth: '400px',
                mt: 2
              }}>
                {tirePhotos.map((photo, index) => (
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
                      src={photo.url || URL.createObjectURL(photo.file)}
                      alt={`Driver Rear Tire ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      onClick={() => onImageClick(tirePhotos, 'driver_rear_tire')}
                    />
                    <IconButton
                      className="delete-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTirePhoto('driver_rear', index);
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
            ) : null;
          })()}
        </Box>
      </Box>

      {/* Driver Rear Inner - only show if Dually is selected */}
      {isDuallySelected && (
        <Box>
          <Box>
            {/* Title with camera, photo library, and notes icons */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                             <FormLabel component="legend" sx={{ flexGrow: 1, fontWeight: 'normal' }}>
                 Driver Rear Inner Tire Tread
               </FormLabel>
              <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
                <SafariImageUpload
                  onImageUpload={onImageUpload}
                  uploadType="driver_rear_inner"
                  disabled={loading}
                  multiple={true}
                  size="small"
                />
                <NotesField
                  fieldName="driver_rear_inner_tire_tread"
                  fieldLabel="Driver Rear Inner Tire Tread"
                  notes={form.field_notes}
                  onNotesChange={onFieldNotesChange}
                />
              </Box>
            </Box>
            
            <TireTreadSection
              label=""
              fieldPrefix="driver_rear_inner_tire_tread"
              value={getDriverRearInnerTread()}
              onChange={(field, value) => onTreadChange('driver_rear_inner', field, value)}
              onConditionChange={(field, condition) => onTreadConditionChange('driver_rear_inner', field, condition)}
              onPhotoClick={() => onTirePhotoClick('driver_rear_inner')}
              onDeletePhoto={(index) => onDeleteTirePhoto('driver_rear_inner', index)}
              tireDate={form.tire_dates.driver_rear_inner || ''}
              onTireDateChange={(date) => onTireDateChange('driver_rear_inner', date)}
              tireComments={form.tire_comments.driver_rear_inner || []}
              onTireCommentToggle={(comment) => onTireCommentToggle('driver_rear_inner', comment)}
              photos={[]}
            />
            
            {/* Display Photos */}
            {(() => {
              const tirePhotos = form.tire_photos.find(p => p.type === 'driver_rear_inner')?.photos || [];
              return tirePhotos.length > 0 ? (
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
                  gap: 2,
                  maxWidth: '400px',
                  mt: 2
                }}>
                  {tirePhotos.map((photo, index) => (
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
                        src={photo.url || URL.createObjectURL(photo.file)}
                        alt={`Driver Rear Inner Tire ${index + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        onClick={() => onImageClick(tirePhotos, 'driver_rear_inner_tire')}
                      />
                      <IconButton
                        className="delete-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTirePhoto('driver_rear_inner', index);
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
              ) : null;
            })()}
          </Box>
        </Box>
      )}

      {/* Spare */}
      <Box>
        <Box>
          {/* Title with camera, photo library, and notes icons */}
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <FormLabel component="legend" sx={{ flexGrow: 1, fontWeight: 'normal' }}>
                Spare Tire Tread
              </FormLabel>
              <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
              <SafariImageUpload
                onImageUpload={onImageUpload}
                uploadType="spare"
                disabled={loading}
                multiple={true}
                size="small"
              />
              <NotesField
                fieldName="spare_tire_tread"
                fieldLabel="Spare Tire Tread"
                notes={form.field_notes}
                onNotesChange={onFieldNotesChange}
              />
            </Box>
          </Box>
          
          <TireTreadSection
            label=""
            fieldPrefix="spare_tire_tread"
            value={form.tire_tread.spare}
            onChange={(field, value) => onTreadChange('spare', field, value)}
            onConditionChange={(field, condition) => onTreadConditionChange('spare', field, condition)}
            onPhotoClick={() => onTirePhotoClick('spare')}
            onDeletePhoto={(index) => onDeleteTirePhoto('spare', index)}
            tireDate={form.tire_dates.spare || ''}
            onTireDateChange={(date) => onTireDateChange('spare', date)}
            tireComments={form.tire_comments.spare || []}
            onTireCommentToggle={(comment) => onTireCommentToggle('spare', comment)}
            photos={[]}
          />
          
          {/* Display Photos */}
          {(() => {
            const tirePhotos = form.tire_photos.find(p => p.type === 'spare')?.photos || [];
            return tirePhotos.length > 0 ? (
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
                gap: 2,
                maxWidth: '400px',
                mt: 2
              }}>
                {tirePhotos.map((photo, index) => (
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
                      src={photo.url || URL.createObjectURL(photo.file)}
                      alt={`Spare Tire ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      onClick={() => onImageClick(tirePhotos, 'spare_tire')}
                    />
                    <IconButton
                      className="delete-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTirePhoto('spare', index);
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
            ) : null;
          })()}
        </Box>
      </Box>

      {/* Rear Brake Pads */}
      <Box>
        {renderRearBrakePadSection(
          'Rear Brake Pads',
          {
            driver: form.rear_brake_pads?.driver || { inner: '', outer: '', rotor_condition: '' },
            passenger: form.rear_brake_pads?.passenger || { inner: '', outer: '', rotor_condition: '' }
          },
          (side: 'driver' | 'passenger', updates) => setForm(prev => ({
            ...prev,
            rear_brake_pads: { 
              ...prev.rear_brake_pads, 
              driver: prev.rear_brake_pads?.driver || { inner: '', outer: '', rotor_condition: '' },
              passenger: prev.rear_brake_pads?.passenger || { inner: '', outer: '', rotor_condition: '' },
              [side]: { 
                ...(prev.rear_brake_pads?.[side] || { inner: '', outer: '', rotor_condition: '' }), 
                ...updates 
              }
            }
          })),
          form.rear_brakes,
          'rear_brakes'
        )}
      </Box>

      {/* Passenger Rear Inner - only show if Dually is selected */}
      {isDuallySelected && (
        <Box>
          <Box>
            {/* Title with camera, photo library, and notes icons */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                             <FormLabel component="legend" sx={{ flexGrow: 1, fontWeight: 'normal' }}>
                 Passenger Rear Inner Tire Tread
               </FormLabel>
              <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
                <SafariImageUpload
                  onImageUpload={onImageUpload}
                  uploadType="passenger_rear_inner"
                  disabled={loading}
                  multiple={true}
                  size="small"
                />
                <NotesField
                  fieldName="passenger_rear_inner_tire_tread"
                  fieldLabel="Passenger Rear Inner Tire Tread"
                  notes={form.field_notes}
                  onNotesChange={onFieldNotesChange}
                />
              </Box>
            </Box>
            
            <TireTreadSection
              label=""
              fieldPrefix="passenger_rear_inner_tire_tread"
              value={getPassengerRearInnerTread()}
              onChange={(field, value) => onTreadChange('passenger_rear_inner', field, value)}
              onConditionChange={(field, condition) => onTreadConditionChange('passenger_rear_inner', field, condition)}
              onPhotoClick={() => onTirePhotoClick('passenger_rear_inner')}
              onDeletePhoto={(index) => onDeleteTirePhoto('passenger_rear_inner', index)}
              tireDate={form.tire_dates.passenger_rear_inner || ''}
              onTireDateChange={(date) => onTireDateChange('passenger_rear_inner', date)}
              tireComments={form.tire_comments.passenger_rear_inner || []}
              onTireCommentToggle={(comment) => onTireCommentToggle('passenger_rear_inner', comment)}
              photos={[]}
            />
            
            {/* Display Photos */}
            {(() => {
              const tirePhotos = form.tire_photos.find(p => p.type === 'passenger_rear_inner')?.photos || [];
              return tirePhotos.length > 0 ? (
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
                  gap: 2,
                  maxWidth: '400px',
                  mt: 2
                }}>
                  {tirePhotos.map((photo, index) => (
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
                        src={photo.url || URL.createObjectURL(photo.file)}
                        alt={`Passenger Rear Inner Tire ${index + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        onClick={() => onImageClick(tirePhotos, 'passenger_rear_inner_tire')}
                      />
                      <IconButton
                        className="delete-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTirePhoto('passenger_rear_inner', index);
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
              ) : null;
            })()}
          </Box>
        </Box>
      )}

      {/* Passenger Rear */}
      <Box>
        <Box>
          {/* Title with camera, photo library, and notes icons */}
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <FormLabel component="legend" sx={{ flexGrow: 1, fontWeight: 'normal' }}>
                Passenger Rear Tire Tread
              </FormLabel>
              <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
              <SafariImageUpload
                onImageUpload={onImageUpload}
                uploadType="passenger_rear"
                disabled={loading}
                multiple={true}
                size="small"
              />
              <NotesField
                fieldName="passenger_rear_tire_tread"
                fieldLabel="Passenger Rear Tire Tread"
                notes={form.field_notes}
                onNotesChange={onFieldNotesChange}
              />
            </Box>
          </Box>
          
          <TireTreadSection
            label=""
            fieldPrefix="passenger_rear_tire_tread"
            value={form.tire_tread.passenger_rear}
            onChange={(field, value) => onTreadChange('passenger_rear', field, value)}
            onConditionChange={(field, condition) => onTreadConditionChange('passenger_rear', field, condition)}
            onPhotoClick={() => onTirePhotoClick('passenger_rear')}
            onDeletePhoto={(index) => onDeleteTirePhoto('passenger_rear', index)}
            tireDate={form.tire_dates.passenger_rear || ''}
            onTireDateChange={(date) => onTireDateChange('passenger_rear', date)}
            tireComments={form.tire_comments.passenger_rear || []}
            onTireCommentToggle={(comment) => onTireCommentToggle('passenger_rear', comment)}
            photos={[]}
          />
          
          {/* Display Photos */}
          {(() => {
            const tirePhotos = form.tire_photos.find(p => p.type === 'passenger_rear')?.photos || [];
            return tirePhotos.length > 0 ? (
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
                gap: 2,
                maxWidth: '400px',
                mt: 2
              }}>
                {tirePhotos.map((photo, index) => (
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
                      src={photo.url || URL.createObjectURL(photo.file)}
                      alt={`Passenger Rear Tire ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      onClick={() => onImageClick(tirePhotos, 'passenger_rear_tire')}
                    />
                    <IconButton
                      className="delete-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTirePhoto('passenger_rear', index);
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
            ) : null;
          })()}
        </Box>
      </Box>

      {/* Tire Rotation */}
      <Box>
        <FormControl component="fieldset">
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <FormLabel component="legend" sx={{ fontWeight: 'normal' }}>Tire Rotation</FormLabel>
            <NotesField
              fieldName="tire_rotation"
              fieldLabel="Tire Rotation"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
          </Box>
          <Stack direction="row" spacing={2} sx={{ mt: 1, flexWrap: 'wrap' }}>
            <Chip
              label="✅ Good"
              color="success"
              variant={form.tire_rotation === 'good' ? 'filled' : 'outlined'}
              clickable
              onClick={() => onRadioChange('tire_rotation', 'good')}
              sx={{ fontWeight: form.tire_rotation === 'good' ? 'bold' : 'normal', mb: 1 }}
            />
            <Chip
              label="🔄 Recommend Tire Rotation"
              color="warning"
              variant={form.tire_rotation === 'bad' ? 'filled' : 'outlined'}
              clickable
              onClick={() => onRadioChange('tire_rotation', 'bad')}
              sx={{ fontWeight: form.tire_rotation === 'bad' ? 'bold' : 'normal', mb: 1 }}
            />
          </Stack>
        </FormControl>
      </Box>

      {/* Drain Plug Type */}
      <Box>
        <FormControl component="fieldset">
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <FormLabel component="legend" sx={{ fontWeight: 'normal' }}>Drain Plug Type</FormLabel>
            <NotesField
              fieldName="drain_plug_type"
              fieldLabel="Drain Plug Type"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
          </Box>
          <Stack direction="row" spacing={2} sx={{ mt: 1, flexWrap: 'wrap' }}>
            <Chip
              label="✅ Metal"
              color="success"
              variant={form.drain_plug_type === 'metal' ? 'filled' : 'outlined'}
              clickable
              onClick={() => onRadioChange('drain_plug_type', 'metal')}
              sx={{ fontWeight: form.drain_plug_type === 'metal' ? 'bold' : 'normal', mb: 1 }}
            />
            <Chip
              label="⚠️ Plastic"
              color="warning"
              variant={form.drain_plug_type === 'plastic' ? 'filled' : 'outlined'}
              clickable
              onClick={() => onRadioChange('drain_plug_type', 'plastic')}
              sx={{ fontWeight: form.drain_plug_type === 'plastic' ? 'bold' : 'normal', mb: 1 }}
            />
          </Stack>
        </FormControl>
      </Box>

      {/* Undercarriage */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="body1" sx={{ flexGrow: 1 }}>
            Undercarriage
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <SafariImageUpload
              onImageUpload={onImageUpload}
              uploadType="undercarriage_photos"
              disabled={loading}
              multiple={true}
              size="small"
            />
            <NotesField
              fieldName="undercarriage_photos"
              fieldLabel="Undercarriage"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
          </Box>
        </Box>
        
        <ImageFieldRectangle
          label=""
          images={(form.undercarriage_photos || [])
            .filter(photo => photo && !photo.isDeleted)
            .map(photo => photo.url || URL.createObjectURL(photo.file))
            .filter(url => url && url.length > 0)}
          onImageUpload={onImageUpload}
          onImageRemove={(index) => onDeleteImage('undercarriage_photos', index)}
          onImageView={(imageUrl) => {
            onImageClick(form.undercarriage_photos || [], 'undercarriage_photos');
          }}
          uploadType="undercarriage_photos"
          disabled={loading}
          multiple={true}
          maxFiles={5}
        />
      </Box>

      {/* Static Sticker */}
      <Box>
        <FormControl component="fieldset">
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <FormLabel component="legend" sx={{ fontWeight: 'normal' }}>Static Sticker</FormLabel>
            <NotesField
              fieldName="static_sticker"
              fieldLabel="Static Sticker"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
          </Box>
          <Stack direction="row" spacing={2} sx={{ mt: 1, flexWrap: 'wrap' }}>
            <Chip
              label="✅ Good"
              color="success"
              variant={form.static_sticker === 'good' ? 'filled' : 'outlined'}
              clickable
              onClick={() => onRadioChange('static_sticker', 'good')}
              sx={{ fontWeight: form.static_sticker === 'good' ? 'bold' : 'normal', mb: 1 }}
            />
            <Chip
              label="Not Oil Change"
              color="warning"
              variant={form.static_sticker === 'not_oil_change' ? 'filled' : 'outlined'}
              clickable
              onClick={() => onRadioChange('static_sticker', 'not_oil_change')}
              sx={{ fontWeight: form.static_sticker === 'not_oil_change' ? 'bold' : 'normal', mb: 1 }}
            />
            <Chip
              label="❌ Need Sticker"
              color="error"
              variant={form.static_sticker === 'need_sticker' ? 'filled' : 'outlined'}
              clickable
              onClick={() => onRadioChange('static_sticker', 'need_sticker')}
              sx={{ fontWeight: form.static_sticker === 'need_sticker' ? 'bold' : 'normal', mb: 1 }}
            />
          </Stack>
        </FormControl>
      </Box>


      {/* Tire Repair */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
            Tire Repair
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <SafariImageUpload
              onImageUpload={onImageUpload}
              uploadType="tire_repair_status"
              disabled={loading}
              multiple={true}
              size="small"
            />
            <NotesField
              fieldName="tire_repair_status"
              fieldLabel="Tire Repair"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
          </Box>
        </Box>
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={2} sx={{ mt: 1, flexWrap: 'wrap' }}>
            <Chip
              label="⚠️ Not a tire repair"
              color="warning"
              variant={form.tire_repair_status === 'not_tire_repair' ? 'filled' : 'outlined'}
              clickable
              onClick={() => onRadioChange('tire_repair_status', 'not_tire_repair')}
              sx={{ fontWeight: form.tire_repair_status === 'not_tire_repair' ? 'bold' : 'normal', mb: 1 }}
            />
            <Chip
              label="Tire Repair"
              color="success"
              variant={form.tire_repair_status === 'repairable' ? 'filled' : 'outlined'}
              clickable
              onClick={() => onRadioChange('tire_repair_status', 'repairable')}
              sx={{ fontWeight: form.tire_repair_status === 'repairable' ? 'bold' : 'normal', mb: 1 }}
            />
          </Stack>
          
          {/* Display Photos */}
          {form.tire_repair_status_photos.length > 0 && (
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
              gap: 2,
              maxWidth: '400px',
              mt: 2
            }}>
              {(form.tire_repair_status_photos || []).map((photo, index) => (
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
                    src={photo.url || URL.createObjectURL(photo.file)}
                    alt={`Tire Repair Status ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                    onClick={() => onImageClick(form.tire_repair_status_photos, 'tire_repair_status')}
                  />
                  <IconButton
                    className="delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteImage('tire_repair_status_photos', index);
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

      {/* Tire Repair Layout */}
      {form.tire_repair_status === 'repairable' && (
        <Box>
          <TireRepairLayout
            tireStatuses={form.tire_repair_statuses}
            treadData={{
              driver_front: form.tire_tread.driver_front,
              passenger_front: form.tire_tread.passenger_front,
              driver_rear_outer: form.tire_tread.driver_rear,
              driver_rear_inner: form.tire_tread.driver_rear,
              passenger_rear_inner: form.tire_tread.passenger_rear,
              passenger_rear_outer: form.tire_tread.passenger_rear,
              spare: form.tire_tread.spare,
            }}
            tireImages={form.tire_repair_images}
            tireDates={form.tire_dates}
            onTireStatusChange={onTireStatusChange}
            onTreadChange={onTreadChange}
            onTreadConditionChange={onTreadConditionChange}
            onTireImageUpload={onTireImageUpload}
            onTireImageDelete={onTireImageDelete}
            onTireDateChange={onTireDateChange}
            showDually={isDuallySelected}
            onDuallyToggle={setIsDuallySelected}
          />
        </Box>
      )}

      {/* TPMS Check */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
            Check TPMS
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <SafariImageUpload
              onImageUpload={onImageUpload}
              uploadType="tpms_type"
              disabled={loading}
              multiple={true}
              size="small"
            />
            <NotesField
              fieldName="tpms_type"
              fieldLabel="Check TPMS"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
          </Box>
        </Box>
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={2} sx={{ mt: 1, flexWrap: 'wrap' }}>
            <Chip
              label="✅ Not a TPMS Check"
              color="success"
              variant={form.tpms_type === 'not_check' ? 'filled' : 'outlined'}
              clickable
              onClick={() => onRadioChange('tpms_type', 'not_check')}
              sx={{ fontWeight: form.tpms_type === 'not_check' ? 'bold' : 'normal', mb: 1 }}
            />
            <Chip
              label="❌ TPMS Check"
              color="error"
              variant={form.tpms_type === 'bad_sensor' ? 'filled' : 'outlined'}
              clickable
              onClick={() => onRadioChange('tpms_type', 'bad_sensor')}
              sx={{ fontWeight: form.tpms_type === 'bad_sensor' ? 'bold' : 'normal', mb: 1 }}
            />
          </Stack>
          
          {/* Display Photos */}
          {form.tpms_type_photos.length > 0 && (
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
              gap: 2,
              maxWidth: '400px',
              mt: 2
            }}>
              {(form.tpms_type_photos || []).map((photo, index) => (
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
                    src={photo.url || URL.createObjectURL(photo.file)}
                    alt={`TPMS Type ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                    onClick={() => onImageClick(form.tpms_type_photos, 'tpms_type')}
                  />
                  <IconButton
                    className="delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteImage('tpms_type_photos', index);
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

      {/* TPMS Tool Bad Sensors Photo */}
      {form.tpms_type === 'bad_sensor' && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
              TPMS Tool Photos
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
              <SafariImageUpload
                onImageUpload={onImageUpload}
                uploadType="tpms_tool"
                disabled={loading}
                multiple={true}
                size="small"
              />
              <NotesField
                fieldName="tpms_tool_photos"
                fieldLabel="TPMS Tool Photos"
                notes={form.field_notes}
                onNotesChange={onFieldNotesChange}
              />
            </Box>
          </Box>
          <Box sx={{ mb: 2 }}>
            
            {form.tpms_tool_photo.length > 0 && (
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
                gap: 2,
                maxWidth: '400px'
              }}>
                {(form.tpms_tool_photo || []).map((photo, index) => (
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
                      src={photo.url || URL.createObjectURL(photo.file)}
                      alt={`TPMS Tool ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      onClick={() => onImageClick(form.tpms_tool_photo, 'tpms_tool_photo')}
                    />
                    <IconButton
                      className="delete-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setForm(f => ({
                          ...f,
                          tpms_tool_photo: (f.tpms_tool_photo || []).filter((_, i) => i !== index)
                        }));
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
      )}

      {/* TPMS Layout */}
      {form.tpms_type === 'bad_sensor' && (
        <Box>
          <TPMSLayout
            tpmsStatuses={form.tpms_statuses}
            onTPMSStatusChange={onTPMSStatusChange}
            showDually={isDuallySelected}
            onDuallyToggle={setIsDuallySelected}
          />
        </Box>
      )}

      {/* Notes */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="body1" sx={{ flexGrow: 1 }}>
            Notes
          </Typography>
          <IconButton
            size="small"
            onClick={(e) => onInfoClick(e, "Add any additional notes or observations about the vehicle inspection.")}
            sx={{ ml: 1 }}
          >
            <InfoIcon fontSize="small" />
          </IconButton>
        </Box>
        <TextField
          fullWidth
          multiline
          rows={4}
          label="Notes"
          name="notes"
          value={form.notes}
          onChange={onChange}
        />
      </Box>

    </Box>
  );
}; 