/**
 * UI Schemas - Layout and structure definitions per inspection type
 * 
 * This file defines how fields from the Field Registry are arranged
 * into tabs, sections, and layouts for each inspection type.
 */

import type { Rule } from './fieldRegistry';

export interface LayoutField { 
  field: string; 
  colSpan?: number; 
  showIf?: Rule; 
  readOnlyIf?: Rule; 
}

export interface Section { 
  id: string; 
  title?: string; 
  columns?: 1 | 2 | 3 | 4; 
  rows: LayoutField[][]; 
  showIf?: Rule; 
}

export interface TabDef { 
  id: string; 
  title: string; 
  sections: Section[]; 
  showIf?: Rule; 
}

export interface InspectionTypeSchema {
  id: string;                 // 'quick_check' | 'no_check' | 'state_inspection' | ...
  title: string;
  extends?: string;           // optional inheritance from a base schema
  fields: string[];           // whitelist of field IDs from the registry
  tabs: TabDef[];             // placement of fields
  draftKeyPrefix: string;     // local storage / draft namespace
  submitType: string;         // backend routing key
  version: number;            // schema version for audit + stability
}

/**
 * Base schema with common structure
 */
const BASE_SCHEMA: Partial<InspectionTypeSchema> = {
  tabs: [
    {
      id: 'info',
      title: 'Info',
      sections: [
        {
          id: 'basic_info',
          title: 'Basic Information',
          columns: 2,
          rows: [
            [{ field: 'user' }, { field: 'date' }],
            [{ field: 'location', colSpan: 2 }]
          ]
        },
        {
          id: 'vehicle_info',
          title: 'Vehicle Information',
          columns: 2,
          rows: [
            [{ field: 'vin', colSpan: 2 }],
            [{ field: 'vehicle_details', colSpan: 2 }],
            [{ field: 'mileage' }, { field: 'mileage_photos' }]
          ]
        }
      ]
    },
    {
      id: 'pulling',
      title: 'Pulling Into Bay',
      sections: [
        {
          id: 'dashboard',
          title: 'Dashboard Assessment',
          columns: 2,
          rows: [
            [{ field: 'dash_lights_photos', colSpan: 2 }]
          ]
        },
        {
          id: 'exterior_basic',
          title: 'Basic Exterior Check',
          columns: 2,
          rows: [
            [{ field: 'windshield_condition' }, { field: 'windshield_condition_photos' }]
          ]
        }
      ]
    },
    {
      id: 'underhood',
      title: 'Underhood',
      sections: [
        {
          id: 'placards',
          title: 'Placards & Inspection',
          columns: 2,
          rows: [
            [{ field: 'tpms_placard', colSpan: 2 }],
            [{ field: 'state_inspection_status' }, { field: 'state_inspection_month' }],
            [{ field: 'state_inspection_date_code' }, { field: 'state_inspection_status_photos' }]
          ]
        },
        {
          id: 'fluids',
          title: 'Fluids',
          columns: 2,
          rows: [
            [{ field: 'washer_fluid' }, { field: 'washer_fluid_photo' }]
          ]
        }
      ]
    },
    {
      id: 'tires',
      title: 'Tires & Final',
      sections: [
        {
          id: 'basic_checks',
          title: 'Basic Checks',
          columns: 2,
          rows: [
            [{ field: 'tire_rotation' }, { field: 'static_sticker' }],
            [{ field: 'drain_plug_type' }, { field: 'undercarriage_photos' }]
          ]
        },
        {
          id: 'tire_repair',
          title: 'Tire Repair Assessment',
          columns: 2,
          rows: [
            [{ field: 'tire_repair_status' }, { field: 'tire_repair_status_photos' }],
            [{ field: 'tire_repair_zones', colSpan: 2, showIf: { when: 'tire_repair_status', in: ['repairable', 'non_repairable'] } }]
          ]
        },
        {
          id: 'tpms_check',
          title: 'TPMS Check',
          columns: 2,
          rows: [
            [{ field: 'tpms_type' }, { field: 'tpms_type_photos' }],
            [{ field: 'tpms_zones', colSpan: 2, showIf: { when: 'tpms_type', eq: 'bad_sensor' } }]
          ]
        },
        {
          id: 'final_notes',
          title: 'Notes',
          columns: 1,
          rows: [
            [{ field: 'notes', colSpan: 1 }],
            [{ field: 'field_notes', colSpan: 1 }]
          ]
        }
      ]
    }
  ]
};

