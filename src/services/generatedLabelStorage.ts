import { GeneratedLabel, CreateGeneratedLabelRequest } from '../types/labels';
import { 
  getGeneratedLabels, 
  createGeneratedLabel, 
  updateGeneratedLabel as apiUpdateGeneratedLabel, 
  deleteGeneratedLabel, 
  archiveGeneratedLabel,
  recordLabelPrint,
  updateLabelRestocking,
  restoreGeneratedLabel 
} from './api-stickers-labels';

const STORAGE_KEY = 'quickcheck_generated_labels';

export class GeneratedLabelStorageService {
  // Helper method to convert Blob to base64
  private static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get just the base64 data
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Helper method to convert base64 back to Blob
  private static base64ToBlob(base64Data: string): Blob {
    // Strip potential data URL prefix
    const cleaned = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const byteCharacters = atob(cleaned);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: 'application/pdf' });
  }

  // Get all generated labels (using database API)
  static async getGeneratedLabels(): Promise<GeneratedLabel[]> {
    try {
      const labels = await getGeneratedLabels();

      // Convert stored base64 data back to Blob objects (safely)
      return labels.map((label: any) => {
        let pdfBlob: Blob | null = null;
        if (label.pdfBase64 && typeof label.pdfBase64 === 'string') {
          try {
            pdfBlob = this.base64ToBlob(label.pdfBase64);
          } catch (e) {
            console.warn('Skipping invalid pdfBase64 for label', label.id);
            pdfBlob = null;
          }
        }
        return {
          ...label,
          pdfBlob
        };
      });
    } catch (error) {
      console.error('Error loading generated labels from database:', error);
      return [];
    }
  }

  // Get active (non-archived) generated labels
  static async getActiveGeneratedLabels(locationFilter?: string): Promise<GeneratedLabel[]> {
    try {
      const labels = await this.getGeneratedLabels(); // Use local method that handles blob conversion
      const filteredLabels = locationFilter 
        ? labels.filter(label => label.locationId === locationFilter)
        : labels;
      return filteredLabels.filter(label => !label.archived);
    } catch (error) {
      console.error('Error fetching active generated labels from database:', error);
      return [];
    }
  }

  // Get archived generated labels
  static async getArchivedGeneratedLabels(): Promise<GeneratedLabel[]> {
    try {
      const labels = await this.getGeneratedLabels();
      return labels.filter(label => label.archived);
    } catch (error) {
      console.error('Error loading archived generated labels:', error);
      return [];
    }
  }

  // Save a new generated label
  static async saveGeneratedLabel(labelRequest: CreateGeneratedLabelRequest): Promise<GeneratedLabel> {
    // Convert blob to base64 for database storage
    let pdfBase64 = '';
    if (labelRequest.pdfBlob) {
      try {
        pdfBase64 = await this.blobToBase64(labelRequest.pdfBlob);
      } catch (error) {
        console.error('Error converting PDF blob to base64:', error);
      }
    }

    const newLabel: GeneratedLabel = {
      id: Date.now().toString(),
      templateId: labelRequest.templateId,
      templateName: labelRequest.templateName,
      labelData: labelRequest.labelData,
      createdBy: labelRequest.createdBy,
      createdDate: new Date().toISOString(),
      printCount: 1, // First generation counts as a print
      archived: false,
      lastPrintedDate: new Date().toISOString(),
      pdfBlob: labelRequest.pdfBlob, // Keep for immediate use
      locationId: labelRequest.locationId // Add location for filtering
    };

    try {
      // Send to database with base64 PDF data
      const labelForDatabase = {
        ...newLabel,
        pdfBase64: pdfBase64,
        pdfBlob: undefined // Don't send blob over HTTP
      };
      
      await createGeneratedLabel(labelForDatabase);
      console.log('✅ Label saved to database with PDF');
      return newLabel;
    } catch (error) {
      console.error('Error saving generated label to database:', error);
      throw error;
    }
  }

  // Update a generated label
  static async updateGeneratedLabel(id: string, updates: Partial<GeneratedLabel>): Promise<GeneratedLabel | null> {
    const labels = await this.getGeneratedLabels();
    const index = labels.findIndex(label => label.id === id);
    if (index === -1) return null;

    const updatedLabel = { ...labels[index], ...updates };

    // Persist to API when possible
    try {
      await apiUpdateGeneratedLabel(id, {
        templateId: updatedLabel.templateId,
        templateName: updatedLabel.templateName,
        labelData: updatedLabel.labelData,
        createdBy: updatedLabel.createdBy,
        lastPrintedDate: updatedLabel.lastPrintedDate,
        printCount: updatedLabel.printCount,
        archived: updatedLabel.archived,
        archivedBy: updatedLabel.archivedBy,
        archivedDate: updatedLabel.archivedDate,
        pdfBlob: updatedLabel.pdfBlob,
        restocking: updatedLabel.restocking,
        restockingDate: updatedLabel.restockingDate,
        locationId: updatedLabel.locationId
      });
    } catch (error) {
      console.warn('Failed to persist label update to API, saving locally only:', error);
    }

    labels[index] = updatedLabel;
    await this.saveLabels(labels);
    return updatedLabel;
  }

  // Update PDF data for a generated label
  static async updateGeneratedLabelPdf(id: string, pdfBlob: Blob): Promise<GeneratedLabel | null> {
    return this.updateGeneratedLabel(id, { pdfBlob });
  }

  static async setGeneratedLabelRestocking(id: string, restocking: boolean): Promise<boolean> {
    try {
      await updateLabelRestocking(id, restocking);
    } catch (error) {
      console.error('Error updating restocking in database:', error);
      // Still update local cache to keep UI responsive
    }

    const labels = await this.getGeneratedLabels();
    const index = labels.findIndex(label => label.id === id);
    if (index === -1) return false;

    labels[index] = {
      ...labels[index],
      restocking,
      restockingDate: restocking ? new Date().toISOString() : undefined,
      archived: restocking ? false : labels[index].archived
    };

    await this.saveLabels(labels);
    return true;
  }

  // Archive a generated label
  static async archiveGeneratedLabel(id: string, archivedBy: string): Promise<boolean> {
    try {
      // First, archive in the database/API
      await archiveGeneratedLabel(id, archivedBy);
      console.log('✅ Label archived in database');
      
      // Then update local cache if it exists
      const labels = await this.getGeneratedLabels();
      const index = labels.findIndex(label => label.id === id);
      
      if (index === -1) {
        // Label wasn't found locally, but API archival succeeded
        return true;
      }

      labels[index] = {
        ...labels[index],
        archived: true,
        archivedBy,
        archivedDate: new Date().toISOString()
      };

      await this.saveLabels(labels);
      return true;
    } catch (error) {
      console.error('Error archiving generated label in database:', error);
      throw error;
    }
  }

  static async restoreGeneratedLabel(id: string): Promise<boolean> {
    try {
      // First, restore in the database/API
      await restoreGeneratedLabel(id);
      console.log('✅ Label restored in database');

      // Then update local cache
      const labels = await this.getGeneratedLabels();
      const index = labels.findIndex(label => label.id === id);
      if (index === -1) return true;

      labels[index] = {
        ...labels[index],
        archived: false,
        archivedBy: undefined,
        archivedDate: undefined
      };

      await this.saveLabels(labels);
      return true;
    } catch (error) {
      console.error('Error restoring generated label in database:', error);
      throw error;
    }
  }

  // Delete a generated label permanently
  static async deleteGeneratedLabel(id: string): Promise<boolean> {
    try {
      // First, delete from the database/API
      await deleteGeneratedLabel(id);
      console.log('✅ Label deleted from database');
      
      // Then remove from local cache if it exists
      const labels = await this.getGeneratedLabels();
      const filteredLabels = labels.filter(label => label.id !== id);
      
      if (filteredLabels.length === labels.length) {
        // Label wasn't found locally, but API deletion succeeded
        return true;
      }

      await this.saveLabels(filteredLabels);
      return true;
    } catch (error) {
      console.error('Error deleting generated label from database:', error);
      throw error;
    }
  }

  // Increment print count and update last printed date
  static async recordPrint(id: string): Promise<boolean> {
    const labels = await this.getGeneratedLabels();
    const index = labels.findIndex(label => label.id === id);
    
    if (index === -1) return false;

    labels[index] = {
      ...labels[index],
      printCount: labels[index].printCount + 1,
      lastPrintedDate: new Date().toISOString()
    };

    await this.saveLabels(labels);
    return true;
  }

  // Get label by ID
  static async getGeneratedLabelById(id: string): Promise<GeneratedLabel | null> {
    const labels = await this.getGeneratedLabels();
    return labels.find(label => label.id === id) || null;
  }



  // Private method to save labels to localStorage
  private static async saveLabels(labels: GeneratedLabel[]): Promise<void> {
    try {
      // Convert labels to storage format with base64 blob data
      const labelsForStorage = await Promise.all(
        labels.map(async (label) => {
          const storageLabel: any = { ...label };
          
          // Convert Blob to base64 string for storage
          if (label.pdfBlob) {
            storageLabel.pdfBlobData = await this.blobToBase64(label.pdfBlob);
            delete storageLabel.pdfBlob; // Remove the actual blob
          }
          
          return storageLabel;
        })
      );
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(labelsForStorage));
    } catch (error) {
      console.error('Error saving generated labels:', error);
      throw new Error('Failed to save generated labels');
    }
  }

  // Clear all generated labels (useful for testing)
  static clearAllGeneratedLabels(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing generated labels:', error);
    }
  }

  // Regenerate PDF for a label that doesn't have blob data
  static async regeneratePdfForLabel(labelId: string, template: any, labelData: any): Promise<boolean> {
    try {
      const { LabelPdfGenerator } = await import('./labelPdfGenerator');
      
      // Generate new PDF
      const pdfBytes = await LabelPdfGenerator.generateLabelPdf(template, labelData, 1);
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      
      // Update the label with new PDF blob
      const result = await this.updateGeneratedLabel(labelId, { pdfBlob });
      return result !== null;
    } catch (error) {
      console.error('Error regenerating PDF for label:', error);
      return false;
    }
  }

  // Export labels data (for backup/sharing)
  static async exportLabels(): Promise<string> {
    const labels = await this.getGeneratedLabels();
    return JSON.stringify(labels, null, 2);
  }

  // Import labels data (for backup restoration)
  static async importLabels(jsonData: string): Promise<boolean> {
    try {
      const labels = JSON.parse(jsonData) as GeneratedLabel[];
      
      // Validate the structure
      if (!Array.isArray(labels)) {
        throw new Error('Invalid labels data format');
      }

      // Basic validation of label structure
      for (const label of labels) {
        if (!label.id || !label.templateId || !label.templateName || !label.createdBy) {
          throw new Error('Invalid label structure');
        }
      }

      await this.saveLabels(labels);
      return true;
    } catch (error) {
      console.error('Error importing labels:', error);
      return false;
    }
  }
} 