/**
 * State inspections — Firestore `state_inspection_records` collection.
 * Replaces stateInspectionApi.ts (legacy backend).
 */

import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, where, limit
} from 'firebase/firestore';
import { db } from './config';

export interface StateInspectionRecord {
  id?: string;
  vin: string;
  licensePlate?: string;
  year?: string;
  make?: string;
  model?: string;
  stickerNumber?: string;
  expirationDate?: string;
  inspectionDate?: string;
  result?: 'pass' | 'fail' | 'pending';
  inspectorId?: string;
  inspectorName?: string;
  locationId?: string;
  locationName?: string;
  notes?: string;
  paymentAmount?: number;
  paymentMethod?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

const STATE_INSPECTIONS = 'state_inspection_records';

export async function getStateInspections(limitCount = 200): Promise<StateInspectionRecord[]> {
  const q = query(
    collection(db, STATE_INSPECTIONS),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as StateInspectionRecord));
}

export async function getStateInspectionById(id: string): Promise<StateInspectionRecord | null> {
  const snap = await getDoc(doc(db, STATE_INSPECTIONS, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } as StateInspectionRecord : null;
}

export async function createStateInspection(data: Omit<StateInspectionRecord, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, STATE_INSPECTIONS), {
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function updateStateInspection(id: string, updates: Partial<StateInspectionRecord>): Promise<void> {
  await updateDoc(doc(db, STATE_INSPECTIONS, id), {
    ...updates,
    updatedAt: new Date().toISOString(),
  } as any);
}

export async function deleteStateInspection(id: string): Promise<void> {
  await deleteDoc(doc(db, STATE_INSPECTIONS, id));
}
