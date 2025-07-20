export type WindshieldCondition = 'good' | 'bad';
export type WiperBladeCondition = 'good' | 'front_minor' | 'front_moderate' | 'front_major' | 'rear_minor' | 'rear_moderate' | 'rear_major';
export type WiperBladeSubCondition = 'good' | 'minor' | 'moderate' | 'major';
export type WasherSquirterCondition = 'good' | 'leaking' | 'not_working' | 'no_pump_sound';
export type StateInspectionStatus = 'expired' | 'this_year' | 'next_year' | 'year_after' | 'no_sticker';
export type WasherFluidCondition = 'full' | 'leaking' | 'not_working' | 'no_pump_sound';
export type EngineAirFilterCondition = 'good' | 'next_oil_change' | 'highly_recommended' | 'today' | 'animal_related';
export type BatteryCondition = 'good' | 'warning' | 'bad' | 'na' | 'terminal_cleaning' | 'less_than_5yr';
export type BatterySubCondition = 'good' | 'warning' | 'bad' | 'na';
export type BatteryTerminalCondition = 'good' | 'terminal_cleaning' | 'terminal_damaged';
export type BatteryTerminalDamageLocation = 'positive' | 'negative';
export type BatteryTerminalDamageLocationList = BatteryTerminalDamageLocation[];
export type TireCondition = '' | 'good' | 'warning' | 'bad' | 'over_7yr' | 'over_6yr' | 'inner_wear' | 'outer_wear' | 'wear_indicator' | 'separated' | 'dry_rotted' | 'na' | 'no_spare';
export type BrakeCondition = '' | 'good' | 'soon' | 'very_soon' | 'today' | 'metal_to_metal' | 'rotors' | 'pull_wheels' | 'drums_not_checked';
export type StaticStickerStatus = '' | 'good' | 'not_oil_change' | 'need_sticker';
export type DrainPlugType = '' | 'metal' | 'plastic';
export type TireRepairStatus = '' | 'repairable' | 'not_tire_repair' | 'non_repairable';
export type TPMSType = '' | 'not_check' | 'bad_sensor';
export type TireRotationStatus = '' | 'good' | 'bad';
export type TreadCondition = '' | 'green' | 'yellow' | 'red';
export type RotorCondition = '' | 'good' | 'grooves' | 'overheated' | 'scared';
export type BrakePadCondition = '' | 'good' | 'warning' | 'bad' | 'critical' | 'metal_to_metal' | 'off' | 'drums_not_checked';
export type InspectionType = 'no_check' | 'quick_check' | 'vsi';

export interface BrakePadData {
  inner: BrakePadCondition;
  outer: BrakePadCondition;
  rotor_condition: RotorCondition;
}

export interface ImageUpload {
  file: File;
  progress: number;
  url?: string; // Now stores relative path (e.g., "/uploads/filename.jpg") instead of full URL
  error?: string;
  position?: number;
  isDeleted?: boolean;
}

export interface TireTread {
  inner_edge_depth: string;
  inner_depth: string;
  center_depth: string;
  outer_depth: string;
  outer_edge_depth: string;
  inner_edge_condition: TreadCondition;
  inner_condition: TreadCondition;
  center_condition: TreadCondition;
  outer_condition: TreadCondition;
  outer_edge_condition: TreadCondition;
}

export interface TireRepairImages {
  not_repairable: ImageUpload[];
  tire_size_brand: ImageUpload[];
  repairable_spot: ImageUpload[];
}

export interface TirePhoto {
  type: 'passenger_front' | 'driver_front' | 'driver_rear' | 'driver_rear_inner' | 'passenger_rear_inner' | 'passenger_rear' | 'spare' | 'front_brakes' | 'rear_brakes';
  photos: ImageUpload[];
}

export interface TireRepairZone {
  position: string;
  status: 'good' | 'bad' | null;
}

export interface TPMSZone {
  position: string;
  status: 'good' | 'bad' | null;
}

export interface DraftData {
  id?: string;
  draft_data: QuickCheckForm;
  last_updated: string;
}

