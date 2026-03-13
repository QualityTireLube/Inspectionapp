import React from 'react';
import ConditionalImageField from './ConditionalImageField';

interface ImageUpload {
  file: File;
  progress: number;
  url?: string;
  error?: string;
  position?: number;
  isDeleted?: boolean;
}

type EngineAirFilterCondition = 'good' | 'next_oil_change' | 'highly_recommended' | 'today' | 'animal_related';

interface EngineAirFilterFieldProps {
  condition: EngineAirFilterCondition;
  photos: ImageUpload[];
  onConditionChange: (condition: EngineAirFilterCondition) => void;
  onImageClick: (photos: ImageUpload[]) => void;
  onCameraOpen: () => void;
}

const EngineAirFilterField: React.FC<EngineAirFilterFieldProps> = ({
  condition,
  photos,
  onConditionChange,
  onImageClick,
  onCameraOpen
}) => {
  const conditionOptions = [
    { value: 'good', label: '✅ Good', color: 'success' as const },
    { value: 'next_oil_change', label: '⚠️ Next Oil Change', color: 'warning' as const },
    { value: 'highly_recommended', label: '❌ Highly Recommended', color: 'warning' as const },
    { value: 'today', label: '🚨 Today', color: 'error' as const },
    { value: 'animal_related', label: '🐀 Animal Related', color: 'error' as const }
  ];

  const handleConditionChange = (value: string) => {
    onConditionChange(value as EngineAirFilterCondition);
  };

  return (
    <ConditionalImageField
      label="Engine Air Filter"
      condition={condition}
      conditionOptions={conditionOptions}
      photos={photos}
      onConditionChange={handleConditionChange}
      onImageClick={onImageClick}
      onCameraOpen={onCameraOpen}
    />
  );
};

export default EngineAirFilterField; 