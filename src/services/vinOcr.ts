/**
 * VIN OCR Service — extracts VINs from images using Tesseract.js.
 * Runs 100% in the browser, no backend or API key required.
 *
 * Strategy: run multiple OCR passes with different page-segmentation modes
 * and character constraints.  The first pass is UN-constrained (full
 * character set) so Tesseract can recognise surrounding text and segment
 * properly; VIN-specific character filtering happens in post-processing.
 */

import { createWorker, PSM } from 'tesseract.js';

export interface VinOcrResult {
  success: boolean;
  vin?: string;
  raw?: string;
  confidence?: number;
  message?: string;
}

const VIN_REGEX = /[A-HJ-NPR-Z0-9]{17}/g;

/** Fix common OCR misreads for VIN characters. */
function cleanOcrText(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/O/g, '0')
    .replace(/Q/g, '0')
    .replace(/I/g, '1')
    .replace(/[^A-HJ-NPR-Z0-9]/g, '');
}

/** Score a 17-char candidate for VIN plausibility. */
function scoreCandidate(candidate: string): number {
  let score = 0;
  if (/[0-9X]/.test(candidate[8])) score += 30;
  const yearChars = 'ABCDEFGHJKLMNPRSTUVWXYZ123456789';
  if (yearChars.includes(candidate[9])) score += 20;
  if (!/[IOQ]/.test(candidate)) score += 30;
  if (/[A-Z]/.test(candidate) && /[0-9]/.test(candidate)) score += 20;
  return score;
}

/** Extract the best 17-char VIN from raw OCR text. */
function extractVin(raw: string): string | null {
  const cleaned = cleanOcrText(raw);
  const matches = [...cleaned.matchAll(VIN_REGEX)];
  if (matches.length > 0) {
    return matches.map(m => m[0]).sort((a, b) => scoreCandidate(b) - scoreCandidate(a))[0];
  }

  const light = raw.toUpperCase().replace(/\s+/g, '');
  const lightMatches = [...light.matchAll(VIN_REGEX)];
  if (lightMatches.length > 0) {
    return lightMatches.map(m => m[0]).sort((a, b) => scoreCandidate(b) - scoreCandidate(a))[0];
  }

  // Sliding-window fallback: pick any 17-char run that scores well
  if (cleaned.length >= 17) {
    let best: string | null = null;
    let bestScore = 0;
    for (let i = 0; i <= cleaned.length - 17; i++) {
      const sub = cleaned.substring(i, i + 17);
      if (VIN_REGEX.test(sub)) {
        VIN_REGEX.lastIndex = 0;
        const s = scoreCandidate(sub);
        if (s > bestScore) { bestScore = s; best = sub; }
      }
    }
    if (best && bestScore >= 50) return best;
  }

  return null;
}

/**
 * Preprocess image for better OCR: resize, sharpen, increase contrast.
 * Returns a data URL string that Tesseract can consume.
 */
async function preprocessImage(image: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(image);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');

      // Scale to a reasonable width for OCR (2000px max keeps detail)
      const MAX_W = 2000;
      let { width, height } = img;
      if (width > MAX_W) {
        height = Math.round((height * MAX_W) / width);
        width = MAX_W;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      // Increase contrast via grayscale + threshold boost
      const imageData = ctx.getImageData(0, 0, width, height);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const boosted = gray < 128 ? Math.max(0, gray * 0.6) : Math.min(255, gray * 1.3 + 30);
        d[i] = d[i + 1] = d[i + 2] = boosted;
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}

/**
 * Run Tesseract OCR on an image and attempt to extract a 17-character VIN.
 * Uses multiple passes with increasingly relaxed settings.
 */
export async function extractVinFromImage(
  image: File | Blob | string,
  onProgress?: (pct: number) => void
): Promise<VinOcrResult> {
  let processedImage: File | Blob | string = image;
  try {
    if (image instanceof File || image instanceof Blob) {
      processedImage = await preprocessImage(image);
    }
  } catch {
    processedImage = image;
  }

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
    // Pass 1: full character set + AUTO segmentation (best for real-world photos)
    await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
    const { data: d1 } = await worker.recognize(processedImage);
    const vin1 = extractVin(d1.text ?? '');
    if (vin1) return { success: true, vin: vin1, raw: d1.text, confidence: d1.confidence, message: `VIN extracted (${d1.confidence.toFixed(0)}% confidence)` };

    // Pass 2: full character set + SINGLE_BLOCK
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
    const { data: d2 } = await worker.recognize(processedImage);
    const vin2 = extractVin(d2.text ?? '');
    if (vin2) return { success: true, vin: vin2, raw: d2.text, confidence: d2.confidence, message: `VIN extracted (${d2.confidence.toFixed(0)}% confidence)` };

    // Pass 3: VIN-only whitelist + SINGLE_LINE (for tight crops of just the VIN)
    const VIN_CHARS = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
    await worker.setParameters({ tessedit_char_whitelist: VIN_CHARS, tessedit_pageseg_mode: PSM.SINGLE_LINE });
    const { data: d3 } = await worker.recognize(processedImage);
    const vin3 = extractVin(d3.text ?? '');
    if (vin3) return { success: true, vin: vin3, raw: d3.text, confidence: d3.confidence, message: `VIN extracted (${d3.confidence.toFixed(0)}% confidence)` };

    // Pass 4: try original un-preprocessed image with AUTO (in case preprocessing hurt)
    if (processedImage !== image) {
      await worker.setParameters({ tessedit_char_whitelist: '', tessedit_pageseg_mode: PSM.AUTO });
      const { data: d4 } = await worker.recognize(image);
      const vin4 = extractVin(d4.text ?? '');
      if (vin4) return { success: true, vin: vin4, raw: d4.text, confidence: d4.confidence, message: `VIN extracted (${d4.confidence.toFixed(0)}% confidence)` };
    }

    return {
      success: false,
      raw: d1.text,
      confidence: d1.confidence,
      message: 'Could not find a valid 17-character VIN. Try a closer, clearer photo with good lighting and minimal glare.',
    };
  } finally {
    await worker.terminate();
  }
}
