import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import { StaticSticker, StickerSettings } from '../types/stickers';

export class PDFGeneratorService {
  static async generateStickerPDF(sticker: StaticSticker, settings: StickerSettings, openInNewTab: boolean = false): Promise<void> {
    try {
      const pdf = new jsPDF({
        orientation: settings.paperSize.width > settings.paperSize.height ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [settings.paperSize.width, settings.paperSize.height]
      });

      // Set font
      pdf.setFont(settings.layout.fontFamily.toLowerCase().replace(/\s+/g, ''), 'normal');

      // Calculate available space with margins
      const availableWidth = settings.paperSize.width - settings.layout.margins.left - settings.layout.margins.right;
      const availableHeight = settings.paperSize.height - settings.layout.margins.top - settings.layout.margins.bottom;

      // Function to replace placeholders in content
      const replaceContent = (content: string): string => {
        const serviceDate = new Date(sticker.date).toLocaleDateString();
        const serviceMileage = (sticker.mileage + sticker.oilType.mileageInterval).toLocaleString();
        
        // Generate decoded details string from sticker data
        let decodedDetailsString = '';
        if (sticker.decodedDetails && typeof sticker.decodedDetails === 'object' && !sticker.decodedDetails.error) {
          const details = sticker.decodedDetails as any; // Cast to any to access NHTSA properties
          const getValue = (key: string) => {
            if (details[key] && details[key] !== 'Not Available' && details[key] !== '') {
              return details[key];
            }
            return null;
          };
          
          const year = getValue('ModelYear') || getValue('year');
          const make = getValue('Make') || getValue('make');
          const model = getValue('Model') || getValue('model');
          const displacement = getValue('DisplacementL') || getValue('engineL');
          const cylinders = getValue('EngineCylinders') || getValue('engineCylinders');
          
          // Build the decoded details string
          const parts = [];
          if (year) parts.push(year);
          if (make) parts.push(make);
          if (model) parts.push(model);
          if (displacement) parts.push(`${displacement}L`);
          if (cylinders && !cylinders.includes('Not Available')) parts.push(`${cylinders} cyl`);
          
          decodedDetailsString = parts.join(' ');
        }
        
        return content
          .replace('{serviceDate}', serviceDate)
          .replace('{serviceMileage}', serviceMileage)
          .replace('{oilType}', sticker.oilType.name)
          .replace('{companyName}', sticker.companyName)
          .replace('{address}', sticker.address)
          .replace('{decodedDetails}', decodedDetailsString);
      };

      // Add dynamic elements
      for (const element of settings.layout.elements) {
        if (!element.visible) continue;

        const actualFontSize = settings.layout.fontSize * element.fontSize;
        pdf.setFontSize(actualFontSize);
        
        // Set font weight
        pdf.setFont(
          settings.layout.fontFamily.toLowerCase().replace(/\s+/g, ''), 
          element.fontWeight === 'bold' ? 'bold' : 'normal'
        );

        // Calculate position
        const x = settings.layout.margins.left + (element.position.x / 100) * availableWidth;
        const y = settings.layout.margins.top + (element.position.y / 100) * availableHeight;

        const text = replaceContent(element.content);

        // Handle text alignment
        const align = element.textAlign as 'left' | 'center' | 'right';
        pdf.text(text, x, y, { align });
      }

      // Generate and add QR code
      const qrCodeDataURL = await QRCode.toDataURL(sticker.qrCode, {
        width: settings.layout.qrCodeSize * 10, // Higher resolution for PDF
        margin: 0
      });

      // Calculate QR code position
      const qrX = settings.layout.margins.left + (settings.layout.qrCodePosition.x / 100) * availableWidth - (settings.layout.qrCodeSize / 2);
      const qrY = settings.layout.margins.top + (settings.layout.qrCodePosition.y / 100) * availableHeight - (settings.layout.qrCodeSize / 2);

      pdf.addImage(
        qrCodeDataURL,
        'PNG',
        qrX,
        qrY,
        settings.layout.qrCodeSize,
        settings.layout.qrCodeSize
      );

      // Save or open the PDF
      const fileName = `oil-change-sticker-${sticker.vin}-${new Date().getTime()}`;
      
      if (openInNewTab) {
        // Open PDF in new tab/window
        const pdfDataUri = pdf.output('dataurlnewwindow');
        // Alternative method that gives more control:
        // const pdfBlob = pdf.output('blob');
        // const pdfUrl = URL.createObjectURL(pdfBlob);
        // window.open(pdfUrl, '_blank');
      } else {
        // Download the PDF
        pdf.save(fileName);
      }

    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF');
    }
  }

