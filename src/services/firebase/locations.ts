/**
 * Firebase locations service — Firestore `locations` collection.
 * Replaces locationService.ts localStorage-only implementation.
 */

import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy, setDoc
} from 'firebase/firestore';
import { db } from './config';

export interface Location {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  active?: boolean;
  createdAt?: string;
}

const LOCATIONS = 'locations';

export async function getLocations(): Promise<Location[]> {
  const snap = await getDocs(query(collection(db, LOCATIONS), orderBy('name')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Location));
}

export async function getLocation(id: string): Promise<Location | null> {
  const snap = await getDoc(doc(db, LOCATIONS, id));
  if (!snap.exists()) return null;
  return { id, ...snap.data() } as Location;
}

export async function createLocation(data: Omit<Location, 'id'>): Promise<Location> {
  const ref = await addDoc(collection(db, LOCATIONS), {
    ...data,
    createdAt: new Date().toISOString(),
  });
  return { id: ref.id, ...data };
}

export async function updateLocation(id: string, updates: Partial<Location>): Promise<void> {
  await updateDoc(doc(db, LOCATIONS, id), updates as any);
}

export async function deleteLocation(id: string): Promise<void> {
  await deleteDoc(doc(db, LOCATIONS, id));
}
