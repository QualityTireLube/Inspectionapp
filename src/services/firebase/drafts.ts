import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
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
}

const DRAFTS_COLLECTION = 'drafts';

/**
 * Get unique draft ID for user and inspection type
 */
export const getDraftId = (userId: string, inspectionType: string): string => {
  return `${userId}-${inspectionType}`;
};

/**
 * Save or update a draft
 */
export const saveDraft = async (
  userId: string,
  userName: string,
  inspectionType: 'quick_check' | 'no_check' | 'vsi',
  formData: QuickCheckForm
): Promise<void> => {
  try {
    const draftId = getDraftId(userId, inspectionType);
    const draftRef = doc(db, DRAFTS_COLLECTION, draftId);
    
    await setDoc(draftRef, {
      userId,
      userName,
      inspectionType,
      data: formData,
      lastUpdated: serverTimestamp()
    }, { merge: true });
    
    console.log('✅ Draft saved:', draftId);
  } catch (error) {
    console.error('❌ Error saving draft:', error);
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
