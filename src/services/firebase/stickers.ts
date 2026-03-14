/**
 * Static (oil change) stickers — Firestore `static_stickers` collection.
 * Same document shape as QL_Test project.
 */

import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, where
} from 'firebase/firestore';
import { db } from './config';

export interface FirebaseSticker {
  id?: string;
  vin: string;
  date: string;
  oilType: {
    id: string;
    name: string;
    durationInDays: number;
    mileageInterval?: number;
  };
  mileage: number;
  companyName?: string;
  address?: string;
  message?: string;
  qrCode?: string;
  decodedDetails?: any;
  printed?: boolean;
  archived?: boolean;
  locationId?: string;
  locationName?: string;
  createdBy?: string;
  dateCreated: string;
  lastUpdated?: string;
  [key: string]: any;
}

const STICKERS = 'static_stickers';

export async function getStickers(archived = false): Promise<FirebaseSticker[]> {
  const q = query(
    collection(db, STICKERS),
    where('archived', '==', archived),
    orderBy('dateCreated', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirebaseSticker));
}

export async function getStickerById(id: string): Promise<FirebaseSticker | null> {
  const snap = await getDoc(doc(db, STICKERS, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } as FirebaseSticker : null;
}

export async function createSticker(data: Omit<FirebaseSticker, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, STICKERS), {
    ...data,
    archived: false,
    dateCreated: data.dateCreated ?? new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  });
  return ref.id;
}

export async function updateSticker(id: string, updates: Partial<FirebaseSticker>): Promise<void> {
  await updateDoc(doc(db, STICKERS, id), {
    ...updates,
    lastUpdated: new Date().toISOString(),
  } as any);
}

export async function archiveSticker(id: string): Promise<void> {
  await updateSticker(id, { archived: true });
}

export async function deleteSticker(id: string): Promise<void> {
  await deleteDoc(doc(db, STICKERS, id));
}

export async function markStickerPrinted(id: string): Promise<void> {
  await updateSticker(id, { printed: true });
}
