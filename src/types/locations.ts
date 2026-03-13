export interface Location {
  id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  enabled: boolean;
  createdAt: string;
  lastUpdated: string;
}

export interface LocationFormData {
  name: string;
  address: string;
  phone?: string;
  email?: string;
  enabled: boolean;
}

export interface LocationSettings {
  locationId: string;
  stickerSettings?: any; // Will be StickerSettings
  labelSettings?: any;   // Will be LabelSettings when available
  printerSettings?: PrinterSettings;
  lastUpdated: string;
}

export interface PrinterSettings {
  defaultPrinter?: string;
  orientation?: 'portrait' | 'landscape';
  paperSize?: string;
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  printMethod?: 'pdf' | 'queue' | 'queue-fallback';
  autoPrint?: boolean;
  printerList?: string[];
}

export interface LocationWithSettings extends Location {
  settings?: LocationSettings;
}