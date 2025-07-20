import { useState, useCallback } from 'react';
import { QuickCheckForm, BatteryCondition, ImageUpload, TreadCondition, PhotoType, InspectionType } from '../types/quickCheck';

const createInitialForm = (user: string): QuickCheckForm => ({
  inspection_type: 'quick_check',
  vin: '',
  vehicle_details: '',
  date: new Date().toISOString().split('T')[0],
  user,
  mileage: '',
  windshield_condition: 'good',
  wiper_blades: 'good',
  wiper_blades_front: 'good',
  wiper_blades_rear: 'good',
  washer_squirters: 'good',
  dash_lights_photos: [],
  // Field-specific images for form fields
  mileage_photos: [],
  windshield_condition_photos: [],
  wiper_blades_photos: [],
  washer_squirters_photos: [],
  vin_photos: [],
  state_inspection_status_photos: [],
  state_inspection_date_code_photos: [],
  battery_date_code_photos: [],
  tire_repair_status_photos: [],
  tpms_type_photos: [],
  front_brake_pads_photos: [],
  rear_brake_pads_photos: [],
  tpms_placard: [],
  state_inspection_status: 'expired',
  state_inspection_month: null,
  state_inspection_date_code: '',
  washer_fluid: 'full',
  washer_fluid_photo: [],
  engine_air_filter: 'good',
  engine_air_filter_photo: [],
  battery_condition: [],
  battery_condition_main: 'good',
  battery_terminals: [],
  battery_terminal_damage_location: null,
  battery_photos: [],
  battery_date_code: '',
  tpms_tool_photo: [],
  passenger_front_tire: 'good',
  driver_front_tire: 'good',
  driver_rear_tire: 'good',
  passenger_rear_tire: 'good',
  spare_tire: 'good',
  front_brakes: [],
  rear_brakes: [],
  front_brake_pads: {
    driver: {
      inner: 'good',
      outer: 'good',
      rotor_condition: 'good'
    },
    passenger: {
      inner: 'good',
      outer: 'good',
      rotor_condition: 'good'
    }
  },
  rear_brake_pads: {
    driver: {
      inner: 'good',
      outer: 'good',
      rotor_condition: 'good'
    },
    passenger: {
      inner: 'good',
      outer: 'good',
      rotor_condition: 'good'
    }
  },
  tire_photos: [],
  undercarriage_photos: [],
  tire_repair_status: 'repairable',
  tire_repair_zones: [],
  tpms_type: 'not_check',
  tpms_zones: [],
  tire_rotation: 'good',
  static_sticker: 'good',
  drain_plug_type: 'metal',
  notes: '',
  tire_repair_statuses: {
    driver_front: null,
    passenger_front: null,
    driver_rear_outer: null,
    driver_rear_inner: null,
    passenger_rear_inner: null,
    passenger_rear_outer: null,
    spare: null
  },
  tpms_statuses: {
    driver_front: null,
    passenger_front: null,
    driver_rear_outer: null,
    driver_rear_inner: null,
    passenger_rear_inner: null,
    passenger_rear_outer: null,
    spare: null
  },
  tire_comments: {},
  tire_dates: {},
  tire_repair_images: {
    driver_front: { not_repairable: [], tire_size_brand: [], repairable_spot: [] },
    passenger_front: { not_repairable: [], tire_size_brand: [], repairable_spot: [] },
    driver_rear_outer: { not_repairable: [], tire_size_brand: [], repairable_spot: [] },
    driver_rear_inner: { not_repairable: [], tire_size_brand: [], repairable_spot: [] },
    passenger_rear_inner: { not_repairable: [], tire_size_brand: [], repairable_spot: [] },
    passenger_rear_outer: { not_repairable: [], tire_size_brand: [], repairable_spot: [] },
    spare: { not_repairable: [], tire_size_brand: [], repairable_spot: [] }
  },
  field_notes: {},
  tire_tread: {
    driver_front: {
      inner_edge_depth: '',
      inner_depth: '',
      center_depth: '',
      outer_depth: '',
      outer_edge_depth: '',
      inner_edge_condition: 'green',
      inner_condition: 'green',
      center_condition: 'green',
      outer_condition: 'green',
      outer_edge_condition: 'green'
    },
    passenger_front: {
      inner_edge_depth: '',
      inner_depth: '',
      center_depth: '',
      outer_depth: '',
      outer_edge_depth: '',
      inner_edge_condition: 'green',
      inner_condition: 'green',
      center_condition: 'green',
      outer_condition: 'green',
      outer_edge_condition: 'green'
    },
    driver_rear: {
      inner_edge_depth: '',
      inner_depth: '',
      center_depth: '',
      outer_depth: '',
      outer_edge_depth: '',
      inner_edge_condition: 'green',
      inner_condition: 'green',
      center_condition: 'green',
      outer_condition: 'green',
      outer_edge_condition: 'green'
    },
    driver_rear_inner: {
      inner_edge_depth: '',
      inner_depth: '',
      center_depth: '',
      outer_depth: '',
      outer_edge_depth: '',
      inner_edge_condition: 'green',
      inner_condition: 'green',
      center_condition: 'green',
      outer_condition: 'green',
      outer_edge_condition: 'green'
    },
    passenger_rear_inner: {
      inner_edge_depth: '',
      inner_depth: '',
      center_depth: '',
      outer_depth: '',
      outer_edge_depth: '',
      inner_edge_condition: 'green',
      inner_condition: 'green',
      center_condition: 'green',
      outer_condition: 'green',
      outer_edge_condition: 'green'
    },
    passenger_rear: {
      inner_edge_depth: '',
      inner_depth: '',
      center_depth: '',
      outer_depth: '',
      outer_edge_depth: '',
      inner_edge_condition: 'green',
      inner_condition: 'green',
      center_condition: 'green',
      outer_condition: 'green',
      outer_edge_condition: 'green'
    },
    spare: {
      inner_edge_depth: '',
      inner_depth: '',
      center_depth: '',
      outer_depth: '',
      outer_edge_depth: '',
      inner_edge_condition: 'green',
      inner_condition: 'green',
      center_condition: 'green',
      outer_condition: 'green',
      outer_edge_condition: 'green'
    }
  },
  tab_timings: {
    info_duration: 0,
    pulling_duration: 0,
    underhood_duration: 0,
    tires_duration: 0
  },
  created_datetime: new Date().toISOString(),
  submitted_datetime: '',
  archived_datetime: ''
});

