import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  DocumentReference,
  QuerySnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './config';
import { QuickCheckForm } from '../../types/quickCheck';

export interface InspectionDocument {
  id?: string;
  userId: string;
  userName: string;
  inspectionType: 'quick_check' | 'no_check' | 'vsi';
  data: QuickCheckForm;
  location?: {
    id: string;
    name: string;
  };
  status: 'draft' | 'submitted' | 'archived';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const INSPECTIONS_COLLECTION = 'inspections';

/**
 * Create a new inspection
 */
export const createInspection = async (
  inspectionData: Partial<InspectionDocument>
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, INSPECTIONS_COLLECTION), {
      ...inspectionData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Inspection created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating inspection:', error);
    throw error;
  }
};

/**
 * Get inspection by ID
 */
export const getInspectionById = async (inspectionId: string): Promise<InspectionDocument | null> => {
  try {
    const docRef = doc(db, INSPECTIONS_COLLECTION, inspectionId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as InspectionDocument;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error getting inspection:', error);
    throw error;
  }
};

/**
 * Get inspections by user ID
 */
export const getInspectionsByUser = async (
  userId: string,
  inspectionType?: string,
  status?: string
): Promise<InspectionDocument[]> => {
  try {
    let q = query(
      collection(db, INSPECTIONS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    if (inspectionType) {
      q = query(q, where('inspectionType', '==', inspectionType));
    }
    
    if (status) {
      q = query(q, where('status', '==', status));
    }
    
    const querySnapshot = await getDocs(q);
    const inspections: InspectionDocument[] = [];
    
    querySnapshot.forEach((doc) => {
      inspections.push({ id: doc.id, ...doc.data() } as InspectionDocument);
    });
    
    return inspections;
  } catch (error) {
    console.error('❌ Error getting inspections:', error);
    throw error;
  }
};

/**
 * Update inspection
 */
export const updateInspection = async (
  inspectionId: string,
  updates: Partial<InspectionDocument>
): Promise<void> => {
  try {
    const docRef = doc(db, INSPECTIONS_COLLECTION, inspectionId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Inspection updated:', inspectionId);
  } catch (error) {
    console.error('❌ Error updating inspection:', error);
    throw error;
  }
};

/**
 * Delete inspection
 */
export const deleteInspection = async (inspectionId: string): Promise<void> => {
  try {
    const docRef = doc(db, INSPECTIONS_COLLECTION, inspectionId);
    await deleteDoc(docRef);
    
    console.log('✅ Inspection deleted:', inspectionId);
  } catch (error) {
    console.error('❌ Error deleting inspection:', error);
    throw error;
  }
};

/**
 * Archive inspection (soft delete)
 */
export const archiveInspection = async (inspectionId: string): Promise<void> => {
  try {
    await updateInspection(inspectionId, {
      status: 'archived'
    });
    
    console.log('✅ Inspection archived:', inspectionId);
  } catch (error) {
    console.error('❌ Error archiving inspection:', error);
    throw error;
  }
};

/**
 * Submit inspection (change from draft to submitted)
 */
export const submitInspection = async (inspectionId: string): Promise<void> => {
  try {
    await updateInspection(inspectionId, { status: 'submitted' });
    console.log('✅ Inspection submitted:', inspectionId);
  } catch (error) {
    console.error('❌ Error submitting inspection:', error);
    throw error;
  }
};

/** Get all submitted inspections (paginated, newest first). */
export const getSubmittedInspections = async (limitCount = 100): Promise<InspectionDocument[]> => {
  const q = query(
    collection(db, INSPECTIONS_COLLECTION),
    where('status', '==', 'submitted'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as InspectionDocument));
};

/** Get all draft inspections. */
export const getDraftInspections = async (limitCount = 200): Promise<InspectionDocument[]> => {
  const q = query(
    collection(db, INSPECTIONS_COLLECTION),
    where('status', '==', 'draft'),
    orderBy('updatedAt', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as InspectionDocument));
};

/** Get all archived inspections. */
export const getArchivedInspections = async (limitCount = 200): Promise<InspectionDocument[]> => {
  const q = query(
    collection(db, INSPECTIONS_COLLECTION),
    where('status', '==', 'archived'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as InspectionDocument));
};

/** Delete all draft inspections in batch. */
export const deleteAllDraftInspections = async (): Promise<void> => {
  const drafts = await getDraftInspections(500);
  await Promise.all(drafts.map(d => deleteInspection(d.id!)));
};
