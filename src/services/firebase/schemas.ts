/**
 * Inspection schemas — Firestore `inspection_schemas` collection.
 * Replaces inspectionSchemasApi.ts (legacy backend).
 */

import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc
} from 'firebase/firestore';
import { db } from './config';

export interface SchemaField {
  id: string;
  type: string;
  label?: string;
  options?: string[];
  required?: boolean;
  [key: string]: any;
}

export interface InspectionSchema {
  id: string;
  title: string;
  enabled?: boolean;
  showInBottomNav?: boolean;
  navOrder?: number;
  navIcon?: string;
  tabs?: string[];
  fieldsByTab?: Record<string, string[]>;
  [key: string]: any;
}

export interface SchemasResponse {
  schemas: Record<string, InspectionSchema>;
}

const SCHEMAS = 'inspection_schemas';

export async function fetchSchemas(): Promise<SchemasResponse> {
  const snap = await getDocs(collection(db, SCHEMAS));
  const schemas: Record<string, InspectionSchema> = {};
  snap.docs.forEach(d => { schemas[d.id] = { id: d.id, ...d.data() } as InspectionSchema; });
  return { schemas };
}

export async function getSchema(type: string): Promise<InspectionSchema | null> {
  const snap = await getDoc(doc(db, SCHEMAS, type));
  if (!snap.exists()) return null;
  return { id: type, ...snap.data() } as InspectionSchema;
}

export async function updateSchema(type: string, updates: Partial<InspectionSchema>): Promise<void> {
  await updateDoc(doc(db, SCHEMAS, type), updates as any);
}

export async function createInspectionType(data: Omit<InspectionSchema, 'id'> & { id: string }): Promise<void> {
  const { id, ...rest } = data;
  await setDoc(doc(db, SCHEMAS, id), rest);
}

export async function deleteInspectionType(type: string): Promise<void> {
  await deleteDoc(doc(db, SCHEMAS, type));
}

export async function renameInspectionType(oldType: string, newType: string): Promise<void> {
  const snap = await getDoc(doc(db, SCHEMAS, oldType));
  if (!snap.exists()) throw new Error('Schema not found');
  await setDoc(doc(db, SCHEMAS, newType), snap.data()!);
  await deleteDoc(doc(db, SCHEMAS, oldType));
}

export async function restoreSchemaDefaults(_type: string): Promise<void> {
  // Defaults can be re-seeded from a local constant if needed
  console.warn('restoreSchemaDefaults: not implemented for Firebase');
}
