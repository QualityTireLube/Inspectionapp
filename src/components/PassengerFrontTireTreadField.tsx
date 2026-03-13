import React from 'react';
import TireTreadField, { TireTreadData } from './TireTreadField';

interface ImageUpload {
  file: File;
  progress: number;
  url?: string;
  error?: string;
  position?: number;
  isDeleted?: boolean;
}

interface PassengerFrontTireTreadFieldProps {
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

const PassengerFrontTireTreadField: React.FC<PassengerFrontTireTreadFieldProps> = ({
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
    <TireTreadField
      position="passenger_front"
      label="Passenger Front Tire Tread"
      value={value}
      photos={photos}
      tireDate={tireDate}
      tireComments={tireComments}
      onChange={onChange}
      onConditionChange={onConditionChange}
      onPhotoClick={onPhotoClick}
      onAddPhoto={onAddPhoto}
      onDeletePhoto={onDeletePhoto}
      onTireDateChange={onTireDateChange}
      onTireCommentToggle={onTireCommentToggle}
    />
  );
};

export default PassengerFrontTireTreadField; 