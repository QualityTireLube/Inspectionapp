/**
 * Print service — calls the QL_Test Cloud Function for label/sticker printing.
 * Replaces the legacy printApi.ts / local print server approach.
 *
 * Cloud Function endpoint:
 *   POST https://us-central1-qualityexpress-c19f2.cloudfunctions.net/printApi/api/print/jobs
 *   Headers: X-API-Key: ql-print-2024
 */

const PRINT_CF_BASE = 'https://us-central1-qualityexpress-c19f2.cloudfunctions.net/printApi';
const PRINT_API_KEY = 'ql-print-2024';

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

const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': PRINT_API_KEY,
};

async function cfFetch(path: string, method = 'GET', body?: any) {
  const res = await fetch(`${PRINT_CF_BASE}${path}`, {
    method,
    mode: 'cors',
    headers,
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
    const data = await cfFetch('/api/printers');
    return (data.printers ?? data ?? []) as Printer[];
  } catch {
    return [];
  }
}

// ── Print clients ─────────────────────────────────────────────────────────────

export async function getPrintClients(): Promise<PrintClient[]> {
  try {
    const data = await cfFetch('/api/clients');
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
  await cfFetch(`/api/print/jobs/${jobId}/cancel`, 'POST');
}