  static async generateMultipleStickersPDF(stickers: StaticSticker[], settings: StickerSettings, openInNewTab: boolean = false): Promise<void> {
    try {
      const pdf = new jsPDF({
        orientation: settings.paperSize.width > settings.paperSize.height ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [settings.paperSize.width, settings.paperSize.height],
      });

      // Function to replace placeholders in content
      const replaceContent = (content: string, sticker: StaticSticker): string => {
        const serviceDate = new Date(sticker.date).toLocaleDateString();
        const serviceMileage = (sticker.mileage + sticker.oilType.mileageInterval).toLocaleString();
        
        // Generate decoded details string from sticker data
        let decodedDetailsString = '';
        if (sticker.decodedDetails && typeof sticker.decodedDetails === 'object' && !sticker.decodedDetails.error) {
          const details = sticker.decodedDetails as any; // Cast to any to access NHTSA properties
          const getValue = (key: string) => {
            if (details[key] && details[key] !== 'Not Available' && details[key] !== '') {
              return details[key];
            }
            return null;
          };
          
          const year = getValue('ModelYear') || getValue('year');
          const make = getValue('Make') || getValue('make');
          const model = getValue('Model') || getValue('model');
          const displacement = getValue('DisplacementL') || getValue('engineL');
          const cylinders = getValue('EngineCylinders') || getValue('engineCylinders');
          
          // Build the decoded details string
          const parts = [];
          if (year) parts.push(year);
          if (make) parts.push(make);
          if (model) parts.push(model);
          if (displacement) parts.push(`${displacement}L`);
          if (cylinders && !cylinders.includes('Not Available')) parts.push(`${cylinders} cyl`);
          
          decodedDetailsString = parts.join(' ');
        }
        
        return content
          .replace('{serviceDate}', serviceDate)
          .replace('{serviceMileage}', serviceMileage)
          .replace('{oilType}', sticker.oilType.name)
          .replace('{companyName}', sticker.companyName)
          .replace('{address}', sticker.address)
          .replace('{decodedDetails}', decodedDetailsString);
      };

      // Calculate available space with margins
      const availableWidth = settings.paperSize.width - settings.layout.margins.left - settings.layout.margins.right;
      const availableHeight = settings.paperSize.height - settings.layout.margins.top - settings.layout.margins.bottom;

      for (let i = 0; i < stickers.length; i++) {
        if (i > 0) {
          pdf.addPage();
        }
        
        const sticker = stickers[i];

        // Set font
        pdf.setFont(settings.layout.fontFamily.toLowerCase().replace(/\s+/g, ''), 'normal');

        // Add dynamic elements
        for (const element of settings.layout.elements) {
          if (!element.visible) continue;

          const actualFontSize = settings.layout.fontSize * element.fontSize;
          pdf.setFontSize(actualFontSize);
          
          // Set font weight
          pdf.setFont(
            settings.layout.fontFamily.toLowerCase().replace(/\s+/g, ''), 
            element.fontWeight === 'bold' ? 'bold' : 'normal'
          );

          // Calculate position
          const x = settings.layout.margins.left + (element.position.x / 100) * availableWidth;
          const y = settings.layout.margins.top + (element.position.y / 100) * availableHeight;

          const text = replaceContent(element.content, sticker);

          // Handle text alignment
          const align = element.textAlign as 'left' | 'center' | 'right';
          pdf.text(text, x, y, { align });
        }

        // Generate and add QR code
        const qrCodeDataURL = await QRCode.toDataURL(sticker.qrCode, {
          width: settings.layout.qrCodeSize * 10, // Higher resolution for PDF
          margin: 0
        });

        // Calculate QR code position
        const qrX = settings.layout.margins.left + (settings.layout.qrCodePosition.x / 100) * availableWidth - (settings.layout.qrCodeSize / 2);
        const qrY = settings.layout.margins.top + (settings.layout.qrCodePosition.y / 100) * availableHeight - (settings.layout.qrCodeSize / 2);

        pdf.addImage(
          qrCodeDataURL,
          'PNG',
          qrX,
          qrY,
          settings.layout.qrCodeSize,
          settings.layout.qrCodeSize
        );

        // Mark as printed
        sticker.printed = true;
        sticker.lastUpdated = new Date().toISOString();
      }

      const fileName = `oil-change-stickers-batch-${new Date().getTime()}`;
      
      if (openInNewTab) {
        // Open PDF in new tab/window
        const pdfDataUri = pdf.output('dataurlnewwindow');
      } else {
        // Download the PDF
        pdf.save(fileName);
      }

    } catch (error) {
      console.error('Error generating batch PDF:', error);
      throw new Error('Failed to generate batch PDF');
    }
  }

  // New convenience methods for opening PDFs
  static async openStickerPDF(sticker: StaticSticker, settings: StickerSettings): Promise<void> {
    return this.generateStickerPDF(sticker, settings, true);
  }

  static async openMultipleStickersPDF(stickers: StaticSticker[], settings: StickerSettings): Promise<void> {
    return this.generateMultipleStickersPDF(stickers, settings, true);
  }
} 