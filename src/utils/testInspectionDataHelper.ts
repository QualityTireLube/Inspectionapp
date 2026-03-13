/**
 * Helper utilities for working with test inspection data
 * 
 * This module provides utilities to load, access, and manipulate
 * test inspection data for development and testing purposes.
 */

import testInspectionData from '../../test-inspection-data.json';

export type TestDatasetKey = 
  | 'quick_check_full' 
  | 'quick_check_minimal' 
  | 'no_check_full' 
  | 'no_check_minimal' 
  | 'vsi_full' 
  | 'vsi_minimal';

export interface TestDataMetadata {
  loadedAt: string;
  inspectionType: string;
  vin: string;
  fieldCount: number;
  photoCount: number;
}

export interface FormFieldData {
  [fieldName: string]: any;
}

/**
 * Test Inspection Data Helper Class
 */
export class TestInspectionDataHelper {
  /**
   * Load test data into localStorage
   */
  static loadTestData(datasetKey: TestDatasetKey): boolean {
    try {
      const data = testInspectionData[datasetKey];
      if (!data) {
        throw new Error(`Test data not found for key: ${datasetKey}`);
      }

      const storageKey = `testInspectionData_${datasetKey}`;
      localStorage.setItem(storageKey, JSON.stringify(data));

      const metadata: TestDataMetadata = {
        loadedAt: new Date().toISOString(),
        inspectionType: data.inspection_type,
        vin: data.vehicle.vin,
        fieldCount: this.countFields(data),
        photoCount: this.countPhotos(data),
      };

      const metadataKey = `testInspectionMetadata_${datasetKey}`;
      localStorage.setItem(metadataKey, JSON.stringify(metadata));

      console.log(`🧪 Test data loaded: ${datasetKey}`, { data, metadata });
      return true;
    } catch (error) {
      console.error('Failed to load test data:', error);
      return false;
    }
  }

