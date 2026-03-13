import { useState, useCallback } from 'react';
import { QuickCheckForm, BatteryCondition, ImageUpload, TreadCondition, PhotoType, WiperBladeCondition, WiperBladeSubCondition } from '../types/quickCheck';

const createInitialForm = (user: string): QuickCheckForm => ({
  inspection_type: 'quick_check',
  vin: '',
  vehicle_details: '',
  decoded_vin_data: null,
  date: new Date().toISOString().split('T')[0],
  user,
  mileage: '',
  windshield_condition: '',
  wiper_blades: '' as WiperBladeCondition,
  wiper_blades_front: '' as WiperBladeSubCondition,
  wiper_blades_rear: '' as WiperBladeSubCondition,
  washer_squirters: '',
  dash_lights_photos: [],
  // VSI-specific condition fields
  check_engine_mounts: '',
  exterior_lights_front: '',
  exterior_lights_rear: '',
  // Field-specific images for form fields
  mileage_photos: [],
  windshield_condition_photos: [],
  wiper_blades_photos: [],
  washer_squirters_photos: [],
  vin_photos: [],
  // VSI-specific photo fields
  check_engine_mounts_photos: [],
  exterior_lights_photos: [],
  state_inspection_status_photos: [],
  state_inspection_date_code_photos: [],
  battery_date_code_photos: [],
  tire_repair_status_photos: [],
  tpms_type_photos: [],
  front_brake_pads_photos: [],
  rear_brake_pads_photos: [],
  tpms_placard: [],
  state_inspection_status: '',
  state_inspection_month: null,
  state_inspection_date_code: '',
  washer_fluid: '',
  washer_fluid_photo: [],
  engine_air_filter: '',
  engine_air_filter_photo: [],
  battery_condition: [],
  battery_condition_main: '',
  battery_terminals: [],
  battery_terminal_damage_location: null,
  battery_photos: [],
  battery_positive_terminal_photos: [],
  battery_negative_terminal_photos: [],
  battery_date_code: '',
  tpms_tool_photo: [],
  
  // VSI-specific Underhood fields
  drive_belt: '',
  drive_belt_photos: [],
  engine_mounts: '',
  engine_mounts_photos: [],
  brake_fluid: '',
  brake_fluid_photos: [],
  powersteering_fluid: '',
  powersteering_fluid_photos: [],
  coolant: '',
  coolant_photos: [],
  radiator_end_caps: '',
  radiator_end_caps_photos: [],
  cooling_hoses: '',
  cooling_hoses_photos: [],
  passenger_front_tire: '',
  driver_front_tire: '',
  driver_rear_tire: '',
  passenger_rear_tire: '',
  spare_tire: '',
  front_brakes: [],
  front_shock_struts: '',
  front_shock_struts_photos: [],
  rear_brakes: [],
  front_brake_pads: {
    driver: {
      inner: '',
      outer: '',
      rotor_condition: ''
    },
    passenger: {
      inner: '',
      outer: '',
      rotor_condition: ''
    }
  },
  rear_brake_pads: {
    driver: {
      inner: '',
      outer: '',
      rotor_condition: ''
    },
    passenger: {
      inner: '',
      outer: '',
      rotor_condition: ''
    }
  },
  rear_shock_struts: '',
  rear_shock_struts_photos: [],
  leaks: '',
  leaks_photos: [],
  tire_photos: [],
  undercarriage_photos: [],
  tire_repair_status: '',
  tire_repair_zones: [],
  tpms_type: '',
  tpms_zones: [],
  tpms_sensor_types: {
    driver_front: '',
    passenger_front: '',
    driver_rear_outer: '',
    driver_rear_inner: '',
    passenger_rear_inner: '',
    passenger_rear_outer: '',
    spare: ''
  },
  tire_rotation: '',
  static_sticker: '',
  drain_plug_type: '',
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
  
  // === VSI Suspension Fields ===
  // Front Suspension
  left_control_arm_bushings: '',
  left_control_arm_bushings_photos: [],
  left_ball_joints: '',
  left_ball_joints_photos: [],
  right_control_arm_bushings: '',
  right_control_arm_bushings_photos: [],
  right_ball_joints: '',
  right_ball_joints_photos: [],
  sway_bar: '',
  sway_bar_photos: [],
  suspension_type: '',
  suspension_type_photos: [],
  gear_box_component: '',
  rack_pinion_component: '',
  wheel_bearing: '',
  wheel_bearing_condition: '',
  cv_axles: '',
  cv_axle_condition: '',
  // Rear Suspension
  rear_suspension: '',
  driver_rear_component: '',
  passenger_rear_component: '',
  
  tab_timings: {},
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
    console.log('🔄 Radio field updated:', name, '=', value); // Debug log for auto-save
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
        'battery_positive_terminal': 'battery_positive_terminal_photos',
        'battery_negative_terminal': 'battery_negative_terminal_photos',
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
        'rear_brake_pads': 'rear_brake_pads_photos',
        'check_engine_mounts_photos': 'check_engine_mounts_photos',
        'exterior_lights_photos': 'exterior_lights_photos',
        'drive_belt_photos': 'drive_belt_photos',
        'engine_mounts_photos': 'engine_mounts_photos',
        'brake_fluid_photos': 'brake_fluid_photos',
        'powersteering_fluid_photos': 'powersteering_fluid_photos',
        'coolant_photos': 'coolant_photos',
        'radiator_end_caps_photos': 'radiator_end_caps_photos',
        'cooling_hoses_photos': 'cooling_hoses_photos',
        'front_shock_struts_photos': 'front_shock_struts_photos',
        'rear_shock_struts_photos': 'rear_shock_struts_photos',
        'leaks_photos': 'leaks_photos',
        'left_control_arm_bushings_photos': 'left_control_arm_bushings_photos',
        'left_ball_joints_photos': 'left_ball_joints_photos',
        'right_control_arm_bushings_photos': 'right_control_arm_bushings_photos',
        'right_ball_joints_photos': 'right_ball_joints_photos',
        'sway_bar_photos': 'sway_bar_photos',
        'suspension_type_photos': 'suspension_type_photos'
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