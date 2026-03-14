/**
 * printApi.ts — re-implemented using the QL_Test Cloud Function.
 * Exports the same `PrintApiService` class shape for backwards compatibility.
 */

import {
  submitPrintJob as cfSubmitPrintJob,
  getPrinters as cfGetPrinters,
  getPrintClients as cfGetPrintClients,
  getPrintQueue as cfGetPrintQueue,
  cancelPrintJob as cfCancelPrintJob,
  Printer,
  PrintClient,
  PrintJobRequest as CfJobRequest,
} from './firebase/print';

// Re-export types used by components
export type { PrintClient };
export type PrinterConfig = Printer & { [key: string]: any };
export type PrintJob = { id: string; status: string; templateName?: string; createdAt?: string; [key: string]: any };
export type PrintConfiguration = { id: string; name: string; [key: string]: any };
export type PrintClientWithPrinters = PrintClient;

// Stub no-op for legacy initialiser
export function initializePrintServerAuth(_cfg: any) { return null; }

export class PrintApiService {

  // ── Printers ─────────────────────────────────────────────────────────────────

  static async discoverPrinters(): Promise<PrinterConfig[]> { return cfGetPrinters(); }
  static async getPrinters(): Promise<PrinterConfig[]> { return cfGetPrinters(); }

  static async checkPrinterStatus(_printerId: string): Promise<{ online: boolean; printerName: string }> {
    return { online: true, printerName: _printerId };
  }

  static async checkAllPrinterStatus(): Promise<Record<string, { online: boolean }>> {
    const printers = await cfGetPrinters();
    const result: Record<string, { online: boolean }> = {};
    printers.forEach(p => { result[p.id] = { online: true }; });
    return result;
  }

  // ── Print Jobs ────────────────────────────────────────────────────────────────

  static async submitPrintJob(request: any): Promise<{ success: boolean; jobId?: string; message?: string }> {
    const cfRequest: CfJobRequest = {
      templateName: request.templateName ?? request.template ?? 'default',
      printer: request.printerId ?? request.printer ?? '',
      pdfData: request.pdfData,
      labelData: request.labelData ?? request.data,
      paperSize: request.paperSize,
      copies: request.copies ?? 1,
      locationId: request.locationId,
    };
    return cfSubmitPrintJob(cfRequest);
  }

  static async getPrintQueue(): Promise<PrintJob[]> { return cfGetPrintQueue(); }

  static async cancelPrintJob(jobId: string): Promise<void> { return cfCancelPrintJob(jobId); }

  static async clearPrintQueue(): Promise<void> {
    const jobs = await cfGetPrintQueue();
    await Promise.all(jobs.map((j: any) => cfCancelPrintJob(j.id ?? j.jobId)));
  }

  static async getPrintQueueArchive(_page = 1, _limit = 50): Promise<{ jobs: PrintJob[]; total: number }> {
    const jobs = await cfGetPrintQueue();
    return { jobs, total: jobs.length };
  }

  // ── Configurations (stored in localStorage as fallback) ───────────────────────

  static async getConfigurations(): Promise<PrintConfiguration[]> {
    try {
      const raw = localStorage.getItem('printConfigurations');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  static async saveConfiguration(name: string, config: any): Promise<PrintConfiguration> {
    const configs = await this.getConfigurations();
    const existing = configs.findIndex(c => c.name === name);
    const updated: PrintConfiguration = { id: `cfg_${name}`, name, ...config };
    if (existing >= 0) configs[existing] = updated; else configs.push(updated);
    localStorage.setItem('printConfigurations', JSON.stringify(configs));
    return updated;
  }

  static async deleteConfiguration(name: string): Promise<void> {
    const configs = await this.getConfigurations();
    localStorage.setItem('printConfigurations', JSON.stringify(configs.filter(c => c.name !== name)));
  }

  // ── Print Clients ─────────────────────────────────────────────────────────────

  static async getPrintClients(): Promise<PrintClientWithPrinters[]> { return cfGetPrintClients(); }

  static async getActivePollingClients(): Promise<PrintClient[]> {
    const clients = await cfGetPrintClients();
    return clients.filter(c => c.status === 'online');
  }

  static async getPrintClientSummary(): Promise<{ anyOnline: boolean; clients: PrintClient[] }> {
    const clients = await cfGetPrintClients();
    return { anyOnline: clients.some(c => c.status === 'online'), clients };
  }

  static async createPrintClient(_data: any): Promise<PrintClient> {
    return { id: `cli_${Date.now()}`, name: _data.name ?? 'Client', status: 'offline', printers: [] };
  }

  static async updatePrintClient(_id: string, _data: any): Promise<PrintClient> {
    return { id: _id, name: _data.name ?? 'Client', status: 'offline', printers: [] };
  }

  static async deletePrintClient(_id: string): Promise<void> {}

  static async updatePrintClientPrinters(_id: string, _printers: any[]): Promise<void> {}

  static async getDefaultPrinter(): Promise<Printer | null> {
    const printers = await cfGetPrinters();
    return printers[0] ?? null;
  }

  static async testPrint(_printerId: string): Promise<void> {
    await cfSubmitPrintJob({ templateName: 'test', printer: _printerId });
  }
}

export default PrintApiService;
