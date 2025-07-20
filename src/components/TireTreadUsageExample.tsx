import React from 'react';
import PassengerFrontTireTreadField, { TireTreadData } from './PassengerFrontTireTreadField';

// This is an example of how to use the new TireTreadField component
// to replace the existing Passenger Front Tire Tread implementation in QuickCheck.tsx

interface ImageUpload {
  file: File;
  progress: number;
  url?: string;
  error?: string;
  position?: number;
  isDeleted?: boolean;
}

// Example usage in QuickCheck component
const TireTreadUsageExample: React.FC = () => {
  // These would be your existing state and handlers from QuickCheck
  const [form, setForm] = React.useState({
    tire_tread: {
      passenger_front: {
        inner_edge_depth: '',
        inner_depth: '',
        center_depth: '',
        outer_depth: '',
        outer_edge_depth: '',
        inner_edge_condition: 'green' as const,
        inner_condition: 'green' as const,
        center_condition: 'green' as const,
        outer_condition: 'green' as const,
        outer_edge_condition: 'green' as const,
      } as TireTreadData
    },
    tire_dates: {
      passenger_front: ''
    },
    tire_comments: {
      passenger_front: [] as string[]
    },
    tire_photos: [] as { type: string; photos: ImageUpload[] }[]
  });

  const handleTreadChange = (field: keyof TireTreadData, value: string) => {
    setForm(prev => ({
      ...prev,
      tire_tread: {
        ...prev.tire_tread,
        passenger_front: {
          ...prev.tire_tread.passenger_front,
          [field]: value,
        },
      },
    }));
  };

  const handleTreadConditionChange = (field: keyof TireTreadData, condition: 'green' | 'yellow' | 'red') => {
    setForm(prev => ({
      ...prev,
      tire_tread: {
        ...prev.tire_tread,
        passenger_front: {
          ...prev.tire_tread.passenger_front,
          [field]: condition,
        },
      },
    }));
  };

  const handleTireDateChange = (date: string) => {
    setForm(prev => ({
      ...prev,
      tire_dates: {
        ...prev.tire_dates,
        passenger_front: date
      }
    }));
  };

  const handleTireCommentToggle = (comment: string) => {
    setForm(prev => ({
      ...prev,
      tire_comments: {
        ...prev.tire_comments,
        passenger_front: prev.tire_comments.passenger_front?.includes(comment)
          ? prev.tire_comments.passenger_front.filter(c => c !== comment)
          : [...(prev.tire_comments.passenger_front || []), comment]
      }
    }));
  };

  const handlePhotoClick = () => {
    console.log('Photo clicked for passenger front tire');
  };

  const handleAddPhoto = () => {
    console.log('Add photo for passenger front tire');
  };

  const handleDeletePhoto = (index: number) => {
    console.log('Delete photo at index:', index);
  };

  // Get photos for passenger front tire
  const passengerFrontPhotos = form.tire_photos
    .find(p => p.type === 'passenger_front')?.photos
    .filter(photo => !photo.isDeleted) || [];

  return (
    <PassengerFrontTireTreadField
      value={form.tire_tread.passenger_front}
      photos={passengerFrontPhotos}
      tireDate={form.tire_dates.passenger_front}
      tireComments={form.tire_comments.passenger_front}
      onChange={handleTreadChange}
      onConditionChange={handleTreadConditionChange}
      onPhotoClick={handlePhotoClick}
      onAddPhoto={handleAddPhoto}
      onDeletePhoto={handleDeletePhoto}
      onTireDateChange={handleTireDateChange}
      onTireCommentToggle={handleTireCommentToggle}
    />
  );
};

export default TireTreadUsageExample; 