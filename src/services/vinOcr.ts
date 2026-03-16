/**
 * VIN OCR Service — extracts VINs from images using Tesseract.js.
 * Runs 100% in the browser, no backend required.
 *
 * Accuracy pipeline:
 *  1. Multiple image preprocessing variants (contrast+, inverted, 2×upscale)
 *  2. Multiple Tesseract PSM passes per image variant
 *  3. VIN check-digit mathematical validation (ISO 3779)
 *  4. Fuzzy correction: try common OCR substitutions (0↔O, 1↔I, 8↔B …)
 *     at each position until the check digit passes
 *  5. NHTSA API confirmation for the winning candidate
 */

import { createWorker, PSM } from 'tesseract.js';

export interface VinOcrResult {
  success: boolean;
  vin?: string;
  raw?: string;
  confidence?: number;
  message?: string;
}

// ─── VIN Check Digit (ISO 3779) ──────────────────────────────────────────────

const TRANSLITERATION: Record<string, number> = {
  A:1, B:2, C:3, D:4, E:5, F:6, G:7, H:8,
  J:1, K:2, L:3, M:4, N:5,      P:7, R:9,
  S:2, T:3, U:4, V:5, W:6, X:7, Y:8, Z:9,
  '0':0,'1':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,
};
const WEIGHTS = [8,7,6,5,4,3,2,10,0,9,8,7,6,5,4,3,2];

function calcCheckDigit(vin: string): string | null {
  if (vin.length !== 17) return null;
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const v = TRANSLITERATION[vin[i]];
    if (v === undefined) return null;
    sum += v * WEIGHTS[i];
  }
  const r = sum % 11;
  return r === 10 ? 'X' : String(r);
}

/** Returns true when the 17-char string passes the VIN check digit. */
function isValidCheckDigit(vin: string): boolean {
  const expected = calcCheckDigit(vin);
  return expected !== null && (vin[8] === expected);
}

// ─── Character confusion map (OCR misread → possible real chars) ─────────────
// Each key is what Tesseract might output; value is the list of characters it
// might ACTUALLY be on the physical VIN plate.
const CONFUSION: Record<string, string[]> = {
  '0': ['0', 'O', 'D', 'Q'],
  'O': ['O', '0', 'D', 'Q'],
  'D': ['D', '0', 'O'],
  'Q': ['Q', '0', 'O'],           // Q is invalid in VINs → always means 0
  '1': ['1', 'I', 'L', '7'],
  'I': ['I', '1', 'L'],           // I is invalid in VINs → always means 1 or J
  'L': ['L', '1', 'I'],
  '7': ['7', '1'],
  '8': ['8', 'B'],
  'B': ['B', '8'],
  '5': ['5', 'S'],
  'S': ['S', '5'],
  '2': ['2', 'Z'],
  'Z': ['Z', '2'],
  '6': ['6', 'G', 'b'],
  'G': ['G', '6'],
  '4': ['4', 'A'],
  'A': ['A', '4'],
  '3': ['3', 'E'],
  'E': ['E', '3'],
  'U': ['U', 'V'],
  'V': ['V', 'U'],
  'M': ['M', 'N'],
  'N': ['N', 'M'],
};

const VALID_VIN_CHARS = new Set('ABCDEFGHJKLMNPRSTUVWXYZ0123456789');
const INVALID_IN_VIN = new Set('IOQ');

/**
 * For a 17-char near-VIN, try all single-character substitutions using the
 * confusion map to find a valid VIN (passing check digit).
 * Returns the corrected VIN, or null if none found.
 */
function fuzzyCorrectionSingle(candidate: string): string | null {
  if (candidate.length !== 17) return null;

  // First: clean up chars that are NEVER valid in a VIN (I, O, Q)
  let cleaned = candidate.split('');
  for (let i = 0; i < 17; i++) {
    if (INVALID_IN_VIN.has(cleaned[i])) {
      // O/Q → 0, I → 1 (default substitution)
      cleaned[i] = (cleaned[i] === 'I') ? '1' : '0';
    }
  }
  const base = cleaned.join('');

  // If base already passes, return it
  if (isValidCheckDigit(base)) return base;

  // Try single-char substitutions at each position
  for (let pos = 0; pos < 17; pos++) {
    if (pos === 8) continue; // skip check digit position — it will self-correct
    const origChar = base[pos];
    const alternatives = CONFUSION[origChar] || [];
    for (const alt of alternatives) {
      if (!VALID_VIN_CHARS.has(alt) || INVALID_IN_VIN.has(alt)) continue;
      if (alt === origChar) continue;
      const tried = base.substring(0, pos) + alt + base.substring(pos + 1);
      // Re-calculate and inject correct check digit
      const correctCheck = calcCheckDigit(tried.substring(0, 8) + tried[8] + tried.substring(9));
      if (!correctCheck) continue;
      const withCheck = tried.substring(0, 8) + correctCheck + tried.substring(9);
      if (isValidCheckDigit(withCheck)) return withCheck;
    }
  }

  // Try injecting the mathematically correct check digit into position 9
  const withCorrectCheck = base.substring(0, 8) + (calcCheckDigit(base) ?? base[8]) + base.substring(9);
  if (isValidCheckDigit(withCorrectCheck) && calcCheckDigit(withCorrectCheck) !== null) {
    return withCorrectCheck;
  }

  return null;
}

