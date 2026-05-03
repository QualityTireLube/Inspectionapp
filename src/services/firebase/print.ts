/**
 * Print service — optional calls to the Quality Express Cloud Function print API.
 *
 * By default this app does NOT call `qualityexpress-c19f2` (no traffic / Firestore reads
 * from an idle or abandoned deploy). To re-enable printing from this app, set at build time:
 *
 *   VITE_QUALITYEXPRESS_PRINT_API_URL=https://us-central1-qualityexpress-c19f2.cloudfunctions.net/printApi
 *   VITE_QUALITYEXPRESS_PRINT_API_KEY=...   (optional; defaults to shop key if URL is set)
 */

const PRINT_CF_BASE = String(import.meta.env.VITE_QUALITYEXPRESS_PRINT_API_URL || '').replace(/\/+$/, '');
const PRINT_API_KEY = String(import.meta.env.VITE_QUALITYEXPRESS_PRINT_API_KEY || 'ql-print-2024');

function qualityExpressPrintConfigured(): boolean {
  return PRINT_CF_BASE.length > 0;
}

export interface PrintJobRequest {
  templateName: string;
  printer: string;
  pdfData?: string;   // base64-encoded PDF
  labelData?: Record<string, any>;
  paperSize?: string;
  copies?: number;
  locationId?: string;
}

export interface PrintJobResponse {
  success: boolean;
  jobId?: string;
  message?: string;
  error?: string;
}

export interface Printer {
  id: string;
  name: string;
  model?: string;
  status?: string;
  locationId?: string;
}

export interface PrintClient {
  id: string;
  name: string;
  status: 'online' | 'offline';
  printers: Printer[];
  locationId?: string;
  lastSeen?: string;
}

function buildHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': PRINT_API_KEY,
  };
}

async function cfFetch(path: string, method = 'GET', body?: any) {
  if (!qualityExpressPrintConfigured()) {
    throw new Error('Quality Express print API disabled (VITE_QUALITYEXPRESS_PRINT_API_URL not set).');
  }
  const res = await fetch(`${PRINT_CF_BASE}${path}`, {
    method,
    mode: 'cors',
    headers: buildHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message ?? err?.error ?? `Print API error ${res.status}`);
  }
  return res.json();
}

// ── Job submission ────────────────────────────────────────────────────────────

export async function submitPrintJob(request: PrintJobRequest): Promise<PrintJobResponse> {
  try {
    const data = await cfFetch('/api/print/jobs', 'POST', request);
    return { success: true, jobId: data.jobId ?? data.id, message: data.message };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Print failed' };
  }
}

// ── Printers ──────────────────────────────────────────────────────────────────

export async function getPrinters(): Promise<Printer[]> {
  try {
    const data = await cfFetch('/api/print/printers');
    return (data.printers ?? data ?? []) as Printer[];
  } catch {
    return [];
  }
}

// ── Print clients ─────────────────────────────────────────────────────────────

export async function getPrintClients(): Promise<PrintClient[]> {
  try {
    const data = await cfFetch('/api/print/clients');
    return (data.clients ?? data ?? []) as PrintClient[];
  } catch {
    return [];
  }
}

export async function getOnlinePrintClients(): Promise<PrintClient[]> {
  const clients = await getPrintClients();
  return clients.filter(c => c.status === 'online');
}

// ── Print queue ───────────────────────────────────────────────────────────────

export async function getPrintQueue(): Promise<any[]> {
  try {
    const data = await cfFetch('/api/print/jobs');
    return data.jobs ?? data ?? [];
  } catch {
    return [];
  }
}

export async function cancelPrintJob(jobId: string): Promise<void> {
  if (!qualityExpressPrintConfigured()) return;
  await cfFetch(`/api/print/jobs/${jobId}/cancel`, 'POST');
}
