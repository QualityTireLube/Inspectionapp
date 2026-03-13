/**
 * Debug Usage Examples for Business Modules
 * 
 * This file shows how to use the debug manager in different sections
 * of the QuickCheck application for targeted debugging.
 */

import { debug } from './debugManager';

// ===== QUICKCHECK INSPECTIONS =====
export const QuickCheckDebugExamples = {
  
  // Form interactions
  logFormStart: (vehicleInfo: any) => {
    debug.log('quickCheck', 'Starting QuickCheck inspection form', vehicleInfo);
  },

  logFieldUpdate: (fieldName: string, value: any) => {
    debug.log('quickCheck', `Field updated: ${fieldName}`, { field: fieldName, value });
  },

  logValidationError: (field: string, error: string) => {
    debug.warn('quickCheck', `Validation error in ${field}:`, error);
  },

  // Image handling in QuickCheck
  logImageUpload: (fieldName: string, imageData: any) => {
    debug.log('quickCheck', `Image uploaded for ${fieldName}`, {
      field: fieldName,
      size: imageData.size,
      type: imageData.type
    });
  },

  // Draft operations
  logDraftSave: (draftId: string) => {
    debug.log('quickCheck', 'QuickCheck draft saved', { draftId });
  },

  logDraftLoad: (draftId: string) => {
    debug.log('quickCheck', 'QuickCheck draft loaded', { draftId });
  },

  // Completion and submission
  logInspectionComplete: (inspectionData: any) => {
    debug.log('quickCheck', 'QuickCheck inspection completed', {
      vehicleId: inspectionData.vehicleId,
      totalImages: inspectionData.images?.length || 0,
      completedSections: inspectionData.completedSections
    });
  }
};

// ===== STATE INSPECTIONS =====
export const StateInspectionDebugExamples = {
  
  logRecordCreate: (recordData: any) => {
    debug.log('stateInspection', 'New state inspection record created', recordData);
  },

  logComplianceCheck: (vehicleId: string, complianceResult: any) => {
    debug.log('stateInspection', `Compliance check for vehicle ${vehicleId}`, complianceResult);
  },

  logAnalyticsQuery: (queryParams: any) => {
    debug.log('stateInspection', 'Analytics query executed', queryParams);
  },

  logCertificateGeneration: (vehicleId: string, certificateData: any) => {
    debug.log('stateInspection', 'Inspection certificate generated', {
      vehicleId,
      certificateNumber: certificateData.number,
      expirationDate: certificateData.expiration
    });
  }
};

// ===== DVI (DOT VEHICLE INSPECTIONS) =====
export const DVIDebugExamples = {
  
  logDVIStart: (vehicleData: any) => {
    debug.log('dvi', 'DOT Vehicle Inspection started', vehicleData);
  },

  logCommercialVehicleCheck: (checkType: string, result: any) => {
    debug.log('dvi', `Commercial vehicle check: ${checkType}`, result);
  },

  logDOTComplianceValidation: (complianceData: any) => {
    debug.log('dvi', 'DOT compliance validation', complianceData);
  },

  logDVISticker: (stickerData: any) => {
    debug.log('dvi', 'DVI inspection sticker generated', stickerData);
  }
};

// ===== TPMS (TIRE PRESSURE MONITORING) =====
export const TPMSDebugExamples = {
  
  logTPMSToolUsage: (toolType: string, sensorData: any) => {
    debug.log('tpms', `TPMS tool used: ${toolType}`, sensorData);
  },

  logSensorReading: (sensorId: string, pressure: number, temperature: number) => {
    debug.log('tpms', 'TPMS sensor reading', {
      sensorId,
      pressure: `${pressure} PSI`,
      temperature: `${temperature}°F`
    });
  },

  logTPMSCalibration: (vehicleId: string, calibrationData: any) => {
    debug.log('tpms', 'TPMS system calibration', { vehicleId, ...calibrationData });
  },

  logTPMSWarning: (vehicleId: string, warningType: string, details: any) => {
    debug.warn('tpms', `TPMS warning for vehicle ${vehicleId}: ${warningType}`, details);
  }
};

