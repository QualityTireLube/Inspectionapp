import { StaticSticker, StickerSettings, OilType } from '../types/stickers';

const STICKERS_STORAGE_KEY = 'oil_change_stickers';
const SETTINGS_STORAGE_KEY = 'oil_change_settings';

export class StickerStorageService {
  // Default oil types
  private static defaultOilTypes: OilType[] = [
    { id: '1', name: 'Conventional Oil', durationInDays: 90, mileageInterval: 3000 },
    { id: '2', name: 'Super Synthetic', durationInDays: 180, mileageInterval: 7000 },
    { id: '3', name: 'Mobil 1', durationInDays: 365, mileageInterval: 10000 },
    { id: '4', name: 'Rotella', durationInDays: 90, mileageInterval: 3000 },
    { id: '5', name: 'Delvac 1', durationInDays: 365, mileageInterval: 10000 },
  ];

  // Default settings
  private static defaultSettings: StickerSettings = {
    paperSize: { name: 'Dymo 200i Label', width: 46.1, height: 63.5 }, // 1.8125" x 2.5"
    layout: {
      fontSize: 8,
      fontFamily: 'Calibri',
      includeLogo: true,
      logoPosition: 'top',
      qrCodeSize: 10,
      qrCodePosition: { x: 50, y: 70 }, // Center bottom
      margins: { top: 2, bottom: 2, left: 2, right: 2 },
      elements: [
        {
          id: 'header',
          label: 'Header Text',
          content: 'Next Service Due',
          visible: true,
          position: { x: 50, y: 18 },
          fontSize: 1.25,
          fontWeight: 'bold',
          textAlign: 'center'
        },
        {
          id: 'serviceDate',
          label: 'Service Date',
          content: '{serviceDate}',
          visible: true,
          position: { x: 10, y: 26 },
          fontSize: 1,
          fontWeight: 'normal',
          textAlign: 'left'
        },
        {
          id: 'serviceMileage',
          label: 'Service Mileage',
          content: '{serviceMileage}',
          visible: true,
          position: { x: 90, y: 26 },
          fontSize: 1,
          fontWeight: 'normal',
          textAlign: 'right'
        },
        {
          id: 'oilType',
          label: 'Oil Type',
          content: '{oilType}',
          visible: true,
          position: { x: 50, y: 32 },
          fontSize: 1,
          fontWeight: 'normal',
          textAlign: 'center'
        },
        {
          id: 'companyName',
          label: 'Company Name',
          content: 'Quality Lube Express',
          visible: true,
          position: { x: 50, y: 40 },
          fontSize: 1.25,
          fontWeight: 'bold',
          textAlign: 'center'
        },
        {
          id: 'address',
          label: 'Address',
          content: '3617 HWY 19 Zachary LA 70791',
          visible: true,
          position: { x: 50, y: 45 },
          fontSize: 0.7,
          fontWeight: 'normal',
          textAlign: 'center'
        },
        {
          id: 'message',
          label: 'Thank You Message',
          content: 'THANK YOU',
          visible: true,
          position: { x: 50, y: 55 },
          fontSize: 1.25,
          fontWeight: 'bold',
          textAlign: 'center'
        },
        {
          id: 'decodedDetails',
          label: 'Vehicle Details',
          content: '{decodedDetails}',
          visible: true,
          position: { x: 50, y: 60 },
          fontSize: 0.7,
          fontWeight: 'normal',
          textAlign: 'center'
        }
      ]
    },
    oilTypes: this.defaultOilTypes
  };

