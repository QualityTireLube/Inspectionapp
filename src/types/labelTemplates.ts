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
}

export interface LabelTemplate {
  id: string;
  labelName: string;
  fields: LabelField[];
  paperSize: 'Brother-QL800' | 'Dymo-TwinTurbo' | '29mmx90mm';
  width: number; // in pixels
  height: number; // in pixels
  copies: number;
  archived: boolean;
  createdBy: string;
  createdDate: string;
  updatedDate?: string;
}

export interface PaperSizeConfig {
  name: string;
  width: number;
  height: number;
  unit: 'mm' | 'inch';
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
  paperSize: 'Brother-QL800' | 'Dymo-TwinTurbo' | '29mmx90mm';
  width: number;
  height: number;
  copies: number;
  createdBy: string;
}

export interface UpdateLabelRequest extends Partial<CreateLabelRequest> {
  id: string;
} 