// ===== TIRE REPAIR =====
export const TireRepairDebugExamples = {
  
  logRepairStart: (tireInfo: any) => {
    debug.log('tireRepair', 'Tire repair procedure started', tireInfo);
  },

  logGuidedStep: (stepNumber: number, stepName: string, data: any) => {
    debug.log('tireRepair', `Guided repair step ${stepNumber}: ${stepName}`, data);
  },

  logRepairMethod: (method: string, materials: any) => {
    debug.log('tireRepair', `Repair method selected: ${method}`, materials);
  },

  logQualityCheck: (checkResults: any) => {
    debug.log('tireRepair', 'Tire repair quality check', checkResults);
  },

  logRepairComplete: (repairData: any) => {
    debug.log('tireRepair', 'Tire repair completed', {
      repairId: repairData.id,
      method: repairData.method,
      duration: repairData.duration,
      qualityRating: repairData.quality
    });
  }
};

// ===== CASH MANAGEMENT =====
export const CashManagementDebugExamples = {
  
  // Bank Deposits
  logDepositStart: (depositData: any) => {
    debug.log('cashManagement', 'Bank deposit started', depositData);
  },

  logDenominationCount: (denomination: string, count: number, total: number) => {
    debug.log('cashManagement', `Denomination counted: ${denomination}`, {
      count,
      total: `$${total.toFixed(2)}`
    });
  },

  logDepositImageUpload: (imageType: string, imageData: any) => {
    debug.log('cashManagement', `Deposit image uploaded: ${imageType}`, {
      size: imageData.size,
      type: imageData.type
    });
  },

  // Drawer Count
  logDrawerCountStart: (drawerId: string) => {
    debug.log('cashManagement', 'Drawer count started', { drawerId });
  },

  logCashVariance: (expected: number, actual: number, variance: number) => {
    debug.warn('cashManagement', 'Cash variance detected', {
      expected: `$${expected.toFixed(2)}`,
      actual: `$${actual.toFixed(2)}`,
      variance: `$${variance.toFixed(2)}`
    });
  },

  // Analytics
  logAnalyticsCalculation: (period: string, totals: any) => {
    debug.log('cashManagement', `Cash analytics calculated for ${period}`, totals);
  }
};

// ===== SHOPMONKEY INTEGRATION =====
export const ShopMonkeyDebugExamples = {
  
  logOrderSync: (orderData: any) => {
    debug.log('shopMonkey', 'ShopMonkey order synchronized', {
      orderId: orderData.id,
      status: orderData.status,
      customerName: orderData.customer?.name
    });
  },

  logWebhookReceived: (webhookType: string, payload: any) => {
    debug.log('webhooks', `ShopMonkey webhook received: ${webhookType}`, payload);
  },

  logStatusUpdate: (orderId: string, oldStatus: string, newStatus: string) => {
    debug.log('shopMonkey', `Order status updated: ${orderId}`, {
      from: oldStatus,
      to: newStatus
    });
  },

  logRateLimit: (remaining: number, resetTime: Date) => {
    debug.warn('shopMonkey', 'API rate limit status', {
      remaining,
      resetTime: resetTime.toISOString()
    });
  }
};

// ===== USAGE EXAMPLES IN COMPONENTS =====

/* 
Example usage in a QuickCheck component:

import { debug } from '../services/debugManager';
// OR import specific examples:
import { QuickCheckDebugExamples } from '../services/debugExamples';

// In your QuickCheck form component:
const handleFieldChange = (fieldName: string, value: any) => {
  debug.log('quickCheck', `Field ${fieldName} changed`, { fieldName, value });
  // ... rest of your logic
};

const handleImageUpload = (field: string, file: File) => {
  debug.log('quickCheck', `Image uploaded for ${field}`, {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type
  });
  // ... rest of your logic
};

// In your State Inspection component:
const createInspectionRecord = async (data: any) => {
  debug.log('stateInspection', 'Creating new inspection record', data);
  try {
    const result = await api.createInspection(data);
    debug.log('stateInspection', 'Inspection record created successfully', result);
    return result;
  } catch (error) {
    debug.error('stateInspection', 'Failed to create inspection record', error);
    throw error;
  }
};

// In your TPMS component:
const readTPMSSensor = (sensorId: string) => {
  debug.log('tpms', `Reading TPMS sensor: ${sensorId}`);
  // ... sensor reading logic
  debug.log('tpms', 'TPMS sensor data received', sensorData);
};

*/