export interface QuickCheckForm {
  inspection_type: InspectionType;
  vin: string;
  vehicle_details: string;
  date: string;
  user: string;
  mileage: string;
  windshield_condition: WindshieldCondition;
  wiper_blades: WiperBladeCondition;
  wiper_blades_front: WiperBladeSubCondition;
  wiper_blades_rear: WiperBladeSubCondition;
  washer_squirters: WasherSquirterCondition;
  dash_lights_photos: ImageUpload[];
  // Field-specific images for form fields
  mileage_photos: ImageUpload[];
  windshield_condition_photos: ImageUpload[];
  wiper_blades_photos: ImageUpload[];
  washer_squirters_photos: ImageUpload[];
  vin_photos: ImageUpload[];
  state_inspection_status_photos: ImageUpload[];
  state_inspection_date_code_photos: ImageUpload[];
  battery_date_code_photos: ImageUpload[];
  tire_repair_status_photos: ImageUpload[];
  tpms_type_photos: ImageUpload[];
  front_brake_pads_photos: ImageUpload[];
  rear_brake_pads_photos: ImageUpload[];
  // Underhood fields
  tpms_placard: ImageUpload[];
  state_inspection_status: StateInspectionStatus;
  state_inspection_month: number | null;
  state_inspection_date_code: string;
  washer_fluid: WasherFluidCondition;
  washer_fluid_photo: ImageUpload[];
  engine_air_filter: EngineAirFilterCondition;
  engine_air_filter_photo: ImageUpload[];
  battery_condition: BatteryCondition[];
  battery_condition_main: BatterySubCondition;
  battery_terminals: BatteryTerminalCondition[];
  battery_terminal_damage_location: BatteryTerminalDamageLocationList | null;
  battery_photos: ImageUpload[];
  battery_date_code: string;
  tpms_tool_photo: ImageUpload[];
  
  // Tires & Brakes fields
  passenger_front_tire: TireCondition;
  driver_front_tire: TireCondition;
  driver_rear_tire: TireCondition;
  passenger_rear_tire: TireCondition;
  spare_tire: TireCondition;
  front_brakes: ImageUpload[];
  rear_brakes: ImageUpload[];
  front_brake_pads: {
    driver: BrakePadData;
    passenger: BrakePadData;
  };
  rear_brake_pads: {
    driver: BrakePadData;
    passenger: BrakePadData;
  };
  tire_photos: TirePhoto[];
  undercarriage_photos: ImageUpload[];
  tire_repair_status: TireRepairStatus;
  tire_repair_zones: TireRepairZone[];
  tire_repair_images: {
    driver_front: TireRepairImages;
    passenger_front: TireRepairImages;
    driver_rear_outer: TireRepairImages;
    driver_rear_inner: TireRepairImages;
    passenger_rear_inner: TireRepairImages;
    passenger_rear_outer: TireRepairImages;
    spare: TireRepairImages;
  };
  tpms_type: TPMSType;
  tpms_zones: TPMSZone[];
  tire_rotation: TireRotationStatus;
  static_sticker: StaticStickerStatus;
  drain_plug_type: DrainPlugType;
  notes: string;
  tire_repair_statuses: {
    driver_front: 'repairable' | 'non_repairable' | null;
    passenger_front: 'repairable' | 'non_repairable' | null;
    driver_rear_outer: 'repairable' | 'non_repairable' | null;
    driver_rear_inner: 'repairable' | 'non_repairable' | null;
    passenger_rear_inner: 'repairable' | 'non_repairable' | null;
    passenger_rear_outer: 'repairable' | 'non_repairable' | null;
    spare: 'repairable' | 'non_repairable' | null;
  };
  tpms_statuses: {
    driver_front: boolean | null;
    passenger_front: boolean | null;
    driver_rear_outer: boolean | null;
    driver_rear_inner: boolean | null;
    passenger_rear_inner: boolean | null;
    passenger_rear_outer: boolean | null;
    spare: boolean | null;
  };
  tire_comments: {
    [key: string]: string[];
  };
  tire_dates: {
    [key: string]: string;
  };
  tire_tread: {
    driver_front: TireTread;
    passenger_front: TireTread;
    driver_rear: TireTread;
    driver_rear_inner: TireTread;
    passenger_rear_inner: TireTread;
    passenger_rear: TireTread;
    spare: TireTread;
  };
  // Field-specific notes
  field_notes: {
    [key: string]: string;
  };
  // Timing fields
  tab_timings: {
    info_duration: number;
    pulling_duration: number;
    underhood_duration: number;
    tires_duration: number;
  };
  // Workflow timing fields
  created_datetime: string;
  submitted_datetime: string;
  archived_datetime: string;
}

export interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

export type PhotoType = 'passenger_front' | 'driver_front' | 'driver_rear' | 'driver_rear_inner' | 'passenger_rear_inner' | 'passenger_rear' | 'spare' | 'undercarriage_photos' | 'front_brakes' | 'rear_brakes' | 'tpms_placard' | 'washer_fluid' | 'engine_air_filter' | 'battery' | 'tpms_tool' | 'dashLights' | 'mileage' | 'windshield_condition' | 'wiper_blades' | 'washer_squirters' | 'vin' | 'state_inspection_status' | 'state_inspection_date_code' | 'battery_date_code' | 'tire_repair_status' | 'tpms_type' | 'front_brake_pads' | 'rear_brake_pads'; 