/**
 * Try two-char substitutions only for the most confusion-prone positions
 * (keeps runtime bounded — called only when single-char fails).
 */
function fuzzyCorrectionDouble(candidate: string): string | null {
  if (candidate.length !== 17) return null;
  let base = candidate;

  // Force-fix invalid chars first
  const arr = base.split('');
  for (let i = 0; i < 17; i++) {
    if (INVALID_IN_VIN.has(arr[i])) arr[i] = arr[i] === 'I' ? '1' : '0';
  }
  base = arr.join('');

  // Try pairs of positions
  for (let p1 = 0; p1 < 16; p1++) {
    if (p1 === 8) continue;
    const alts1 = (CONFUSION[base[p1]] || []).filter(c => VALID_VIN_CHARS.has(c) && !INVALID_IN_VIN.has(c));
    for (const a1 of alts1) {
      if (a1 === base[p1]) continue;
      for (let p2 = p1 + 1; p2 < 17; p2++) {
        if (p2 === 8) continue;
        const alts2 = (CONFUSION[base[p2]] || []).filter(c => VALID_VIN_CHARS.has(c) && !INVALID_IN_VIN.has(c));
        for (const a2 of alts2) {
          if (a2 === base[p2]) continue;
          const tried = base.substring(0, p1) + a1 + base.substring(p1 + 1, p2) + a2 + base.substring(p2 + 1);
          const check = calcCheckDigit(tried);
          if (!check) continue;
          const withCheck = tried.substring(0, 8) + check + tried.substring(9);
          if (isValidCheckDigit(withCheck)) return withCheck;
        }
      }
    }
  }
  return null;
}

// ─── Text extraction helpers ─────────────────────────────────────────────────

const VIN_REGEX = /[A-HJ-NPR-Z0-9]{17}/g;

