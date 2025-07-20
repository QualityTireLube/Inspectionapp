export interface OilType {
  id: string;
  name: string;
  durationInDays: number;
  mileageInterval: number;
}

export interface StaticSticker {
  id: string;
  dateCreated: string;
  vin: string;
  decodedDetails: VinDecodedDetails;
  date: string; // Auto-calculated or manual override
  oilType: OilType;
  mileage: number;
  companyName: string;
  address: string;
  message: string;
  qrCode: string;
  printed: boolean;
  lastUpdated: string;
  archived: boolean;
}

export interface VinDecodedDetails {
  make?: string;
  model?: string;
  year?: string;
  engine?: string;
  engineL?: string;
  engineCylinders?: string;
  trim?: string;
  bodyType?: string;
  bodyClass?: string;
  driveType?: string;
  transmission?: string;
  fuelType?: string;
  manufacturer?: string;
  plant?: string;
  vehicleType?: string;
  error?: string;
}

export interface StickerSettings {
  paperSize: PaperSize;
  layout: LayoutSettings;
  oilTypes: OilType[];
}

export interface PaperSize {
  name: string;
  width: number; // in mm
  height: number; // in mm
}

export interface StickerElement {
  id: string;
  label: string;
  content: string;
  visible: boolean;
  position: {
    x: number; // percentage from left (0-100)
    y: number; // percentage from top (0-100)
  };
  fontSize: number; // relative to base font size (0.1 - 3.0)
  fontWeight: 'normal' | 'bold';
  textAlign: 'left' | 'center' | 'right';
}

export interface LayoutSettings {
  fontSize: number;
  fontFamily: string;
  includeLogo: boolean;
  logoPosition: 'top' | 'bottom' | 'left' | 'right';
  qrCodeSize: number;
  qrCodePosition: {
    x: number; // percentage from left (0-100)
    y: number; // percentage from top (0-100)
  };
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  elements: StickerElement[];
}

export interface CreateStickerFormData {
  vin: string;
  oilTypeId: string;
  mileage: number;
  dateOverride?: string;
} 