import { useState, useRef, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  saveDraft,
  loadDraft,
  deleteDraft as fbDeleteDraft,
  submitDraftAsInspection,
  getDraftId,
} from '../services/firebase/drafts';
import { QuickCheckForm, ImageUpload } from '../types/quickCheck';
import { useNotification } from './useNotification';

interface DraftFormState {
  draftId: string | null;
  status: 'idle' | 'loading' | 'creating' | 'updating' | 'error';
  error: string | null;
  lastSave: Date | null;
  isInitialized: boolean;
}

interface DraftFormActions {
  createDraft: (form: QuickCheckForm) => Promise<string | null>;
  updateDraft: (form: QuickCheckForm) => Promise<void>;
  deleteDraft: () => Promise<void>;
  submitDraft: (form: QuickCheckForm) => Promise<void>;
  cancelDraft: (action: 'delete' | 'archive') => Promise<void>;
  loadForm: (draftId: string) => Promise<QuickCheckForm | null>;
}

interface UseDraftFormProps {
  userId: string;
  userName: string;
  initialForm: QuickCheckForm;
  onFormLoad?: (form: QuickCheckForm) => void;
  autoSaveDelay?: number;
  namespace?: string;
  inspectionType?: string;
}

interface UseDraftFormReturn extends DraftFormState, DraftFormActions {
  isAutoSaving: boolean;
  sessionLocked: boolean;
  scheduleAutoSave: (form: QuickCheckForm) => void;
  submitForm: (form: QuickCheckForm) => Promise<void>;
  disableAutoSave: () => void;
}

const IMAGE_ARRAY_KEYS = new Set([
  'dash_lights_photos', 'mileage_photos', 'windshield_condition_photos',
  'wiper_blades_photos', 'washer_squirters_photos', 'vin_photos',
  'state_inspection_status_photos', 'state_inspection_date_code_photos',
  'battery_date_code_photos', 'tire_repair_status_photos', 'tpms_type_photos',
  'front_brake_pads_photos', 'rear_brake_pads_photos', 'tpms_placard',
  'washer_fluid_photo', 'engine_air_filter_photo', 'battery_photos',
  'battery_positive_terminal_photos', 'battery_negative_terminal_photos',
  'tpms_tool_photo', 'front_brakes', 'rear_brakes', 'undercarriage_photos',
  'check_engine_mounts_photos', 'exterior_lights_photos', 'drive_belt_photos',
  'engine_mounts_photos', 'brake_fluid_photos', 'powersteering_fluid_photos',
  'coolant_photos', 'radiator_end_caps_photos', 'cooling_hoses_photos',
  'front_shock_struts_photos', 'rear_shock_struts_photos', 'leaks_photos',
  'left_control_arm_bushings_photos', 'left_ball_joints_photos',
  'right_control_arm_bushings_photos', 'right_ball_joints_photos',
  'sway_bar_photos', 'suspension_type_photos',
]);

const filterImages = (images: ImageUpload[] | undefined | null) =>
  (Array.isArray(images) ? images : [])
    .filter(img => img?.url && !img.url.startsWith('blob:'))
    .map(img => ({ url: img.url! }));

/** Recursively remove undefined values (Firestore rejects them). */
const stripUndefined = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  if (typeof obj === 'object' && !(obj instanceof Date) && !(obj instanceof File)) {
    const clean: any = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) clean[k] = stripUndefined(v);
    }
    return clean;
  }
  return obj;
};

/** Strip File objects and blob: URLs before saving to Firestore. */
const prepareFormForSave = (form: QuickCheckForm, userName: string): any => {
  const result: any = {
    ...form,
    lastSaved: new Date().toISOString(),
    savedBy: userName,
  };

  for (const key of Object.keys(result)) {
    if (IMAGE_ARRAY_KEYS.has(key)) {
      result[key] = filterImages(result[key]);
    }
  }

  result.tire_photos = (form.tire_photos || []).map(tp => ({
    type: tp.type,
    photos: filterImages(tp.photos),
  }));

  result.tire_repair_images = Object.keys(form.tire_repair_images || {}).reduce((acc, pos) => {
    const posImages = (form.tire_repair_images as any)?.[pos] || {};
    acc[pos] = {
      not_repairable: filterImages(posImages.not_repairable || []),
      tire_size_brand: filterImages(posImages.tire_size_brand || []),
      repairable_spot: filterImages(posImages.repairable_spot || []),
    };
    return acc;
  }, {} as any);

  return stripUndefined(result);
};

