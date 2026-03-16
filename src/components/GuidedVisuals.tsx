import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { 
  CircularProgress, 
  Box, 
  Dialog, 
  DialogContent, 
  IconButton,
  Button, 
  Typography, 
  Paper 
} from '@mui/material';
import { PhotoCamera, PhotoLibrary, Close as CloseIcon } from '@mui/icons-material';
import { acquireCamera, releaseCamera } from '../utils/cameraLock';
import { 
  logImageUploadAttempt, 
  showSafariImageAlert, 
  detectBrowser,
  isHEICFile,
  convertHEICToJPEG,
  processImageForUpload 
} from '../services/imageUploadDebug';

// Type definitions for field configurations
export interface GuidedVisualField {
  fieldName: string;
  prompt: string;
  guidedVisualType: 'vehicle_instrument_cluster' | 'tire_tread' | 'tire_full' | 'brake_pad' | 'tpms_placard' | 'engine_air_filter' | 'battery_terminals_cleaning' | 'battery_terminals_positive' | 'battery_terminals_negative' | 'custom';
  guidedVisualUrl?: string; // For custom images
  triggerConditions: {
    tabName?: string;
    fieldEmpty?: boolean;
    vinReaches17?: boolean; // Trigger once when VIN reaches exactly 17 characters
    chipSelected?: boolean; // Trigger when a chip is selected
    terminalCleaning?: boolean; // Trigger when terminal cleaning chip is selected
    terminalDamaged?: string; // Trigger for specific terminal damage ('positive' | 'negative')
    tireDateAdded?: boolean; // Trigger when tire date is added
    rotorConditionSelected?: boolean; // Trigger when front rotor condition is selected for brake photos
    rearRotorConditionSelected?: boolean; // Trigger when rear rotor condition is selected for brake photos
    customCondition?: () => boolean;
    dependentField?: string; // For fields that trigger if a specific other field is not empty
  };
  uploadType: string;
  sequenceStep?: number; // For multi-step captures (1 for tread, 2 for full tire)
  nextField?: string; // Field name for next step in sequence
}

interface GuidedVisualsProps {
  onImageUpload: (file: File, type: any) => Promise<void>;
  fieldConfigurations: GuidedVisualField[];
  currentTab?: string;
  formData?: any;
  disabled?: boolean;
  multiple?: boolean;
  maxFiles?: number;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  resize1080p?: boolean;
  cameraFacing?: 'user' | 'environment';
}

export interface GuidedVisualsRef {
  checkTriggers: () => void;
  triggerField: (fieldName: string) => void;
  resetVinTriggers: () => void;
  resetTireTriggers: () => void;
  startTerminalDamageSequence: (damageLocations: string[]) => void;
  startTireSequence: (tirePosition: string) => void;
}