export const useQuickCheckForm = (user: string) => {
  const [form, setForm] = useState<QuickCheckForm>(() => createInitialForm(user));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    console.log('📝 Form field updated:', name, '=', value); // Debug log
    
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRadioChange = useCallback((name: string, value: string) => {
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const handleBatteryConditionToggle = useCallback((condition: BatteryCondition) => {
    setForm(prev => {
      const newConditions = prev.battery_condition.includes(condition)
        ? prev.battery_condition.filter(c => c !== condition)
        : [...prev.battery_condition, condition];
      
      return {
        ...prev,
        battery_condition: newConditions
      };
    });
  }, []);

  const handleTreadChange = useCallback((position: string, field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      tire_tread: {
        ...prev.tire_tread,
        [position]: {
          ...prev.tire_tread[position as keyof typeof prev.tire_tread],
          [field]: value
        }
      }
    }));
  }, []);

  const handleTreadConditionChange = useCallback((position: string, field: string, condition: TreadCondition) => {
    setForm(prev => ({
      ...prev,
      tire_tread: {
        ...prev.tire_tread,
        [position]: {
          ...prev.tire_tread[position as keyof typeof prev.tire_tread],
          [field]: condition
        }
      }
    }));
  }, []);

  const handleTireDateChange = useCallback((position: string, date: string) => {
    setForm(prev => ({
      ...prev,
      tire_dates: {
        ...prev.tire_dates,
        [position]: date
      }
    }));
  }, []);

  const handleTireCommentToggle = useCallback((position: string, comment: string) => {
    setForm(prev => {
      const currentComments = prev.tire_comments[position] || [];
      const newComments = currentComments.includes(comment)
        ? currentComments.filter(c => c !== comment)
        : [...currentComments, comment];
      
      return {
        ...prev,
        tire_comments: {
          ...prev.tire_comments,
          [position]: newComments
        }
      };
    });
  }, []);

  const handleTireStatusChange = useCallback((position: string, status: 'repairable' | 'non_repairable' | null) => {
    setForm(prev => ({
      ...prev,
      tire_repair_statuses: {
        ...prev.tire_repair_statuses,
        [position]: status
      }
    }));
  }, []);

  const handleTPMSStatusChange = useCallback((position: string, status: boolean | null) => {
    setForm(prev => ({
      ...prev,
      tpms_statuses: {
        ...prev.tpms_statuses,
        [position]: status
      }
    }));
  }, []);

  const updatePhotoField = useCallback((photoType: PhotoType, photos: ImageUpload[]) => {
    setForm(prev => {
      const fieldMap: Record<PhotoType, keyof QuickCheckForm> = {
        'dashLights': 'dash_lights_photos',
        'tpms_placard': 'tpms_placard',
        'washer_fluid': 'washer_fluid_photo',
        'engine_air_filter': 'engine_air_filter_photo',
        'battery': 'battery_photos',
        'tpms_tool': 'tpms_tool_photo',
        'front_brakes': 'front_brakes',
        'rear_brakes': 'rear_brakes',
        'passenger_front': 'tire_photos',
        'driver_front': 'tire_photos',
        'driver_rear': 'tire_photos',
        'driver_rear_inner': 'tire_photos',
        'passenger_rear_inner': 'tire_photos',
        'passenger_rear': 'tire_photos',
        'spare': 'tire_photos',
        'undercarriage_photos': 'undercarriage_photos',
        'mileage': 'mileage_photos',
        'windshield_condition': 'windshield_condition_photos',
        'wiper_blades': 'wiper_blades_photos',
        'washer_squirters': 'washer_squirters_photos',
        'vin': 'vin_photos',
        'state_inspection_status': 'state_inspection_status_photos',
        'state_inspection_date_code': 'state_inspection_date_code_photos',
        'battery_date_code': 'battery_date_code_photos',
        'tire_repair_status': 'tire_repair_status_photos',
        'tpms_type': 'tpms_type_photos',
        'front_brake_pads': 'front_brake_pads_photos',
        'rear_brake_pads': 'rear_brake_pads_photos'
      };

      const fieldName = fieldMap[photoType];
      
      if (!fieldName) return prev;

      return {
        ...prev,
        [fieldName]: photos
      } as QuickCheckForm;
    });
  }, []);

  const resetForm = useCallback(() => {
    setForm(createInitialForm(user));
  }, [user]);

  return {
    form,
    setForm,
    handleChange,
    handleRadioChange,
    handleBatteryConditionToggle,
    handleTreadChange,
    handleTreadConditionChange,
    handleTireDateChange,
    handleTireCommentToggle,
    handleTireStatusChange,
    handleTPMSStatusChange,
    updatePhotoField,
    resetForm
  };
}; 