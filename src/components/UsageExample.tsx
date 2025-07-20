import React from 'react';
import Grid from './CustomGrid';
import ConditionalImageField from './ConditionalImageField';

// This is an example of how to use the new reusable component
// to replace the existing engine air filter implementation in QuickCheck.tsx

interface ImageUpload {
  file: File;
  progress: number;
  url?: string;
  error?: string;
  position?: number;
  isDeleted?: boolean;
}

type EngineAirFilterCondition = 'good' | 'next_oil_change' | 'highly_recommended' | 'today' | 'animal_related';

// Example usage in QuickCheck component
const ExampleUsage: React.FC = () => {
  // These would be your existing state and handlers from QuickCheck
  const [form, setForm] = React.useState({
    engine_air_filter: 'good' as EngineAirFilterCondition,
    engine_air_filter_photo: [] as ImageUpload[]
  });

  const handleRadioChange = (name: string, value: string) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleImageClick = (photos: ImageUpload[]) => {
    // Your existing image click handler
    console.log('Image clicked:', photos);
  };

  const handleCameraOpen = () => {
    // Your existing camera open handler for engine_air_filter
    console.log('Camera opened for engine air filter');
  };

  // Define the condition options for engine air filter
  const engineAirFilterOptions = [
    { value: 'good', label: '✅ Good', color: 'success' as const },
    { value: 'next_oil_change', label: '⚠️ Next Oil Change', color: 'warning' as const },
    { value: 'highly_recommended', label: '❌ Highly Recommended', color: 'warning' as const },
    { value: 'today', label: '🚨 Today', color: 'error' as const },
    { value: 'animal_related', label: '🐀 Animal Related', color: 'error' as const }
  ];

  return (
    <Grid item xs={12} sm={6}>
      <ConditionalImageField
        label="Engine Air Filter"
        condition={form.engine_air_filter}
        conditionOptions={engineAirFilterOptions}
        photos={form.engine_air_filter_photo}
        onConditionChange={(value) => handleRadioChange('engine_air_filter', value)}
        onImageClick={handleImageClick}
        onCameraOpen={handleCameraOpen}
      />
    </Grid>
  );
};

export default ExampleUsage; 