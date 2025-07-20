import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { LabelTemplate, LabelField, PAPER_SIZES } from '../types/labelTemplates';

export interface LabelData {
  [fieldName: string]: string;
}

export class LabelPdfGenerator {
  // Generate PDF from label template
  static async generateLabelPdf(
    template: LabelTemplate, 
    labelData: LabelData, 
    copies: number = 1
  ): Promise<Uint8Array> {
    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Get paper dimensions
      const paperConfig = PAPER_SIZES[template.paperSize];
      if (!paperConfig) {
        throw new Error(`Unknown paper size: ${template.paperSize}`);
      }

      // Convert mm to points (1 mm = 2.834645669 points)
      const mmToPoints = (mm: number) => mm * 2.834645669;
      const pageWidth = mmToPoints(paperConfig.width);
      const pageHeight = mmToPoints(paperConfig.height);

      // Generate the requested number of copies
      for (let copy = 0; copy < copies; copy++) {
        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        // Draw each field
        for (const field of template.fields) {
          const value = this.getFieldValue(field, labelData);
          if (!value) continue;

          // Calculate position (convert from screen pixels to PDF points)
          // Use consistent canvas dimensions like the live preview
          const canvasWidth = 400;
          const canvasHeight = Math.round((paperConfig.height / paperConfig.width) * canvasWidth);
          const scaleX = pageWidth / canvasWidth;
          const scaleY = pageHeight / canvasHeight;
          
          // Select font based on field properties
          const selectedFont = field.fontFamily?.includes('bold') || field.fontFamily?.includes('Bold') 
            ? boldFont 
            : font;
          
          const fontSize = field.fontSize || 10;
          
          // Calculate text width for alignment
          const textWidth = selectedFont.widthOfTextAtSize(value, fontSize);
          
          // Calculate base position
          let x = field.position.x * scaleX;
          
          // Adjust x position based on text alignment
          switch (field.textAlign) {
            case 'center':
              x = x - (textWidth / 2);
              break;
            case 'right':
              x = x - textWidth;
              break;
            case 'left':
            default:
              // x remains as is for left alignment
              break;
          }
          
          // PDF coordinates are bottom-left origin, so we need to flip Y
          const y = pageHeight - (field.position.y * scaleY) - fontSize;

          // Draw text
          page.drawText(value, {
            x,
            y,
            size: fontSize,
            font: selectedFont,
            color: this.parseColor(field.color || '#000000'),
          });
        }
      }

      // Serialize the PDF
      const pdfBytes = await pdfDoc.save();
      return pdfBytes;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF');
    }
  }

  // Generate preview image (as base64 data URL)
  static async generatePreviewImage(template: LabelTemplate, labelData: LabelData): Promise<string> {
    try {
      // Create a canvas element
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      // Set canvas size to consistent dimensions like the live preview
      const paperConfig = PAPER_SIZES[template.paperSize];
      const canvasWidth = 400;
      const canvasHeight = Math.round((paperConfig.height / paperConfig.width) * canvasWidth);
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Clear canvas with white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw border
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);

      // Draw each field
      for (const field of template.fields) {
        const value = this.getFieldValue(field, labelData);
        if (!value) continue;

        // Set font properties
        ctx.font = `${field.fontSize || 10}px ${field.fontFamily || 'Arial'}`;
        ctx.fillStyle = field.color || '#000000';
        ctx.textAlign = field.textAlign || 'left';

        // Draw text with proper alignment
        ctx.fillText(value, field.position.x, field.position.y + (field.fontSize || 10));
      }

      // Convert canvas to data URL
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error generating preview:', error);
      throw new Error('Failed to generate preview');
    }
  }

  // Get field value from label data or use default
  private static getFieldValue(field: LabelField, labelData: LabelData): string {
    // First check if we have actual data for this field
    if (labelData[field.name]) {
      return labelData[field.name];
    }

    // Use preview value if available
    if (field.value) {
      return field.value;
    }

    // Generate sample data based on field name
    return this.getSampleValue(field.name);
  }

  // Generate sample values for preview
  private static getSampleValue(fieldName: string): string {
    const sampleData: { [key: string]: string } = {
      'Label Name': 'Sample Label',
      'Created By': 'John Doe',
      'Created Date': new Date().toLocaleDateString(),
      'Invoice #': 'INV-2024-001',
      'Tire Size': '225/65R17',
      'Part Number': 'PN-123456',
      'Vendor Part Number': 'VPN-789',
      'Vendor': 'ABC Supply Co.',
      'Bin/Location': 'A1-B2',
      'Copies to be Printed': '1'
    };

    return sampleData[fieldName] || fieldName;
  }

  // Parse color string to PDF-lib color
  private static parseColor(colorString: string) {
    // Remove # if present
    const hex = colorString.replace('#', '');
    
    // Parse hex color
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    
    return rgb(r, g, b);
  }

  // Utility to download PDF
  static downloadPdf(pdfBytes: Uint8Array, filename: string = 'label.pdf') {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  // Utility to open PDF in new tab
  static openPdfInNewTab(pdfBytes: Uint8Array) {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }
} 