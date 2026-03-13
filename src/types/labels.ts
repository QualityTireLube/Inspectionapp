import { LabelTemplate } from './labelTemplates';
import { LabelData } from '../services/labelPdfGenerator';

export interface GeneratedLabel {
  id: string;
  templateId: string;
  templateName: string;
  labelData: LabelData;
  createdBy: string;
  createdDate: string;
  lastPrintedDate?: string;
  printCount: number;
  archived: boolean;
  archivedBy?: string;
  archivedDate?: string;
  pdfBlob?: Blob; // Optional: store the generated PDF
  // New properties for restocking
  restocking?: boolean;
  restockingDate?: string;
  locationId?: string; // Added for location filtering
}

export interface CreateGeneratedLabelRequest {
  templateId: string;
  templateName: string;
  labelData: LabelData;
  createdBy: string;
  pdfBlob?: Blob;
  locationId?: string; // User's location ID for location-specific filtering
} 