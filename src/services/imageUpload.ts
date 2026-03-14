/**
 * imageUpload.ts — re-exports from cloudinary.ts for backwards compatibility.
 * All components that import from this file continue to work unchanged.
 */
export {
  uploadImageToServer,
  getFullImageUrl,
  cancelImageVerification,
  cancelAllImageVerifications,
  cleanupUploadResult,
} from './cloudinary';
export type { ImageUploadResult } from './cloudinary';