const GuidedVisuals = forwardRef<GuidedVisualsRef, GuidedVisualsProps>(({
  onImageUpload,
  fieldConfigurations,
  currentTab,
  formData,
  disabled = false,
  multiple = true,
  maxFiles = 5,
  className = '',
  size = 'small',
  resize1080p = false,
  cameraFacing = 'environment'
}, ref) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isPageLoaded, setIsPageLoaded] = useState(false);

  const [activeField, setActiveField] = useState<GuidedVisualField | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const pendingStreamRef = useRef<MediaStream | null>(null);
  const currentCameraInputRef = useRef<HTMLInputElement | null>(null);
  const triggerCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const vinTriggeredRef = useRef<Set<string>>(new Set()); // Track which fields have been triggered by VIN
  const terminalDamageSequenceRef = useRef<{
    locations: string[];
    currentIndex: number;
    active: boolean;
  }>({ locations: [], currentIndex: 0, active: false }); // Track terminal damage photo sequence
  
  const tireSequenceRef = useRef<{
    position: string;
    currentStep: number;
    active: boolean;
  }>({ position: '', currentStep: 0, active: false }); // Track tire photo sequence
  
  const tireTriggeredRef = useRef<Map<string, string>>(new Map()); // Track tire dates that have triggered sequences
  
  const brakeSequenceRef = useRef<{
    active: boolean;
    currentStep: number;
  }>({ active: false, currentStep: 0 }); // Track brake photo sequence

  const dismissedFieldsRef = useRef<Set<string>>(new Set());

  // Track user interaction and page load state
  useEffect(() => {
    const loadTimer = setTimeout(() => {
      setIsPageLoaded(true);
    }, 1000);

    const handleUserInteraction = () => {
      setHasUserInteracted(true);
    };

    document.addEventListener('click', handleUserInteraction, { once: true });
    document.addEventListener('touchstart', handleUserInteraction, { once: true });
    document.addEventListener('keydown', handleUserInteraction, { once: true });

    return () => {
      clearTimeout(loadTimer);
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (triggerCheckTimeoutRef.current) {
        clearTimeout(triggerCheckTimeoutRef.current);
      }
    };
  }, []);

  // Reset dismissed fields when the tab changes so triggers can fire again on a new tab
  const prevTabRef = useRef(currentTab);
  useEffect(() => {
    if (currentTab !== prevTabRef.current) {
      dismissedFieldsRef.current.clear();
      prevTabRef.current = currentTab;
    }
  }, [currentTab]);

  // Check for trigger conditions when tab or form data changes (with debounce)
  useEffect(() => {
    if (isPageLoaded && hasUserInteracted && !cameraOpen && !activeField) {
      if (triggerCheckTimeoutRef.current) {
        clearTimeout(triggerCheckTimeoutRef.current);
      }
      
      triggerCheckTimeoutRef.current = setTimeout(() => {
        checkTriggers();
      }, 500);
    }
    
    return () => {
      if (triggerCheckTimeoutRef.current) {
        clearTimeout(triggerCheckTimeoutRef.current);
      }
    };
  }, [currentTab, formData, isPageLoaded, hasUserInteracted, cameraOpen, activeField]);

  const checkTriggers = () => {
    if (disabled) return;
    
    console.log('🔍 GuidedVisuals: Checking triggers...', {
      currentTab,
      hasUserInteracted,
      isPageLoaded,
      fieldCount: fieldConfigurations.length
    });

    // Debug: Log all brake photo field configurations
    const brakeFields = fieldConfigurations.filter(f => f.fieldName.includes('brake_photo'));
    console.log('🔧 BRAKE FIELD CONFIGURATIONS (UPDATED VERSION):', brakeFields.map(f => ({
      fieldName: f.fieldName,
      sequenceStep: f.sequenceStep,
      triggerConditions: f.triggerConditions,
      uploadType: f.uploadType,
      nextField: f.nextField
    })));
    
    // Debug: Specifically log which field should be step 1
    const step1Field = brakeFields.find(f => f.sequenceStep === 1);
    if (step1Field) {
      console.log('🚀 STEP 1 BRAKE FIELD (should be rotor):', step1Field.fieldName);
    }

    // IMMEDIATE PROTECTION: Filter out _tire_full fields unless in active sequence
    const allowedFields = fieldConfigurations.filter(field => {
      if (field.fieldName.includes('_tire_full') && !tireSequenceRef.current.active) {
        console.log(`❌ BLOCKED: ${field.fieldName} - tire full fields only allowed during active sequence`);
        return false;
      }
      return true;
    });
    
    // Sort fields to prioritize step 1 (tread condition) over step 2 (full tire)
    const sortedFields = [...allowedFields].sort((a, b) => {
      // First sort by tire position to group related fields together
      const aPosMatch = a.fieldName.match(/^(driver_front|passenger_front|driver_rear|passenger_rear|spare)/);
      const bPosMatch = b.fieldName.match(/^(driver_front|passenger_front|driver_rear|passenger_rear|spare)/);
      const aPos = aPosMatch ? aPosMatch[1] : '';
      const bPos = bPosMatch ? bPosMatch[1] : '';
      
      if (aPos !== bPos) {
        return aPos.localeCompare(bPos);
      }
      
      // Then sort by sequence step (step 1 before step 2)
      const aStep = a.sequenceStep || 0;
      const bStep = b.sequenceStep || 0;
      return aStep - bStep;
    });
    
    for (const field of sortedFields) {
      const shouldTrigger = evaluateTriggerConditions(field);
      console.log(`🎯 Field ${field.fieldName} (step ${field.sequenceStep}):`, {
        shouldTrigger,
        triggerConditions: field.triggerConditions,
        guidedVisualType: field.guidedVisualType,
        tireDateAdded: field.triggerConditions.tireDateAdded
      });
      
      if (shouldTrigger) {
        if (dismissedFieldsRef.current.has(field.fieldName)) {
          continue;
        }
        triggerGuidedVisual(field);
        break;
      }
    }
    console.log('✅ GuidedVisuals: Trigger check complete');
  };

  const evaluateTriggerConditions = (field: GuidedVisualField): boolean => {
    const { triggerConditions } = field;
    
    console.log(`🔍 Evaluating ${field.fieldName}:`, {
      triggerConditions,
      currentTab,
      fieldValue: getFieldValue(field.fieldName, formData)
    });
    
    // GENERAL PROTECTION: Prevent _tire_full fields from auto-triggering
    // These should only trigger manually or as part of a sequence after tread photos
    if (field.fieldName.includes('_tire_full') && !tireSequenceRef.current.active) {
      console.log(`❌ ${field.fieldName}: _tire_full field blocked - only allowed during active tire sequence`);
      return false;
    }
    
    // Check tab condition
    if (triggerConditions.tabName && currentTab !== triggerConditions.tabName) {
      console.log(`❌ ${field.fieldName}: Tab mismatch (${currentTab} !== ${triggerConditions.tabName})`);
      return false;
    }
    
    // Check VIN reaches 17 characters condition
    if (triggerConditions.vinReaches17 && formData) {
      const currentVin = formData.vin || '';
      const fieldKey = `${field.fieldName}_vin17`;
      
      // Only trigger if:
      // 1. VIN is exactly 17 characters
      // 2. This field hasn't been triggered by VIN before
      // 3. Field is still empty
      if (currentVin.length === 17) {
        if (vinTriggeredRef.current.has(fieldKey)) {
          return false; // Already triggered for this field
        }
        
        const fieldValue = getFieldValue(field.fieldName, formData);
        if (fieldValue && fieldValue.length > 0) {
          return false; // Field is not empty, don't trigger
        }
        
        // Mark this field as triggered by VIN
        vinTriggeredRef.current.add(fieldKey);
        return true;
      }
      
      return false;
    }
    
    // Check if field is empty
    if (triggerConditions.fieldEmpty && formData) {
      // Prevent _tire_full fields from auto-triggering on fieldEmpty condition
      // These should only trigger as part of a sequence after tread photos
      if (field.fieldName.includes('_tire_full')) {
        console.log(`❌ ${field.fieldName}: _tire_full field blocked from fieldEmpty auto-trigger`);
        return false;
      }
      
      const fieldValue = getFieldValue(field.fieldName, formData);
      console.log(`📋 ${field.fieldName}: fieldEmpty check - value:`, fieldValue);
      if (fieldValue && fieldValue.length > 0) {
        console.log(`❌ ${field.fieldName}: Field not empty, don't trigger`);
        return false; // Field is not empty, don't trigger
      }
      console.log(`✅ ${field.fieldName}: Field is empty, condition met`);
    }
    
    // Check chip selected condition
    if (triggerConditions.chipSelected && formData) {
      const chipValue = getChipValue(field.fieldName, formData);
      const fieldImages = getFieldValue(field.fieldName, formData);
      
      console.log(`🔘 ${field.fieldName}: chipSelected check - chipValue:`, chipValue, 'fieldImages:', fieldImages);
      
      // Only trigger if:
      // 1. A chip is selected (chip value is not empty)
      // 2. Field images are still empty
      if (!chipValue || chipValue === '') {
        console.log(`❌ ${field.fieldName}: No chip selected, don't trigger`);
        return false; // No chip selected, don't trigger
      }
      
      if (fieldImages && fieldImages.length > 0) {
        console.log(`❌ ${field.fieldName}: Field already has images, don't trigger`);
        return false; // Field already has images, don't trigger
      }
      
      console.log(`✅ ${field.fieldName}: Chip selected and field empty, condition met`);
      return true;
    }

    // Check terminal cleaning condition
    if (triggerConditions.terminalCleaning && formData) {
      const batteryTerminals = formData.battery_terminals || [];
      const batteryImages = formData.battery_photos || [];
      
      // Only trigger if:
      // 1. Terminal cleaning chip is selected
      // 2. Battery images are still empty
      if (!batteryTerminals.includes('terminal_cleaning')) {
        return false; // Terminal cleaning not selected, don't trigger
      }
      
      if (batteryImages.length > 0) {
        return false; // Battery already has images, don't trigger
      }
      
      return true;
    }

    // Check terminal damaged condition
    if (triggerConditions.terminalDamaged && formData) {
      const batteryTerminals = formData.battery_terminals || [];
      const damageLocations = formData.battery_terminal_damage_location || [];
      
      // Only trigger if:
      // 1. Terminal damaged chip is selected
      // 2. The specific terminal location is selected
      // 3. We're in an active terminal damage sequence
      if (!batteryTerminals.includes('terminal_damaged')) {
        return false; // Terminal damaged not selected, don't trigger
      }
      
      if (!damageLocations.includes(triggerConditions.terminalDamaged)) {
        return false; // This specific terminal not selected for damage, don't trigger
      }
      
      if (!terminalDamageSequenceRef.current.active) {
        return false; // Terminal damage sequence not active, don't trigger
      }
      
      // Check if we should trigger this specific terminal in the sequence
      const currentTerminal = terminalDamageSequenceRef.current.locations[terminalDamageSequenceRef.current.currentIndex];
      if (currentTerminal !== triggerConditions.terminalDamaged) {
        return false; // Not the current terminal in sequence, don't trigger
      }
      
      return true;
    }
    
    // Check tire date added condition
    if (triggerConditions.tireDateAdded && formData) {
      console.log('🔍 TIRE DATE DEBUG for:', field.fieldName);
      
      // Only allow _tire_tread fields to trigger, not _tire_full fields
      if (field.fieldName.includes('_tire_full')) {
        console.log('❌ Blocked: _tire_full field');
        return false;
      }
      
      const tireDateField = field.fieldName.replace('_tire_tread', '').replace('_tire_full', '');
      const tireDate = formData.tire_dates?.[tireDateField] || '';
      const rawTireDate = tireDate.replace(/\D/g, '');
      const tireImages = getFieldValue(field.fieldName, formData);
      const trackingKey = `${tireDateField}_${rawTireDate}`;

      console.log('🔍 TIRE TRIGGER DATA:', {
        tireDateField,
        tireDate,
        rawTireDate,
        rawTireDateLength: rawTireDate.length,
        sequenceStep: field.sequenceStep,
        tireImagesLength: tireImages?.length,
        trackingKey,
        alreadyTriggered: tireTriggeredRef.current.has(trackingKey),
        sequenceActive: tireSequenceRef.current.active,
        fullTireDates: formData.tire_dates
      });

      // Only trigger camera if it's the TREAD image and tire date is 4 digits
      if (field.sequenceStep !== 1 || rawTireDate.length !== 4) {
        console.log('❌ Failed: sequenceStep !== 1 OR rawTireDate !== 4 chars');
        return false;
      }
      
      if (tireTriggeredRef.current.has(trackingKey)) {
        console.log('❌ Failed: Already triggered for this tire date');
        return false;
      }
      if (tireImages && tireImages.length > 0) {
        console.log('❌ Failed: Tire already has images');
        return false;
      }
      if (tireSequenceRef.current.active && tireSequenceRef.current.position === tireDateField) {
        console.log('❌ Failed: Tire sequence already active for this position');
        return false;
      }

      console.log('✅ TIRE TRIGGER SUCCESS - marking as triggered');
      tireTriggeredRef.current.set(trackingKey, rawTireDate);
      return true;
    }
    
    // Check front rotor condition selected
    if (triggerConditions.rotorConditionSelected && formData) {
      const driver = formData.front_brake_pads?.driver?.rotor_condition || '';
      const passenger = formData.front_brake_pads?.passenger?.rotor_condition || '';
      const fieldValue = getFieldValue(field.fieldName, formData);
      
      console.log(`🔧 ${field.fieldName}: FRONT ROTOR CONDITION DEBUG`, {
        driver,
        passenger,
        fieldValue,
        fieldValueLength: fieldValue?.length,
        driverNotBlank: !!driver && driver !== '',
        passengerNotBlank: !!passenger && passenger !== '',
        eitherSelected: (!!driver && driver !== '') || (!!passenger && passenger !== ''),
        fieldEmpty: !fieldValue || fieldValue.length === 0,
        fullBrakePadsData: formData.front_brake_pads,
        sequenceStep: field.sequenceStep,
        brakeSequenceActive: brakeSequenceRef.current.active,
        brakeSequenceStep: brakeSequenceRef.current.currentStep,
        shouldTrigger: ((!!driver && driver !== '') || (!!passenger && passenger !== '')) && (!fieldValue || fieldValue.length === 0)
      });
      
      // Only trigger if:
      // 1. Either driver or passenger rotor condition is selected (not blank)
      // 2. Field images are still empty
      if (((driver && driver !== '') || (passenger && passenger !== '')) && (!fieldValue || fieldValue.length === 0)) {
        console.log(`✅ ${field.fieldName}: Front rotor condition selected and field empty, condition met`);
        return true;
      }
      
      console.log(`❌ ${field.fieldName}: Front rotor condition not selected or field not empty, don't trigger`);
      return false;
    }
    
    // Check rear rotor condition selected
    if (triggerConditions.rearRotorConditionSelected && formData) {
      const driver = formData.rear_brake_pads?.driver?.rotor_condition || '';
      const passenger = formData.rear_brake_pads?.passenger?.rotor_condition || '';
      const fieldValue = getFieldValue(field.fieldName, formData);
      
      console.log(`🔧 ${field.fieldName}: REAR ROTOR CONDITION DEBUG`, {
        driver,
        passenger,
        fieldValue,
        fieldValueLength: fieldValue?.length,
        driverNotBlank: !!driver && driver !== '',
        passengerNotBlank: !!passenger && passenger !== '',
        eitherSelected: (!!driver && driver !== '') || (!!passenger && passenger !== ''),
        fieldEmpty: !fieldValue || fieldValue.length === 0,
        fullBrakePadsData: formData.rear_brake_pads,
        sequenceStep: field.sequenceStep,
        brakeSequenceActive: brakeSequenceRef.current.active,
        brakeSequenceStep: brakeSequenceRef.current.currentStep,
        shouldTrigger: ((!!driver && driver !== '') || (!!passenger && passenger !== '')) && (!fieldValue || fieldValue.length === 0)
      });
      
      // Only trigger if:
      // 1. Either driver or passenger rotor condition is selected (not blank)
      // 2. Field images are still empty
      if (((driver && driver !== '') || (passenger && passenger !== '')) && (!fieldValue || fieldValue.length === 0)) {
        console.log(`✅ ${field.fieldName}: Rear rotor condition selected and field empty, condition met`);
        return true;
      }
      
      console.log(`❌ ${field.fieldName}: Rear rotor condition not selected or field not empty, don't trigger`);
      return false;
    }
    
    // Check custom condition
    if (triggerConditions.customCondition && !triggerConditions.customCondition()) {
      console.log(`❌ ${field.fieldName}: Custom condition failed`);
      return false;
    }
    
    // Check dependent field condition
    if (triggerConditions.dependentField && formData) {
      const depValue = formData[triggerConditions.dependentField];
      const fieldValue = getFieldValue(field.fieldName, formData);
      
      console.log(`🔗 ${field.fieldName}: dependentField check - dependent field '${triggerConditions.dependentField}':`, depValue, 'fieldValue:', fieldValue, 'fieldValueLength:', fieldValue?.length);
      
      if (depValue && (!fieldValue || fieldValue.length === 0)) {
        console.log(`✅ ${field.fieldName}: Dependent field has value and current field is empty, triggering`);
        return true;
      }
      
      if (fieldValue && fieldValue.length > 0) {
        console.log(`❌ ${field.fieldName}: Field already has ${fieldValue.length} image(s), not triggering`);
      } else if (!depValue) {
        console.log(`❌ ${field.fieldName}: Dependent field '${triggerConditions.dependentField}' is empty, not triggering`);
      }
      
      return false;
    }
    
    // PROTECTION: Step 2 fields should NEVER auto-trigger UNLESS they're the first in a brake sequence
    // Tire step 2 fields should only trigger via sequence progression from step 1
    if (field.sequenceStep === 2 && !field.fieldName.includes('brake_photo') && field.fieldName.includes('_tire_full')) {
      console.log(`❌ ${field.fieldName}: Step 2 tire fields can only trigger via sequence progression, not auto-trigger`);
      return false;
    }
    
    // If we reach here and no specific conditions were met, don't trigger
    // Only fields with explicit trigger conditions should auto-trigger
    const hasExplicitCondition = !!(
      triggerConditions.tabName ||
      triggerConditions.fieldEmpty ||
      triggerConditions.vinReaches17 ||
      triggerConditions.chipSelected ||
      triggerConditions.terminalCleaning ||
      triggerConditions.terminalDamaged ||
      triggerConditions.tireDateAdded ||
      triggerConditions.rotorConditionSelected ||
      triggerConditions.rearRotorConditionSelected ||
      triggerConditions.dependentField
    );
    
    if (!hasExplicitCondition) {
      console.log(`❌ ${field.fieldName}: No explicit trigger conditions defined, not auto-triggering`);
      return false;
    }
    
    console.log(`🎯 ${field.fieldName}: ALL CONDITIONS MET - WILL TRIGGER`);
    return true;
  };

  const getFieldValue = (fieldName: string, data: any): any => {
    // Handle different field name formats
    if (fieldName === 'dashimage' || fieldName === 'dash_lights') {
      return data.dash_lights_photos || [];
    }
    
    if (fieldName === 'tpms_placard') {
      return data.tpms_placard || [];
    }
    
    if (fieldName === 'engine_air_filter') {
      return data.engine_air_filter_photo || [];
    }

    if (fieldName === 'battery_terminals_cleaning') {
      return data.battery_photos || [];
    }

    if (fieldName === 'battery_terminals_positive') {
      return data.battery_positive_terminal_photos || [];
    }

    if (fieldName === 'battery_terminals_negative') {
      return data.battery_negative_terminal_photos || [];
    }
    
    // Handle brake photo field names
    if (fieldName === 'front_brake_photo_pad' || fieldName === 'front_brake_photo_rotor') {
      return data.front_brakes || [];
    }
    
    if (fieldName === 'rear_brake_photo_pad' || fieldName === 'rear_brake_photo_rotor') {
      return data.rear_brakes || [];
    }
    
    // Handle undercarriage photo field name
    if (fieldName === 'undercarriage_photo') {
      return data.undercarriage_photos || [];
    }
    
    // Handle tire field names
    if (fieldName.includes('tire_tread') || fieldName.includes('tire_full')) {
      // Extract tire position from field name (e.g., 'driver_front_tire_tread' -> 'driver_front')
      const tirePosition = fieldName.replace('_tire_tread', '').replace('_tire_full', '');
      
      // Look for tire photos in tire_photos array or direct field photos
      const tirePhotos = data.tire_photos || [];
      const positionPhotos = tirePhotos.find((p: any) => p.type === tirePosition)?.photos || [];
      
      // Also check for direct field-based photos
      const directPhotos = data[`${tirePosition}_photos`] || data[`${fieldName}_photos`] || [];
      
      return positionPhotos.length > 0 ? positionPhotos : directPhotos;
    }
    
    return data[fieldName] || data[`${fieldName}_photos`] || [];
  };

  const getChipValue = (fieldName: string, data: any): any => {
    // Get the chip/selection value for a field
    if (fieldName === 'engine_air_filter') {
      return data.engine_air_filter || '';
    }
    
    return data[fieldName] || '';
  };

  const triggerGuidedVisual = (field: GuidedVisualField) => {
    console.log('🎯 Triggering guided visual for field:', field.fieldName);
    setActiveField(field);
    
    // If this is a tire field, set up tire sequence tracking
    if (field.fieldName.includes('tire_tread') || field.fieldName.includes('tire_full')) {
      const tirePosition = field.fieldName.replace('_tire_tread', '').replace('_tire_full', '');
      tireSequenceRef.current = {
        position: tirePosition,
        currentStep: field.sequenceStep || 1,
        active: true
      };
    }
    
    // If this is a brake field, set up brake sequence tracking
    if (field.fieldName.includes('brake_photo')) {
      brakeSequenceRef.current = {
        currentStep: field.sequenceStep || 1,
        active: true
      };
    }
    
    // Skip the explanation modal and go directly to camera
    openCamera();
  };

  const triggerField = (fieldName: string) => {
    const field = fieldConfigurations.find(f => f.fieldName === fieldName);
    if (field) {
      setActiveField(field);
      // Go directly to camera for manual triggers too
      openCamera();
    }
  };

  const validateFile = async (file: File): Promise<string | null> => {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/heic', 'image/heif'];
    if (!validTypes.includes(file.type) && !(await isHEICFile(file))) {
      return 'Only JPEG, PNG, GIF, and HEIC images are allowed';
    }

    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      return 'Image must be smaller than 25MB';
    }

    return null;
  };

  const processFiles = async (files: FileList | null): Promise<void> => {
    if (!files || files.length === 0 || !activeField) return;

    const fileArray = Array.from(files);
    const filesToProcess = multiple ? fileArray.slice(0, maxFiles) : [fileArray[0]];
    
    setUploading(true);
    setError(null);

    let successCount = 0;
    let lastError: string | null = null;

    for (const file of filesToProcess) {
      try {
        logImageUploadAttempt(file);

        const validationError = await validateFile(file);
        if (validationError) {
          lastError = validationError;
          continue;
        }

        let processedFile: File;
        try {
          processedFile = await processImageForUpload(file, resize1080p);
        } catch (processingError) {
          console.error('Image processing failed:', processingError);
          const errorMsg = processingError instanceof Error ? processingError.message : 'Processing failed';
          lastError = `Failed to process ${file.name}: ${errorMsg}`;
          continue;
        }

        try {
          await onImageUpload(processedFile, activeField.uploadType);
          successCount++;
          console.log(`✅ Successfully uploaded: ${file.name}`);
        } catch (uploadError) {
          console.error('Upload failed:', uploadError);
          const errorMsg = uploadError instanceof Error ? uploadError.message : 'Upload failed';
          lastError = `Failed to upload ${file.name}: ${errorMsg}`;
        }
        
      } catch (error) {
        console.error('Error processing file:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        lastError = `Error with ${file.name}: ${errorMessage}`;
      }
    }

    setUploading(false);
    
    if (successCount === 0 && lastError) {
      setError(lastError);
    } else if (successCount > 0) {
      setError(null);
      // Handle terminal damage sequence progression
      if (terminalDamageSequenceRef.current.active && activeField.triggerConditions.terminalDamaged) {
        progressTerminalDamageSequence();
      } 
      // Handle brake sequence progression
      else if (brakeSequenceRef.current.active && activeField.nextField) {
        progressBrakeSequence();
      }
      // Handle tire sequence progression
      else if (tireSequenceRef.current.active && activeField.nextField) {
        progressTireSequence();
      } else {
        // Close modals on successful upload for non-sequence captures
        closeAll();
      }
    }
  };

  const progressTerminalDamageSequence = () => {
    const sequence = terminalDamageSequenceRef.current;
    sequence.currentIndex++;
    
    if (sequence.currentIndex < sequence.locations.length) {
      // More terminals to capture - trigger next one
      const nextTerminal = sequence.locations[sequence.currentIndex];
      const nextField = fieldConfigurations.find(f => 
        f.triggerConditions.terminalDamaged === nextTerminal
      );
      
      if (nextField) {
        // Close current and immediately trigger next
        closeAll();
        setTimeout(() => {
          triggerGuidedVisual(nextField);
        }, 500); // Small delay for better UX
      }
    } else {
      // Sequence complete
      sequence.active = false;
      sequence.currentIndex = 0;
      sequence.locations = [];
      closeAll();
    }
  };

  const progressTireSequence = () => {
    if (!activeField?.nextField) {
      closeAll();
      return;
    }
    
    const nextField = fieldConfigurations.find(f => f.fieldName === activeField.nextField);
    
    if (nextField) {
      // Close current and immediately trigger next step
      closeAll();
      setTimeout(() => {
        triggerGuidedVisual(nextField);
      }, 500); // Small delay for better UX
    } else {
      // Sequence complete
      tireSequenceRef.current.active = false;
      tireSequenceRef.current.currentStep = 0;
      tireSequenceRef.current.position = '';
      closeAll();
    }
  };

  const progressBrakeSequence = () => {
    if (!activeField?.nextField) {
      closeAll();
      return;
    }
    
    const nextField = fieldConfigurations.find(f => f.fieldName === activeField.nextField);
    
    if (nextField) {
      // Close current and immediately trigger next step
      closeAll();
      setTimeout(() => {
        triggerGuidedVisual(nextField);
      }, 500); // Small delay for better UX
    } else {
      // Sequence complete
      brakeSequenceRef.current.active = false;
      brakeSequenceRef.current.currentStep = 0;
      closeAll();
    }
  };

  const openCamera = () => {
    if (!acquireCamera('guided-visuals')) return;
    setCameraOpen(true);
    setError(null);
  };

  const initCameraStream = async () => {
    try {
      let stream: MediaStream;
      
      if (activeField?.fieldName === 'undercarriage_photo') {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          
          const ultraWideDevice = videoDevices.find(device => 
            device.label.toLowerCase().includes('ultra') || 
            device.label.toLowerCase().includes('wide') ||
            device.label.toLowerCase().includes('0.5')
          );
          
          if (ultraWideDevice) {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: { exact: ultraWideDevice.deviceId },
                width: { ideal: 1920 },
                height: { ideal: 1080 }
              }
            });
          } else {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: cameraFacing,
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                aspectRatio: { ideal: 16/9 }
              }
            });
          }
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: cameraFacing } 
          });
        }
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: cameraFacing } 
        });
      }
      
      videoTrackRef.current = stream.getVideoTracks()[0];
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      } else {
        pendingStreamRef.current = stream;
      }
    } catch (error) {
      console.error('Camera access error:', error);
      setError('Camera access denied. You can still use the file picker or try camera access again.');
    }
  };

  useEffect(() => {
    if (cameraOpen) {
      initCameraStream();
    }
    return () => {
      if (pendingStreamRef.current) {
        pendingStreamRef.current.getTracks().forEach(t => t.stop());
        pendingStreamRef.current = null;
      }
    };
  }, [cameraOpen]);

  const videoRefCallback = (el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && pendingStreamRef.current) {
      el.srcObject = pendingStreamRef.current;
      el.play().catch(() => {});
      pendingStreamRef.current = null;
    }
  };

  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        
        canvas.toBlob(async (blob) => {
          if (blob && activeField) {
            const file = new File([blob], `guided-capture-${activeField.fieldName}-${Date.now()}.jpg`, { 
              type: 'image/jpeg' 
            });
            const fileList = [file];
            await processFiles({ length: 1, item: (i: number) => fileList[i], [Symbol.iterator]: () => fileList[Symbol.iterator]() } as FileList);
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const handleFilePickerClick = () => {
    if (!activeField) return;
    
    // Close the camera first so pickers don't overlap on iOS
    if (videoTrackRef.current) {
      videoTrackRef.current.stop();
      videoTrackRef.current = null;
    }
    if (pendingStreamRef.current) {
      pendingStreamRef.current.getTracks().forEach(t => t.stop());
      pendingStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOpen(false);

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,image/heic,image/heif,.heic,.heif';
    input.multiple = multiple;
    
    input.style.position = 'absolute';
    input.style.left = '-9999px';
    input.style.opacity = '0';
    input.style.pointerEvents = 'none';
    
    document.body.appendChild(input);
    currentCameraInputRef.current = input;
    
    let hasProcessed = false;
    
    const handleFileChange = async (files: FileList | null) => {
      if (hasProcessed || !files || !files.length) return;
      hasProcessed = true;
      
      await processFiles(files);
      
      if (document.body.contains(input)) {
        document.body.removeChild(input);
      }
    };
    
    input.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      handleFileChange(target.files);
    });
    
    setTimeout(() => {
      input.click();
    }, 100);
    
    setTimeout(() => {
      if (document.body.contains(input)) {
        document.body.removeChild(input);
      }
    }, 30000);
  };

  const closeAll = () => {
    if (activeField) {
      dismissedFieldsRef.current.add(activeField.fieldName);
    }
    setCameraOpen(false);
    setActiveField(null);
    setError(null);
    releaseCamera('guided-visuals');
    
    // Clean up camera
    if (videoTrackRef.current) {
      videoTrackRef.current.stop();
      videoTrackRef.current = null;
    }
    if (pendingStreamRef.current) {
      pendingStreamRef.current.getTracks().forEach(t => t.stop());
      pendingStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    // Clean up trigger check timeout
    if (triggerCheckTimeoutRef.current) {
      clearTimeout(triggerCheckTimeoutRef.current);
      triggerCheckTimeoutRef.current = null;
    }
  };

  // Reset VIN trigger tracking (useful for testing or form resets)
  const resetVinTriggers = () => {
    vinTriggeredRef.current.clear();
  };

  // Reset tire trigger tracking (useful for testing or form resets)
  const resetTireTriggers = () => {
    tireTriggeredRef.current.clear();
  };

  // Start terminal damage photo sequence
  const startTerminalDamageSequence = (damageLocations: string[]) => {
    if (damageLocations.length === 0) return;
    
    terminalDamageSequenceRef.current = {
      locations: [...damageLocations],
      currentIndex: 0,
      active: true
    };
    
    // Trigger first terminal in sequence
    const firstTerminal = damageLocations[0];
    const firstField = fieldConfigurations.find(f => 
      f.triggerConditions.terminalDamaged === firstTerminal
    );
    
    if (firstField) {
      triggerGuidedVisual(firstField);
    }
  };

  // Start tire photo sequence for a specific tire position
  const startTireSequence = (tirePosition: string) => {
    const treadField = fieldConfigurations.find(f => 
      f.fieldName === `${tirePosition}_tire_tread`
    );
    
    if (treadField) {
      tireSequenceRef.current = {
        position: tirePosition,
        currentStep: 1,
        active: true
      };
      
      triggerGuidedVisual(treadField);
    }
  };

  // Helper function to get photo name label
  const getPhotoNameLabel = (guidedVisualType: string, fieldName?: string): string => {
    switch (guidedVisualType) {
      case 'vehicle_instrument_cluster':
        return 'Instrument Cluster';
      case 'tpms_placard':
        return 'TPMS Placard';
      case 'engine_air_filter':
        return 'Engine Air Filter';
      case 'battery_terminals_cleaning':
        return 'Corroded Terminals';
      case 'battery_terminals_positive':
      case 'battery_terminals_negative':
        return 'Damaged Terminals';
      case 'tire_tread':
        return 'Tread Condition';
      case 'tire_full':
        return 'Full Tire View';
      case 'brake_pad':
        if (fieldName?.includes('pad')) {
          return 'Brake Pad';
        } else if (fieldName?.includes('rotor')) {
          return 'Brake Rotor';
        }
        return 'Brake Component';
      case 'custom':
        if (fieldName === 'undercarriage_photo') return 'Undercarriage';
        return 'Photo';
      default:
        return 'Photo';
    }
  };

  // Helper component for photo name label
  const PhotoNameLabel = ({ label }: { label: string }) => (
    <Box
      sx={{
        position: 'absolute',
        top: 8,
        right: 8,
        bgcolor: 'rgba(0, 0, 0, 0.75)',
        color: 'white',
        px: 1.5,
        py: 0.5,
        borderRadius: 1,
        fontSize: '12px',
        fontWeight: 'bold',
        pointerEvents: 'none',
        zIndex: 2
      }}
    >
      {label}
    </Box>
  );


  useImperativeHandle(ref, () => ({
    checkTriggers,
    triggerField,
    resetVinTriggers,
    resetTireTriggers,
    startTerminalDamageSequence,
    startTireSequence,
  }));

  return (
    <Box className={className}>

      {/* Camera Modal */}
      <Dialog 
        open={cameraOpen} 
        onClose={closeAll}
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: { bgcolor: 'black' }
        }}
      >
        <DialogContent sx={{ p: 0, bgcolor: 'black' }}>
          {activeField && (
            <Box sx={{ position: 'relative' }}>
              {/* Header with prompt */}
              <Paper 
                sx={{ 
                  position: 'absolute',
                  top: 16,
                  left: 16,
                  right: 16,
                  zIndex: 1,
                  p: 2,
                  bgcolor: 'rgba(255,255,255,0.9)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <Typography variant="body1" sx={{ textAlign: 'center', fontWeight: 'bold' }}>
                  {activeField.prompt}
                </Typography>
              </Paper>

              {/* Video stream */}
              <video
                ref={videoRefCallback}
                style={{
                  width: '100%',
                  height: 'auto',
                  minHeight: '400px',
                  objectFit: 'cover'
                }}
                playsInline
                autoPlay
              />

              {/* Guided overlay based on field type */}
              {activeField.guidedVisualType === 'vehicle_instrument_cluster' && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '40%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '80%',
                    height: '30%',
                    border: '3px solid #1976d2',
                    borderRadius: 2,
                    backgroundColor: 'rgba(25, 118, 210, 0.1)',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <PhotoNameLabel label={getPhotoNameLabel('vehicle_instrument_cluster')} />
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#1976d2', 
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontWeight: 'bold'
                    }}
                  >
                    Instrument Cluster
                  </Typography>
                </Box>
              )}

              {/* TPMS Placard overlay */}
              {activeField.guidedVisualType === 'tpms_placard' && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '60%',
                    height: '40%',
                    border: '3px solid #ff9800',
                    borderRadius: 2,
                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <PhotoNameLabel label={getPhotoNameLabel('tpms_placard')} />
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#ff9800', 
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontWeight: 'bold'
                    }}
                  >
                    TPMS Placard
                  </Typography>
                </Box>
              )}

              {/* Engine Air Filter overlay */}
              {activeField.guidedVisualType === 'engine_air_filter' && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '70%',
                    height: '50%',
                    border: '3px solid #4caf50',
                    borderRadius: 2,
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <PhotoNameLabel label={getPhotoNameLabel('engine_air_filter')} />
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#4caf50', 
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontWeight: 'bold'
                    }}
                  >
                    Engine Air Filter
                  </Typography>
                </Box>
              )}

              {/* Battery Terminals Cleaning overlay */}
              {activeField.guidedVisualType === 'battery_terminals_cleaning' && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '65%',
                    height: '45%',
                    border: '3px solid #2196f3',
                    borderRadius: 2,
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <PhotoNameLabel label={getPhotoNameLabel('battery_terminals_cleaning')} />
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#2196f3', 
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontWeight: 'bold'
                    }}
                  >
                    Battery Terminals (Before Cleaning)
                  </Typography>
                </Box>
              )}

              {/* Battery Positive Terminal overlay */}
              {activeField.guidedVisualType === 'battery_terminals_positive' && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '60%',
                    height: '40%',
                    border: '3px solid #f44336',
                    borderRadius: 2,
                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <PhotoNameLabel label={getPhotoNameLabel('battery_terminals_positive')} />
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#f44336', 
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontWeight: 'bold'
                    }}
                  >
                    ➕ Positive Terminal
                  </Typography>
                </Box>
              )}

              {/* Battery Negative Terminal overlay */}
              {activeField.guidedVisualType === 'battery_terminals_negative' && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '60%',
                    height: '40%',
                    border: '3px solid #000000',
                    borderRadius: 2,
                    backgroundColor: 'rgba(0, 0, 0, 0.1)',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <PhotoNameLabel label={getPhotoNameLabel('battery_terminals_negative')} />
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#000000', 
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontWeight: 'bold'
                    }}
                  >
                    ➖ Negative Terminal
                  </Typography>
                </Box>
              )}

              {/* Tire Tread Condition overlay - Rectangle */}
              {activeField.guidedVisualType === 'tire_tread' && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '70%',
                    height: '30%',
                    border: '3px solid #4caf50',
                    borderRadius: 1,
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <PhotoNameLabel label="Tread Condition" />
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#4caf50', 
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontWeight: 'bold'
                    }}
                  >
                    📏 Tread Area
                  </Typography>
                </Box>
              )}

              {/* Tire Full View overlay - Circle */}
              {activeField.guidedVisualType === 'tire_full' && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '80%',
                    height: '80%',
                    border: '3px solid #ff9800',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <PhotoNameLabel label="Full Tire View" />
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#ff9800', 
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontWeight: 'bold'
                    }}
                  >
                    🛞 Full Side View
                  </Typography>
                </Box>
              )}

              {/* Brake Pad overlay - Rectangle */}
              {activeField.guidedVisualType === 'brake_pad' && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '65%',
                    height: '40%',
                    border: '3px solid #e91e63',
                    borderRadius: 1,
                    backgroundColor: 'rgba(233, 30, 99, 0.1)',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <PhotoNameLabel label={getPhotoNameLabel('brake_pad', activeField.fieldName)} />
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#e91e63', 
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontWeight: 'bold'
                    }}
                  >
                    🔧 Brake Component
                  </Typography>
                </Box>
              )}

              {/* Brake Rotor overlay - Rectangle */}
              {activeField.guidedVisualType === 'brake_pad' && activeField.fieldName?.includes('rotor') && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '65%',
                    height: '40%',
                    border: '3px solid #e91e63',
                    borderRadius: 1,
                    backgroundColor: 'rgba(233, 30, 99, 0.1)',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <PhotoNameLabel label={getPhotoNameLabel('brake_pad', activeField.fieldName)} />
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#e91e63', 
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontWeight: 'bold'
                    }}
                  >
                    🔧 Brake Rotor
                  </Typography>
                </Box>
              )}

              {/* Camera controls */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 16,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  gap: 2,
                  alignItems: 'center'
                }}
              >
                <IconButton
                  onClick={closeAll}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.9)',
                    color: 'black',
                    '&:hover': { bgcolor: 'rgba(255,255,255,1)' }
                  }}
                >
                  <CloseIcon />
                </IconButton>
                
                <Button
                  variant="contained"
                  onClick={captureImage}
                  disabled={uploading}
                  sx={{
                    bgcolor: 'white',
                    color: 'black',
                    borderRadius: '50%',
                    width: 72,
                    height: 72,
                    minWidth: 72,
                    '&:hover': { bgcolor: 'grey.100' }
                  }}
                >
                  {uploading ? <CircularProgress size={32} /> : <PhotoCamera sx={{ fontSize: 32 }} />}
                </Button>
                
                <IconButton
                  onClick={handleFilePickerClick}
                  disabled={uploading}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.9)',
                    color: 'black',
                    '&:hover': { bgcolor: 'rgba(255,255,255,1)' }
                  }}
                >
                  <PhotoLibrary />
                </IconButton>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
});

export default GuidedVisuals; 