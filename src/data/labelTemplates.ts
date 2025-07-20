import { LabelTemplate, LabelField } from '../types/labelTemplates';
import { v4 as uuidv4 } from 'uuid';

// Helper function to create a field with consistent styling
const createField = (name: string, yPosition: number): LabelField => ({
  id: uuidv4(),
  name,
  position: { x: 10, y: yPosition },
  fontSize: 10,
  fontFamily: 'Arial',
  textAlign: 'left',
  color: '#000000',
  value: name // Default preview value
});

// Convert inches to pixels (assuming 96 DPI)
const inchesToPixels = (inches: number) => Math.round(inches * 96);

// Paper size for 1.1" x 3.5" labels
const CUSTOM_PAPER_SIZE = {
  width: inchesToPixels(3.5), // 336 pixels
  height: inchesToPixels(1.1)  // 106 pixels
};

// Predefined label templates
export const labelTemplates: LabelTemplate[] = [
  // TIRE TEMPLATES
  {
    id: uuidv4(),
    labelName: 'Tire Check-In',
    fields: [
      createField('Created By', 15),
      createField('Created Date', 35),
      createField('Invoice #', 55),
      createField('Tire Size', 75),
      createField('Copies to be Printed', 95)
    ],
    paperSize: 'Brother-QL800' as any, // Will need to add custom size to types
    width: CUSTOM_PAPER_SIZE.width,
    height: CUSTOM_PAPER_SIZE.height,
    copies: 1,
    archived: false,
    createdBy: 'System',
    createdDate: new Date().toISOString()
  },
  
  {
    id: uuidv4(),
    labelName: 'Tires Restock',
    fields: [
      createField('Created By', 15),
      createField('Created Date', 35),
      createField('Tire Size', 55),
      createField('Bin/Location', 75),
      createField('Copies to be Printed', 95)
    ],
    paperSize: 'Brother-QL800' as any,
    width: CUSTOM_PAPER_SIZE.width,
    height: CUSTOM_PAPER_SIZE.height,
    copies: 1,
    archived: false,
    createdBy: 'System',
    createdDate: new Date().toISOString()
  },
  
  {
    id: uuidv4(),
    labelName: 'Tire Completed',
    fields: [
      createField('Created By', 15),
      createField('Created Date', 35),
      createField('Invoice #', 55),
      createField('Tire Size', 75),
      createField('Copies to be Printed', 95)
    ],
    paperSize: 'Brother-QL800' as any,
    width: CUSTOM_PAPER_SIZE.width,
    height: CUSTOM_PAPER_SIZE.height,
    copies: 1,
    archived: false,
    createdBy: 'System',
    createdDate: new Date().toISOString()
  },
  
  {
    id: uuidv4(),
    labelName: 'Tire Warranty',
    fields: [
      createField('Created By', 15),
      createField('Created Date', 35),
      createField('Invoice #', 55),
      createField('Tire Size', 75),
      createField('Copies to be Printed', 95)
    ],
    paperSize: 'Brother-QL800' as any,
    width: CUSTOM_PAPER_SIZE.width,
    height: CUSTOM_PAPER_SIZE.height,
    copies: 1,
    archived: false,
    createdBy: 'System',
    createdDate: new Date().toISOString()
  },
  
  {
    id: uuidv4(),
    labelName: 'Tire Return',
    fields: [
      createField('Created By', 15),
      createField('Created Date', 35),
      createField('Tire Size', 55),
      createField('Copies to be Printed', 75)
    ],
    paperSize: 'Brother-QL800' as any,
    width: CUSTOM_PAPER_SIZE.width,
    height: CUSTOM_PAPER_SIZE.height,
    copies: 1,
    archived: false,
    createdBy: 'System',
    createdDate: new Date().toISOString()
  },
  
  // PARTS TEMPLATES
  {
    id: uuidv4(),
    labelName: 'Parts Check-In',
    fields: [
      createField('Created By', 10),
      createField('Created Date', 25),
      createField('Invoice #', 40),
      createField('Part Number', 55),
      createField('Vendor Part Number', 70),
      createField('Copies to be Printed', 85)
    ],
    paperSize: 'Brother-QL800' as any,
    width: CUSTOM_PAPER_SIZE.width,
    height: CUSTOM_PAPER_SIZE.height,
    copies: 1,
    archived: false,
    createdBy: 'System',
    createdDate: new Date().toISOString()
  },
  
  {
    id: uuidv4(),
    labelName: 'Parts Restock',
    fields: [
      createField('Created By', 10),
      createField('Created Date', 25),
      createField('Part Number', 40),
      createField('Vendor Part Number', 55),
      createField('Bin/Location', 70),
      createField('Copies to be Printed', 85)
    ],
    paperSize: 'Brother-QL800' as any,
    width: CUSTOM_PAPER_SIZE.width,
    height: CUSTOM_PAPER_SIZE.height,
    copies: 1,
    archived: false,
    createdBy: 'System',
    createdDate: new Date().toISOString()
  },
  
  {
    id: uuidv4(),
    labelName: 'Parts Warranty',
    fields: [
      createField('Created By', 15),
      createField('Created Date', 35),
      createField('Invoice #', 55),
      createField('Part Number', 75),
      createField('Vendor', 95),
      createField('Copies to be Printed', 115)
    ],
    paperSize: 'Brother-QL800' as any,
    width: CUSTOM_PAPER_SIZE.width,
    height: CUSTOM_PAPER_SIZE.height,
    copies: 1,
    archived: false,
    createdBy: 'System',
    createdDate: new Date().toISOString()
  },
  
  {
    id: uuidv4(),
    labelName: 'Parts Return',
    fields: [
      createField('Created By', 15),
      createField('Created Date', 35),
      createField('Invoice #', 55),
      createField('Part Number', 75),
      createField('Vendor', 95)
    ],
    paperSize: 'Brother-QL800' as any,
    width: CUSTOM_PAPER_SIZE.width,
    height: CUSTOM_PAPER_SIZE.height,
    copies: 1,
    archived: false,
    createdBy: 'System',
    createdDate: new Date().toISOString()
  }
];

// Helper function to get templates by category
export const getTireTemplates = (): LabelTemplate[] => {
  return labelTemplates.filter(template => 
    template.labelName.toLowerCase().includes('tire')
  );
};

export const getPartsTemplates = (): LabelTemplate[] => {
  return labelTemplates.filter(template => 
    template.labelName.toLowerCase().includes('parts')
  );
};

// Helper function to get template by name
export const getTemplateByName = (name: string): LabelTemplate | undefined => {
  return labelTemplates.find(template => 
    template.labelName.toLowerCase() === name.toLowerCase()
  );
};

// Function to import these templates into the system
export const importPredefinedTemplates = async (): Promise<void> => {
  // This would be used to bulk import templates into your system
  // Implementation would depend on your API structure
  console.log('Predefined templates ready for import:', labelTemplates.length);
};

export default labelTemplates; 