const toImageUploads = (items: any[]): ImageUpload[] => {
  if (!Array.isArray(items)) return [];
  return items.map((item, idx) => ({
    file: new File([], `image_${idx}.jpg`, { type: 'image/jpeg' }),
    progress: 100,
    url: typeof item === 'string' ? item : item?.url,
  }));
};

/** Restore image arrays from plain URL objects back to ImageUpload shape. */
const convertToForm = (data: any): QuickCheckForm => {
  const result: any = { ...data };

  for (const key of IMAGE_ARRAY_KEYS) {
    if (key in result) {
      result[key] = toImageUploads(result[key]);
    }
  }

  result.tire_photos = (data.tire_photos || []).map((tp: any) => ({
    type: tp.type,
    photos: toImageUploads(tp.photos),
  }));

  result.tire_repair_images = Object.keys(data.tire_repair_images || {}).reduce((acc, pos) => {
    const posImages = data.tire_repair_images[pos];
    acc[pos] = {
      not_repairable: toImageUploads(posImages?.not_repairable || []),
      tire_size_brand: toImageUploads(posImages?.tire_size_brand || []),
      repairable_spot: toImageUploads(posImages?.repairable_spot || []),
    };
    return acc;
  }, {} as any);

  return result as QuickCheckForm;
};

