/**
 * Global Field Registry - Single source of truth for all form fields
 * 
 * This registry defines all possible fields that can be used across
 * any inspection type. Fields are reused and configured through UI schemas.
 */

export type FieldType = 
  | 'text' 
  | 'number' 
  | 'select' 
  | 'photo' 
  | 'tread' 
  | 'brakePad' 
  | 'checkbox' 
  | 'date'
  | 'textarea'
  | 'complex'
  | 'tire'
  | 'battery'
  | 'tpms'
  | 'tireRepair'
  | 'section_header';

export type Rule =
  | { all: Rule[] } 
  | { any: Rule[] } 
  | { not: Rule }
  | { when: string; eq?: unknown; in?: unknown[]; truthy?: boolean };

export interface FieldDef {
  id: string;              // e.g., "vin"
  label: string;
  type: FieldType;
  required?: boolean | Rule;
  defaultValue?: unknown;
  options?: { value: string; label: string }[];
  validate?: (val: unknown, ctx: any) => string | null;
  widget?: string;         // maps to a React component in widget registry
  description?: string;    // Help text or description
  placeholder?: string;    // Input placeholder
  maxLength?: number;      // For text inputs
  min?: number;           // For number inputs
  max?: number;           // For number inputs
  accept?: string;        // For file inputs
  multiple?: boolean;     // For photo fields
  showIf?: Rule;         // Field-level visibility rule
  readOnlyIf?: Rule;     // Field-level read-only rule
}

/**
 * Global Field Registry
 * All fields that can be used across inspection types
 */
