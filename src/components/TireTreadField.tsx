import React from 'react';
import Grid from './CustomGrid';
import TireTreadSection from './TireTreadSection';

interface ImageUpload {
  file: File;
  progress: number;
  url?: string;
  error?: string;
  position?: number;
  isDeleted?: boolean;
}

export interface TireTreadData {
  inner_edge_depth: string;
  inner_depth: string;
  center_depth: string;
  outer_depth: string;
  outer_edge_depth: string;
  inner_edge_condition: 'green' | 'yellow' | 'red';
  inner_condition: 'green' | 'yellow' | 'red';
  center_condition: 'green' | 'yellow' | 'red';
  outer_condition: 'green' | 'yellow' | 'red';
  outer_edge_condition: 'green' | 'yellow' | 'red';
}

type TirePosition = 'passenger_front' | 'driver_front' | 'driver_rear' | 'passenger_rear' | 'spare';

interface TireTreadFieldProps {
  position: TirePosition;
  label: string;
  value: TireTreadData;
  photos: ImageUpload[];
  tireDate: string;
  tireComments: string[];
  onChange: (field: keyof TireTreadData, newValue: string) => void;
  onConditionChange: (field: keyof TireTreadData, condition: 'green' | 'yellow' | 'red') => void;
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