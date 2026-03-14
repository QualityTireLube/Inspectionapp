/**
 * Labels — Firestore `label_templates` and `saved_labels` collections.
 * Same document shape as QL_Test project.
 */

import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, where
} from 'firebase/firestore';
import { db } from './config';

// ── Label Templates ────────────────────────────────────────────────────────────

export interface LabelTemplateDoc {
  id?: string;
  name: string;
  description?: string;
  paperSize?: string;
  orientation?: string;
  elements?: any[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

const TEMPLATES = 'label_templates';

export async function getLabelTemplates(): Promise<LabelTemplateDoc[]> {
  const snap = await getDocs(query(collection(db, TEMPLATES), orderBy('name')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as LabelTemplateDoc));
}

export async function getLabelTemplateById(id: string): Promise<LabelTemplateDoc | null> {
  const snap = await getDoc(doc(db, TEMPLATES, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } as LabelTemplateDoc : null;
}

export async function createLabelTemplate(data: Omit<LabelTemplateDoc, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, TEMPLATES), {
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function updateLabelTemplate(id: string, updates: Partial<LabelTemplateDoc>): Promise<void> {
  await updateDoc(doc(db, TEMPLATES, id), {
    ...updates,
    updatedAt: new Date().toISOString(),
  } as any);
}

export async function deleteLabelTemplate(id: string): Promise<void> {
  await deleteDoc(doc(db, TEMPLATES, id));
}

// ── Saved Labels (generated instances) ────────────────────────────────────────

export interface SavedLabelDoc {
  id?: string;
  templateId?: string;
  templateName?: string;
  vehicleInfo?: string;
  vin?: string;
  mileage?: number;
  createdBy?: string;
  createdDate?: string;
  printCount?: number;
  active?: boolean;
  locationId?: string;
  pdfData?: string;
  [key: string]: any;
}

const SAVED_LABELS = 'saved_labels';

export async function getSavedLabels(activeOnly = false): Promise<SavedLabelDoc[]> {
  let q = activeOnly
    ? query(collection(db, SAVED_LABELS), where('active', '==', true), orderBy('createdDate', 'desc'))
    : query(collection(db, SAVED_LABELS), orderBy('createdDate', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as SavedLabelDoc));
}

export async function saveLabelInstance(data: Omit<SavedLabelDoc, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, SAVED_LABELS), {
    ...data,
    printCount: data.printCount ?? 0,
    active: data.active ?? true,
    createdDate: data.createdDate ?? new Date().toISOString(),
  });
  return ref.id;
}

export async function incrementLabelPrintCount(id: string): Promise<void> {
  const snap = await getDoc(doc(db, SAVED_LABELS, id));
  const current = (snap.data()?.printCount ?? 0) as number;
  await updateDoc(doc(db, SAVED_LABELS, id), { printCount: current + 1 });
}

export async function deleteSavedLabel(id: string): Promise<void> {
  await deleteDoc(doc(db, SAVED_LABELS, id));
}
