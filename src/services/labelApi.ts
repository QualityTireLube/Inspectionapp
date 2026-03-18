/**
 * LabelApiService — Firebase Firestore implementation.
 * Preserves the original class interface consumed by Labels.tsx.
 * Replaces the legacy Express/JWT backend.
 */
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, where,
} from 'firebase/firestore';
import { db } from './firebase/config';
import { LabelTemplate, CreateLabelRequest, UpdateLabelRequest } from '../types/labelTemplates';

const TEMPLATES = 'label_templates';

// ── helpers ───────────────────────────────────────────────────────────────────

function docToTemplate(id: string, data: any): LabelTemplate {
  return {
    id,
    labelName:    data.labelName   ?? data.name ?? '',
    fields:       data.fields      ?? [],
    paperSize:    data.paperSize   ?? '29mmx90mm',
    width:        data.width       ?? 0,
    height:       data.height      ?? 0,
    copies:       data.copies      ?? 1,
    archived:     data.archived    ?? false,
    createdBy:    data.createdBy   ?? '',
    createdDate:  data.createdDate ?? data.createdAt ?? '',
    updatedDate:  data.updatedDate ?? data.updatedAt,
    customWidth:  data.customWidth,
    customHeight: data.customHeight,
    customUnit:   data.customUnit,
    canvasRotation: data.canvasRotation,
    category:     data.category,
    version:      data.version,
    is_active:    data.is_active,
    lastUsed:     data.lastUsed,
    design_data:  data.design_data,
    print_settings: data.print_settings,
  } as LabelTemplate;
}

// ── LabelApiService ───────────────────────────────────────────────────────────

export class LabelApiService {

  static async getAllTemplates(archived?: boolean): Promise<LabelTemplate[]> {
    let q = archived === undefined
      ? query(collection(db, TEMPLATES), orderBy('labelName'))
      : query(collection(db, TEMPLATES), where('archived', '==', archived), orderBy('labelName'));
    const snap = await getDocs(q);
    return snap.docs.map(d => docToTemplate(d.id, d.data()));
  }

  static async getActiveTemplates(): Promise<LabelTemplate[]> {
    return this.getAllTemplates(false);
  }

  static async getArchivedTemplates(): Promise<LabelTemplate[]> {
    return this.getAllTemplates(true);
  }

  static async getTemplate(id: string): Promise<LabelTemplate> {
    const snap = await getDoc(doc(db, TEMPLATES, id));
    if (!snap.exists()) throw new Error(`Template ${id} not found`);
    return docToTemplate(snap.id, snap.data());
  }

  static async createTemplate(template: CreateLabelRequest): Promise<LabelTemplate> {
    const now = new Date().toISOString();
    const data = {
      ...template,
      archived:    false,
      createdDate: now,
      updatedDate: now,
    };
    const ref = await addDoc(collection(db, TEMPLATES), data);
    return docToTemplate(ref.id, data);
  }

  static async updateTemplate(id: string, updates: Partial<UpdateLabelRequest>): Promise<LabelTemplate> {
    const now = new Date().toISOString();
    await updateDoc(doc(db, TEMPLATES, id), { ...updates, updatedDate: now } as any);
    const snap = await getDoc(doc(db, TEMPLATES, id));
    return docToTemplate(snap.id, snap.data()!);
  }

  static async archiveTemplate(id: string): Promise<void> {
    await updateDoc(doc(db, TEMPLATES, id), {
      archived: true,
      updatedDate: new Date().toISOString(),
    } as any);
  }

  static async deleteTemplate(id: string): Promise<void> {
    await deleteDoc(doc(db, TEMPLATES, id));
  }

  static async restoreTemplate(id: string): Promise<LabelTemplate> {
    await updateDoc(doc(db, TEMPLATES, id), {
      archived: false,
      updatedDate: new Date().toISOString(),
    } as any);
    const snap = await getDoc(doc(db, TEMPLATES, id));
    return docToTemplate(snap.id, snap.data()!);
  }

  static async duplicateTemplate(id: string, createdBy: string): Promise<LabelTemplate> {
    const original = await this.getTemplate(id);
    const now = new Date().toISOString();
    const data = {
      ...original,
      labelName:   `${original.labelName} (copy)`,
      createdBy,
      createdDate: now,
      updatedDate: now,
      archived:    false,
    };
    const ref = await addDoc(collection(db, TEMPLATES), data);
    return docToTemplate(ref.id, data);
  }
}

export default LabelApiService;
