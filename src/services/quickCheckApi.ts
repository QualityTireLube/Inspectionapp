/**
 * quickCheckApi.ts — re-implemented using Firebase/Firestore.
 * Exports the same `quickCheckApi` object shape for backwards compatibility.
 */

import {
  getSubmittedInspections,
  getDraftInspections,
  deleteInspection,
  InspectionDocument,
} from './firebase/inspections';

/** Map an InspectionDocument to the legacy QuickCheckResponse shape. */
function mapToLegacy(doc: InspectionDocument) {
  const ts = (doc.createdAt as any)?.toDate ? (doc.createdAt as any).toDate() : new Date();
  return {
    id: doc.id!,
    user_email: '',
    user_name: doc.userName ?? '',
    title: doc.data?.vin ?? '',
    data: typeof doc.data === 'string' ? doc.data : JSON.stringify(doc.data ?? {}),
    created_at: ts.toISOString(),
    status: doc.status,
    inspectionType: doc.inspectionType,
    firestoreId: doc.id,
    _doc: doc,
  };
}

export const getQuickCheckHistory = async (): Promise<any[]> => {
  const docs = await getSubmittedInspections(200);
  return docs.map(mapToLegacy);
};

export const deleteQuickCheck = async (id: any): Promise<void> => {
  await deleteInspection(String(id));
};

export const submitQuickCheck = async (_formData: FormData): Promise<any> => {
  throw new Error('submitQuickCheck: use firebase/inspections.createInspection instead');
};

export const quickCheckApi = {
  submit: submitQuickCheck,
  getHistory: getQuickCheckHistory,
  delete: deleteQuickCheck,
};

export default quickCheckApi;