export const FIELD_REGISTRY: Record<string, FieldDef> = {
  // === Basic Info Fields ===
  user: {
    id: 'user',
    label: 'Technician',
    type: 'text',
    required: true,
    defaultValue: '',
    readOnlyIf: { when: 'system_field', truthy: true }
  },

  date: {
    id: 'date',
    label: 'Date',
    type: 'date',
    required: true,
    defaultValue: new Date().toISOString().split('T')[0], // Static value instead of function
    readOnlyIf: { when: 'system_field', truthy: true }
  },

  vin: {
    id: 'vin',
    label: 'VIN',
    type: 'text',
    required: true,
    defaultValue: '',
    maxLength: 17,
    placeholder: 'Enter 17-character VIN',
    validate: (val: string) => {
      if (!val) return 'VIN is required';
      if (val.length !== 17) return 'VIN must be 17 characters';
      return null;
    }
  },

  vehicle_details: {
    id: 'vehicle_details',
    label: 'Vehicle Details',
    type: 'text',
    defaultValue: '',
    placeholder: 'Year Make Model'
  },

  mileage: {
    id: 'mileage',
    label: 'Mileage',
    type: 'text',
    required: true,
    defaultValue: '',
    placeholder: '000,000'
  },

  location: {
    id: 'location',
    label: 'Location',
    type: 'text',
    defaultValue: '',
    readOnlyIf: { when: 'system_field', truthy: true }
  },

  // === Pulling Into Bay Fields ===
  dash_lights_photos: {
    id: 'dash_lights_photos',
    label: 'Dashboard Lights',
    type: 'photo',
    defaultValue: [],
    multiple: true,
    accept: 'image/*',
    description: 'Take photos of any illuminated dashboard warning lights'
  },

  mileage_photos: {
    id: 'mileage_photos',
    label: 'Mileage Photos',
    type: 'photo',
    defaultValue: [],
    multiple: true,
    accept: 'image/*',
    description: 'Photo of odometer reading'
  },

  windshield_condition: {
    id: 'windshield_condition',
    label: 'Windshield Condition',
    type: 'select',
    required: true,
    defaultValue: '',
    options: [
      { value: 'good', label: 'Good' },
      { value: 'bad', label: 'Bad' }
    ]
  },

  windshield_condition_photos: {
    id: 'windshield_condition_photos',
    label: 'Windshield Photos',
    type: 'photo',
    defaultValue: [],
    multiple: true,
    accept: 'image/*',
    showIf: { when: 'windshield_condition', eq: 'bad' }
  },

  wiper_blades: {
    id: 'wiper_blades',
    label: 'Wiper Blades Overall',
    type: 'select',
    defaultValue: 'good',
    options: [
      { value: 'good', label: 'Good' },
      { value: 'front_minor', label: 'Front Minor' },
      { value: 'front_moderate', label: 'Front Moderate' },
      { value: 'front_major', label: 'Front Major' },
      { value: 'rear_minor', label: 'Rear Minor' },
      { value: 'rear_moderate', label: 'Rear Moderate' },
      { value: 'rear_major', label: 'Rear Major' }
    ]
  },

  wiper_blades_front: {
    id: 'wiper_blades_front',
    label: 'Front Wiper Blades',
    type: 'select',
    defaultValue: 'good',
    options: [
      { value: 'good', label: 'Good' },
      { value: 'minor', label: 'Minor Wear' },
      { value: 'moderate', label: 'Moderate Wear' },
      { value: 'major', label: 'Major Wear' }
    ]
  },

  wiper_blades_rear: {
    id: 'wiper_blades_rear',
    label: 'Rear Wiper Blades',
    type: 'select',
    defaultValue: 'good',
    options: [
      { value: 'good', label: 'Good' },
      { value: 'minor', label: 'Minor Wear' },
      { value: 'moderate', label: 'Moderate Wear' },
      { value: 'major', label: 'Major Wear' }
    ]
  },

  wiper_blades_photos: {
    id: 'wiper_blades_photos',
    label: 'Wiper Blade Photos',
    type: 'photo',
    defaultValue: [],
    multiple: true,
    accept: 'image/*'
  },

  washer_squirters: {
    id: 'washer_squirters',
    label: 'Washer Squirters',
    type: 'select',
    required: true,
    defaultValue: '',
    options: [
      { value: 'good', label: 'Good' },
      { value: 'leaking', label: 'Leaking' },
      { value: 'not_working', label: 'Not Working' },
      { value: 'no_pump_sound', label: 'No Pump Sound' }
    ]
  },

  washer_squirters_photos: {
    id: 'washer_squirters_photos',
    label: 'Washer Squirter Photos',
    type: 'photo',
    defaultValue: [],
    multiple: true,
    accept: 'image/*'
  },

  // === VSI-Specific Pulling Into Bay Fields ===

  exterior_lights_front: {
    id: 'exterior_lights_front',
    label: 'Exterior Lights (Front)',
    type: 'select',
    defaultValue: '',
    options: [
      { value: '', label: 'Select...' },
      { value: 'l_low_beam', label: '(L) Low Beam' },
      { value: 'r_low_beam', label: '(R) Low Beam' },
      { value: 'l_fog_light', label: '(L) Fog Light' },
      { value: 'r_fog_light', label: '(R) Fog Light' },
      { value: 'l_high_beam', label: '(L) High Beam' },
      { value: 'r_high_beam', label: '(R) High Beam' },
      { value: 'l_turn_signal', label: '(L) Turn Signal' },
      { value: 'r_turn_signal', label: '(R) Turn Signal' },
      { value: 'l_marker', label: '(L) Marker' },
      { value: 'r_marker', label: '(R) Marker' }
    ]
  },

  exterior_lights_rear: {
    id: 'exterior_lights_rear',
    label: 'Exterior Lights (Rear)',
    type: 'select',
    defaultValue: '',
    options: [
      { value: '', label: 'Select...' },
      { value: 'l_stop', label: '(L) Stop' },
      { value: '3rd_stop', label: '(3rd) Stop' },
      { value: 'r_stop', label: '(R) Stop' },
      { value: 'l_turn_signal', label: '(L) Turn Signal' },
      { value: 'r_turn_signal', label: '(R) Turn Signal' },
      { value: 'l_tail_light', label: '(L) Tail Light' },
      { value: 'r_tail_light', label: '(R) Tail Light' },
      { value: 'l_reverse_light', label: '(L) Reverse Light' },
      { value: 'r_reverse_light', label: '(R) Reverse Light' },
      { value: 'l_license_plate', label: '(L) License Plate' },
      { value: 'r_license_plate', label: '(R) License Plate' }
    ]
  },

  exterior_lights_photos: {
    id: 'exterior_lights_photos',
    label: 'Exterior Lights Photos',
    type: 'photo',
    multiple: true,
    defaultValue: [],
    description: 'Photos of exterior light conditions'
  },

  // === Underhood Fields ===
  tpms_placard: {
    id: 'tpms_placard',
    label: 'TPMS Placard',
    type: 'photo',
    defaultValue: [],
    multiple: true,
    accept: 'image/*',
    description: 'Photo of tire pressure placard'
  },

  state_inspection_status: {
    id: 'state_inspection_status',
    label: 'State Inspection Status',
    type: 'select',
    required: true,
    defaultValue: '',
    options: [
      { value: 'expired', label: 'Expired' },
      { value: 'this_year', label: 'Current Year' },
      { value: 'next_year', label: 'Next Year' },
      { value: 'year_after', label: 'Year After Next' },
      { value: 'no_sticker', label: 'No Sticker' }
    ]
  },

  state_inspection_month: {
    id: 'state_inspection_month',
    label: 'Inspection Month',
    type: 'number',
    min: 1,
    max: 12,
    showIf: { when: 'state_inspection_status', in: ['this_year', 'next_year', 'year_after'] }
  },

  state_inspection_date_code: {
    id: 'state_inspection_date_code',
    label: 'Date Code (MM/YY)',
    type: 'text',
    defaultValue: '',
    placeholder: 'MM/YY',
    maxLength: 5
  },

  state_inspection_status_photos: {
    id: 'state_inspection_status_photos',
    label: 'State Inspection Photos',
    type: 'photo',
    defaultValue: [],
    multiple: true,
    accept: 'image/*'
  },

  washer_fluid: {
    id: 'washer_fluid',
    label: 'Washer Fluid',
    type: 'select',
    required: true,
    defaultValue: '',
    options: [
      { value: 'full', label: 'Full' },
      { value: 'leaking', label: 'Leaking' },
      { value: 'not_working', label: 'Not Working' },
      { value: 'no_pump_sound', label: 'No Pump Sound' }
    ]
  },

  washer_fluid_photo: {
    id: 'washer_fluid_photo',
    label: 'Washer Fluid Photos',
    type: 'photo',
    defaultValue: [],
    multiple: true,
    accept: 'image/*'
  },

  engine_air_filter: {
    id: 'engine_air_filter',
    label: 'Engine Air Filter',
    type: 'select',
    required: true,
    defaultValue: '',
    options: [
      { value: 'good', label: 'Good' },
      { value: 'next_oil_change', label: 'Next Oil Change' },
      { value: 'highly_recommended', label: 'Highly Recommended' },
      { value: 'today', label: 'Replace Today' },
      { value: 'animal_related', label: 'Animal Related Damage' }
    ]
  },

  engine_air_filter_photo: {
    id: 'engine_air_filter_photo',
    label: 'Air Filter Photos',
    type: 'photo',
    defaultValue: [],
    multiple: true,
    accept: 'image/*'
  },

  battery_condition_main: {
    id: 'battery_condition_main',
    label: 'Battery Condition',
    type: 'select',
    required: true,
    defaultValue: '',
    options: [
      { value: 'good', label: 'Good' },
      { value: 'warning', label: 'Warning' },
      { value: 'bad', label: 'Bad' },
      { value: 'na', label: 'N/A' }
    ]
  },

  battery_condition: {
    id: 'battery_condition',
    label: 'Battery Conditions (Multi-select)',
    type: 'complex',
    widget: 'BatteryConditionField',
    defaultValue: []
  },

  battery_terminals: {
    id: 'battery_terminals',
    label: 'Battery Terminals',
    type: 'complex',
    widget: 'BatteryTerminalField',
    defaultValue: []
  },

  battery_date_code: {
    id: 'battery_date_code',
    label: 'Battery Date Code (MM/YY)',
    type: 'text',
    defaultValue: '',
    placeholder: 'MM/YY',
    maxLength: 5
  },

  battery_photos: {
    id: 'battery_photos',
    label: 'Battery Photos',
    type: 'photo',
    defaultValue: [],
    multiple: true,
    accept: 'image/*'
  },

  battery_positive_terminal_photos: {
    id: 'battery_positive_terminal_photos',
    label: 'Positive Terminal Photos',
    type: 'photo',
    defaultValue: [],
    multiple: true,
    accept: 'image/*'
  },

  battery_negative_terminal_photos: {
    id: 'battery_negative_terminal_photos',
    label: 'Negative Terminal Photos',
    type: 'photo',
    defaultValue: [],
    multiple: true,
    accept: 'image/*'
  },

  battery_date_code_photos: {
    id: 'battery_date_code_photos',
    label: 'Battery Date Code Photos',
    type: 'photo',
    defaultValue: [],
    multiple: true,
    accept: 'image/*'
  },

  tpms_tool_photo: {
    id: 'tpms_tool_photo',
    label: 'TPMS Tool Photos',
    type: 'photo',
    defaultValue: [],
    multiple: true,
    accept: 'image/*',
    description: 'Photos of TPMS sensor issues'
  },

  // === Tires & Brakes Fields ===
  tire_tread: {
    id: 'tire_tread',
    label: 'Tire Tread Measurements',
    type: 'complex',
    widget: 'TireTreadField',
    defaultValue: {}
  },

  tire_comments: {
    id: 'tire_comments',
    label: 'Tire Comments',
    type: 'complex',
    widget: 'TireCommentsField',
    defaultValue: {}
  },

  tire_dates: {
    id: 'tire_dates',
    label: 'Tire Dates',
    type: 'complex',
    widget: 'TireDatesField',
    defaultValue: {}
  },

  front_brake_pads: {
    id: 'front_brake_pads',
    label: 'Front Brake Pads',
    type: 'complex',
    widget: 'BrakePadField',
    defaultValue: {
      driver: { inner: '', outer: '', rotor_condition: '' },
      passenger: { inner: '', outer: '', rotor_condition: '' }
    }
  },

  rear_brake_pads: {
    id: 'rear_brake_pads',
    label: 'Rear Brake Pads',
    type: 'complex',
    widget: 'BrakePadField',
    defaultValue: {
      driver: { inner: '', outer: '', rotor_condition: '' },
      passenger: { inner: '', outer: '', rotor_condition: '' }
    }
  },

  front_brakes: {
    id: 'front_brakes',
    label: 'Front Brake Photos',
    type: 'photo',
    defaultValue: [],
    multiple: true,
    accept: 'image/*'
  },

  rear_brakes: {
    id: 'rear_brakes',
    label: 'Rear Brake Photos',
    type: 'photo',
    defaultValue: [],
    multiple: true,
    accept: 'image/*'
  },

  front_brake_pads_photos: {
    id: 'front_brake_pads_photos',
    label: 'Front Brake Pad Photos',
    type: 'photo',
    defaultValue: [],
    multiple: true,
    accept: 'image/*'
  },

  rear_brake_pads_photos: {
    id: 'rear_brake_pads_photos',
    label: 'Rear Brake Pad Photos',
    type: 'photo',
    defaultValue: [],
    multiple: true,
    accept: 'image/*'
  },

  tire_photos: {
    id: 'tire_photos',
    label: 'Tire Photos',
    type: 'complex',
    widget: 'TirePhotoField',
    defaultValue: []
  },

  tire_rotation: {
    id: 'tire_rotation',
    label: 'Tire Rotation',
    type: 'select',
    required: true,
    defaultValue: '',
    options: [
      { value: 'good', label: 'Good' },
      { value: 'bad', label: 'Bad' }
    ]
  },

  static_sticker: {
    id: 'static_sticker',
    label: 'Static Sticker',
    type: 'select',
    required: true,
    defaultValue: '',
    options: [
      { value: 'good', label: 'Good' },
      { value: 'not_oil_change', label: 'Not Oil Change' },
      { value: 'need_sticker', label: 'Need Sticker' }
    ]
  },

  drain_plug_type: {
    id: 'drain_plug_type',
    label: 'Drain Plug Type',
    type: 'select',
    required: true,
    defaultValue: '',
    options: [
      { value: 'metal', label: 'Metal' },
      { value: 'plastic', label: 'Plastic' }
    ]
  },

  undercarriage_photos: {
    id: 'undercarriage_photos',
    label: 'Undercarriage Photos',
    type: 'photo',
    defaultValue: [],
    multiple: true,
    accept: 'image/*'
  },

  tire_repair_status: {
    id: 'tire_repair_status',
    label: 'Tire Repair Status',
    type: 'select',
    required: true,
    defaultValue: '',
    options: [
      { value: 'repairable', label: 'Repairable' },
      { value: 'not_tire_repair', label: 'Not Tire Repair' },
      { value: 'non_repairable', label: 'Non-Repairable' }
    ]
  },

  tire_repair_zones: {
    id: 'tire_repair_zones',
    label: 'Tire Repair Zones',
    type: 'complex',
    widget: 'TireRepairField',
    defaultValue: []
  },

  tire_repair_status_photos: {
    id: 'tire_repair_status_photos',
    label: 'Tire Repair Photos',
    type: 'photo',
    defaultValue: [],
    multiple: true,
    accept: 'image/*'
  },

  tpms_type: {
    id: 'tpms_type',
    label: 'TPMS Type',
    type: 'select',
    required: true,
    defaultValue: '',
    options: [
      { value: 'not_check', label: 'Not Checked' },
      { value: 'bad_sensor', label: 'Bad Sensor' }
    ]
  },

  tpms_zones: {
    id: 'tpms_zones',
    label: 'TPMS Zones',
    type: 'complex',
    widget: 'TPMSField',
    defaultValue: []
  },

  tpms_type_photos: {
    id: 'tpms_type_photos',
    label: 'TPMS Photos',
    type: 'photo',
    defaultValue: [],
    multiple: true,
    accept: 'image/*'
  },

  // === General Fields ===
  notes: {
    id: 'notes',
    label: 'Notes',
    type: 'textarea',
    defaultValue: '',
    placeholder: 'Additional notes or observations...'
  },

  field_notes: {
    id: 'field_notes',
    label: 'Field-Specific Notes',
    type: 'complex',
    widget: 'FieldNotesField',
    defaultValue: {}
  },

  // === VSI-Specific Fields ===

  

  drive_belt: {
    id: 'drive_belt',
    label: 'Drive Belt',
    type: 'select',
    defaultValue: '',
    options: [
      { value: '', label: 'Select...' },
      { value: 'good', label: '✅ Good' },
      { value: 'warning', label: '⚠️ Warning' },
      { value: 'bad', label: '❌ Bad' }
    ]
  },

  drive_belt_photos: {
    id: 'drive_belt_photos',
    label: 'Drive Belt Photos',
    type: 'photo',
    multiple: true,
    defaultValue: []
  },

  engine_mounts: {
    id: 'engine_mounts',
    label: 'Engine Mounts',
    type: 'select',
    multiple: true,
    defaultValue: '',
    options: [
      { value: '', label: 'Select...' },
      { value: 'good', label: '✅ Good' },
      { value: 'left', label: 'Left' },
      { value: 'right', label: 'Right' },
      { value: 'frontward', label: 'Frontward' },
      { value: 'rearward', label: 'Rearward' },
      { value: 'torque_mount', label: 'Torque Mount' }
    ]
  },

  engine_mounts_photos: {
    id: 'engine_mounts_photos',
    label: 'Engine Mounts Photos',
    type: 'photo',
    multiple: true,
    defaultValue: []
  },

  brake_fluid: {
    id: 'brake_fluid',
    label: 'Brake Fluid',
    type: 'select',
    defaultValue: '',
    options: [
      { value: '', label: 'Select...' },
      { value: 'good', label: '✅ Good' },
      { value: 'warning', label: '⚠️ Warning' },
      { value: 'bad', label: '❌ Bad' },
      { value: 'flush', label: 'Flush' }
    ]
  },

  brake_fluid_photos: {
    id: 'brake_fluid_photos',
    label: 'Brake Fluid Photos',
    type: 'photo',
    multiple: true,
    defaultValue: []
  },

  powersteering_fluid: {
    id: 'powersteering_fluid',
    label: 'Power Steering Fluid',
    type: 'select',
    defaultValue: '',
    options: [
      { value: '', label: 'Select...' },
      { value: 'good', label: '✅ Good' },
      { value: 'warning', label: '⚠️ Warning' },
      { value: 'bad', label: '❌ Bad' },
      { value: 'flush', label: 'Flush' }
    ]
  },

  powersteering_fluid_photos: {
    id: 'powersteering_fluid_photos',
    label: 'Power Steering Fluid Photos',
    type: 'photo',
    multiple: true,
    defaultValue: []
  },

  coolant: {
    id: 'coolant',
    label: 'Coolant',
    type: 'select',
    defaultValue: '',
    options: [
      { value: '', label: 'Select...' },
      { value: 'good', label: '✅ Good' },
      { value: 'warning', label: '⚠️ Warning' },
      { value: 'bad', label: '❌ Bad' },
      { value: 'flush', label: 'Flush' }
    ]
  },

  coolant_photos: {
    id: 'coolant_photos',
    label: 'Coolant Photos',
    type: 'photo',
    multiple: true,
    defaultValue: []
  },

  radiator_end_caps: {
    id: 'radiator_end_caps',
    label: 'Radiator End Caps',
    type: 'select',
    defaultValue: '',
    options: [
      { value: '', label: 'Select...' },
      { value: 'good', label: '✅ Good' },
      { value: 'warning', label: '⚠️ Warning' },
      { value: 'bad', label: '❌ Bad' },
      { value: 'leaking', label: 'Leaking' }
    ]
  },

  radiator_end_caps_photos: {
    id: 'radiator_end_caps_photos',
    label: 'Radiator End Caps Photos',
    type: 'photo',
    multiple: true,
    defaultValue: []
  },

  cooling_hoses: {
    id: 'cooling_hoses',
    label: 'Cooling Hoses',
    type: 'select',
    multiple: true,
    defaultValue: '',
    options: [
      { value: '', label: 'Select...' },
      { value: 'good', label: '✅ Good' },
      { value: 'warning', label: '⚠️ Warning' },
      { value: 'bad', label: '❌ Bad' },
      { value: 'heater_hoses', label: 'Heater Hoses' },
      { value: 'radiator_hoses', label: 'Radiator Hoses' }
    ]
  },

  cooling_hoses_photos: {
    id: 'cooling_hoses_photos',
    label: 'Cooling Hoses Photos',
    type: 'photo',
    multiple: true,
    defaultValue: []
  },

  // Tire fields
  passenger_front_tire: {
    id: 'passenger_front_tire',
    label: 'Passenger Front Tire Condition',
    type: 'select',
    defaultValue: '',
    options: [
      { value: '', label: 'Select...' },
      { value: 'good', label: 'Good' },
      { value: 'warning', label: 'Warning' },
      { value: 'bad', label: 'Bad' },
      { value: 'over_7yr', label: 'Over 7 Years' },
      { value: 'over_6yr', label: 'Over 6 Years' },
      { value: 'inner_wear', label: 'Inner Wear' },
      { value: 'outer_wear', label: 'Outer Wear' },
      { value: 'wear_indicator', label: 'Wear Indicator' },
      { value: 'separated', label: 'Separated' },
      { value: 'dry_rotted', label: 'Dry Rotted' },
      { value: 'na', label: 'N/A' },
      { value: 'no_spare', label: 'No Spare' }
    ]
  },

  driver_front_tire: {
    id: 'driver_front_tire',
    label: 'Driver Front Tire Condition',
    type: 'select',
    defaultValue: '',
    options: [
      { value: '', label: 'Select...' },
      { value: 'good', label: 'Good' },
      { value: 'warning', label: 'Warning' },
      { value: 'bad', label: 'Bad' },
      { value: 'over_7yr', label: 'Over 7 Years' },
      { value: 'over_6yr', label: 'Over 6 Years' },
      { value: 'inner_wear', label: 'Inner Wear' },
      { value: 'outer_wear', label: 'Outer Wear' },
      { value: 'wear_indicator', label: 'Wear Indicator' },
      { value: 'separated', label: 'Separated' },
      { value: 'dry_rotted', label: 'Dry Rotted' },
      { value: 'na', label: 'N/A' },
      { value: 'no_spare', label: 'No Spare' }
    ]
  },

  driver_rear_tire: {
    id: 'driver_rear_tire',
    label: 'Driver Rear Tire Condition',
    type: 'select',
    defaultValue: '',
    options: [
      { value: '', label: 'Select...' },
      { value: 'good', label: 'Good' },
      { value: 'warning', label: 'Warning' },
      { value: 'bad', label: 'Bad' },
      { value: 'over_7yr', label: 'Over 7 Years' },
      { value: 'over_6yr', label: 'Over 6 Years' },
      { value: 'inner_wear', label: 'Inner Wear' },
      { value: 'outer_wear', label: 'Outer Wear' },
      { value: 'wear_indicator', label: 'Wear Indicator' },
      { value: 'separated', label: 'Separated' },
      { value: 'dry_rotted', label: 'Dry Rotted' },
      { value: 'na', label: 'N/A' },
      { value: 'no_spare', label: 'No Spare' }
    ]
  },

  passenger_rear_tire: {
    id: 'passenger_rear_tire',
    label: 'Passenger Rear Tire Condition',
    type: 'select',
    defaultValue: '',
    options: [
      { value: '', label: 'Select...' },
      { value: 'good', label: 'Good' },
      { value: 'warning', label: 'Warning' },
      { value: 'bad', label: 'Bad' },
      { value: 'over_7yr', label: 'Over 7 Years' },
      { value: 'over_6yr', label: 'Over 6 Years' },
      { value: 'inner_wear', label: 'Inner Wear' },
      { value: 'outer_wear', label: 'Outer Wear' },
      { value: 'wear_indicator', label: 'Wear Indicator' },
      { value: 'separated', label: 'Separated' },
      { value: 'dry_rotted', label: 'Dry Rotted' },
      { value: 'na', label: 'N/A' },
      { value: 'no_spare', label: 'No Spare' }
    ]
  },

  spare_tire: {
    id: 'spare_tire',
    label: 'Spare Tire Condition',
    type: 'select',
    defaultValue: '',
    options: [
      { value: '', label: 'Select...' },
      { value: 'good', label: 'Good' },
      { value: 'warning', label: 'Warning' },
      { value: 'bad', label: 'Bad' },
      { value: 'over_7yr', label: 'Over 7 Years' },
      { value: 'over_6yr', label: 'Over 6 Years' },
      { value: 'inner_wear', label: 'Inner Wear' },
      { value: 'outer_wear', label: 'Outer Wear' },
      { value: 'wear_indicator', label: 'Wear Indicator' },
      { value: 'separated', label: 'Separated' },
      { value: 'dry_rotted', label: 'Dry Rotted' },
      { value: 'na', label: 'N/A' },
      { value: 'no_spare', label: 'No Spare' }
    ]
  },

  front_shock_struts: {
    id: 'front_shock_struts',
    label: 'Front Shock/Struts',
    type: 'select',
    defaultValue: '',
    options: [
      { value: '', label: 'Select...' },
      { value: 'good', label: '✅ Good' },
      { value: 'warning', label: '⚠️ Warning' },
      { value: 'bad', label: '❌ Bad' },
      { value: 'air_suspension', label: 'Air Suspension' },
      { value: 'leaking', label: 'Leaking' }
    ]
  },

  front_shock_struts_photos: {
    id: 'front_shock_struts_photos',
    label: 'Front Shock/Struts Photos',
    type: 'photo',
    multiple: true,
    defaultValue: []
  },

  rear_shock_struts: {
    id: 'rear_shock_struts',
    label: 'Rear Shock/Struts',
    type: 'select',
    defaultValue: '',
    options: [
      { value: '', label: 'Select...' },
      { value: 'good', label: '✅ Good' },
      { value: 'warning', label: '⚠️ Warning' },
      { value: 'bad', label: '❌ Bad' },
      { value: 'air_suspension', label: 'Air Suspension' },
      { value: 'leaking', label: 'Leaking' }
    ]
  },

  rear_shock_struts_photos: {
    id: 'rear_shock_struts_photos',
    label: 'Rear Shock/Struts Photos',
    type: 'photo',
    multiple: true,
    defaultValue: []
  },

  leaks: {
    id: 'leaks',
    label: 'Leaks',
    type: 'select',
    defaultValue: '',
    options: [
      { value: '', label: 'Select...' },
      { value: 'oil', label: 'Oil' },
      { value: 'coolant', label: 'Coolant' },
      { value: 'transmission', label: 'Transmission' },
      { value: 'differential', label: 'Differential' },
      { value: 'brake_fluid', label: 'Brake Fluid' },
      { value: 'powersteering_fluid', label: 'Power Steering Fluid' }
    ]
  },

  leaks_photos: {
    id: 'leaks_photos',
    label: 'Leaks Photos',
    type: 'photo',
    multiple: true,
    defaultValue: []
  },

  // Suspension fields
  left_control_arm_bushings: {
    id: 'left_control_arm_bushings',
    label: 'Left Control Arm Bushings',
    type: 'select',
    defaultValue: '',
    options: [
      { value: '', label: 'Select...' },
      { value: 'good', label: '✅ Good' },
      { value: 'bad', label: '❌ Bad' },
      { value: 'upper', label: 'Upper' },
      { value: 'lower', label: 'Lower' },
      { value: 'frontward', label: 'Frontward' },
      { value: 'rearward', label: 'Rearward' }
    ]
  },

  left_control_arm_bushings_photos: {
    id: 'left_control_arm_bushings_photos',
    label: 'Left Control Arm Bushings Photos',
    type: 'photo',
    multiple: true,
    defaultValue: []
  },

  left_ball_joints: {
    id: 'left_ball_joints',
    label: 'Left Ball Joints',
    type: 'select',
    defaultValue: '',
    options: [
      { value: '', label: 'Select...' },
      { value: 'good', label: '✅ Good' },
      { value: 'warning', label: '⚠️ Warning' },
      { value: 'bad', label: '❌ Bad' },
      { value: 'upper', label: 'Upper' },
      { value: 'lower', label: 'Lower' }
    ]
  },

  left_ball_joints_photos: {
    id: 'left_ball_joints_photos',
    label: 'Left Ball Joints Photos',
    type: 'photo',
    multiple: true,
    defaultValue: []
  },

  right_control_arm_bushings: {
    id: 'right_control_arm_bushings',
    label: 'Right Control Arm Bushings',
    type: 'select',
    defaultValue: '',
    options: [
      { value: '', label: 'Select...' },
      { value: 'good', label: '✅ Good' },
      { value: 'bad', label: '❌ Bad' },
      { value: 'upper', label: 'Upper' },
      { value: 'lower', label: 'Lower' },
      { value: 'frontward', label: 'Frontward' },
      { value: 'rearward', label: 'Rearward' }
    ]
  },

  right_control_arm_bushings_photos: {
    id: 'right_control_arm_bushings_photos',
    label: 'Right Control Arm Bushings Photos',
    type: 'photo',
    multiple: true,
    defaultValue: []
  },

  right_ball_joints: {
    id: 'right_ball_joints',
    label: 'Right Ball Joints',
    type: 'select',
    defaultValue: '',
    options: [
      { value: '', label: 'Select...' },
      { value: 'good', label: '✅ Good' },
      { value: 'warning', label: '⚠️ Warning' },
      { value: 'bad', label: '❌ Bad' },
      { value: 'upper', label: 'Upper' },
      { value: 'lower', label: 'Lower' }
    ]
  },

  right_ball_joints_photos: {
    id: 'right_ball_joints_photos',
    label: 'Right Ball Joints Photos',
    type: 'photo',
    multiple: true,
    defaultValue: []
  },

  sway_bar: {
    id: 'sway_bar',
    label: 'Sway Bar',
    type: 'select',
    defaultValue: '',
    options: [
      { value: '', label: 'Select...' },
      { value: 'good', label: '✅ Good' },
      { value: 'bad', label: '❌ Bad' },
      { value: 'f_links', label: 'F/Links' },
      { value: 'f_bushings', label: 'F/Bushings' },
      { value: 'r_links', label: 'R/Links' },
      { value: 'r_bushings', label: 'R/Bushings' }
    ]
  },

  sway_bar_photos: {
    id: 'sway_bar_photos',
    label: 'Sway Bar Photos',
    type: 'photo',
    multiple: true,
    defaultValue: []
  },

  suspension_type: {
    id: 'suspension_type',
    label: 'Suspension Type',
    type: 'select',
    defaultValue: '',
    options: [
      { value: '', label: 'Select...' },
      { value: 'good', label: '✅ Good' },
      { value: 'gear_box', label: 'Gear Box' },
      { value: 'rack_and_pinion', label: 'Rack & Pinion' }
    ]
  },

  suspension_type_photos: {
    id: 'suspension_type_photos',
    label: 'Suspension Type Photos',
    type: 'photo',
    multiple: true,
    defaultValue: []
  },

  wheel_bearing: {
    id: 'wheel_bearing',
    label: 'Wheel Bearing',
    type: 'select',
    defaultValue: '',
    options: [
      { value: '', label: 'Select...' },
      { value: 'f_left', label: 'F/Left' },
      { value: 'f_right', label: 'F/Right' },
      { value: 'r_right', label: 'R/Right' },
      { value: 'r_left', label: 'R/Left' }
    ]
  },

  cv_axles: {
    id: 'cv_axles',
    label: 'CV Axles',
    type: 'select',
    defaultValue: '',
    options: [
      { value: '', label: 'Select...' },
      { value: 'f_left', label: 'F/Left' },
      { value: 'f_right', label: 'F/Right' },
      { value: 'r_right', label: 'R/Right' },
      { value: 'r_left', label: 'R/Left' }
    ]
  },

  rear_suspension: {
    id: 'rear_suspension',
    label: 'Rear Suspension',
    type: 'select',
    defaultValue: '',
    options: [
      { value: '', label: 'Select...' },
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' }
    ]
  },

  // === System Fields ===
  inspection_type: {
    id: 'inspection_type',
    label: 'Inspection Type',
    type: 'select',
    required: true,
    defaultValue: 'quick_check',
    readOnlyIf: { when: 'system_field', truthy: true },
    options: [
      { value: 'quick_check', label: 'Quick Check' },
      { value: 'no_check', label: 'No Check' },
      { value: 'vsi', label: 'VSI' }
    ]
  },

  tab_timings: {
    id: 'tab_timings',
    label: 'Tab Timings',
    type: 'complex',
    widget: 'TabTimingsField',
    defaultValue: {}
  },

  created_datetime: {
    id: 'created_datetime',
    label: 'Created',
    type: 'text',
    readOnlyIf: { when: 'system_field', truthy: true },
    defaultValue: ''
  },

  submitted_datetime: {
    id: 'submitted_datetime',
    label: 'Submitted',
    type: 'text',
    readOnlyIf: { when: 'system_field', truthy: true },
    defaultValue: ''
  },

  archived_datetime: {
    id: 'archived_datetime',
    label: 'Archived',
    type: 'text',
    readOnlyIf: { when: 'system_field', truthy: true },
    defaultValue: ''
  },

  // === Section Headers ===
  // These create visual section headers with no input fields
  section_header_fluids: {
    id: 'section_header_fluids',
    label: 'Fluids',
    type: 'section_header',
    defaultValue: null
  },

  section_header_front_suspension: {
    id: 'section_header_front_suspension',
    label: 'Front Suspension',
    type: 'section_header',
    defaultValue: null
  },

  section_header_rear_suspension: {
    id: 'section_header_rear_suspension',
    label: 'Rear Suspension',
    type: 'section_header',
    defaultValue: null
  },

  section_header_tire_condition: {
    id: 'section_header_tire_condition',
    label: 'Tire Condition',
    type: 'section_header',
    defaultValue: null
  },

  section_header_brake_inspection: {
    id: 'section_header_brake_inspection',
    label: 'Brake Inspection',
    type: 'section_header',
    defaultValue: null
  },

  section_header_electrical: {
    id: 'section_header_electrical',
    label: 'Electrical System',
    type: 'section_header',
    defaultValue: null
  },

  section_header_engine: {
    id: 'section_header_engine',
    label: 'Engine',
    type: 'section_header',
    defaultValue: null
  }
};