/**
 * UI Schemas for each inspection type
 */
export const UI_SCHEMAS: Record<string, InspectionTypeSchema> = {
  /**
   * Base schema - not used directly but extended by others
   */
  base: {
    id: 'base',
    title: 'Base Inspection',
    fields: [
      'user', 'date', 'location', 'vin', 'vehicle_details', 'mileage', 'mileage_photos',
      'dash_lights_photos', 'windshield_condition', 'windshield_condition_photos',
      'tpms_placard', 'state_inspection_status', 'state_inspection_month', 
      'state_inspection_date_code', 'state_inspection_status_photos',
      'washer_fluid', 'washer_fluid_photo',
      'tire_rotation', 'static_sticker', 'drain_plug_type', 'undercarriage_photos',
      'tire_repair_status', 'tire_repair_zones', 'tire_repair_status_photos',
      'tpms_type', 'tpms_zones', 'tpms_type_photos',
      'notes', 'field_notes'
    ],
    tabs: BASE_SCHEMA.tabs || [],
    draftKeyPrefix: 'baseDraft:',
    submitType: 'base',
    version: 1
  },

  /**
   * Quick Check - Comprehensive inspection with all fields
   */
  quick_check: {
    id: 'quick_check',
    title: 'Quick Check',
    extends: 'base',
    fields: [
      // Inherit base fields plus additional comprehensive fields
      'user', 'date', 'location', 'vin', 'vehicle_details', 'mileage', 'mileage_photos',
      'dash_lights_photos', 'windshield_condition', 'windshield_condition_photos',
      'wiper_blades', 'wiper_blades_front', 'wiper_blades_rear', 'wiper_blades_photos',
      'washer_squirters', 'washer_squirters_photos',
      'tpms_placard', 'state_inspection_status', 'state_inspection_month', 
      'state_inspection_date_code', 'state_inspection_status_photos',
      'washer_fluid', 'washer_fluid_photo',
      'engine_air_filter', 'engine_air_filter_photo',
      'battery_condition_main', 'battery_condition', 'battery_terminals',
      'battery_date_code', 'battery_photos', 'battery_positive_terminal_photos', 
      'battery_negative_terminal_photos', 'battery_date_code_photos',
      'tpms_tool_photo',
      'tire_tread', 'tire_comments', 'tire_dates',
      'front_brake_pads', 'rear_brake_pads', 'front_brakes', 'rear_brakes',
      'front_brake_pads_photos', 'rear_brake_pads_photos', 'tire_photos',
      'tire_rotation', 'static_sticker', 'drain_plug_type', 'undercarriage_photos',
      'tire_repair_status', 'tire_repair_zones', 'tire_repair_status_photos',
      'tpms_type', 'tpms_zones', 'tpms_type_photos',
      'notes', 'field_notes'
    ],
    tabs: [
      {
        id: 'info',
        title: 'Info',
        sections: [
          {
            id: 'basic_info',
            title: 'Basic Information',
            columns: 2,
            rows: [
              [{ field: 'user' }, { field: 'date' }],
              [{ field: 'location', colSpan: 2 }]
            ]
          },
          {
            id: 'vehicle_info',
            title: 'Vehicle Information',
            columns: 2,
            rows: [
              [{ field: 'vin', colSpan: 2 }],
              [{ field: 'vehicle_details', colSpan: 2 }],
              [{ field: 'mileage' }, { field: 'mileage_photos' }]
            ]
          }
        ]
      },
      {
        id: 'pulling',
        title: 'Pulling Into Bay',
        sections: [
          {
            id: 'dashboard',
            title: 'Dashboard Assessment',
            columns: 2,
            rows: [
              [{ field: 'dash_lights_photos', colSpan: 2 }]
            ]
          },
          {
            id: 'exterior_comprehensive',
            title: 'Comprehensive Exterior Check',
            columns: 2,
            rows: [
              [{ field: 'windshield_condition' }, { field: 'windshield_condition_photos' }],
              [{ field: 'wiper_blades', colSpan: 2 }],
              [{ field: 'wiper_blades_front' }, { field: 'wiper_blades_rear' }],
              [{ field: 'wiper_blades_photos', colSpan: 2 }],
              [{ field: 'washer_squirters' }, { field: 'washer_squirters_photos' }]
            ]
          }
        ]
      },
      {
        id: 'underhood',
        title: 'Underhood',
        sections: [
          {
            id: 'placards',
            title: 'Placards & Inspection',
            columns: 2,
            rows: [
              [{ field: 'tpms_placard', colSpan: 2 }],
              [{ field: 'state_inspection_status' }, { field: 'state_inspection_month' }],
              [{ field: 'state_inspection_date_code' }, { field: 'state_inspection_status_photos' }]
            ]
          },
          {
            id: 'fluids_comprehensive',
            title: 'Fluids & Filters',
            columns: 2,
            rows: [
              [{ field: 'washer_fluid' }, { field: 'washer_fluid_photo' }],
              [{ field: 'engine_air_filter' }, { field: 'engine_air_filter_photo' }]
            ]
          },
          {
            id: 'battery_system',
            title: 'Battery System',
            columns: 2,
            rows: [
              [{ field: 'battery_condition_main', colSpan: 2 }],
              [{ field: 'battery_condition', colSpan: 2 }],
              [{ field: 'battery_terminals', colSpan: 2 }],
              [{ field: 'battery_date_code' }, { field: 'battery_date_code_photos' }],
              [{ field: 'battery_photos', colSpan: 2 }],
              [{ field: 'battery_positive_terminal_photos' }, { field: 'battery_negative_terminal_photos' }]
            ]
          },
          {
            id: 'tpms_tools',
            title: 'TPMS Tools',
            columns: 2,
            rows: [
              [{ field: 'tpms_tool_photo', colSpan: 2 }]
            ]
          }
        ]
      },
      {
        id: 'tires',
        title: 'Tires & Brakes',
        sections: [
          {
            id: 'tire_assessment',
            title: 'Tire Assessment',
            columns: 1,
            rows: [
              [{ field: 'tire_tread' }],
              [{ field: 'tire_comments' }],
              [{ field: 'tire_dates' }],
              [{ field: 'tire_photos' }]
            ]
          },
          {
            id: 'brake_assessment',
            title: 'Brake Assessment',
            columns: 2,
            rows: [
              [{ field: 'front_brake_pads', colSpan: 2 }],
              [{ field: 'rear_brake_pads', colSpan: 2 }],
              [{ field: 'front_brakes' }, { field: 'rear_brakes' }],
              [{ field: 'front_brake_pads_photos' }, { field: 'rear_brake_pads_photos' }]
            ]
          },
          {
            id: 'additional_checks',
            title: 'Additional Checks',
            columns: 2,
            rows: [
              [{ field: 'tire_rotation' }, { field: 'static_sticker' }],
              [{ field: 'drain_plug_type' }, { field: 'undercarriage_photos' }]
            ]
          },
          {
            id: 'tire_repair',
            title: 'Tire Repair Assessment',
            columns: 2,
            rows: [
              [{ field: 'tire_repair_status' }, { field: 'tire_repair_status_photos' }],
              [{ field: 'tire_repair_zones', colSpan: 2, showIf: { when: 'tire_repair_status', in: ['repairable', 'non_repairable'] } }]
            ]
          },
          {
            id: 'tpms_check',
            title: 'TPMS Check',
            columns: 2,
            rows: [
              [{ field: 'tpms_type' }, { field: 'tpms_type_photos' }],
              [{ field: 'tpms_zones', colSpan: 2, showIf: { when: 'tpms_type', eq: 'bad_sensor' } }]
            ]
          },
          {
            id: 'final_notes',
            title: 'Notes',
            columns: 1,
            rows: [
              [{ field: 'notes', colSpan: 1 }],
              [{ field: 'field_notes', colSpan: 1 }]
            ]
          }
        ]
      }
    ],
    draftKeyPrefix: 'quickCheckDraft:',
    submitType: 'quick_check',
    version: 1
  },

  /**
   * No Check - Streamlined inspection with minimal fields
   */
  no_check: {
    id: 'no_check',
    title: 'No Check',
    extends: 'base',
    fields: [
      // Streamlined field set - only essential fields
      'user', 'date', 'vin', 'mileage', 'mileage_photos',
      'dash_lights_photos', 'windshield_condition', 'windshield_condition_photos',
      'tpms_placard', 'state_inspection_status', 'state_inspection_month', 
      'state_inspection_date_code', 'state_inspection_status_photos',
      'washer_fluid', 'washer_fluid_photo',
      'tire_rotation', 'static_sticker', 'drain_plug_type', 'undercarriage_photos',
      'tire_repair_status', 'tire_repair_zones', 'tire_repair_status_photos',
      'tpms_type', 'tpms_zones', 'tpms_type_photos',
      'notes'
    ],
    tabs: [
      {
        id: 'info',
        title: 'Info',
        sections: [
          {
            id: 'basic_info',
            title: 'Basic Information',
            columns: 2,
            rows: [
              [{ field: 'user' }, { field: 'date' }]
            ]
          },
          {
            id: 'vehicle_info_simple',
            title: 'Vehicle Information',
            columns: 2,
            rows: [
              [{ field: 'vin', colSpan: 2 }],
              [{ field: 'mileage' }, { field: 'mileage_photos' }]
            ]
          }
        ]
      },
      {
        id: 'pulling',
        title: 'Pulling Into Bay',
        sections: [
          {
            id: 'dashboard',
            title: 'Dashboard Assessment',
            columns: 2,
            rows: [
              [{ field: 'dash_lights_photos', colSpan: 2 }]
            ]
          },
          {
            id: 'exterior_basic',
            title: 'Basic Exterior Check',
            columns: 2,
            rows: [
              [{ field: 'windshield_condition' }, { field: 'windshield_condition_photos' }]
            ]
          }
        ]
      },
      {
        id: 'underhood',
        title: 'Underhood',
        sections: [
          {
            id: 'placards',
            title: 'Placards & Inspection',
            columns: 2,
            rows: [
              [{ field: 'tpms_placard', colSpan: 2 }],
              [{ field: 'state_inspection_status' }, { field: 'state_inspection_month' }],
              [{ field: 'state_inspection_date_code' }, { field: 'state_inspection_status_photos' }]
            ]
          },
          {
            id: 'fluids_basic',
            title: 'Basic Fluids',
            columns: 2,
            rows: [
              [{ field: 'washer_fluid' }, { field: 'washer_fluid_photo' }]
            ]
          }
        ]
      },
      {
        id: 'tires',
        title: 'Tires & Final',
        sections: [
          {
            id: 'basic_checks',
            title: 'Basic Checks',
            columns: 2,
            rows: [
              [{ field: 'tire_rotation' }, { field: 'static_sticker' }],
              [{ field: 'drain_plug_type' }, { field: 'undercarriage_photos' }]
            ]
          },
          {
            id: 'tire_repair',
            title: 'Tire Repair Assessment',
            columns: 2,
            rows: [
              [{ field: 'tire_repair_status' }, { field: 'tire_repair_status_photos' }],
              [{ field: 'tire_repair_zones', colSpan: 2, showIf: { when: 'tire_repair_status', in: ['repairable', 'non_repairable'] } }]
            ]
          },
          {
            id: 'tpms_check',
            title: 'TPMS Check',
            columns: 2,
            rows: [
              [{ field: 'tpms_type' }, { field: 'tpms_type_photos' }],
              [{ field: 'tpms_zones', colSpan: 2, showIf: { when: 'tpms_type', eq: 'bad_sensor' } }]
            ]
          },
          {
            id: 'final_notes',
            title: 'Notes',
            columns: 1,
            rows: [
              [{ field: 'notes', colSpan: 1 }]
            ]
          }
        ]
      }
    ],
    draftKeyPrefix: 'noCheckDraft:',
    submitType: 'no_check',
    version: 1
  },

  /**
   * VSI - Vehicle Safety Inspection
   */
  vsi: {
    id: 'vsi',
    title: 'VSI',
    extends: 'base',
    fields: [
      // Basic Info
      'user', 'date', 'vin', 'vehicle_details',
      
      // Pulling Into Bay
      'mileage', 'mileage_photos', 'dash_lights_photos', 'windshield_condition', 'wiper_blades', 'washer_squirters',
      
      // Underhood
      'vin', 'tpms_placard', 'state_inspection', 'washer_fluid', 'washer_fluid_photo',
      'engine_air_filter', 'engine_air_filter_photo', 'battery_condition', 
      'battery_photos', 'battery_date_code', 'drive_belt', 'drive_belt_photos',
      'engine_mounts', 'engine_mounts_photos', 'brake_fluid', 'brake_fluid_photos',
      'powersteering_fluid', 'powersteering_fluid_photos', 'coolant', 'coolant_photos',
      'radiator_end_caps', 'radiator_end_caps_photos', 'cooling_hoses', 'cooling_hoses_photos',
      
      // Tires & Final
      'passenger_front_tire', 'driver_front_tire', 'driver_rear_tire', 'passenger_rear_tire', 'spare_tire',
      'front_brakes', 'front_shock_struts', 'front_shock_struts_photos',
      'rear_brakes', 'front_brake_pads', 'rear_brake_pads', 'tire_photos', 'tire_tread', 'tire_comments', 'tire_dates',
      'rear_shock_struts', 'rear_shock_struts_photos', 'leaks', 'leaks_photos',
      'tire_rotation', 'static_sticker', 'drain_plug_type', 'undercarriage_photos',
      'tire_repair_status', 'tire_repair_zones', 'tire_repair_status_photos',
      'tpms_type', 'tpms_zones', 'tpms_type_photos',
      'notes'
    ],
    tabs: [
      {
        id: 'info',
        title: 'Info',
        sections: [
          {
            id: 'basic_info',
            title: 'Basic Information',
            columns: 2,
            rows: [
              [{ field: 'user' }, { field: 'date' }],
              [{ field: 'vin', colSpan: 2 }],
              [{ field: 'vehicle_details', colSpan: 2 }],
              [{ field: 'mileage', colSpan: 2 }]
            ]
          }
        ]
      },
      {
        id: 'pulling',
        title: 'Pulling Into Bay',
        sections: [
          {
            id: 'dashboard_exterior',
            title: 'Dashboard & Exterior Assessment',
            columns: 2,
            rows: [
              [{ field: 'dash_lights_photos', colSpan: 2 }],
              [{ field: 'windshield_condition' }, { field: 'wiper_blades' }],
              [{ field: 'washer_squirters', colSpan: 2 }]
            ]
          }
        ]
      },
      {
        id: 'underhood',
        title: 'Underhood',
        sections: [
          {
            id: 'placards_inspection',
            title: 'Placards & Inspection',
            columns: 2,
            rows: [
              [{ field: 'tpms_placard', colSpan: 2 }],
              [{ field: 'state_inspection_status' }, { field: 'state_inspection_month' }],
              [{ field: 'state_inspection_date_code', colSpan: 2 }]
            ]
          },
          {
            id: 'basic_underhood',
            title: 'Basic Underhood Checks',
            columns: 2,
            rows: [
              [{ field: 'washer_fluid' }, { field: 'washer_fluid_photo' }],
              [{ field: 'engine_air_filter' }, { field: 'engine_air_filter_photo' }],
              [{ field: 'battery_condition' }, { field: 'battery_photos' }],
              [{ field: 'battery_date_code', colSpan: 2 }]
            ]
          }
        ]
      },
      {
        id: 'tires_final',
        title: 'Tires & Final',
        sections: [
          {
            id: 'basic_checks',
            title: 'Basic Checks',
            columns: 2,
            rows: [
              [{ field: 'tire_rotation' }, { field: 'static_sticker' }],
              [{ field: 'drain_plug_type' }, { field: 'undercarriage_photos' }]
            ]
          },
          {
            id: 'tire_repair',
            title: 'Tire Repair Assessment',
            columns: 2,
            rows: [
              [{ field: 'tire_repair_status' }, { field: 'tire_repair_status_photos' }],
              [{ field: 'tire_repair_zones', colSpan: 2, showIf: { when: 'tire_repair_status', in: ['repairable', 'non_repairable'] } }]
            ]
          },
          {
            id: 'tpms_check',
            title: 'TPMS Check',
            columns: 2,
            rows: [
              [{ field: 'tpms_type' }, { field: 'tpms_type_photos' }],
              [{ field: 'tpms_zones', colSpan: 2, showIf: { when: 'tpms_type', eq: 'bad_sensor' } }]
            ]
          },
          {
            id: 'final_notes',
            title: 'Notes',
            columns: 1,
            rows: [
              [{ field: 'notes', colSpan: 1 }]
            ]
          }
        ]
      }
    ],
    draftKeyPrefix: 'vsiDraft:',
    submitType: 'vsi',
    version: 1
  }
};

