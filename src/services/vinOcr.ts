/**
 * VIN OCR Service — extracts VINs from images using Tesseract.js.
 * Runs 100% in the browser, no backend or API key required.
 */

import { createWorker, PSM } from 'tesseract.js';

export interface VinOcrResult {
  success: boolean;
  vin?: string;
  raw?: string;
  confidence?: number;
  message?: string;
}

// Characters that are never valid in a VIN (I, O, Q are banned by ISO 3779)
const VIN_CHARS = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
const VIN_REGEX = /[A-HJ-NPR-Z0-9]{17}/g;

/**
 * Common OCR misread corrections for VIN characters.
 * Order matters — apply most-specific substitutions first.
 */
function cleanOcrText(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/\s+/g, '')        // remove whitespace
    .replace(/O/g, '0')         // capital O → zero (rare in VINs)
    .replace(/I(?=\d)/g, '1')   // I before digit → 1
    .replace(/(?<=\d)I/g, '1')  // I after digit → 1
    .replace(/[^A-HJ-NPR-Z0-9]/g, ''); // strip chars not valid in VINs
}

/**
 * Score a candidate 17-char string for VIN likelihood.
 * Higher = more likely to be a real VIN.
 */
function scoreCandidate(candidate: string): number {
  let score = 0;
  // 9th character (check digit) is 0-9 or X
  const checkDigit = candidate[8];
  if (/[0-9X]/.test(checkDigit)) score += 30;
  // 10th character (model year) must be specific values
  const yearChars = 'ABCDEFGHJKLMNPRSTUVWXYZ123456789';
  if (yearChars.includes(candidate[9])) score += 20;
  // No I, O, Q anywhere
  if (!/[IOQ]/.test(candidate)) score += 30;
  // Mix of letters and digits (not all one type)
  const hasLetters = /[A-Z]/.test(candidate);
  const hasDigits = /[0-9]/.test(candidate);
  if (hasLetters && hasDigits) score += 20;
  return score;
}

/**
 * Extract the best VIN candidate from raw OCR text.
 */
function extractVin(raw: string): string | null {
  const cleaned = cleanOcrText(raw);

  // Try to find a direct 17-char VIN match in the cleaned string
  const matches = [...cleaned.matchAll(VIN_REGEX)];
  if (matches.length > 0) {
    // Pick the highest-scoring match
    return matches
      .map(m => m[0])
      .sort((a, b) => scoreCandidate(b) - scoreCandidate(a))[0];
  }

  // Fallback: also try on the raw text with lighter cleaning
  const lightCleaned = raw.toUpperCase().replace(/\s+/g, '');
  const lightMatches = [...lightCleaned.matchAll(VIN_REGEX)];
  if (lightMatches.length > 0) {
    return lightMatches
      .map(m => m[0])
      .sort((a, b) => scoreCandidate(b) - scoreCandidate(a))[0];
  }

  return null;
}

/**
 * Run Tesseract OCR on an image (File, Blob, or base64 data URL) and
 * attempt to extract a 17-character VIN.
 */
export async function extractVinFromImage(
  image: File | Blob | string,
  onProgress?: (pct: number) => void
): Promise<VinOcrResult> {
  const worker = await createWorker('eng', 1, {
    logger: onProgress
      ? (m: any) => {
          if (m.status === 'recognizing text') {
            onProgress(Math.round(m.progress * 100));
          }
        }
      : undefined,
  });

  try {
    // Configure Tesseract for single-line dense text (VIN plates)
    await worker.setParameters({
      tessedit_char_whitelist: VIN_CHARS,
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
    });

    const { data } = await worker.recognize(image);
    const raw = data.text ?? '';
    const confidence = data.confidence ?? 0;

    const vin = extractVin(raw);

    if (vin) {
      return { success: true, vin, raw, confidence, message: `VIN extracted (confidence: ${confidence.toFixed(0)}%)` };
    }

    // If single-line failed, retry with automatic page segmentation
    await worker.setParameters({
      tessedit_char_whitelist: VIN_CHARS,
      tessedit_pageseg_mode: PSM.AUTO,
    });
    const { data: data2 } = await worker.recognize(image);
    const raw2 = data2.text ?? '';
    const vin2 = extractVin(raw2);

    if (vin2) {
      return { success: true, vin: vin2, raw: raw2, confidence: data2.confidence, message: `VIN extracted (confidence: ${data2.confidence.toFixed(0)}%)` };
    }

    return {
      success: false,
      raw,
      confidence,
      message: 'Could not find a valid 17-character VIN in the image. Try a closer, clearer photo with good lighting.',
    };
  } finally {
    await worker.terminate();
  }
}
