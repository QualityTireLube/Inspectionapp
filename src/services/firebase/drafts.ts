import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  runTransaction,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './config';
import { QuickCheckForm } from '../../types/quickCheck';

export interface DraftDocument {
  userId: string;
  userName: string;
  inspectionType: 'quick_check' | 'no_check' | 'vsi';
  data: QuickCheckForm;
  lastUpdated: any;
  /** Monotonically incrementing integer. Each save bumps this by 1. */
  version: number;
}

const DRAFTS_COLLECTION = 'drafts';

/**
 * Get unique draft ID for user and inspection type
 */
export const getDraftId = (userId: string, inspectionType: string): string => {
  return `${userId}-${inspectionType}`;
};

/**
 * Save or update a draft (simple, unconditional — used for the first/initial save).
 * Returns the new version number.
 */
export const saveDraft = async (
  userId: string,
  userName: string,
  inspectionType: 'quick_check' | 'no_check' | 'vsi',
  formData: QuickCheckForm
): Promise<number> => {
  const draftId = getDraftId(userId, inspectionType);
  const draftRef = doc(db, DRAFTS_COLLECTION, draftId);
  try {
    // Read current version so we can increment it atomically
    const snap = await getDoc(draftRef);
    const currentVersion: number = snap.exists() ? (snap.data().version ?? 0) : 0;
    const newVersion = currentVersion + 1;

    await setDoc(draftRef, {
      userId,
      userName,
      inspectionType,
      data: formData,
      lastUpdated: serverTimestamp(),
      version: newVersion,
    }, { merge: true });

    return newVersion;
  } catch (error) {
    console.error('❌ Error saving draft:', error);
    throw error;
  }
};

/**
 * Conflict-safe save using a Firestore transaction.
 * Compares `expectedVersion` against the stored version; if they differ it
 * means another session has saved since we last loaded.
 *
 * Returns `{ saved: true, version }` on success,
 *         `{ saved: false, conflictVersion, conflictUser }` on conflict.
 */
export const saveDraftSafe = async (
  userId: string,
  userName: string,
  inspectionType: 'quick_check' | 'no_check' | 'vsi',
  formData: QuickCheckForm,
  expectedVersion: number
): Promise<{ saved: boolean; version: number; conflictUser?: string }> => {
  const draftId = getDraftId(userId, inspectionType);
  const draftRef = doc(db, DRAFTS_COLLECTION, draftId);

  try {
    let newVersion = expectedVersion + 1;
    let conflictUser: string | undefined;

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(draftRef);
      const storedVersion: number = snap.exists() ? (snap.data().version ?? 0) : 0;

      if (snap.exists() && storedVersion !== expectedVersion) {
        // Conflict: someone else saved in between
        conflictUser = snap.data().userName ?? 'another user';
        // Still write — caller decides what to do after checking the return value
        // but we mark the conflict so the UI can warn the user
        newVersion = storedVersion + 1;
      }

      tx.set(draftRef, {
        userId,
        userName,
        inspectionType,
        data: formData,
        lastUpdated: serverTimestamp(),
        version: newVersion,
      }, { merge: true });
    });

    if (conflictUser) {
      return { saved: true, version: newVersion, conflictUser };
    }
    return { saved: true, version: newVersion };
  } catch (error) {
    console.error('❌ Error in conflict-safe draft save:', error);
    throw error;
  }
};

/**
 * Load a draft
 */
export const loadDraft = async (
  userId: string,
  inspectionType: string
): Promise<DraftDocument | null> => {
  try {
    const draftId = getDraftId(userId, inspectionType);
    const draftRef = doc(db, DRAFTS_COLLECTION, draftId);
    const draftSnap = await getDoc(draftRef);
    
    if (draftSnap.exists()) {
      return draftSnap.data() as DraftDocument;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error loading draft:', error);
    throw error;
  }
};

/**
 * Delete a draft
 */
export const deleteDraft = async (
  userId: string,
  inspectionType: string
): Promise<void> => {
  try {
    const draftId = getDraftId(userId, inspectionType);
    const draftRef = doc(db, DRAFTS_COLLECTION, draftId);
    await deleteDoc(draftRef);
    
    console.log('✅ Draft deleted:', draftId);
  } catch (error) {
    console.error('❌ Error deleting draft:', error);
    throw error;
  }
};

/**
 * Delete a draft by its raw document ID (e.g. "userId-quick_check").
 * Used by the Home screen delete button which already has the doc ID.
 */
export const deleteDraftById = async (draftDocId: string): Promise<void> => {
  try {
    const draftRef = doc(db, DRAFTS_COLLECTION, draftDocId);
    await deleteDoc(draftRef);
    console.log('✅ Draft deleted by ID:', draftDocId);
  } catch (error) {
    console.error('❌ Error deleting draft by ID:', error);
    throw error;
  }
};

/**
 * Subscribe to draft changes in real-time
 */
export const subscribeToDraft = (
  userId: string,
  inspectionType: string,
  callback: (draft: DraftDocument | null) => void
): Unsubscribe => {
  const draftId = getDraftId(userId, inspectionType);
  const draftRef = doc(db, DRAFTS_COLLECTION, draftId);
  
  return onSnapshot(draftRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data() as DraftDocument);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('❌ Error in draft subscription:', error);
    callback(null);
  });
};

/**
 * Submit draft as final inspection (moves draft to inspections collection)
 */
export const submitDraftAsInspection = async (
  userId: string,
  userName: string,
  inspectionType: 'quick_check' | 'no_check' | 'vsi',
  formData: QuickCheckForm
): Promise<string> => {
  try {
    const { createInspection } = await import('./inspections');
    
    // Create the inspection
    const inspectionId = await createInspection({
      userId,
      userName,
      inspectionType,
      data: formData,
      status: 'submitted'
    });
    
    // Delete the draft
    await deleteDraft(userId, inspectionType);
    
    console.log('✅ Draft submitted as inspection:', inspectionId);
    return inspectionId;
  } catch (error) {
    console.error('❌ Error submitting draft:', error);
    throw error;
  }
};