/**
 * Get field definition by ID
 */
export function getFieldDef(fieldId: string): FieldDef | undefined {
  return FIELD_REGISTRY[fieldId];
}

/**
 * Get all field definitions for given field IDs
 */
export function getFieldDefs(fieldIds: string[]): FieldDef[] {
  return fieldIds
    .map(id => FIELD_REGISTRY[id])
    .filter(Boolean);
}

/**
 * Get default value for a field
 */
export function getFieldDefaultValue(fieldId: string): unknown {
  const field = FIELD_REGISTRY[fieldId];
  if (!field) return undefined;
  
  const defaultValue = field.defaultValue;
  // Since we've removed function defaults, just return the value
  return defaultValue;
}

/**
 * Validate field value
 */
export function validateField(fieldId: string, value: unknown, context: any = {}): string | null {
  const field = FIELD_REGISTRY[fieldId];
  if (!field) return null;
  
  // Required validation
  const isRequired = typeof field.required === 'boolean' 
    ? field.required 
    : field.required ? evaluateRule(field.required, context) : false;
    
  if (isRequired && (!value || (typeof value === 'string' && value.trim() === ''))) {
    return `${field.label} is required`;
  }
  
  // Custom validation
  if (field.validate) {
    return field.validate(value, context);
  }
  
  return null;
}

/**
 * Basic rule evaluation (simplified version)
 * TODO: Move to separate ruleEvaluator.ts
 */
function evaluateRule(rule: Rule, context: Record<string, unknown>): boolean {
  if ('when' in rule) {
    const value = context[rule.when];
    if (rule.eq !== undefined) return value === rule.eq;
    if (rule.in !== undefined) return rule.in.includes(value);
    if (rule.truthy !== undefined) return rule.truthy ? !!value : !value;
  }
  
  if ('all' in rule) return rule.all.every(r => evaluateRule(r, context));
  if ('any' in rule) return rule.any.some(r => evaluateRule(r, context));
  if ('not' in rule) return !evaluateRule(rule.not, context);
  
  return false;
}
