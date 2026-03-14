/**
 * api-stickers-labels.ts — re-exports from firebase/stickers.ts and firebase/labels.ts.
 * Backwards-compatible shim for legacy callers.
 */

import { getStickers, createSticker, updateSticker, archiveSticker, deleteSticker, markStickerPrinted } from './firebase/stickers';
import { getLabelTemplates, createLabelTemplate, updateLabelTemplate, deleteLabelTemplate, getSavedLabels, saveLabelInstance } from './firebase/labels';

// ── Stickers ──────────────────────────────────────────────────────────────────

export const getStaticStickers = async (_locationFilter?: string, archived = false) => getStickers(archived);
export const createStaticSticker = async (sticker: any) => {
  const id = await createSticker(sticker);
  return { ...sticker, id };
};
export const updateStaticSticker = async (id: string, updates: any) => updateSticker(id, updates);
export const archiveStaticSticker = async (id: string) => archiveSticker(id);
export const deleteStaticSticker = async (id: string) => deleteSticker(id);
export const markStaticStickerPrinted = async (id: string) => markStickerPrinted(id);
export const restoreStaticSticker = async (id: string) => updateSticker(id, { archived: false });

// ── Labels ─────────────────────────────────────────────────────────────────────

export const getLabelTemplatesApi = getLabelTemplates;
export const createLabelTemplateApi = async (data: any) => {
  const id = await createLabelTemplate(data);
  return { ...data, id };
};
export const updateLabelTemplateApi = async (id: string, data: any) => updateLabelTemplate(id, data);
export const deleteLabelTemplateApi = deleteLabelTemplate;
export const getGeneratedLabels = async (_locationId?: string) => getSavedLabels();
export const createGeneratedLabel = async (data: any) => {
  const id = await saveLabelInstance(data);
  return { ...data, id };
};

export const updateGeneratedLabel = async (id: string, updates: any) => {
  const { updateDoc, doc } = await import('firebase/firestore');
  const { db } = await import('./firebase/config');
  await updateDoc(doc(db, 'saved_labels', id), updates);
};

export const deleteGeneratedLabel = async (id: string) => {
  const { deleteSavedLabel } = await import('./firebase/labels');
  return deleteSavedLabel(id);
};

export const archiveGeneratedLabel = async (id: string) => updateGeneratedLabel(id, { active: false });
export const restoreGeneratedLabel = async (id: string) => updateGeneratedLabel(id, { active: true });
export const recordLabelPrint = async (id: string) => {
  const { incrementLabelPrintCount } = await import('./firebase/labels');
  return incrementLabelPrintCount(id);
};
export const updateLabelRestocking = async (id: string, data: any) => updateGeneratedLabel(id, data);