  // Get all stickers
  static getAllStickers(): StaticSticker[] {
    try {
      const stored = localStorage.getItem(STICKERS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading stickers:', error);
      return [];
    }
  }

  // Get active stickers
  static getActiveStickers(): StaticSticker[] {
    return this.getAllStickers().filter(sticker => !sticker.archived);
  }

  // Get archived stickers
  static getArchivedStickers(): StaticSticker[] {
    return this.getAllStickers().filter(sticker => sticker.archived);
  }

  // Get sticker by ID
  static getStickerById(id: string): StaticSticker | undefined {
    return this.getAllStickers().find(sticker => sticker.id === id);
  }

  // Save sticker
  static saveSticker(sticker: StaticSticker): void {
    try {
      const stickers = this.getAllStickers();
      const existingIndex = stickers.findIndex(s => s.id === sticker.id);
      
      if (existingIndex >= 0) {
        stickers[existingIndex] = { ...sticker, lastUpdated: new Date().toISOString() };
      } else {
        stickers.push(sticker);
      }
      
      localStorage.setItem(STICKERS_STORAGE_KEY, JSON.stringify(stickers));
    } catch (error) {
      console.error('Error saving sticker:', error);
      throw new Error('Failed to save sticker');
    }
  }

  // Delete sticker
  static deleteSticker(id: string): void {
    try {
      const stickers = this.getAllStickers().filter(sticker => sticker.id !== id);
      localStorage.setItem(STICKERS_STORAGE_KEY, JSON.stringify(stickers));
    } catch (error) {
      console.error('Error deleting sticker:', error);
      throw new Error('Failed to delete sticker');
    }
  }

  // Archive sticker
  static archiveSticker(id: string): void {
    try {
      const stickers = this.getAllStickers();
      const sticker = stickers.find(s => s.id === id);
      if (sticker) {
        sticker.archived = true;
        sticker.lastUpdated = new Date().toISOString();
        localStorage.setItem(STICKERS_STORAGE_KEY, JSON.stringify(stickers));
      }
    } catch (error) {
      console.error('Error archiving sticker:', error);
      throw new Error('Failed to archive sticker');
    }
  }

  // Restore sticker from archive
  static restoreSticker(id: string): void {
    try {
      const stickers = this.getAllStickers();
      const sticker = stickers.find(s => s.id === id);
      if (sticker) {
        sticker.archived = false;
        sticker.lastUpdated = new Date().toISOString();
        localStorage.setItem(STICKERS_STORAGE_KEY, JSON.stringify(stickers));
      }
    } catch (error) {
      console.error('Error restoring sticker:', error);
      throw new Error('Failed to restore sticker');
    }
  }

  // Settings management
  static getSettings(): StickerSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!stored) {
        return this.defaultSettings;
      }
      
      const storedSettings = JSON.parse(stored);
      
      // Merge settings with proper handling of nested objects
      const mergedSettings: StickerSettings = {
        ...this.defaultSettings,
        ...storedSettings,
        layout: {
          ...this.defaultSettings.layout,
          ...storedSettings.layout,
          // Ensure elements array exists - use default if missing
          elements: storedSettings.layout?.elements || this.defaultSettings.layout.elements,
          // Ensure qrCodePosition exists - use default if missing  
          qrCodePosition: storedSettings.layout?.qrCodePosition || this.defaultSettings.layout.qrCodePosition
        }
      };

      // Check if decodedDetails element exists, if not add it for backward compatibility
      const hasDecodedDetailsElement = mergedSettings.layout.elements.some(el => el.id === 'decodedDetails');
      if (!hasDecodedDetailsElement) {
        const decodedDetailsElement = this.defaultSettings.layout.elements.find(el => el.id === 'decodedDetails');
        if (decodedDetailsElement) {
          mergedSettings.layout.elements.push(decodedDetailsElement);
        }
      }
      
      return mergedSettings;
    } catch (error) {
      console.error('Error loading settings:', error);
      return this.defaultSettings;
    }
  }

  static saveSettings(settings: StickerSettings): void {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
      throw new Error('Failed to save settings');
    }
  }

  // Get oil types from settings
  static getOilTypes(): OilType[] {
    return this.getSettings().oilTypes;
  }

  // Get oil type by ID
  static getOilTypeById(id: string): OilType | undefined {
    return this.getOilTypes().find(type => type.id === id);
  }
} 