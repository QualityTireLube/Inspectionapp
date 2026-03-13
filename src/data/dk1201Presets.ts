import { LabelTemplate, LabelField } from '../types/labelTemplates';
import { v4 as uuidv4 } from 'uuid';

// Convert mm to pixels (assuming 96 DPI: 1 inch = 25.4mm = 96px)
const mmToPixels = (mm: number) => Math.round((mm / 25.4) * 96);

// DK1201 Paper size: 29mm wide x 90mm tall (narrow and tall)
// But display rotated 90° for landscape preview (left-to-right viewing)
const DK1201_DIMENSIONS = {
  width: mmToPixels(29),   // 109 pixels (actual paper width)
  height: mmToPixels(90),  // 340 pixels (actual paper height)
  physicalWidth: 29,       // mm (actual paper width)
  physicalHeight: 90       // mm (actual paper height)
};

// Helper function to create horizontal fields for DK1201 (normal left-to-right text)
const createHorizontalField = (name: string, xPosition: number, yPosition: number, fontSize: number = 10): LabelField => ({
  id: uuidv4(),
  name,
  position: { x: xPosition, y: yPosition },
  fontSize,
  fontFamily: 'Arial',
  textAlign: 'left',
  color: '#000000',
  value: name,
  rotation: 0, // No rotation - normal horizontal text
  showInForm: true
});

// DK1201 Specific Label Templates
export const dk1201Presets: LabelTemplate[] = [
  // Basic DK1201 Address Label
  {
    id: uuidv4(),
    labelName: 'DK1201 Address Label',
    fields: [
      createHorizontalField('Company Name', 10, 20, 12),
      createHorizontalField('Address Line 1', 10, 50, 10),
      createHorizontalField('Address Line 2', 10, 80, 10),
      createHorizontalField('City, State ZIP', 10, 110, 10),
      createHorizontalField('Phone Number', 10, 140, 9)
    ],
    paperSize: 'DK1201',
    width: DK1201_DIMENSIONS.width,
    height: DK1201_DIMENSIONS.height,
    copies: 1,
    archived: false,
    createdBy: 'System',
    createdDate: new Date().toISOString(),
    canvasRotation: 90 // Rotate 90° for landscape preview (29mm becomes width in preview)
  },

  // DK1201 Product Label
  {
    id: uuidv4(),
    labelName: 'DK1201 Product Label',
    fields: [
      createHorizontalField('Product Name', 10, 20, 11),
      createHorizontalField('SKU/Part Number', 10, 50, 10),
      createHorizontalField('Price', 10, 80, 12),
      createHorizontalField('Barcode/QR', 10, 110, 9),
      createHorizontalField('Date', 10, 140, 8)
    ],
    paperSize: 'DK1201',
    width: DK1201_DIMENSIONS.width,
    height: DK1201_DIMENSIONS.height,
    copies: 1,
    archived: false,
    createdBy: 'System',
    createdDate: new Date().toISOString(),
    canvasRotation: 90 // Rotate 90° for landscape preview
  },

  // DK1201 Inventory Label
  {
    id: uuidv4(),
    labelName: 'DK1201 Inventory Label',
    fields: [
      createHorizontalField('Item Name', 10, 20, 11),
      createHorizontalField('Location/Bin', 10, 50, 10),
      createHorizontalField('Quantity', 10, 80, 10),
      createHorizontalField('Date Added', 10, 110, 9),
      createHorizontalField('Notes', 10, 140, 8)
    ],
    paperSize: 'DK1201',
    width: DK1201_DIMENSIONS.width,
    height: DK1201_DIMENSIONS.height,
    copies: 1,
    archived: false,
    createdBy: 'System',
    createdDate: new Date().toISOString(),
    canvasRotation: 90 // Rotate 90° for landscape preview
  },

  // DK1201 Name Badge
  {
    id: uuidv4(),
    labelName: 'DK1201 Name Badge',
    fields: [
      createHorizontalField('HELLO', 10, 20, 8),
      createHorizontalField('my name is', 10, 40, 8),
      createHorizontalField('Name', 10, 70, 14),
      createHorizontalField('Title/Department', 10, 110, 9),
      createHorizontalField('Company', 10, 140, 8)
    ],
    paperSize: 'DK1201',
    width: DK1201_DIMENSIONS.width,
    height: DK1201_DIMENSIONS.height,
    copies: 1,
    archived: false,
    createdBy: 'System',
    createdDate: new Date().toISOString(),
    canvasRotation: 90 // Rotate 90° for landscape preview
  },

  // DK1201 Simple Text Label
  {
    id: uuidv4(),
    labelName: 'DK1201 Simple Text Label',
    fields: [
      createHorizontalField('Main Text', 10, 50, 14),
      createHorizontalField('Subtitle', 10, 100, 10),
      createHorizontalField('Date', 10, 150, 9)
    ],
    paperSize: 'DK1201',
    width: DK1201_DIMENSIONS.width,
    height: DK1201_DIMENSIONS.height,
    copies: 1,
    archived: false,
    createdBy: 'System',
    createdDate: new Date().toISOString(),
    canvasRotation: 90 // Rotate 90° for landscape preview
  }
];

// Helper functions to access DK1201 presets
export const getDK1201Presets = (): LabelTemplate[] => {
  return dk1201Presets;
};

export const getDK1201PresetByName = (name: string): LabelTemplate | undefined => {
  return dk1201Presets.find(preset => 
    preset.labelName.toLowerCase().includes(name.toLowerCase())
  );
};

// Get DK1201 paper dimensions for reference
export const getDK1201Dimensions = () => DK1201_DIMENSIONS;

// Function to create a new DK1201 template with default settings
export const createDK1201Template = (labelName: string, fields: LabelField[]): LabelTemplate => ({
  id: uuidv4(),
  labelName,
  fields,
  paperSize: 'DK1201',
  width: DK1201_DIMENSIONS.width,
  height: DK1201_DIMENSIONS.height,
  copies: 1,
  archived: false,
  createdBy: 'User',
  createdDate: new Date().toISOString(),
  canvasRotation: 90 // Rotate 90° for landscape preview of tall label
});

export default dk1201Presets; 