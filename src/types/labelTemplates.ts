export interface LabelField {
  id: string;
  name: string;
  position: { x: number; y: number };
  fontSize: number;
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right';
  color: string;
  value?: string; // For preview purposes
  showInForm?: boolean; // Whether this field appears in the label creation form
  rotation?: number; // Text rotation in degrees (0-360)
}

export interface LabelTemplate {
  id: string;
  labelName: string;
  fields: LabelField[];
  paperSize: 'Brother-QL800' | 'Dymo-TwinTurbo' | '29mmx90mm' | 'Godex-200i' | 'DK1201' | 'DK221' | 'Custom';
  width: number; // in pixels
  height: number; // in pixels
  copies: number;
  archived: boolean;
  createdBy: string;
  createdDate: string;
  updatedDate?: string;
  // Add custom paper size properties
  customWidth?: number;
  customHeight?: number;
  customUnit?: 'mm' | 'inch';
  // Canvas orientation/rotation
  canvasRotation?: number;
  // Additional properties for the Labels page
  category?: string;
  version?: string;
  is_active?: boolean;
  lastUsed?: string;
  design_data?: any;
  print_settings?: any;
}

export interface PaperSizeConfig {
  name: string;
  width: number;
  height: number;
  unit: 'mm' | 'inch';
  custom?: boolean;
}

export const PAPER_SIZES: Record<string, PaperSizeConfig> = {
  'Brother-QL800': {
    name: 'Brother QL-800',
    width: 62,
    height: 29,
    unit: 'mm'
  },
  'Dymo-TwinTurbo': {
    name: 'Dymo Twin Turbo',
    width: 89,
    height: 36,
    unit: 'mm'
  },
  '29mmx90mm': {
    name: 'Brother DK1201 (90mm x 29mm)',
    width: 90,
    height: 29,
    unit: 'mm'
  },
  'Godex-200i': {
    name: 'Godex 200i (1.8125" x 2.5")',
    width: 1.8125,
    height: 2.5,
    unit: 'inch'
  },
  'DK1201': {
    name: 'Brother DK1201',
    width: 29,
    height: 90,
    unit: 'mm'
  },
  'DK221': {
    name: 'Brother DK221',
    width: 23,
    height: 23,
    unit: 'mm'
  },
  'Custom': {
    name: 'Custom Size',
    width: 62,
    height: 29,
    unit: 'mm',
    custom: true
  }
};

export const AVAILABLE_FIELDS = [
  'Label Name',
  'Created By',
  'Created Date',
  'Invoice #',
  'Tire Size',
  'Part Number',
  'Vendor',
  'Bin/Location',
  'Copies to be Printed'
];

export interface CreateLabelRequest {
  labelName: string;
  fields: LabelField[];
  paperSize: 'Brother-QL800' | 'Dymo-TwinTurbo' | '29mmx90mm' | 'Godex-200i' | 'DK1201' | 'DK221' | 'Custom';
  width: number;
  height: number;
  copies: number;
  createdBy: string;
  customWidth?: number;
  customHeight?: number;
  customUnit?: 'mm' | 'inch';
}

export interface UpdateLabelRequest extends Partial<CreateLabelRequest> {
  id: string;
} 