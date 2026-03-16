/**
 * Cloudinary image upload service — direct browser upload, no backend required.
 * Configure VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in .env
 * and in the Amplify Console environment variables.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

/** Compression settings — 1920px max keeps documents legible; 82% JPEG cuts ~75% of file size. */
const COMPRESS_MAX_DIMENSION = 1920;
const COMPRESS_QUALITY = 0.82;
/** Files already under this size are left untouched. */
const COMPRESS_SKIP_THRESHOLD_BYTES = 300 * 1024; // 300 KB

/**
 * Resize + JPEG-compress an image file in the browser using Canvas.
 * Returns the original file unchanged if it is already small, not an image,
 * or if the Canvas API is unavailable.
 */
async function compressImage(file: File): Promise<File> {
  if (
    !file.type.startsWith('image/') ||
    file.size < COMPRESS_SKIP_THRESHOLD_BYTES ||
    typeof document === 'undefined'
  ) {
    return file;
  }

  return new Promise<File>((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > COMPRESS_MAX_DIMENSION || height > COMPRESS_MAX_DIMENSION) {
        if (width >= height) {
          height = Math.round((height * COMPRESS_MAX_DIMENSION) / width);
          width = COMPRESS_MAX_DIMENSION;
        } else {
          width = Math.round((width * COMPRESS_MAX_DIMENSION) / height);
          height = COMPRESS_MAX_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          // Keep a .jpg extension so the filename stays recognisable.
          const name = file.name.replace(/\.[^.]+$/, '.jpg');
          resolve(new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() }));
        },
        'image/jpeg',
        COMPRESS_QUALITY
      );
    };

    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });
}

export interface CloudinaryUploadResult {
  success: boolean;
  url?: string;        // CDN URL (secure_url)
  publicId?: string;   // Cloudinary public_id
  previewUrl?: string; // Local blob URL for immediate display
  error?: string;
}

/** Upload a single File to Cloudinary and return the CDN URL. */
export async function uploadImageToCloudinary(
  file: File,
  folder = 'inspections'
): Promise<CloudinaryUploadResult> {
  const previewUrl = URL.createObjectURL(file);

  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    console.warn('Cloudinary not configured — VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET missing');
    return { success: false, previewUrl, error: 'Cloudinary not configured' };
  }

  const compressed = await compressImage(file);

  const formData = new FormData();
  formData.append('file', compressed);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, previewUrl, error: err?.error?.message ?? `Upload failed (${res.status})` };
    }

    const data = await res.json();
    return { success: true, url: data.secure_url, publicId: data.public_id, previewUrl };
  } catch (err) {
    return { success: false, previewUrl, error: err instanceof Error ? err.message : 'Upload failed' };
  }
}

/** Upload multiple files in parallel and return an array of results. */
export async function uploadImagesToCloudinary(
  files: File[],
  folder = 'inspections'
): Promise<CloudinaryUploadResult[]> {
  return Promise.all(files.map(f => uploadImageToCloudinary(f, folder)));
}

/**
 * Compatibility shim matching the old imageUpload.ts interface.
 * Components still calling uploadImageToServer() will work unchanged.
 */
export async function uploadImageToServer(
  file: File,
  onVerificationComplete?: (result: ImageUploadResult) => void
): Promise<ImageUploadResult> {
  const result = await uploadImageToCloudinary(file);
  const compat: ImageUploadResult = {
    success: result.success,
    previewUrl: result.previewUrl,
    serverUrl: result.url,
    status: result.success ? 'verified' : 'error',
    uploadId: `cld_${Date.now()}`,
    fileName: file.name,
    error: result.error,
  };
  if (onVerificationComplete) onVerificationComplete(compat);
  return compat;
}

/** Legacy ImageUploadResult shape kept for backwards compatibility. */
export interface ImageUploadResult {
  success: boolean;
  previewUrl?: string;
  serverUrl?: string;
  error?: string;
  status: 'uploading' | 'uploaded' | 'verified' | 'unverified' | 'error';
  uploadId?: string;
  fileName?: string;
}

export const getFullImageUrl = (url: string): string => url ?? '';
export const cancelImageVerification = (_id: string) => {};
export const cancelAllImageVerifications = () => {};
export const cleanupUploadResult = (_r: ImageUploadResult) => {
  if (_r.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(_r.previewUrl);
};
