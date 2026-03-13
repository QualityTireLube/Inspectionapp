export type InspectionType = 'quick_check' | 'no_check' | 'vsi';

export type TabKey = 'info' | 'pulling' | 'underhood' | 'tires' | 'suspension';
export type FieldKey =
  | 'user' | 'datetime' | 'vin' | 'vehicle_details' | 'mileage' | 'mileage_photos'
  | 'dash_lights_photos' | 'windshield_condition' | 'wiper_blades' | 'washer_squirters'
  | 'tpms_placard' | 'state_inspection' | 'state_inspection_status' | 'state_inspection_month' | 'state_inspection_date_code'
  | 'washer_fluid' | 'washer_fluid_photo' | 'engine_air_filter' | 'engine_air_filter_photo' | 'battery_condition' | 'battery_photos' | 'battery_date_code' | 'tpms_tool'
  | 'tire_tread' | 'tire_tread_front' | 'tire_tread_rear' | 'tire_comments' | 'tire_dates' | 'brake_pads' | 'front_brake_pads' | 'rear_brake_pads' | 'tire_photos' | 'tire_rotation' | 'drain_plug_type' | 'undercarriage_photo' | 'static_sticker' | 'tire_repair' | 'check_tpms' | 'notes'
  | 'check_engine_mounts' | 'check_engine_mounts_photos' | 'exterior_lights_front' | 'exterior_lights_rear' | 'exterior_lights_photos'
  | 'drive_belt' | 'drive_belt_photos' | 'engine_mounts' | 'engine_mounts_photos' | 'brake_fluid' | 'brake_fluid_photos'
  | 'powersteering_fluid' | 'powersteering_fluid_photos' | 'coolant' | 'coolant_photos' | 'radiator_end_caps' | 'radiator_end_caps_photos'
  | 'cooling_hoses' | 'cooling_hoses_photos' | 'passenger_front_tire' | 'driver_front_tire' | 'driver_rear_tire'
  | 'passenger_rear_tire' | 'spare_tire' | 'front_brakes' | 'rear_brakes' | 'front_shock_struts' | 'front_shock_struts_photos' | 'rear_shock_struts'
  | 'rear_shock_struts_photos' | 'leaks' | 'leaks_photos' | 'tire_repair_status' | 'tire_repair_zones'
  | 'tire_repair_statuses' | 'tire_repair_images' | 'tpms_type' | 'tpms_zones' | 'tpms_statuses' | 'tpms_tool_photo'
  | 'left_control_arm_bushings' | 'left_control_arm_bushings_photos' | 'left_ball_joints' | 'left_ball_joints_photos'
  | 'right_control_arm_bushings' | 'right_control_arm_bushings_photos' | 'right_ball_joints' | 'right_ball_joints_photos'
  | 'sway_bar' | 'sway_bar_photos' | 'suspension_type' | 'suspension_type_photos' | 'wheel_bearing' | 'cv_axles' | 'rear_suspension';

export interface InspectionSchema {
  title: string;
  tabOrder: TabKey[];
  fieldsByTab: Record<TabKey, FieldKey[]>;
  draftKeyPrefix: string;
  submitType: InspectionType;
  // Controls whether the form shows the bottom navigation (Prev/Next/Save)
  // When omitted, defaults to true
  showBottomNav?: boolean;
}

