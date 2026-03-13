import { useState, useRef, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  createDraftQuickCheck, 
  updateDraftQuickCheck, 
  getDraftQuickChecks, 
  deleteQuickCheck 
} from '../services/api';
import { QuickCheckForm, ImageUpload } from '../types/quickCheck';
import { useNotification } from './useNotification';

interface DraftFormState {
  draftId: number | null;
  status: 'idle' | 'loading' | 'creating' | 'updating' | 'error';
  error: string | null;
  lastSave: Date | null;
  isInitialized: boolean;
}

interface DraftFormActions {
  createDraft: (form: QuickCheckForm) => Promise<number | null>;
  updateDraft: (form: QuickCheckForm) => Promise<void>;
  deleteDraft: () => Promise<void>;
  submitDraft: (form: QuickCheckForm) => Promise<void>;
  cancelDraft: (action: 'delete' | 'archive') => Promise<void>;
  loadForm: (draftId: number) => Promise<QuickCheckForm | null>;
}

interface UseDraftFormProps {
  userId: string;
  userName: string;
  initialForm: QuickCheckForm;
  onFormLoad?: (form: QuickCheckForm) => void;
  autoSaveDelay?: number;
  // Optional scoping to avoid collisions between inspection types
  namespace?: string; // used for sessionStorage keys; defaults to 'quickcheck'
  inspectionType?: string; // used to filter/select drafts by type when loading existing drafts
}

interface UseDraftFormReturn extends DraftFormState, DraftFormActions {
  isAutoSaving: boolean;
  sessionLocked: boolean;
  scheduleAutoSave: (form: QuickCheckForm) => void;
  submitForm: (form: QuickCheckForm) => Promise<void>;
  disableAutoSave: () => void;
}

// SessionStorage utilities
const DRAFT_LOCK_KEY = 'quickcheck_draft_lock';
const DRAFT_SESSION_KEY = 'quickcheck_draft_session';

const generateSessionId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const getSessionLock = (): { userId: string; draftId: number; sessionId: string } | null => {
  try {
    const lock = sessionStorage.getItem(DRAFT_LOCK_KEY);
    return lock ? JSON.parse(lock) : null;
  } catch {
    return null;
  }
};

const setSessionLock = (userId: string, draftId: number, sessionId: string) => {
  const lockData = { userId, draftId, sessionId, timestamp: Date.now() };
  sessionStorage.setItem(DRAFT_LOCK_KEY, JSON.stringify(lockData));
  sessionStorage.setItem(DRAFT_SESSION_KEY, sessionId);
  console.log('🔐 Session lock set:', lockData);
};

const clearSessionLock = () => {
  sessionStorage.removeItem(DRAFT_LOCK_KEY);
  sessionStorage.removeItem(DRAFT_SESSION_KEY);
  console.log('🧹 Session lock cleared');
};

const getCurrentSessionId = (): string | null => {
  return sessionStorage.getItem(DRAFT_SESSION_KEY);
};

