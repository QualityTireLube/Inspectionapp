/**
 * Field registry — Firestore `field_registry` collection.
 * Replaces fieldRegistryApi.ts (legacy backend).
 */

import {
  collection, doc, getDocs, setDoc, updateDoc
} from 'firebase/firestore';
import { db } from './config';

export interface FieldRegistryItem {
  id: string;
  label: string;
  type: string;
  options?: string[];
  defaultValue?: any;
  required?: boolean;
  [key: string]: any;
}

export interface FieldRegistryResponse {
  fields: Record<string, FieldRegistryItem>;
}

const FIELD_REGISTRY = 'field_registry';

export async function fetchFieldRegistry(): Promise<FieldRegistryResponse> {
  const snap = await getDocs(collection(db, FIELD_REGISTRY));
  const fields: Record<string, FieldRegistryItem> = {};
  snap.docs.forEach(d => { fields[d.id] = { id: d.id, ...d.data() } as FieldRegistryItem; });
  return { fields };
}

export async function upsertFieldRegistryItem(item: FieldRegistryItem): Promise<void> {
  const { id, ...rest } = item;
  await setDoc(doc(db, FIELD_REGISTRY, id), rest, { merge: true });
}
