import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from './config';
import { InspectionDocument } from './inspections';

export type InspectionUpdateCallback = (inspections: InspectionDocument[]) => void;
export type ErrorCallback = (error: Error) => void;

/**
 * Subscribe to real-time inspection updates for a user
 */
export const subscribeToInspections = (
  userId: string,
  inspectionType?: string,
  callback: InspectionUpdateCallback,
  onError?: ErrorCallback
): Unsubscribe => {
  try {
    let q = query(
      collection(db, 'inspections'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    if (inspectionType) {
      q = query(q, where('inspectionType', '==', inspectionType));
    }
    
    return onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const inspections: InspectionDocument[] = [];
        snapshot.forEach((doc) => {
          inspections.push({ id: doc.id, ...doc.data() } as InspectionDocument);
        });
        callback(inspections);
      },
      (error) => {
        console.error('❌ Error in inspections subscription:', error);
        if (onError) onError(error);
      }
    );
  } catch (error) {
    console.error('❌ Error setting up inspections subscription:', error);
    if (onError) onError(error as Error);
    return () => {}; // Return empty unsubscribe function
  }
};

/**
 * Subscribe to submitted inspections (status = 'submitted')
 */
export const subscribeToSubmittedInspections = (
  userId: string,
  callback: InspectionUpdateCallback,
  onError?: ErrorCallback
): Unsubscribe => {
  try {
    const q = query(
      collection(db, 'inspections'),
      where('userId', '==', userId),
      where('status', '==', 'submitted'),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(
      q,
      (snapshot) => {
        const inspections: InspectionDocument[] = [];
        snapshot.forEach((doc) => {
          inspections.push({ id: doc.id, ...doc.data() } as InspectionDocument);
        });
        callback(inspections);
      },
      (error) => {
        console.error('❌ Error in submitted inspections subscription:', error);
        if (onError) onError(error);
      }
    );
  } catch (error) {
    console.error('❌ Error setting up submitted inspections subscription:', error);
    if (onError) onError(error as Error);
    return () => {};
  }
};

/**
 * Subscribe to in-progress inspections (status = 'draft')
 */
export const subscribeToInProgressInspections = (
  userId: string,
  callback: InspectionUpdateCallback,
  onError?: ErrorCallback
): Unsubscribe => {
  try {
    const q = query(
      collection(db, 'inspections'),
      where('userId', '==', userId),
      where('status', '==', 'draft'),
      orderBy('updatedAt', 'desc')
    );
    
    return onSnapshot(
      q,
      (snapshot) => {
        const inspections: InspectionDocument[] = [];
        snapshot.forEach((doc) => {
          inspections.push({ id: doc.id, ...doc.data() } as InspectionDocument);
        });
        callback(inspections);
      },
      (error) => {
        console.error('❌ Error in in-progress inspections subscription:', error);
        if (onError) onError(error);
      }
    );
  } catch (error) {
    console.error('❌ Error setting up in-progress inspections subscription:', error);
    if (onError) onError(error as Error);
    return () => {};
  }
};

/**
 * Subscribe to inspection updates by inspection type
 */
export const subscribeToInspectionsByType = (
  userId: string,
  inspectionType: 'quick_check' | 'no_check' | 'vsi',
  callback: InspectionUpdateCallback,
  onError?: ErrorCallback
): Unsubscribe => {
  return subscribeToInspections(userId, inspectionType, callback, onError);
};
