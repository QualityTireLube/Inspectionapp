// User settings types for server storage

export interface PrinterSettings {
  printMethod: 'pdf' | 'queue' | 'queue-fallback';
  printerId: string;
  orientation: 'portrait' | 'landscape';
  autoPrint: boolean;
}

export interface LabelPrintSettings extends PrinterSettings {
  enableCustomCopies: boolean;
  defaultCopies: number;
  autoCut: boolean;
}

export interface StickerPrintSettings extends PrinterSettings {
  // Additional sticker-specific settings can be added here
}

export interface UserSettings {
  // General settings
  autoSaveEnabled?: boolean;
  autoSaveInterval?: number;
  showSaveNotifications?: boolean;
  enableDraftManagement?: boolean;
  enableReviewMode?: boolean;
  enableHistoryView?: boolean;
  mobileViewEnabled?: boolean;
  showDebugTimerPanel?: boolean;

  // Printer settings
  labelPrintSettings?: LabelPrintSettings;
  stickerPrintSettings?: StickerPrintSettings;
}