export const useDraftForm = ({
  userId,
  userName,
  initialForm,
  onFormLoad,
  autoSaveDelay = 1000,
  namespace = 'quickcheck',
  inspectionType
}: UseDraftFormProps): UseDraftFormReturn => {
  
  const location = useLocation();
  const { showSuccess, showError } = useNotification();
  
  // Core state
  const [state, setState] = useState<DraftFormState>({
    draftId: null,
    status: 'idle',
    error: null,
    lastSave: null,
    isInitialized: false
  });
  
  // Session management (namespaced per inspection type)
  const draftLockKey = `${namespace}_draft_lock`;
  const draftSessionKey = `${namespace}_draft_session`;

  const localGetSessionLock = () => {
    try {
      const lock = sessionStorage.getItem(draftLockKey);
      return lock ? JSON.parse(lock) : null;
    } catch {
      return null;
    }
  };

  const localSetSessionLock = (lockUserId: string, draftId: number, sessionId: string) => {
    const lockData = { userId: lockUserId, draftId, sessionId, timestamp: Date.now() };
    sessionStorage.setItem(draftLockKey, JSON.stringify(lockData));
    sessionStorage.setItem(draftSessionKey, sessionId);
    console.log('🔐 Session lock set:', lockData);
  };

  const localClearSessionLock = () => {
    sessionStorage.removeItem(draftLockKey);
    sessionStorage.removeItem(draftSessionKey);
    console.log('🧹 Session lock cleared');
  };

  const localGetCurrentSessionId = (): string | null => sessionStorage.getItem(draftSessionKey);

  const sessionIdRef = useRef<string>(localGetCurrentSessionId() || generateSessionId());
  const initializationLockRef = useRef(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const autosaveDisabledRef = useRef<boolean>(false);
  const creatingDraftRef = useRef<boolean>(false);
  
  // Check if current session has lock
  const sessionLocked = useCallback(() => {
    const lock = localGetSessionLock();
    return lock?.userId === userId && lock?.sessionId === sessionIdRef.current;
  }, [userId]);

  // Convert form images to API format (remove blob URLs, keep relative paths)
  const prepareFormForSave = useCallback((form: QuickCheckForm) => {
    const filterImages = (images: ImageUpload[] | undefined | null) => 
      (Array.isArray(images) ? images : [])
        .filter(img => img && img.url && !img.url.startsWith('blob:'))
        .map(img => ({ url: img.url! })); // url now contains relative path

    return {
      ...form,
      lastSaved: new Date().toISOString(),
      savedBy: userName,
      // Filter all image fields - relative paths are preserved
      dash_lights_photos: filterImages(form.dash_lights_photos),
      mileage_photos: filterImages(form.mileage_photos),
      windshield_condition_photos: filterImages(form.windshield_condition_photos),
      wiper_blades_photos: filterImages(form.wiper_blades_photos),
      washer_squirters_photos: filterImages(form.washer_squirters_photos),
      vin_photos: filterImages(form.vin_photos),
      state_inspection_status_photos: filterImages(form.state_inspection_status_photos),
      state_inspection_date_code_photos: filterImages(form.state_inspection_date_code_photos),
      battery_date_code_photos: filterImages(form.battery_date_code_photos),
      tire_repair_status_photos: filterImages(form.tire_repair_status_photos),
      tpms_type_photos: filterImages(form.tpms_type_photos),
      front_brake_pads_photos: filterImages(form.front_brake_pads_photos),
      rear_brake_pads_photos: filterImages(form.rear_brake_pads_photos),
      tpms_placard: filterImages(form.tpms_placard),
      washer_fluid_photo: filterImages(form.washer_fluid_photo),
      engine_air_filter_photo: filterImages(form.engine_air_filter_photo),
      battery_photos: filterImages(form.battery_photos),
      battery_positive_terminal_photos: filterImages(form.battery_positive_terminal_photos),
      battery_negative_terminal_photos: filterImages(form.battery_negative_terminal_photos),
      tpms_tool_photo: filterImages(form.tpms_tool_photo),
      front_brakes: filterImages(form.front_brakes),
      rear_brakes: filterImages(form.rear_brakes),
      tire_photos: (form.tire_photos || []).map(tp => ({
        type: tp.type,
        photos: filterImages(tp.photos)
      })),
      tire_repair_images: Object.keys(form.tire_repair_images || {}).reduce((acc, position) => {
        const posImages = (form.tire_repair_images as any)?.[position] || {};
        acc[position] = {
          not_repairable: filterImages(posImages.not_repairable || []),
          tire_size_brand: filterImages(posImages.tire_size_brand || []),
          repairable_spot: filterImages(posImages.repairable_spot || [])
        };
        return acc;
      }, {} as any)
    };
  }, [userName]);

  // Convert API response back to form format
  const convertApiToForm = useCallback((draftData: any): QuickCheckForm => {
    const convertToImageUploads = (items: any[]): ImageUpload[] => {
      if (!Array.isArray(items)) return [];
      return items.map((item, index) => ({
        file: new File([], `image_${index}.jpg`, { type: 'image/jpeg' }),
        progress: 100,
        url: typeof item === 'string' ? item : item.url
      }));
    };

    return {
      ...draftData,
      dash_lights_photos: convertToImageUploads(draftData.dash_lights_photos),
      mileage_photos: convertToImageUploads(draftData.mileage_photos),
      windshield_condition_photos: convertToImageUploads(draftData.windshield_condition_photos),
      wiper_blades_photos: convertToImageUploads(draftData.wiper_blades_photos),
      washer_squirters_photos: convertToImageUploads(draftData.washer_squirters_photos),
      vin_photos: convertToImageUploads(draftData.vin_photos),
      state_inspection_status_photos: convertToImageUploads(draftData.state_inspection_status_photos),
      state_inspection_date_code_photos: convertToImageUploads(draftData.state_inspection_date_code_photos),
      battery_date_code_photos: convertToImageUploads(draftData.battery_date_code_photos),
      tire_repair_status_photos: convertToImageUploads(draftData.tire_repair_status_photos),
      tpms_type_photos: convertToImageUploads(draftData.tpms_type_photos),
      front_brake_pads_photos: convertToImageUploads(draftData.front_brake_pads_photos),
      rear_brake_pads_photos: convertToImageUploads(draftData.rear_brake_pads_photos),
      tpms_placard: convertToImageUploads(draftData.tpms_placard),
      washer_fluid_photo: convertToImageUploads(draftData.washer_fluid_photo),
      engine_air_filter_photo: convertToImageUploads(draftData.engine_air_filter_photo),
      battery_photos: convertToImageUploads(draftData.battery_photos),
      battery_positive_terminal_photos: convertToImageUploads(draftData.battery_positive_terminal_photos),
      battery_negative_terminal_photos: convertToImageUploads(draftData.battery_negative_terminal_photos),
      tpms_tool_photo: convertToImageUploads(draftData.tpms_tool_photo),
      front_brakes: convertToImageUploads(draftData.front_brakes),
      rear_brakes: convertToImageUploads(draftData.rear_brakes),
      tire_photos: (draftData.tire_photos || []).map((tp: any) => ({
        type: tp.type,
        photos: convertToImageUploads(tp.photos)
      })),
      tire_repair_images: Object.keys(draftData.tire_repair_images || {}).reduce((acc, position) => {
        const posImages = draftData.tire_repair_images[position];
        acc[position] = {
          not_repairable: convertToImageUploads(posImages?.not_repairable || []),
          tire_size_brand: convertToImageUploads(posImages?.tire_size_brand || []),
          repairable_spot: convertToImageUploads(posImages?.repairable_spot || [])
        };
        return acc;
      }, {} as any)
    };
  }, []);

  // Create new draft
  const createDraft = useCallback(async (form: QuickCheckForm): Promise<number | null> => {
    console.log('🔄 createDraft called');
    
    if (!userId) {
      console.log('🚫 No userId provided');
      return null;
    }

    if (state.draftId) {
      console.log('🚫 Draft already exists:', state.draftId);
      return state.draftId;
    }

    if (state.status !== 'idle') {
      console.log('🚫 Invalid status for creation:', state.status);
      return null;
    }

    // Additional protection: prevent concurrent createDraft calls
    if (creatingDraftRef.current) {
      console.log('🚫 Draft creation already in progress, rejecting concurrent call');
      return null;
    }

    // Check session lock and validate draft still exists
    const existingLock = localGetSessionLock();
    if (existingLock?.userId === userId) {
      console.log('🔐 Session lock exists, validating draft:', existingLock.draftId);
      
      try {
        // Validate the draft still exists on server
        const drafts = await getDraftQuickChecks();
        const draftExists = drafts.some((d: any) => d.id === existingLock.draftId);
        
        if (draftExists) {
          console.log('✅ Existing draft validated, using:', existingLock.draftId);
          setState(prev => ({ ...prev, draftId: existingLock.draftId, status: 'idle' }));
          return existingLock.draftId;
        } else {
          console.log('❌ Draft no longer exists on server, clearing session lock');
          localClearSessionLock();
          // Continue with new draft creation below
        }
      } catch (error) {
        console.error('❌ Error validating existing draft:', error);
        console.log('🔄 Clearing session lock and creating new draft');
        localClearSessionLock();
        // Continue with new draft creation below
      }
    }

    setState(prev => ({ ...prev, status: 'creating', error: null }));
    creatingDraftRef.current = true;

    try {
      const title = `Draft - ${form.vin || 'New'} - ${form.date}`;
      const formData = prepareFormForSave(form);
      const finalData = {
        ...formData,
        inspection_type: inspectionType || (form as any).inspection_type || 'quick_check'
      };
      const result = await createDraftQuickCheck(title, finalData);
      
      // Set session lock immediately
      localSetSessionLock(userId, result.id, sessionIdRef.current);
      
      setState(prev => ({
        ...prev,
        draftId: result.id,
        status: 'idle',
        lastSave: new Date(),
        error: null
      }));
      
      console.log('✅ Draft created successfully:', result.id);
      
      // Call onFormLoad with the form data that was used to create the draft
      if (onFormLoad) {
        console.log('🔄 Calling onFormLoad with created draft data:', {
          vin: form.vin,
          mileage: form.mileage
        });
        onFormLoad(form);
      }
      
      showSuccess('Draft created and auto-save enabled');
      return result.id;
      
    } catch (error) {
      console.error('❌ Error creating draft:', error);
      setState(prev => ({ 
        ...prev, 
        status: 'error', 
        error: 'Failed to create draft' 
      }));
      showError('Failed to create draft');
      return null;
    } finally {
      creatingDraftRef.current = false;
    }
  }, [userId, state.draftId, state.status, prepareFormForSave, showSuccess, showError]);

  // Update existing draft
  const updateDraft = useCallback(async (form: QuickCheckForm): Promise<void> => {
    if (!state.draftId || !userId || state.status === 'updating') {
      return;
    }

    // Verify session lock ownership
    if (!sessionLocked()) {
      // Attempt to adopt or re-establish lock for this user/draft to keep autosave working
      const existingLock = localGetSessionLock();
      if (existingLock && existingLock.userId === userId && existingLock.draftId === state.draftId) {
        // Align our session with existing lock
        sessionIdRef.current = existingLock.sessionId;
        console.log('🔐 Adopted existing session lock for autosave');
      } else {
        // Recreate lock for this namespace/user/draft
        localSetSessionLock(userId, state.draftId, sessionIdRef.current);
        console.log('🔐 Re-established session lock for autosave');
      }
    }

    setIsAutoSaving(true);
    setState(prev => ({ ...prev, status: 'updating', error: null }));

    try {
      const title = `Draft - ${form.vin || 'New'} - ${form.date}`;
      const formData = prepareFormForSave(form);
      const finalData = {
        ...formData,
        inspection_type: inspectionType || (form as any).inspection_type || 'quick_check'
      };
      
      await updateDraftQuickCheck(state.draftId, title, finalData);
      
      setState(prev => ({
        ...prev,
        status: 'idle',
        lastSave: new Date(),
        error: null
      }));
      
      console.log('✅ Draft auto-saved successfully');
      
    } catch (error: any) {
      console.error('❌ Error updating draft:', error);
      
      // Handle 404 - draft no longer exists on server
      if (error.response?.status === 404) {
        console.log('🔄 Draft not found on server, creating new draft...');
        
        // Clear the invalid draft state
        setState(prev => ({ 
          ...prev, 
          draftId: null, 
          status: 'idle', 
          error: null 
        }));
        
        // Clear session lock for invalid draft
        localClearSessionLock();
        
        // Create a new draft with current form data
        try {
          const newDraftId = await createDraft(form);
          if (newDraftId) {
            console.log('✅ New draft created after 404:', newDraftId);
            showSuccess('Draft recreated and saved');
          }
        } catch (createError) {
          console.error('❌ Failed to recreate draft:', createError);
          setState(prev => ({ 
            ...prev, 
            status: 'error', 
            error: 'Failed to recreate draft' 
          }));
        }
      } else {
        // Other errors - show generic error
        setState(prev => ({ 
          ...prev, 
          status: 'error', 
          error: 'Failed to auto-save draft' 
        }));
      }
    } finally {
      setIsAutoSaving(false);
    }
  }, [state.draftId, state.status, userId, sessionLocked, prepareFormForSave, createDraft, showSuccess]);

  // Load existing draft by ID
  const loadForm = useCallback(async (draftId: number): Promise<QuickCheckForm | null> => {
    setState(prev => ({ ...prev, status: 'loading', error: null }));

    try {
      const drafts = await getDraftQuickChecks();
      const draft = drafts.find((d: any) => d.id === draftId);
      
      if (!draft) {
        setState(prev => ({ ...prev, status: 'error', error: 'Draft not found' }));
        return null;
      }

      const draftData = JSON.parse(draft.data);
      const formData = convertApiToForm(draftData);
      
      setState(prev => ({
        ...prev,
        draftId,
        status: 'idle',
        lastSave: new Date(draftData.lastSaved || draft.created_at),
        error: null
      }));

      // Set session lock for loaded draft (namespaced)
      localSetSessionLock(userId, draftId, sessionIdRef.current);
      
      console.log('✅ Draft loaded successfully:', draftId);
      onFormLoad?.(formData);
      return formData;
      
    } catch (error) {
      console.error('❌ Error loading draft:', error);
      setState(prev => ({ 
        ...prev, 
        status: 'error', 
        error: 'Failed to load draft' 
      }));
      return null;
    }
  }, [convertApiToForm, userId, onFormLoad]);

  // Delete draft
  const deleteDraft = useCallback(async (): Promise<void> => {
    let targetDraftId = state.draftId;

    try {
      // If we don't currently have a draftId, try to resolve one from the namespaced lock
      if (!targetDraftId) {
        const lock = localGetSessionLock();
        if (lock && lock.userId === userId) {
          targetDraftId = lock.draftId;
          console.log('🧭 Resolved draftId from session lock for deletion:', targetDraftId);
        }
      }

      // As a final fallback, look up drafts and pick the user's active draft(s) for this inspection type
      if (!targetDraftId) {
        try {
          const drafts = await getDraftQuickChecks();
          const matching = drafts.filter((d: any) => {
            try {
              const data = JSON.parse(d.data);
              const notFinished = !data.submitted_datetime && !data.archived_datetime;
              const savedByUser = data.savedBy === userName;
              const typeMatches = inspectionType ? data.inspection_type === inspectionType : true;
              return notFinished && savedByUser && typeMatches;
            } catch {
              return false;
            }
          });
          if (matching.length > 0) {
            // Delete all matching drafts to ensure cleanup
            for (const d of matching) {
              try {
                await deleteQuickCheck(d.id);
              } catch (delErr: any) {
                if (delErr?.response?.status !== 404) {
                  console.warn('Delete error for draft', d.id, delErr);
                }
              }
            }
            targetDraftId = matching[0].id;
            console.log('🧭 Resolved and deleted matching drafts for deletion, primary:', targetDraftId);
          }
        } catch (lookupErr) {
          console.warn('Unable to lookup drafts to resolve deletion target:', lookupErr);
        }
      }

      if (!targetDraftId) {
        console.log('ℹ️ No draft to delete');
        localClearSessionLock();
        setState(prev => ({ ...prev, draftId: null, status: 'idle', error: null, lastSave: null, isInitialized: true }));
        return;
      }

      // If we still have a specific target, attempt delete (may already be deleted in bulk step above)
      try { await deleteQuickCheck(targetDraftId); } catch (finalErr: any) {
        if (finalErr?.response?.status !== 404) {
          throw finalErr;
        }
      }
      localClearSessionLock();
      setState({
        draftId: null,
        status: 'idle',
        error: null,
        lastSave: null,
        isInitialized: true
      });
      console.log('✅ Draft deleted successfully');
      showSuccess('Draft deleted');
      
    } catch (error: any) {
      console.error('❌ Error deleting draft:', error);
      
      // Handle 404 errors gracefully - draft might already be consumed/deleted
      if (error?.response?.status === 404) {
        console.log('🔍 Draft already deleted or consumed, clearing local state');
        localClearSessionLock();
        setState({
          draftId: null,
          status: 'idle',
          error: null,
          lastSave: null,
          isInitialized: true
        });
        showSuccess('Draft already removed');
      } else {
        setState(prev => ({ ...prev, error: 'Failed to delete draft' }));
        showError('Failed to delete draft');
      }
    }
  }, [state.draftId, userId, userName, inspectionType, showSuccess, showError]);

  // Submit draft (mark as completed)
  const submitDraft = useCallback(async (form: QuickCheckForm): Promise<void> => {
    if (!state.draftId) return;

    try {
      const typeTitle = form.inspection_type === 'no_check' ? 'No Check' : 'Quick Check';
      const title = `${typeTitle} - ${form.vin} - ${form.date}`;
      const formData = {
        ...prepareFormForSave(form),
        submitted_datetime: new Date().toISOString(),
        status: 'submitted'
      };
      
      await updateDraftQuickCheck(state.draftId, title, formData);
      localClearSessionLock();
      
      setState({
        draftId: null,
        status: 'idle',
        error: null,
        lastSave: null,
        isInitialized: true
      });
      
      console.log('✅ Draft submitted successfully');
      showSuccess('Quick Check submitted successfully!');
      
    } catch (error: any) {
      console.error('❌ Error submitting draft:', error);
      
      // Handle 404 - draft no longer exists, but we can still show success since intent was to submit
      if (error?.response?.status === 404) {
        console.log('🔍 Draft not found during submission, likely already submitted or deleted');
        localClearSessionLock();
        setState({
          draftId: null,
          status: 'idle',
          error: null,
          lastSave: null,
          isInitialized: true
        });
        showSuccess('Draft was already submitted or processed');
        return; // Don't throw error for 404 on submission
      } else {
        setState(prev => ({ ...prev, error: 'Failed to submit draft' }));
        showError('Failed to submit Quick Check');
        throw error;
      }
    }
  }, [state.draftId, prepareFormForSave, showSuccess, showError]);

  // Cancel draft with options
  const cancelDraft = useCallback(async (action: 'delete' | 'archive'): Promise<void> => {
    if (action === 'delete') {
      // Always attempt deletion (deleteDraft can resolve target draft by lock or lookup)
      await deleteDraft();
      return;
    } else {
      // Archive: mark as archived but keep the data
      try {
        // Resolve a draft id if not present
        let targetId = state.draftId;
        if (!targetId) {
          const lock = localGetSessionLock();
          if (lock && lock.userId === userId) {
            targetId = lock.draftId;
          } else {
            try {
              const drafts = await getDraftQuickChecks();
              const match = drafts.find((d: any) => {
                try {
                  const data = JSON.parse(d.data);
                  const notFinished = !data.submitted_datetime && !data.archived_datetime;
                  const savedByUser = data.savedBy === userName;
                  const typeMatches = inspectionType ? data.inspection_type === inspectionType : true;
                  return notFinished && savedByUser && typeMatches;
                } catch { return false; }
              });
              if (match) targetId = match.id;
            } catch {}
          }
        }

        if (!targetId) {
          // Nothing to archive
          return;
        }

        const formData = {
          archived_datetime: new Date().toISOString(),
          status: 'archived'
        };
        
          await updateDraftQuickCheck(targetId, 'Archived Draft', formData);
          localClearSessionLock();
        
        setState({
          draftId: null,
          status: 'idle',
          error: null,
          lastSave: null,
          isInitialized: true
        });
        
        console.log('✅ Draft archived successfully');
        showSuccess('Draft archived');
        
      } catch (error) {
        console.error('❌ Error archiving draft:', error);
        showError('Failed to archive draft');
      }
    }
  }, [state.draftId, deleteDraft, showSuccess, showError]);

  // Initialize draft system - enforces single draft per inspection type
  const initializeDraftSystem = useCallback(async () => {
    if (initializationLockRef.current || state.isInitialized || !userId) {
      return;
    }

    initializationLockRef.current = true;
    console.log('🔄 Initializing draft system for user:', userId, 'inspection type:', inspectionType);

    try {
      // Check URL parameters first
      const urlParams = new URLSearchParams(location.search);
      const draftIdFromUrl = urlParams.get('draftId');
      const vinFromUrl = urlParams.get('vin');
      
      // STEP 1: Handle specific draft ID from URL (highest priority)
      if (draftIdFromUrl) {
        console.log('📂 Loading specific draft from URL:', draftIdFromUrl);
        await loadForm(parseInt(draftIdFromUrl));
        return;
      }

      // STEP 2: Enforce single draft per inspection type rule
      console.log('🔍 Checking for existing drafts for inspection type:', inspectionType);
      const drafts = await getDraftQuickChecks();
      const userDraftsForType = drafts.filter((draft: any) => {
        try {
          const draftData = JSON.parse(draft.data);
          const notFinished = !draftData.submitted_datetime && !draftData.archived_datetime;
          const savedByUser = draftData.savedBy === userName;
          const typeMatches = inspectionType ? draftData.inspection_type === inspectionType : true;
          return notFinished && savedByUser && typeMatches;
        } catch {
          return false;
        }
      });

      // If user has existing draft(s) for this inspection type, auto-reopen the most recent one
      if (userDraftsForType.length > 0) {
        // Sort by last update time and keep the most recent
        const sortedDrafts = userDraftsForType.sort((a: any, b: any) => {
          const aTime = new Date(a.updated_at || a.created_at).getTime();
          const bTime = new Date(b.updated_at || b.created_at).getTime();
          return bTime - aTime; // Most recent first
        });

        const primaryDraft = sortedDrafts[0];
        console.log('🔄 Auto-reopening existing draft for inspection type:', inspectionType, 'draft ID:', primaryDraft.id);
        
        // Notify user that existing draft was reopened
        const typeLabel = inspectionType === 'no_check' ? 'No Check' : 'Quick Check';
        showSuccess(`Continuing your existing ${typeLabel} draft (Draft ID: ${primaryDraft.id})`);

        // Delete any duplicate drafts to enforce single draft rule
        for (let i = 1; i < sortedDrafts.length; i++) {
          try {
            console.log('🗑️ Deleting duplicate draft:', sortedDrafts[i].id);
            await deleteQuickCheck(sortedDrafts[i].id);
          } catch (delErr) {
            console.warn('Failed to delete duplicate draft:', sortedDrafts[i].id, delErr);
          }
        }

        // Handle VIN from URL - update existing draft with new VIN if provided
        if (vinFromUrl) {
          console.log('📋 VIN provided in URL, updating existing draft with VIN:', vinFromUrl);
          const existingData = JSON.parse(primaryDraft.data);
          const updatedForm: QuickCheckForm = {
            ...existingData,
            vin: vinFromUrl,
            mileage: urlParams.get('mileage') ? String(urlParams.get('mileage')) : existingData.mileage,
          };

          const title = `Draft - ${updatedForm.vin || 'New'} - ${updatedForm.date}`;
          const finalData = {
            ...prepareFormForSave(updatedForm),
            inspection_type: inspectionType || updatedForm.inspection_type
          };
          await updateDraftQuickCheck(primaryDraft.id, title, finalData);
          
          // Set session lock and state
          localSetSessionLock(userId, primaryDraft.id, sessionIdRef.current);
          setState(prev => ({
            ...prev,
            draftId: primaryDraft.id,
            status: 'idle',
            lastSave: new Date(),
            error: null
          }));

          onFormLoad?.(updatedForm);
          return;
        }

        // No VIN from URL - just reopen the existing draft as-is
        await loadForm(primaryDraft.id);
        return;
      }

      // STEP 3: No existing drafts - create new one
      console.log('📝 No existing drafts found, creating new draft for inspection type:', inspectionType);

      let newForm: QuickCheckForm;
      if (vinFromUrl) {
        // Create with VIN/mileage from URL
        console.log('📋 Creating new draft with VIN from URL:', vinFromUrl);
        newForm = { 
          ...initialForm, 
          vin: vinFromUrl,
          mileage: urlParams.get('mileage') ? String(urlParams.get('mileage')) : initialForm.mileage,
          inspection_type: (inspectionType as any) || (initialForm as any).inspection_type || 'quick_check'
        } as QuickCheckForm;
      } else {
        // Create blank form
        newForm = { 
          ...initialForm, 
          inspection_type: (inspectionType as any) || (initialForm as any).inspection_type || 'quick_check'
        } as QuickCheckForm;
      }

      await createDraft(newForm);

    } catch (error) {
      console.error('❌ Error initializing draft system:', error);
      setState(prev => ({ ...prev, error: 'Failed to initialize draft system' }));
    } finally {
      setState(prev => ({ ...prev, isInitialized: true }));
      initializationLockRef.current = false;
    }
  }, [userId, userName, location.search, initialForm, loadForm, createDraft, state.isInitialized, inspectionType, prepareFormForSave, onFormLoad]);

  // Auto-save with debouncing
  const scheduleAutoSave = useCallback((form: QuickCheckForm) => {
    console.log('⏰ scheduleAutoSave called - Status:', state.status, 'DraftId:', state.draftId, 'Disabled:', autosaveDisabledRef.current);
    if (autosaveDisabledRef.current) return;
    // If we're in the middle of an update, skip scheduling
    if (state.status === 'updating') return;

    // If no draft exists yet, attempt to create one on-the-fly (prevent concurrent creation)
    if (!state.draftId) {
      if (creatingDraftRef.current) {
        console.log('📝 Draft creation already in progress, skipping concurrent attempt');
        return;
      }
      
      console.log('📝 No draftId present on schedule, attempting to create draft for autosave');
      creatingDraftRef.current = true;
      
      createDraft({ ...form, inspection_type: (inspectionType as any) || (form as any).inspection_type || 'quick_check' } as QuickCheckForm)
        .then(() => {
          // After creation, schedule an update shortly
          if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
          autoSaveTimeoutRef.current = setTimeout(() => updateDraft(form), autoSaveDelay);
        })
        .catch((err) => {
          console.error('❌ Failed to create draft for autosave:', err);
        })
        .finally(() => {
          creatingDraftRef.current = false;
        });
      return;
    }

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Schedule new auto-save
    console.log(`⏱️ Auto-save scheduled for ${autoSaveDelay}ms delay`);
    autoSaveTimeoutRef.current = setTimeout(() => {
      if (!autosaveDisabledRef.current) {
        console.log('💾 Auto-save timer fired - calling updateDraft');
        updateDraft(form);
      } else {
        console.log('⏹️ Auto-save timer fired but disabled');
      }
    }, autoSaveDelay);
  }, [state.draftId, state.status, updateDraft, autoSaveDelay, createDraft, inspectionType]);

  // Initialize on mount and user change
  useEffect(() => {
    if (userId && !state.isInitialized) {
      initializeDraftSystem();
    }
  }, [userId, initializeDraftSystem, state.isInitialized]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Reset when user changes
  useEffect(() => {
    const currentLock = localGetSessionLock();
    if (currentLock && currentLock.userId !== userId) {
      console.log('👤 User changed, resetting draft system');
      localClearSessionLock();
      setState({
        draftId: null,
        status: 'idle',
        error: null,
        lastSave: null,
        isInitialized: false
      });
      // Reset draft creation flag on user change
      creatingDraftRef.current = false;
      initializationLockRef.current = false;
    }
  }, [userId]);

  return {
    // State
    draftId: state.draftId,
    status: state.status,
    error: state.error,
    lastSave: state.lastSave,
    isInitialized: state.isInitialized,
    isAutoSaving,
    sessionLocked: sessionLocked(),
    
    // Actions
    createDraft,
    updateDraft,
    deleteDraft,
    submitDraft,
    submitForm: submitDraft, // Alias for compatibility
    cancelDraft,
    loadForm,
    scheduleAutoSave,
    disableAutoSave: () => { autosaveDisabledRef.current = true; }
  };
}; 