export const useDraftForm = ({
  userId,
  userName,
  initialForm,
  onFormLoad,
  autoSaveDelay = 3000,
  inspectionType,
}: UseDraftFormProps): UseDraftFormReturn => {
  const location = useLocation();
  const { showSuccess, showError } = useNotification();

  const [state, setState] = useState<DraftFormState>({
    draftId: null,
    status: 'idle',
    error: null,
    lastSave: null,
    isInitialized: false,
  });

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const autosaveDisabledRef = useRef(false);
  const initializationLockRef = useRef(false);
  const savingRef = useRef(false);

  const iType = (inspectionType || 'quick_check') as 'quick_check' | 'no_check' | 'vsi';

  const createDraft = useCallback(async (form: QuickCheckForm): Promise<string | null> => {
    if (!userId) return null;
    setState(prev => ({ ...prev, status: 'creating', error: null }));
    try {
      const prepared = prepareFormForSave({ ...form, inspection_type: iType }, userName);
      await saveDraft(userId, userName, iType, prepared as QuickCheckForm);
      const draftId = getDraftId(userId, iType);
      setState(prev => ({ ...prev, draftId, status: 'idle', lastSave: new Date() }));
      return draftId;
    } catch {
      setState(prev => ({ ...prev, status: 'error', error: 'Failed to create draft' }));
      showError('Failed to create draft');
      return null;
    }
  }, [userId, userName, iType, showError]);

  const updateDraft = useCallback(async (form: QuickCheckForm): Promise<void> => {
    if (!userId || savingRef.current) return;
    savingRef.current = true;
    setIsAutoSaving(true);
    setState(prev => ({ ...prev, status: 'updating', error: null }));
    try {
      const prepared = prepareFormForSave({ ...form, inspection_type: iType }, userName);
      await saveDraft(userId, userName, iType, prepared as QuickCheckForm);
      setState(prev => ({ ...prev, status: 'idle', lastSave: new Date() }));
    } catch {
      setState(prev => ({ ...prev, status: 'error', error: 'Failed to auto-save' }));
    } finally {
      setIsAutoSaving(false);
      savingRef.current = false;
    }
  }, [userId, userName, iType]);

  const loadForm = useCallback(async (_draftId: string): Promise<QuickCheckForm | null> => {
    if (!userId) return null;
    setState(prev => ({ ...prev, status: 'loading' }));
    try {
      const draft = await loadDraft(userId, iType);
      if (!draft) {
        setState(prev => ({ ...prev, status: 'idle', error: 'Draft not found' }));
        return null;
      }
      const formData = convertToForm(draft.data);
      const draftId = getDraftId(userId, iType);
      setState(prev => ({ ...prev, draftId, status: 'idle', lastSave: new Date() }));
      onFormLoad?.(formData);
      return formData;
    } catch {
      setState(prev => ({ ...prev, status: 'error', error: 'Failed to load draft' }));
      return null;
    }
  }, [userId, iType, onFormLoad]);

  const deleteDraft = useCallback(async (): Promise<void> => {
    try {
      if (userId) await fbDeleteDraft(userId, iType);
      setState({ draftId: null, status: 'idle', error: null, lastSave: null, isInitialized: true });
      showSuccess('Draft deleted');
    } catch {
      setState(prev => ({ ...prev, error: 'Failed to delete draft' }));
      showError('Failed to delete draft');
    }
  }, [userId, iType, showSuccess, showError]);

  const submitDraft = useCallback(async (form: QuickCheckForm): Promise<void> => {
    if (!userId) return;
    try {
      const prepared = prepareFormForSave({ ...form, inspection_type: iType }, userName);
      await submitDraftAsInspection(userId, userName, iType, prepared as QuickCheckForm);
      setState({ draftId: null, status: 'idle', error: null, lastSave: null, isInitialized: true });
      showSuccess('Inspection submitted successfully!');
    } catch (err) {
      setState(prev => ({ ...prev, error: 'Failed to submit' }));
      showError('Failed to submit inspection');
      throw err;
    }
  }, [userId, userName, iType, showSuccess, showError]);

  const cancelDraft = useCallback(async (action: 'delete' | 'archive'): Promise<void> => {
    if (action === 'delete') {
      await deleteDraft();
    } else {
      try {
        if (userId) await fbDeleteDraft(userId, iType);
        setState({ draftId: null, status: 'idle', error: null, lastSave: null, isInitialized: true });
        showSuccess('Draft archived');
      } catch {
        showError('Failed to archive draft');
      }
    }
  }, [userId, iType, deleteDraft, showSuccess, showError]);

  const initializeDraftSystem = useCallback(async () => {
    if (initializationLockRef.current || state.isInitialized || !userId) return;
    initializationLockRef.current = true;

    try {
      // Check if a VIN was passed in the URL (e.g. from Home screen)
      const urlParams = new URLSearchParams(location.search);
      const vinFromUrl = urlParams.get('vin');
      const mileageFromUrl = urlParams.get('mileage');

      const existing = await loadDraft(userId, iType);

      if (existing) {
        const formData = convertToForm(existing.data);
        // If URL provides a VIN, override the draft's VIN
        if (vinFromUrl) {
          formData.vin = vinFromUrl.toUpperCase();
          if (mileageFromUrl) formData.mileage = mileageFromUrl;
        }
        const draftId = getDraftId(userId, iType);
        setState(prev => ({ ...prev, draftId, status: 'idle', lastSave: new Date(), isInitialized: true }));
        onFormLoad?.(formData);
        showSuccess(`Continuing your existing ${iType.replace(/_/g, ' ')} draft`);
      } else {
        // No existing draft — create a fresh one (pre-fill VIN from URL if present)
        const newForm: QuickCheckForm = {
          ...initialForm,
          inspection_type: iType as any,
          ...(vinFromUrl ? { vin: vinFromUrl.toUpperCase() } : {}),
          ...(mileageFromUrl ? { mileage: mileageFromUrl } : {}),
        };
        const prepared = prepareFormForSave(newForm, userName);
        await saveDraft(userId, userName, iType, prepared as QuickCheckForm);
        const draftId = getDraftId(userId, iType);
        setState(prev => ({ ...prev, draftId, status: 'idle', lastSave: new Date(), isInitialized: true }));
      }
    } catch {
      setState(prev => ({ ...prev, error: 'Failed to initialize draft', isInitialized: true }));
    } finally {
      initializationLockRef.current = false;
    }
  }, [userId, userName, iType, initialForm, state.isInitialized, location.search, onFormLoad, showSuccess]);

  const scheduleAutoSave = useCallback((form: QuickCheckForm) => {
    if (autosaveDisabledRef.current || state.status === 'updating') return;
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(() => {
      if (!autosaveDisabledRef.current) updateDraft(form);
    }, autoSaveDelay);
  }, [state.status, updateDraft, autoSaveDelay]);

  useEffect(() => {
    if (userId && !state.isInitialized) initializeDraftSystem();
  }, [userId, initializeDraftSystem, state.isInitialized]);

  // Reset when user changes
  useEffect(() => {
    setState({ draftId: null, status: 'idle', error: null, lastSave: null, isInitialized: false });
    initializationLockRef.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, []);

  return {
    draftId: state.draftId,
    status: state.status,
    error: state.error,
    lastSave: state.lastSave,
    isInitialized: state.isInitialized,
    isAutoSaving,
    sessionLocked: false,
    createDraft,
    updateDraft,
    deleteDraft,
    submitDraft,
    submitForm: submitDraft,
    cancelDraft,
    loadForm,
    scheduleAutoSave,
    disableAutoSave: () => { autosaveDisabledRef.current = true; },
  };
};