  /**
   * Get test data from localStorage
   */
  static getTestData(datasetKey: TestDatasetKey): any | null {
    try {
      const storageKey = `testInspectionData_${datasetKey}`;
      const data = localStorage.getItem(storageKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get test data:', error);
      return null;
    }
  }

  /**
   * Get test data metadata from localStorage
   */
  static getTestDataMetadata(datasetKey: TestDatasetKey): TestDataMetadata | null {
    try {
      const metadataKey = `testInspectionMetadata_${datasetKey}`;
      const metadata = localStorage.getItem(metadataKey);
      return metadata ? JSON.parse(metadata) : null;
    } catch (error) {
      console.error('Failed to get test data metadata:', error);
      return null;
    }
  }

  /**
   * Convert test data to flat form fields object
   */
  static convertToFormFields(datasetKey: TestDatasetKey): FormFieldData | null {
    const data = this.getTestData(datasetKey);
    if (!data) {
      console.error(`❌ No data found for dataset: ${datasetKey}`);
      return null;
    }

    console.log(`🔄 Converting ${datasetKey} from nested structure:`, data);

    const formFields: FormFieldData = {};
    let fieldCount = 0;
    
    data.tabs?.forEach((tab: any) => {
      console.log(`📂 Processing tab: ${tab.tab_name}`);
      tab.sections?.forEach((section: any) => {
        console.log(`📁 Processing section: ${section.section_header}`);
        Object.entries(section.fields || {}).forEach(([fieldName, fieldValue]) => {
          formFields[fieldName] = fieldValue;
          fieldCount++;
          console.log(`  ✅ ${fieldName}:`, fieldValue);
        });
      });
    });

    console.log(`🎯 Conversion complete! Generated ${fieldCount} form fields:`, formFields);
    return formFields;
  }

  /**
   * Get all available test dataset keys
   */
  static getAvailableDatasets(): TestDatasetKey[] {
    return Object.keys(testInspectionData) as TestDatasetKey[];
  }

  /**
   * Check if test data is loaded in localStorage
   */
  static isTestDataLoaded(datasetKey: TestDatasetKey): boolean {
    const storageKey = `testInspectionData_${datasetKey}`;
    return localStorage.getItem(storageKey) !== null;
  }

  /**
   * Clear all test data from localStorage
   */
  static clearAllTestData(): number {
    let clearedCount = 0;
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('testInspectionData_') || key.startsWith('testInspectionMetadata_'))) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      clearedCount++;
    });

    console.log(`🧹 Cleared ${clearedCount} test data items from localStorage`);
    return clearedCount / 2; // Divide by 2 since we store both data and metadata
  }

  /**
   * Clear specific test data from localStorage
   */
  static clearTestData(datasetKey: TestDatasetKey): boolean {
    try {
      const storageKey = `testInspectionData_${datasetKey}`;
      const metadataKey = `testInspectionMetadata_${datasetKey}`;
      
      localStorage.removeItem(storageKey);
      localStorage.removeItem(metadataKey);
      
      console.log(`🗑️ Cleared test data: ${datasetKey}`);
      return true;
    } catch (error) {
      console.error('Failed to clear test data:', error);
      return false;
    }
  }

  /**
   * Get inspection URL for a dataset
   */
  static getInspectionUrl(datasetKey: TestDatasetKey): string {
    const data = testInspectionData[datasetKey];
    if (!data) return '';

    const baseUrl = window.location.origin;
    const inspectionType = data.inspection_type;
    const vin = data.vehicle.vin;

    let path: string;
    switch (inspectionType) {
      case 'quick_check':
        path = '/quick-check';
        break;
      case 'no_check':
        path = '/no-check';
        break;
      case 'vsi':
        path = '/vsi';
        break;
      default:
        path = '/quick-check';
    }

    return `${baseUrl}${path}?vin=${vin}`;
  }

  /**
   * Load all full datasets
   */
  static loadAllFullDatasets(): boolean[] {
    const fullDatasets: TestDatasetKey[] = ['quick_check_full', 'no_check_full', 'vsi_full'];
    return fullDatasets.map(key => this.loadTestData(key));
  }

  /**
   * Load all minimal datasets
   */
  static loadAllMinimalDatasets(): boolean[] {
    const minimalDatasets: TestDatasetKey[] = ['quick_check_minimal', 'no_check_minimal', 'vsi_minimal'];
    return minimalDatasets.map(key => this.loadTestData(key));
  }

  /**
   * Count fields in test data
   */
  private static countFields(data: any): number {
    let count = 0;
    data.tabs?.forEach((tab: any) => {
      tab.sections?.forEach((section: any) => {
        count += Object.keys(section.fields || {}).length;
      });
    });
    return count;
  }

  /**
   * Count photos in test data
   */
  private static countPhotos(data: any): number {
    let count = 0;
    data.tabs?.forEach((tab: any) => {
      tab.sections?.forEach((section: any) => {
        Object.values(section.fields || {}).forEach((value: any) => {
          if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string' && value[0].includes('.jpg')) {
            count += value.length;
          }
        });
      });
    });
    return count;
  }

  /**
   * Get dataset statistics
   */
  static getDatasetStats(datasetKey: TestDatasetKey): {
    fieldCount: number;
    photoCount: number;
    inspectionType: string;
    vin: string;
    dataSize: 'full' | 'minimal';
  } | null {
    const data = testInspectionData[datasetKey];
    if (!data) return null;

    return {
      fieldCount: this.countFields(data),
      photoCount: this.countPhotos(data),
      inspectionType: data.inspection_type,
      vin: data.vehicle.vin,
      dataSize: datasetKey.includes('minimal') ? 'minimal' : 'full',
    };
  }
}

// Export convenience functions for direct use
export const {
  loadTestData,
  getTestData,
  getTestDataMetadata,
  convertToFormFields,
  getAvailableDatasets,
  isTestDataLoaded,
  clearAllTestData,
  clearTestData,
  getInspectionUrl,
  loadAllFullDatasets,
  loadAllMinimalDatasets,
  getDatasetStats,
} = TestInspectionDataHelper;

// Make helper available globally for console access
if (typeof window !== 'undefined') {
  (window as any).testInspectionHelper = TestInspectionDataHelper;
}