/**
 * Get UI schema by ID
 */
export function getUISchema(schemaId: string): InspectionTypeSchema | undefined {
  return UI_SCHEMAS[schemaId];
}

/**
 * Get UI schema with inheritance resolved
 */
export function getResolvedUISchema(schemaId: string): InspectionTypeSchema | undefined {
  const schema = UI_SCHEMAS[schemaId];
  if (!schema) return undefined;

  // If no inheritance, return as-is
  if (!schema.extends) return schema;

  // Resolve inheritance
  const baseSchema = UI_SCHEMAS[schema.extends];
  if (!baseSchema) return schema;

  // Merge base schema with current schema
  return {
    ...baseSchema,
    ...schema,
    fields: [...(baseSchema.fields || []), ...(schema.fields || [])],
    tabs: schema.tabs || baseSchema.tabs || []
  };
}

/**
 * Get all available schema IDs (excluding base)
 */
export function getAvailableSchemaIds(): string[] {
  return Object.keys(UI_SCHEMAS).filter(id => id !== 'base');
}

/**
 * Validate schema structure
 */
export function validateSchema(schema: InspectionTypeSchema): string[] {
  const errors: string[] = [];

  if (!schema.id) errors.push('Schema ID is required');
  if (!schema.title) errors.push('Schema title is required');
  if (!schema.submitType) errors.push('Submit type is required');
  if (!schema.version) errors.push('Schema version is required');
  if (!Array.isArray(schema.fields)) errors.push('Fields must be an array');
  if (!Array.isArray(schema.tabs)) errors.push('Tabs must be an array');

  // Validate tabs structure
  schema.tabs?.forEach((tab, tabIndex) => {
    if (!tab.id) errors.push(`Tab ${tabIndex} missing ID`);
    if (!tab.title) errors.push(`Tab ${tabIndex} missing title`);
    if (!Array.isArray(tab.sections)) errors.push(`Tab ${tabIndex} sections must be an array`);

    tab.sections?.forEach((section, sectionIndex) => {
      if (!section.id) errors.push(`Tab ${tabIndex}, Section ${sectionIndex} missing ID`);
      if (!Array.isArray(section.rows)) errors.push(`Tab ${tabIndex}, Section ${sectionIndex} rows must be an array`);
    });
  });

  return errors;
}
