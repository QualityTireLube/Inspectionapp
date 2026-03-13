/**
 * Test Data Loader for Inspection Forms
 * 
 * This utility bridges the gap between test data stored in localStorage
 * and the inspection forms that need to be populated with it.
 */

import { TestInspectionDataHelper, TestDatasetKey } from './testInspectionDataHelper';

export interface TestDataLoaderOptions {
  inspectionType: string;
  vin?: string;
  preferDataset?: TestDatasetKey;
  fallbackToMinimal?: boolean;
}

/**
 * Load test data into inspection form if available
 */
export function loadTestDataIntoForm(options: TestDataLoaderOptions): any | null {
  const { inspectionType, vin, preferDataset, fallbackToMinimal = true } = options;

  console.log('🔍 Looking for test data to load into form:', options);

  // Debug: Check what's available in localStorage
  const availableKeys = Object.keys(localStorage).filter(key => key.startsWith('testInspectionData_'));
  console.log('📂 Available test data keys in localStorage:', availableKeys);

  // Strategy 1: Use preferred dataset if specified
  if (preferDataset && TestInspectionDataHelper.isTestDataLoaded(preferDataset)) {
    console.log(`📋 Loading preferred dataset: ${preferDataset}`);
    return loadDatasetIntoForm(preferDataset);
  }

  // Strategy 2: Find test data by VIN
  if (vin) {
    const datasetByVin = findDatasetByVin(vin);
    console.log(`🔍 VIN ${vin} maps to dataset: ${datasetByVin}`);
    if (datasetByVin && TestInspectionDataHelper.isTestDataLoaded(datasetByVin)) {
      console.log(`✅ Found test data by VIN ${vin}: ${datasetByVin}`);
      return loadDatasetIntoForm(datasetByVin);
    } else {
      console.log(`❌ Test data for VIN ${vin} not loaded in localStorage`);
    }
  }

  // Strategy 3: Find test data by inspection type (prefer full over minimal)
  const datasetByType = findDatasetByInspectionType(inspectionType, fallbackToMinimal);
  console.log(`📝 Inspection type ${inspectionType} maps to dataset: ${datasetByType}`);
  if (datasetByType && TestInspectionDataHelper.isTestDataLoaded(datasetByType)) {
    console.log(`✅ Found test data by type ${inspectionType}: ${datasetByType}`);
    return loadDatasetIntoForm(datasetByType);
  } else {
    console.log(`❌ Test data for type ${inspectionType} not loaded in localStorage`);
  }

  console.log('❌ No test data found for loading into form');
  return null;
}

/**
 * Find dataset by VIN
 */
function findDatasetByVin(vin: string): TestDatasetKey | null {
  const vinToDataset: Record<string, TestDatasetKey> = {
    '1HGCM82633A123456': 'quick_check_full',
    '2T1BURHE5JC123789': 'quick_check_minimal',
    '3VW447AU8JM123456': 'no_check_full',
    '1FTFW1ET5DFC12345': 'no_check_minimal',
    '1G1ZB5ST8HF123456': 'vsi_full',
    '5NPF34AF8HH123456': 'vsi_minimal',
  };

  return vinToDataset[vin] || null;
}

/**
 * Find dataset by inspection type
 */
function findDatasetByInspectionType(inspectionType: string, fallbackToMinimal: boolean = true): TestDatasetKey | null {
  const typeToDatasets: Record<string, { full: TestDatasetKey; minimal: TestDatasetKey }> = {
    'quick_check': { full: 'quick_check_full', minimal: 'quick_check_minimal' },
    'no_check': { full: 'no_check_full', minimal: 'no_check_minimal' },
    'vsi': { full: 'vsi_full', minimal: 'vsi_minimal' },
  };

  const datasets = typeToDatasets[inspectionType];
  if (!datasets) return null;

  // Prefer full dataset if available
  if (TestInspectionDataHelper.isTestDataLoaded(datasets.full)) {
    return datasets.full;
  }

  // Fall back to minimal if enabled and available
  if (fallbackToMinimal && TestInspectionDataHelper.isTestDataLoaded(datasets.minimal)) {
    return datasets.minimal;
  }

  return null;
}

/**
 * Load specific dataset into form format
 */
function loadDatasetIntoForm(datasetKey: TestDatasetKey): any | null {
  try {
    console.log(`🔄 Converting dataset ${datasetKey} to form fields...`);
    const formFields = TestInspectionDataHelper.convertToFormFields(datasetKey);
    const metadata = TestInspectionDataHelper.getTestDataMetadata(datasetKey);
    
    if (!formFields) {
      console.error(`❌ Failed to convert test data to form fields: ${datasetKey}`);
      return null;
    }

    console.log(`✅ Successfully loaded test data: ${datasetKey}`, {
      fieldCount: Object.keys(formFields).length,
      photoCount: metadata?.photoCount || 0,
      sampleFields: Object.keys(formFields).slice(0, 5), // Show first 5 field names
      allFields: Object.keys(formFields),
      formFields: formFields
    });

    return formFields;
  } catch (error) {
    console.error(`❌ Error loading test data: ${datasetKey}`, error);
    return null;
  }
}

/**
 * Check if test data is available for an inspection type
 */
export function hasTestDataForInspection(inspectionType: string, vin?: string): boolean {
  if (vin) {
    const datasetByVin = findDatasetByVin(vin);
    if (datasetByVin && TestInspectionDataHelper.isTestDataLoaded(datasetByVin)) {
      return true;
    }
  }

  const datasetByType = findDatasetByInspectionType(inspectionType);
  return datasetByType ? TestInspectionDataHelper.isTestDataLoaded(datasetByType) : false;
}

/**
 * Get available test datasets for an inspection type
 */
export function getAvailableTestDatasets(inspectionType: string): TestDatasetKey[] {
  const typeToDatasets: Record<string, TestDatasetKey[]> = {
    'quick_check': ['quick_check_full', 'quick_check_minimal'],
    'no_check': ['no_check_full', 'no_check_minimal'],
    'vsi': ['vsi_full', 'vsi_minimal'],
  };

  const datasets = typeToDatasets[inspectionType] || [];
  return datasets.filter(dataset => TestInspectionDataHelper.isTestDataLoaded(dataset));
}

/**
 * Show test data notification in console
 */
export function logTestDataStatus(inspectionType: string, vin?: string): void {
  const hasData = hasTestDataForInspection(inspectionType, vin);
  const availableDatasets = getAvailableTestDatasets(inspectionType);
  
  if (hasData) {
    console.log(`🧪 Test data available for ${inspectionType}:`, availableDatasets);
  } else {
    console.log(`🚫 No test data loaded for ${inspectionType}. Available options:`, {
      'quick_check': ['quick_check_full', 'quick_check_minimal'],
      'no_check': ['no_check_full', 'no_check_minimal'],
      'vsi': ['vsi_full', 'vsi_minimal'],
    }[inspectionType]);
  }
}
