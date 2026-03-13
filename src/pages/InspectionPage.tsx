import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Box, Alert, Button, Dialog, DialogContent, Typography, Paper, Stack } from '@mui/material';
import Grid from '../components/CustomGrid';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import InspectionLayout from '../components/InspectionLayout';
import { InfoTab } from '../components/QuickCheck/tabs/InfoTab';
import { PullingIntoBayTab } from '../components/QuickCheck/tabs/PullingIntoBayTab';
import { UnderhoodTab } from '../components/QuickCheck/tabs/UnderhoodTab';
import { TiresBrakesTab } from '../components/QuickCheck/tabs/TiresBrakesTab';
import { SuspensionTab } from '../components/QuickCheck/tabs/SuspensionTab';
import { getQuickCheckHistory, deleteQuickCheck } from '../services/api';
import { useQuickCheckForm } from '../hooks/useQuickCheckForm';
import { useDraftForm } from '../hooks/useDraftForm';
import { QuickCheckForm, ImageUpload as QCImageUpload } from '../types/quickCheck';
import type { InspectionSchema, TabKey } from '../config/inspectionSchemas';
import VirtualTabTimer from '../components/VirtualTabTimer';
import { loadTestDataIntoForm, logTestDataStatus } from '../utils/testDataLoader';
import { getFieldDef } from '../config/fieldRegistry';
import { SafeFieldRenderer } from '../components/InspectionEngine/widgetRegistry';

interface Props { schema: InspectionSchema }

const TabPanel: React.FC<{ value: number; index: number; children?: React.ReactNode }> = ({ value, index, children }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
  </div>
);

/**
 * Dynamic Tab Content - Renders fields based on schema instead of hardcoded components
 */
interface DynamicTabContentProps {
  tabKey: string;
  fieldIds: string[];
  form: QuickCheckForm;
  onChange: (field: string, value: any) => void;
  onRadioChange: (field: string, value: string) => void;
  onImageUpload: (uploadType: string, files: FileList) => void;
  onImageClick: (imageIndex: number, uploadType: string) => void;
  onFormUpdate: (updates: Partial<QuickCheckForm>) => void;
  onFieldNotesChange: (field: string, notes: string) => void;
  onDeleteImage: (uploadType: string, imageIndex: number) => void;
  loading: boolean;
}

const DynamicTabContent: React.FC<DynamicTabContentProps> = ({
  tabKey,
  fieldIds,
  form,
  onChange,
  loading
}) => {
  // If there are no fields defined for this tab, show empty state
  if (!fieldIds || fieldIds.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="h6" gutterBottom>
          No fields configured for this tab
        </Typography>
        <Typography variant="body2">
          Add fields to the "{tabKey}" tab through the inspection schema configuration.
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2}>
      {fieldIds.map((fieldId) => {
        const fieldDef = getFieldDef(fieldId);
        
        if (!fieldDef) {
          return (
            <Grid item xs={12} key={fieldId}>
              <Alert severity="warning">
                Field "{fieldId}" not found in field registry
              </Alert>
            </Grid>
          );
        }

        // For section headers, use full width
        const gridSize = fieldDef.type === 'section_header' ? 12 : 6;

        return (
          <Grid item xs={12} md={gridSize} key={fieldId}>
            <SafeFieldRenderer
              fieldId={fieldId}
              field={fieldDef}
              value={(form as any)[fieldId] || fieldDef.defaultValue}
              onChange={(newValue) => onChange(fieldId, newValue)}
              disabled={loading}
              context={{ form }}
            />
          </Grid>
        );
      })}
    </Grid>
  );
};

