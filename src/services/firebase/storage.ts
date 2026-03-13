import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  UploadResult,
  StorageReference
} from 'firebase/storage';
import { storage } from './config';

export interface UploadImageResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

/**
 * Upload an image to Firebase Storage
 */
export const uploadImage = async (
  file: File,
  path: string,
  onProgress?: (progress: number) => void
): Promise<UploadImageResult> => {
  try {
    // Create a unique filename
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const fullPath = `${path}/${timestamp}_${sanitizedFilename}`;
    
    const storageRef = ref(storage, fullPath);
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    console.log('✅ Image uploaded successfully:', downloadURL);
    
    return {
      success: true,
      url: downloadURL,
      path: fullPath
    };
  } catch (error: any) {
    console.error('❌ Error uploading image:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload image'
    };
  }
};

/**
 * Upload multiple images
 */
export const uploadImages = async (
  files: File[],
  basePath: string,
  onProgress?: (index: number, progress: number) => void
): Promise<UploadImageResult[]> => {
  const uploadPromises = files.map((file, index) => 
    uploadImage(file, basePath, onProgress ? (prog) => onProgress(index, prog) : undefined)
  );
  
  return Promise.all(uploadPromises);
};

/**
 * Delete an image from Firebase Storage
 */
export const deleteImage = async (path: string): Promise<boolean> => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    
    console.log('✅ Image deleted:', path);
    return true;
  } catch (error) {
    console.error('❌ Error deleting image:', error);
    return false;
  }
};

/**
 * Upload inspection image
 */
export const uploadInspectionImage = async (
  file: File,
  inspectionType: string,
  inspectionId: string,
  imageType: string
): Promise<UploadImageResult> => {
  const path = `uploads/${inspectionType}/${inspectionId}/${imageType}`;
  return uploadImage(file, path);
};

/**
 * Upload draft image (temporary storage)
 */
export const uploadDraftImage = async (
  file: File,
  userId: string,
  inspectionType: string,
  imageType: string
): Promise<UploadImageResult> => {
  const path = `drafts/${userId}/${inspectionType}/${imageType}`;
  return uploadImage(file, path);
};

/**
 * Get image URL from storage path
 */
export const getImageUrl = async (path: string): Promise<string | null> => {
  try {
    const storageRef = ref(storage, path);
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (error) {
    console.error('❌ Error getting image URL:', error);
    return null;
  }
};