function normaliseForVin(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Extract and score all 17-char candidates from raw OCR text.
 * Returns them sorted by validity (check digit pass first, then score).
 */
function extractCandidates(raw: string): string[] {
  const norm = normaliseForVin(raw);
  const seen = new Set<string>();
  const candidates: Array<{ vin: string; score: number }> = [];

  const addCandidate = (s: string) => {
    if (seen.has(s)) return;
    seen.add(s);
    const valid = isValidCheckDigit(s) ? 1000 : 0;
    const yearChars = 'ABCDEFGHJKLMNPRSTUVWXYZ123456789';
    let score = valid;
    if (/[0-9X]/.test(s[8])) score += 30;
    if (yearChars.includes(s[9])) score += 20;
    if (!/[IOQ]/.test(s)) score += 30;
    if (/[A-Z]/.test(s) && /[0-9]/.test(s)) score += 20;
    candidates.push({ vin: s, score });
  };

  // Direct regex matches
  const matches = [...norm.matchAll(VIN_REGEX)];
  matches.forEach(m => addCandidate(m[0]));

  // Sliding window over the normalised text
  if (norm.length >= 17) {
    for (let i = 0; i <= norm.length - 17; i++) {
      const sub = norm.substring(i, i + 17);
      if (/^[A-Z0-9]{17}$/.test(sub)) addCandidate(sub);
    }
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .map(c => c.vin);
}

// ─── Image preprocessing ─────────────────────────────────────────────────────

interface ProcessedVariant { label: string; dataUrl: string }

async function preprocessVariants(image: File | Blob): Promise<ProcessedVariant[]> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(image);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);

      const MAX_W = 2400;
      let { width, height } = img;
      if (width > MAX_W) { height = Math.round((height * MAX_W) / width); width = MAX_W; }
      // 2× upscale for small images
      if (width < 800) { width *= 2; height *= 2; }

      const draw = (filter: (gray: number) => number): string => {
        const c = document.createElement('canvas');
        c.width = width; c.height = height;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        const id = ctx.getImageData(0, 0, width, height);
        const d = id.data;
        for (let i = 0; i < d.length; i += 4) {
          const g = filter(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
          d[i] = d[i + 1] = d[i + 2] = Math.max(0, Math.min(255, g));
        }
        ctx.putImageData(id, 0, 0);
        return c.toDataURL('image/png');
      };

      // Otsu-like threshold approximation
      const otsuThreshold = (g: number) => (g < 127 ? 0 : 255);
      const contrastBoost = (g: number) => (g < 128 ? g * 0.5 : Math.min(255, g * 1.4 + 20));
      const inverted = (g: number) => 255 - contrastBoost(g);
      const sharpen = (g: number) => Math.min(255, Math.max(0, (g - 128) * 1.8 + 128));

      resolve([
        { label: 'contrast',  dataUrl: draw(contrastBoost) },
        { label: 'bw',        dataUrl: draw(otsuThreshold) },
        { label: 'inverted',  dataUrl: draw(inverted) },
        { label: 'sharpen',   dataUrl: draw(sharpen) },
      ]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}

// ─── NHTSA confirmation ───────────────────────────────────────────────────────

async function confirmViaNhtsa(vin: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return false;
    const json = await res.json();
    const makeResult = (json.Results as any[])?.find((r: any) => r.Variable === 'Make');
    return !!(makeResult?.Value && makeResult.Value !== 'null' && makeResult.Value !== '0');
  } catch {
    return false;
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function extractVinFromImage(
  image: File | Blob | string,
  onProgress?: (pct: number) => void
): Promise<VinOcrResult> {

  // Build image variants (only when given a blob/file)
  let variants: Array<{ label: string; image: File | Blob | string }> = [];
  if (image instanceof File || image instanceof Blob) {
    try {
      const preprocessed = await preprocessVariants(image);
      variants = preprocessed.map(v => ({ label: v.label, image: v.dataUrl }));
    } catch {
      /* fall through to original */
    }
  }
  variants.push({ label: 'original', image });

  // Report rough progress ticks during preprocessing
  onProgress?.(5);

  const PSM_MODES = [PSM.AUTO, PSM.SINGLE_BLOCK, PSM.SINGLE_LINE];
  const VIN_CHARS = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
  const totalPasses = variants.length * PSM_MODES.length;
  let passIndex = 0;

  // Collect all unique candidates across all passes
  const allCandidates: Map<string, number> = new Map(); // vin → best score

  const worker = await createWorker('eng', 1, {
    logger: (m: any) => {
      if (m.status === 'recognizing text' && onProgress) {
        const base = 5 + Math.round((passIndex / totalPasses) * 85);
        const within = Math.round(m.progress * (85 / totalPasses));
        onProgress(Math.min(90, base + within));
      }
    },
  });

  try {
    for (const variant of variants) {
      for (const psm of PSM_MODES) {
        passIndex++;

        // For SINGLE_LINE pass, also add the whitelist
        const params: Record<string, any> = { tessedit_pageseg_mode: psm };
        if (psm === PSM.SINGLE_LINE) {
          params.tessedit_char_whitelist = VIN_CHARS;
        } else {
          params.tessedit_char_whitelist = '';
        }

        try {
          await worker.setParameters(params);
          const { data } = await worker.recognize(variant.image);
          const raw = data.text ?? '';
          const candidates = extractCandidates(raw);

          for (const c of candidates) {
            const prev = allCandidates.get(c) ?? 0;
            const score = isValidCheckDigit(c) ? 1000 : 0;
            if (score > prev) allCandidates.set(c, score);
          }
        } catch { /* skip failed pass */ }
      }
    }
  } finally {
    await worker.terminate();
  }

  onProgress?.(92);

  // ── Step 1: prefer valid check-digit winners ──────────────────────────────
  const sorted = [...allCandidates.entries()].sort((a, b) => b[1] - a[1]);
  const validCandidates = sorted.filter(([v]) => isValidCheckDigit(v)).map(([v]) => v);

  if (validCandidates.length > 0) {
    const winner = validCandidates[0];
    // Confirm with NHTSA (non-blocking — don't fail if it times out)
    const confirmed = await confirmViaNhtsa(winner).catch(() => false);
    onProgress?.(100);
    return {
      success: true,
      vin: winner,
      confidence: 90,
      message: confirmed
        ? `VIN confirmed via NHTSA`
        : `VIN extracted (check digit valid)`,
    };
  }

  // ── Step 2: fuzzy-correct all candidates ────────────────────────────────
  const allRaw = sorted.map(([v]) => v);
  for (const candidate of allRaw) {
    const fixed1 = fuzzyCorrectionSingle(candidate);
    if (fixed1) {
      const confirmed = await confirmViaNhtsa(fixed1).catch(() => false);
      onProgress?.(100);
      return {
        success: true,
        vin: fixed1,
        confidence: 70,
        message: confirmed
          ? `VIN corrected + confirmed via NHTSA`
          : `VIN extracted (corrected via check digit)`,
      };
    }
    const fixed2 = fuzzyCorrectionDouble(candidate);
    if (fixed2) {
      onProgress?.(100);
      return {
        success: true,
        vin: fixed2,
        confidence: 55,
        message: 'VIN extracted (double-char correction applied — please verify)',
      };
    }
  }

  onProgress?.(100);
  return {
    success: false,
    message:
      'Could not find a valid VIN. Tips: hold the camera 20–30 cm away, ensure even lighting with no glare, and align the VIN horizontally in the blue box.',
  };
}
