import React from 'react';
import Grid from './CustomGrid';
import TireTreadSection from './TireTreadSection';
import { Box, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { TireTread as TireTreadData } from '../types/quickCheck';

export interface ImageUpload {
  file: File;
  url: string;
  uploadId: string;
  position?: number;
  isDeleted?: boolean;
}

// Export the TireTreadData for backward compatibility
export type { TireTreadData };

type TirePosition = 'passenger_front' | 'driver_front' | 'driver_rear' | 'passenger_rear' | 'spare';

interface TireTreadFieldProps {
  position: TirePosition;
  label: string;
  value: TireTreadData;
  photos: ImageUpload[];
  tireDate: string;
  tireComments: string[];
  onChange: (field: keyof TireTreadData, newValue: string) => void;
  onConditionChange: (field: keyof TireTreadData, condition: '' | 'green' | 'yellow' | 'red') => void;
  onPhotoClick: () => void;
  onAddPhoto: () => void;
  onDeletePhoto: (index: number) => void;
  onTireDateChange: (date: string) => void;
  onTireCommentToggle: (comment: string) => void;
}

const TireTreadField: React.FC<TireTreadFieldProps> = ({
  position,
  label,
  value,
  photos,
  tireDate,
  tireComments,
  onChange,
  onConditionChange,
  onPhotoClick,
  onAddPhoto,
  onDeletePhoto,
  onTireDateChange,
  onTireCommentToggle
}) => {
  return (
    <Grid item xs={12} sm={6}>
      <TireTreadSection
        label={label}
        fieldPrefix={label.replace(/\s+/g, '_').toLowerCase()}
        value={value}
        onChange={onChange}
        onConditionChange={onConditionChange}
        onPhotoClick={onPhotoClick}
        onDeletePhoto={onDeletePhoto}
        tireDate={tireDate}
        onTireDateChange={onTireDateChange}
        tireComments={tireComments}
        onTireCommentToggle={onTireCommentToggle}
        photos={photos}
      />
    </Grid>
  );
};

export default TireTreadField; 