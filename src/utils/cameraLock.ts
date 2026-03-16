/**
 * Global camera lock — prevents multiple camera dialogs from opening
 * simultaneously on mobile (e.g. GuidedVisuals + SafariImageUpload).
 *
 * Each camera component calls acquireCamera() before opening.
 * If another camera is already active, acquireCamera returns false
 * and the caller should NOT open its camera.
 */

let activeOwner: string | null = null;

export const acquireCamera = (ownerId: string): boolean => {
  if (activeOwner && activeOwner !== ownerId) return false;
  activeOwner = ownerId;
  return true;
};

export const releaseCamera = (ownerId: string): void => {
  if (activeOwner === ownerId) activeOwner = null;
};

export const isCameraLocked = (exceptOwner?: string): boolean =>
  activeOwner !== null && activeOwner !== exceptOwner;