export const INSPECTION_SCHEMAS: Record<InspectionType, InspectionSchema> = {
  quick_check: {
    title: 'Quick Check',
    showBottomNav: true,
    tabOrder: ['info', 'pulling', 'underhood', 'tires'],
    fieldsByTab: {
      info: ['user', 'datetime', 'vehicle_details'],
      pulling: ['dash_lights_photos', 'mileage', 'windshield_condition', 'wiper_blades', 'washer_squirters'],
      underhood: ['vin', 'tpms_placard', 'state_inspection', 'washer_fluid', 'engine_air_filter', 'battery_condition', 'tpms_tool'],
      tires: ['tire_tread', 'tire_tread_front', 'tire_tread_rear', 'tire_comments', 'tire_dates', 'brake_pads', 'front_brake_pads', 'rear_brake_pads', 'tire_photos', 'tire_rotation', 'drain_plug_type', 'undercarriage_photo', 'static_sticker', 'tire_repair', 'check_tpms', 'notes'],
      suspension: []
    },
    draftKeyPrefix: 'quickCheckDraft:',
    submitType: 'quick_check'
  },
  no_check: {
    title: 'No Check',
    showBottomNav: true,
    tabOrder: ['info', 'pulling', 'underhood', 'tires'],
    fieldsByTab: {
      info: ['user', 'datetime'],
      pulling: ['dash_lights_photos', 'mileage', 'windshield_condition'],
      underhood: ['vin', 'tpms_placard', 'state_inspection', 'washer_fluid'],
      tires: ['tire_rotation', 'drain_plug_type', 'undercarriage_photo', 'static_sticker', 'tire_repair', 'check_tpms', 'notes'],
      suspension: []
    },
    draftKeyPrefix: 'noCheckDraft:',
    submitType: 'no_check'
  },
  vsi: {
    title: 'VSI',
    showBottomNav: true,
    tabOrder: ['info', 'pulling', 'underhood', 'tires', 'suspension'],
    fieldsByTab: {
      // Info Tab Fields (exact order from specification)
      info: ['user', 'datetime', 'vin', 'vehicle_details'],
      
      // Pulling Into Bay Tab Fields (exact order from specification)
      pulling: [
        'mileage', 'mileage_photos',
        'dash_lights_photos',
        'check_engine_mounts', 'check_engine_mounts_photos',
        'windshield_condition',
        'wiper_blades',
        'washer_squirters',
        'exterior_lights_front', 'exterior_lights_rear', 'exterior_lights_photos'
      ],
      
      // Underhood Tab Fields (exact order from specification)
      underhood: [
        'vin',
        'tpms_placard',
        'state_inspection',
        'washer_fluid', 'washer_fluid_photo',
        'engine_air_filter', 'engine_air_filter_photo',
        'battery_condition', 'battery_photos', 'battery_date_code',
        'drive_belt', 'drive_belt_photos',
        'engine_mounts', 'engine_mounts_photos',
        // Fluids section
        'brake_fluid', 'brake_fluid_photos',
        'powersteering_fluid', 'powersteering_fluid_photos',
        'coolant', 'coolant_photos',
        'radiator_end_caps', 'radiator_end_caps_photos',
        'cooling_hoses', 'cooling_hoses_photos'
      ],
      
      // Tires & Brakes Tab Fields (exact order from specification)
      tires: [
        'passenger_front_tire',
        'driver_front_tire',
        'driver_rear_tire',
        'passenger_rear_tire',
        'spare_tire',
        'front_brakes',
        'front_shock_struts', 'front_shock_struts_photos',
        'rear_brakes',
        'rear_shock_struts', 'rear_shock_struts_photos',
        'front_brake_pads',
        'rear_brake_pads',
        'tire_photos',
        'tire_tread',
        'tire_comments',
        'tire_dates',
        'leaks', 'leaks_photos',
        'tire_repair_status',
        'tire_repair_zones',
        'tire_repair_statuses',
        'tire_repair_images',
        'tpms_type',
        'tpms_zones',
        'tpms_statuses',
        'tpms_tool_photo',
        'tire_rotation',
        'static_sticker',
        'drain_plug_type',
        'notes'
      ],
      
      // Suspension Tab Fields (exact order from specification)
      suspension: [
        // Front Suspension section
        'left_control_arm_bushings', 'left_control_arm_bushings_photos',
        'left_ball_joints', 'left_ball_joints_photos',
        'right_control_arm_bushings', 'right_control_arm_bushings_photos',
        'right_ball_joints', 'right_ball_joints_photos',
        'sway_bar', 'sway_bar_photos',
        'suspension_type', 'suspension_type_photos',
        'wheel_bearing',
        'cv_axles',
        // Rear Suspension section
        'rear_suspension'
      ]
    },
    draftKeyPrefix: 'vsiDraft:',
    submitType: 'vsi'
  }
  
  /* EXAMPLE: How to add a new inspection type with automatic timer support

  safety_inspection: {
    title: 'Safety Inspection',
    tabOrder: ['basics', 'lights', 'mechanical', 'final'],
    fieldsByTab: {
      basics: ['user', 'datetime', 'vin', 'mileage'],
      lights: ['headlights', 'taillights', 'brake_lights', 'turn_signals'],
      mechanical: ['brakes', 'steering', 'suspension', 'exhaust'],
      final: ['notes', 'recommendations', 'pass_fail_status']
    },
    draftKeyPrefix: 'safetyInspectionDraft:',
    submitType: 'safety_inspection'
  }

  This would automatically get:
  ✅ VirtualTabTimer with 4 tabs: Basics | Lights | Mechanical | Final
  ✅ Dynamic tab timing persistence (basics_duration, lights_duration, etc.)
  ✅ Header timer display showing current tab and total time
  ✅ Clickable timing dialog with per-tab breakdown
  ✅ Draft autosave including timing data
  ✅ Single draft enforcement per user
  ✅ Automatic navigation with timer integration
  ✅ Bottom nav with Prev/Cancel/Next/Save
  */
};