const InspectionPage: React.FC<Props> = ({ schema }) => {
  const { userLocation } = useUser();
  const userName = localStorage.getItem('userName') || '';
  const userId = localStorage.getItem('userId') || '';
  // Read URL params early so we can feed them into initial draft state
  const urlParams = new URLSearchParams(window.location.search);
  const vinFromUrl = (urlParams.get('vin') || '').toUpperCase();
  const mileageFromUrl = urlParams.get('mileage') || '';
  const [tabValue, setTabValue] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);
  const [isPageVisible, setIsPageVisible] = useState<boolean>(true);
  const { 
    form, 
    setForm, 
    handleChange, 
    handleRadioChange, 
    updatePhotoField, 
    resetForm,
    handleBatteryConditionToggle,
    handleTreadChange,
    handleTreadConditionChange,
    handleTireDateChange,
    handleTireCommentToggle,
    handleTireStatusChange,
    handleTPMSStatusChange
  } = useQuickCheckForm(userName);
  const navigate = useNavigate();
  const timerAPI = useRef<any | null>(null);
  // Initialize draft autosave system (mirrors Quick Check)
  const draft = useDraftForm({
    userId,
    userName,
    initialForm: { 
      ...form, 
      inspection_type: schema.submitType,
      vin: vinFromUrl || form.vin,
      mileage: mileageFromUrl || form.mileage
    } as QuickCheckForm,
    onFormLoad: (loadedForm) => setForm(loadedForm),
    autoSaveDelay: 100, // Fast debounce since timer controls frequency
    namespace: schema.submitType === 'no_check' ? 'nocheck' : 
              schema.submitType === 'vsi' ? 'vsi' : 'quickcheck',
    inspectionType: schema.submitType
  });

  // Use ref to access current form without triggering effect dependencies
  const formRef = useRef(form);
  useEffect(() => {
    formRef.current = form;
  }, [form]);

  // Timer-based auto-save every 1 second (independent of form changes)
  useEffect(() => {
    console.log('🚀 Setting up auto-save timer for VSI');
    
    const autoSaveInterval = setInterval(() => {
      // Only auto-save if page is visible and not already saving
      if (isPageVisible && draft.status !== 'updating' && draft.status !== 'creating') {
        console.log('⏰ Timer-based auto-save triggered - Draft Status:', draft.status, 'Draft ID:', draft.draftId);
        draft.scheduleAutoSave(formRef.current);
      } else if (!isPageVisible) {
        console.log('👁️ Skipping auto-save - page not visible');
      } else {
        console.log('⏸️ Skipping auto-save - operation in progress:', draft.status);
      }
    }, 1000); // Save every 1 second

    return () => {
      console.log('🛑 Clearing auto-save timer');
      clearInterval(autoSaveInterval);
    };
  }, [draft.scheduleAutoSave, isPageVisible]); // Include page visibility

  // Track page visibility for auto-save optimization
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      console.log('👁️ Page visibility changed:', visible ? 'visible' : 'hidden');
      setIsPageVisible(visible);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Initialize defaults based on user/location and submit type
  const [testDataLoaded, setTestDataLoaded] = useState(false);
  
  useEffect(() => {
    setForm(prev => ({
      ...prev,
      inspection_type: schema.submitType,
      location: userLocation?.name || '',
      location_id: userLocation?.id || '',
      vin: vinFromUrl || prev.vin,
      mileage: mileageFromUrl || prev.mileage
    }));
    
    // Mark that we should now try to load test data
    setTestDataLoaded(false);
  }, [schema.submitType, userLocation?.id, userLocation?.name, setForm, vinFromUrl, mileageFromUrl]);

  // Draft persistence
  const draftKey = useMemo(() => `${schema.draftKeyPrefix}${userId || 'anon'}`, [schema.draftKeyPrefix, userId]);

  useEffect(() => {
    // Log test data status for debugging
    logTestDataStatus(schema.submitType, vinFromUrl);

    // Restore draft
    let dataLoaded = false;
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        console.log('📄 Loading existing draft data');
        const parsed = JSON.parse(saved);
        const restoreImages = (items: any[]): QCImageUpload[] => {
          if (!Array.isArray(items)) return [];
          return items.map((item: any, idx: number) => ({ file: new File([], `image_${idx}.jpg`, { type: 'image/jpeg' }), progress: 100, url: typeof item === 'string' ? item : item.url }));
        };
        setForm(prev => ({
          ...prev,
          ...parsed,
          dash_lights_photos: restoreImages(parsed.dash_lights_photos),
          mileage_photos: restoreImages(parsed.mileage_photos),
          windshield_condition_photos: restoreImages(parsed.windshield_condition_photos),
          tpms_placard: restoreImages(parsed.tpms_placard),
          state_inspection_status_photos: restoreImages(parsed.state_inspection_status_photos),
          washer_fluid_photo: restoreImages(parsed.washer_fluid_photo),
          undercarriage_photos: restoreImages(parsed.undercarriage_photos),
          tire_repair_status_photos: restoreImages(parsed.tire_repair_status_photos),
          tpms_type_photos: restoreImages(parsed.tpms_type_photos)
        } as QuickCheckForm));
        dataLoaded = true;
        setTestDataLoaded(true); // Mark that data is loaded
      }
    } catch {}

    // Mark that we've checked for drafts
    if (!dataLoaded) {
      setTestDataLoaded(false); // Allow test data loading
    }

    const savedTab = localStorage.getItem(`${schema.draftKeyPrefix}ActiveTab`);
    if (savedTab) setTabValue(parseInt(savedTab, 10) || 0);
  }, [draftKey, schema.draftKeyPrefix, setForm]);

  // Load test data only after form initialization and if no draft was loaded
  useEffect(() => {
    if (testDataLoaded || !userLocation?.id) return; // Don't load if already loaded or location not ready

    try {
      const testData = loadTestDataIntoForm({
        inspectionType: schema.submitType,
        vin: vinFromUrl,
        fallbackToMinimal: true
      });

      if (testData) {
        console.log('🧪 Loading test data into form');
        const restoreImages = (items: string[]): QCImageUpload[] => {
          if (!Array.isArray(items)) return [];
          return items.map((filename: string) => ({ 
            file: new File([], filename, { type: 'image/jpeg' }), 
            progress: 100, 
            url: `https://example.com/test-images/${filename}` // Mock URL for test images
          }));
        };

        const updatedForm = {
          ...prev,
          ...testData,
          // Preserve critical system values
          inspection_type: schema.submitType,
          location: userLocation?.name || '',
          location_id: userLocation?.id || '',
          vin: vinFromUrl || testData.vin || prev.vin,
          mileage: mileageFromUrl || testData.mileage || prev.mileage,
          // Convert photo arrays to QCImageUpload format
          dash_lights_photos: restoreImages(testData.dash_lights_photos || []),
          mileage_photos: restoreImages(testData.mileage_photos || []),
          windshield_condition_photos: restoreImages(testData.windshield_condition_photos || []),
          tpms_placard: restoreImages(testData.tpms_placard || []),
          state_inspection_status_photos: restoreImages(testData.state_inspection_status_photos || []),
          washer_fluid_photo: restoreImages(testData.washer_fluid_photo || []),
          undercarriage_photos: restoreImages(testData.undercarriage_photos || []),
          tire_repair_status_photos: restoreImages(testData.tire_repair_status_photos || []),
          tpms_type_photos: restoreImages(testData.tpms_type_photos || [])
        } as QuickCheckForm;

        console.log('🎯 About to update form with test data:', {
          testDataFields: Object.keys(testData),
          testDataSample: Object.entries(testData).slice(0, 5),
          finalFormSample: Object.entries(updatedForm).slice(0, 10),
          formFieldCount: Object.keys(updatedForm).length
        });

        setForm(updatedForm);
        
        setTestDataLoaded(true);
        console.log('✅ Test data successfully loaded and integrated with form');
      }
    } catch (error) {
      console.error('❌ Error loading test data:', error);
    }
  }, [testDataLoaded, userLocation?.id, schema.submitType, vinFromUrl, mileageFromUrl, setForm]);

  useEffect(() => {
    localStorage.setItem(`${schema.draftKeyPrefix}ActiveTab`, String(tabValue));
  }, [schema.draftKeyPrefix, tabValue]);

  useEffect(() => {
    const filterImages = (images: QCImageUpload[]) => (images || []).filter(i => i.url && !i.url.startsWith('blob:')).map(i => ({ url: i.url! }));
    try {
      const toSave = {
        ...form,
        inspection_type: schema.submitType,
        dash_lights_photos: filterImages(form.dash_lights_photos),
        mileage_photos: filterImages(form.mileage_photos),
        windshield_condition_photos: filterImages(form.windshield_condition_photos),
        tpms_placard: filterImages(form.tpms_placard),
        state_inspection_status_photos: filterImages(form.state_inspection_status_photos),
        washer_fluid_photo: filterImages(form.washer_fluid_photo),
        undercarriage_photos: filterImages(form.undercarriage_photos),
        tire_repair_status_photos: filterImages(form.tire_repair_status_photos),
        tpms_type_photos: filterImages(form.tpms_type_photos)
      };
      localStorage.setItem(draftKey, JSON.stringify(toSave));
    } catch {}
  }, [form, draftKey, schema.submitType]);

  // Track page visibility for timer debug
  useEffect(() => {
    const handleVisibility = () => setIsPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Load debug panel setting (reuse Quick Check setting)
  useEffect(() => {
    const savedSettings = localStorage.getItem('quickCheckSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setShowDebugPanel(parsed.showDebugTimerPanel || false);
      } catch {
        setShowDebugPanel(false);
      }
    } else {
      setShowDebugPanel(false);
    }

    const handleSettingsChange = (event: CustomEvent) => {
      setShowDebugPanel((event as any).detail?.showDebugTimerPanel || false);
    };
    window.addEventListener('quickCheckSettingsChanged', handleSettingsChange as EventListener);
    return () => window.removeEventListener('quickCheckSettingsChanged', handleSettingsChange as EventListener);
  }, []);

  // Generic image handlers
  const getPhotosArrayByType = (f: QuickCheckForm, type: string): QCImageUpload[] => {
    const map: Record<string, keyof QuickCheckForm> = {
      dashLights: 'dash_lights_photos',
      mileage: 'mileage_photos',
      windshield_condition: 'windshield_condition_photos',
      tpms_placard: 'tpms_placard',
      state_inspection_status: 'state_inspection_status_photos',
      washer_fluid: 'washer_fluid_photo',
      undercarriage_photos: 'undercarriage_photos',
      tire_repair_status: 'tire_repair_status_photos',
      tpms_type: 'tpms_type_photos',
    };
    const key = map[type];
    if (!key) return [];
    return (f as any)[key] || [];
  };

  const onImageUpload = async (file: File, type: string) => {
    try {
      // Import the upload service
      const { uploadImageToServer } = await import('../services/imageUpload');
      
      // Upload to server and get result
      const uploadResult = await uploadImageToServer(file);
      
      if (!uploadResult.success) {
        console.error('Upload failed:', uploadResult.error);
        setError(uploadResult.error || 'Upload failed');
        return;
      }
      
      // Create image object with server URL
      const newImage: QCImageUpload = { 
        file, 
        progress: 100, 
        url: uploadResult.serverUrl || URL.createObjectURL(file)
      };
      
      const existing = getPhotosArrayByType(form, type);
      updatePhotoField(type as any, [...existing, newImage]);
      
      console.log(`✅ Successfully uploaded ${file.name} to server:`, uploadResult.serverUrl);
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
      
      // Fallback to local blob URL if upload fails
      const newImage: QCImageUpload = { file, progress: 100, url: URL.createObjectURL(file) };
      const existing = getPhotosArrayByType(form, type);
      updatePhotoField(type as any, [...existing, newImage]);
    }
  };
  const onImageClick = (_photos: QCImageUpload[], _photoType?: string) => {};
  const onDeleteImage = (photoType: string, index: number) => {
    const key = {
      dash_lights_photos: 'dash_lights_photos',
      mileage_photos: 'mileage_photos',
      windshield_condition_photos: 'windshield_condition_photos',
      state_inspection_status_photos: 'state_inspection_status_photos',
      washer_fluid_photo: 'washer_fluid_photo',
      undercarriage_photos: 'undercarriage_photos',
      tire_repair_status_photos: 'tire_repair_status_photos',
      tpms_type_photos: 'tpms_type_photos',
      tpms_placard: 'tpms_placard',
    } as const;
    const k = (key as any)[photoType];
    if (!k) return;
    setForm(prev => ({ ...prev, [k]: ((prev as any)[k] || []).filter((_: any, i: number) => i !== index) }) as QuickCheckForm);
  };

  // Notes updates
  const onFormUpdate = useCallback((updates: Partial<QuickCheckForm>) => setForm(prev => ({ ...prev, ...updates })), [setForm]);
  const onFieldNotesChange = useCallback((fieldName: string, noteText: string) => {
    setForm(prev => ({ ...prev, field_notes: { ...prev.field_notes, [fieldName]: noteText } }));
  }, [setForm]);

  // Battery condition handlers  
  const handleBatteryConditionMainChange = useCallback((type: 'main', value: string) => {
    setForm(prev => ({ ...prev, battery_condition_main: value }));
  }, [setForm]);

  const handleBatteryTerminalsToggle = useCallback((condition: string) => {
    setForm(prev => {
      const currentTerminals = prev.battery_terminals || [];
      const newTerminals = currentTerminals.includes(condition)
        ? currentTerminals.filter(c => c !== condition)
        : [...currentTerminals, condition];
      
      return {
        ...prev,
        battery_terminals: newTerminals
      };
    });
  }, [setForm]);

  // Submit - use submitDraft to mark draft as completed (no longer a draft)
  const handleSubmit = async () => {
    setError(null);
    if (!form.vin || form.vin.replace(/\s/g, '').length < 11) {
      setError('VIN must be at least 11 characters.');
      return;
    }
    setLoading(true);
    try {
      // Use draft.submitDraft to mark the draft as submitted (transitions draft → completed record)
      await draft.submitDraft({ ...form, inspection_type: schema.submitType } as QuickCheckForm);

      // Clean up local storage
      try { localStorage.removeItem(draftKey); } catch {}

      // Reset and return home
      resetForm();
      setTabValue(0);
      navigate('/');
    } catch (e) {
      setError('Failed to submit.');
    } finally {
      setLoading(false);
    }
  };

  const enabled = (tab: TabKey) => schema.fieldsByTab[tab] as readonly string[];

  const isLastTab = tabValue >= schema.tabOrder.length - 1;

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const handleCancel = () => setCancelDialogOpen(true);
  const cancelCancel = () => setCancelDialogOpen(false);
  const confirmCancel = async () => {
    try {
      timerAPI.current?.stopAllTimers?.();
    } catch {}
    // Disable any pending autosave to avoid re-creation during delete flow
    try { draft.disableAutoSave(); } catch {}
    // Ensure the draft is deleted, not just cleared
    try { await draft.cancelDraft('delete'); } catch {}
    try {
      localStorage.removeItem(draftKey);
    } catch {}
    resetForm();
    setTabValue(0);
    navigate('/');
  };

  // History & details dialogs
  const [showHistory, setShowHistory] = useState(false);
  const [inspectionHistory, setInspectionHistory] = useState<any[]>([]);
  const [selectedInspection, setSelectedInspection] = useState<any | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showTimingDialog, setShowTimingDialog] = useState(false);

  const openHistory = async () => {
    try {
      const hist = await getQuickCheckHistory();
      setInspectionHistory(hist);
      setShowHistory(true);
    } catch {
      setError('Failed to load history');
    }
  };

  const handleViewInspection = (inspection: any) => {
    setSelectedInspection(inspection);
    setShowDetailDialog(true);
  };

  const handleDeleteInspection = async (inspectionId: number) => {
    try {
      await deleteQuickCheck(inspectionId);
      const updated = await getQuickCheckHistory();
      setInspectionHistory(updated);
    } catch {
      setError('Failed to delete');
    }
  };

  const tabNames = schema.tabOrder.map(k => {
    switch (k) {
      case 'info': return 'Info';
      case 'pulling': return 'Pulling Into Bay';
      case 'underhood': return 'Underhood';
      case 'tires': return 'Tires & Brakes';
      case 'suspension': return 'Suspension';
      default: return String(k);
    }
  });

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      <InspectionLayout
        title={schema.title}
        tabNames={tabNames}
        currentTab={tabValue}
        onChangeTab={(i) => {
          if (timerAPI.current?.changeTab) {
            timerAPI.current.changeTab(i);
          } else {
            setTabValue(i);
          }
        }}
        loading={draft.status === 'creating' || draft.status === 'updating'}
        onSave={() => handleSubmit()}
        onOpenHistory={openHistory}
        draftStatus={draft.status}
        lastSave={draft.lastSave}
        draftError={draft.error}
        showBottomNav={schema.showBottomNav !== false}
        disablePrev={tabValue === 0}
        disableNext={false}
        isLastTab={isLastTab}
        onPrev={() => timerAPI.current?.changeTab?.(Math.max(0, tabValue - 1))}
        onCancel={handleCancel}
        onNext={() => timerAPI.current?.changeTab?.(Math.min(schema.tabOrder.length - 1, tabValue + 1))}
        onSaveBottom={handleSubmit}
        saveLoading={loading}
        onShowTiming={() => setShowTimingDialog(true)}
        currentTabDuration={timerAPI.current?.getTabDuration ? timerAPI.current.getTabDuration(tabNames[tabValue]) : 0}
        totalDuration={timerAPI.current?.getTotalDuration ? timerAPI.current.getTotalDuration() : 0}
        tabTimings={form.tab_timings}
      >
        {/* Virtual timer matching Quick Check behavior */}
        <VirtualTabTimer
          tabNames={tabNames}
          currentTabIndex={tabValue}
          initialTimings={form.tab_timings}
          onTabTimingUpdate={(timings) => setForm(prev => ({ ...prev, tab_timings: timings }))}
          onTabChange={(newIndex) => setTabValue(newIndex)}
          showDebugPanel={showDebugPanel}
          isPageVisible={isPageVisible}
        >
          {(api) => {
            timerAPI.current = api;
            return null;
          }}
        </VirtualTabTimer>
        {schema.tabOrder.map((tab, idx) => (
          <TabPanel key={tab} value={tabValue} index={idx}>
            {/* Use existing components for standard inspection types, dynamic for custom types */}
            {(schema.submitType === 'quick_check' || schema.submitType === 'no_check' || schema.submitType === 'vsi') ? (
              <>
                {tab === 'info' && (
                  <InfoTab form={form} onChange={handleChange as any} enabledFields={enabled('info') as string[]} />
                )}
                {tab === 'pulling' && (
                  <PullingIntoBayTab
                    form={form}
                    loading={loading}
                    onChange={handleChange as any}
                    onRadioChange={handleRadioChange}
                    onImageUpload={onImageUpload as any}
                    onImageClick={onImageClick as any}
                    onInfoClick={() => {}}
                    onFormUpdate={onFormUpdate}
                    onFieldNotesChange={onFieldNotesChange}
                    onDeleteImage={onDeleteImage}
                    enabledFields={enabled('pulling') as string[]}
                  />
                )}
                {tab === 'underhood' && (
                  <UnderhoodTab
                    form={form}
                    loading={loading}
                    onChange={handleChange as any}
                    onRadioChange={handleRadioChange}
                    onImageUpload={onImageUpload as any}
                    onImageClick={onImageClick as any}
                    onInfoClick={() => {}}
                    onScannerOpen={() => {}}
                    onFormUpdate={onFormUpdate}
                    onBatteryConditionToggle={handleBatteryConditionToggle}
                    onBatteryConditionChange={handleBatteryConditionMainChange}
                    onBatteryTerminalsToggle={handleBatteryTerminalsToggle}
                    onVehicleDetailsOpen={() => {}}
                    onFieldNotesChange={onFieldNotesChange}
                    onDeleteImage={onDeleteImage}
                    vinDecodeLoading={false}
                    vinDecodeError={null}
                    vehicleDetails={null}
                    enabledFields={enabled('underhood') as string[]}
                  />
                )}
                {tab === 'tires' && (
                  <TiresBrakesTab
                    form={form}
                    loading={loading}
                    onChange={handleChange as any}
                    onRadioChange={handleRadioChange}
                    onImageUpload={onImageUpload as any}
                    onImageClick={onImageClick as any}
                    onInfoClick={() => {}}
                    onFormUpdate={onFormUpdate}
                    onTreadChange={handleTreadChange}
                    onTreadConditionChange={handleTreadConditionChange}
                    onTirePhotoClick={() => {}}
                    onDeleteTirePhoto={() => {}}
                    onTireDateChange={handleTireDateChange}
                    onTireCommentToggle={handleTireCommentToggle}
                    onTireStatusChange={handleTireStatusChange}
                    onTireImageUpload={async () => {}}
                    onTireImageDelete={() => {}}
                    onTPMSStatusChange={handleTPMSStatusChange}
                    onTPMSSensorTypeChange={() => {}}
                    onFieldNotesChange={onFieldNotesChange}
                    onDeleteImage={onDeleteImage}
                    setForm={setForm}
                    enabledFields={enabled('tires') as string[]}
                  />
                )}
                {tab === 'suspension' && (
                  <SuspensionTab
                    form={form}
                    loading={loading}
                    onChange={handleChange as any}
                    onRadioChange={handleRadioChange}
                    onImageUpload={onImageUpload as any}
                    onImageClick={onImageClick as any}
                    onInfoClick={() => {}}
                    onFieldNotesChange={onFieldNotesChange}
                    onDeleteImage={onDeleteImage}
                    enabledFields={enabled('suspension') as string[]}
                  />
                )}
              </>
            ) : (
              /* Use dynamic system for custom inspection types */
              <DynamicTabContent
                tabKey={tab}
                fieldIds={enabled(tab) as string[]}
                form={form}
                onChange={handleChange}
                onRadioChange={handleRadioChange}
                onImageUpload={onImageUpload as any}
                onImageClick={onImageClick as any}
                onFormUpdate={onFormUpdate}
                onFieldNotesChange={onFieldNotesChange}
                onDeleteImage={onDeleteImage}
                loading={loading}
              />
            )}
          </TabPanel>
        ))}
      </InspectionLayout>

      {/* Bottom nav now provided by InspectionLayout */}

      {/* History dialog */}
      <Dialog open={showHistory} onClose={() => setShowHistory(false)} maxWidth="md" fullWidth>
        <DialogContent>
          <Typography variant="h6" gutterBottom>Inspection History</Typography>
          {inspectionHistory.length > 0 ? (
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {inspectionHistory.map((inspection: any, index: number) => (
                <Paper key={index} sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle1">VIN: {inspection.vin || inspection.data?.vin}</Typography>
                    <Typography variant="body2" color="text.secondary">Date: {inspection.date || inspection.data?.date}</Typography>
                    <Typography variant="body2" color="text.secondary">User: {inspection.user || inspection.data?.user}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" onClick={() => handleViewInspection(inspection)}>View</Button>
                    <Button color="error" variant="outlined" onClick={() => handleDeleteInspection(inspection.id)}>Delete</Button>
                  </Stack>
                </Paper>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">No inspection history found.</Typography>
          )}
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={showDetailDialog} onClose={() => setShowDetailDialog(false)} maxWidth="md" fullWidth>
        <DialogContent>
          {selectedInspection && (
            <Box>
              <Typography variant="h6" gutterBottom>Inspection Details</Typography>
              <Typography variant="subtitle1">VIN: {selectedInspection.data?.vin}</Typography>
              <Typography>Date: {selectedInspection.data?.date}</Typography>
              <Typography>User: {selectedInspection.data?.user}</Typography>
              <Typography>Mileage: {selectedInspection.data?.mileage}</Typography>
              <Typography>Windshield Condition: {selectedInspection.data?.windshield_condition}</Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Timing dialog based on virtual timer */}
      <Dialog open={showTimingDialog} onClose={() => setShowTimingDialog(false)} maxWidth="sm" fullWidth>
        <DialogContent>
          <Typography variant="h6" gutterBottom>{schema.title} Timing Summary</Typography>
          <Box>
            {tabNames.map((name) => (
              <Box key={name} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                <Typography variant="body2" color="text.secondary">{name}:</Typography>
                <Typography variant="body2" fontWeight={500}>
                  {timerAPI.current?.getTabDuration ? `${timerAPI.current.getTabDuration(name)}s` : '0s'}
                </Typography>
              </Box>
            ))}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, mt: 1 }}>
              <Typography variant="body2" color="text.secondary">Total:</Typography>
              <Typography variant="body2" fontWeight={600}>
                {timerAPI.current?.getTotalDuration ? `${timerAPI.current.getTotalDuration()}s` : '0s'}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onClose={cancelCancel}>
        <DialogContent>
          <Typography variant="h6" gutterBottom>Cancel {schema.title}?</Typography>
          <Typography gutterBottom>
            Are you sure you want to cancel? This will permanently delete your auto-saved progress.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Tip: You can safely close your browser instead - your work will be automatically saved and restored when you return.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
            <Button onClick={cancelCancel} color="primary">No</Button>
            <Button onClick={confirmCancel} color="error" variant="contained">Yes, Cancel</Button>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InspectionPage;


