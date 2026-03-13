// Firebase configuration and initialization
export { app, auth, db, storage, firebaseConfig } from './config';

// Authentication services
export {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  onAuthChange,
  getIdToken
} from './auth';

// Inspection CRUD operations
export {
  createInspection,
  getInspectionById,
  getInspectionsByUser,
  updateInspection,
  deleteInspection,
  archiveInspection,
  submitInspection
} from './inspections';

// Draft management
export {
  getDraftId,
  saveDraft,
  loadDraft,
  deleteDraft,
  subscribeToDraft,
  submitDraftAsInspection
} from './drafts';

// Storage operations
export {
  uploadImage,
  uploadImages,
  deleteImage,
  uploadInspectionImage,
  uploadDraftImage,
  getImageUrl
} from './storage';

// Real-time subscriptions
export {
  subscribeToInspections,
  subscribeToSubmittedInspections,
  subscribeToInProgressInspections,
  subscribeToInspectionsByType
} from './realtime';

// Types
export type { AuthUser } from './auth';
export type { InspectionDocument } from './inspections';
export type { DraftDocument } from './drafts';
export type { UploadImageResult } from './storage';
export type { InspectionUpdateCallback, ErrorCallback } from './realtime';
