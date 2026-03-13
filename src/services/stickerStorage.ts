import { StaticSticker, StickerSettings, OilType, LocationStickerSettings } from '../types/stickers';
import { 
  getStaticStickers, 
  createStaticSticker, 
  updateStaticSticker, 
  deleteStaticSticker, 
  archiveStaticSticker,
  restoreStaticSticker 
} from './api-stickers-labels';

const STICKERS_STORAGE_KEY = 'oil_change_stickers';
const SETTINGS_STORAGE_KEY = 'oil_change_settings';
const LOCATION_SETTINGS_STORAGE_KEY = 'oil_change_location_settings';

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
      qrCodeSize: 15,
      qrCodePosition: { x: 50, y: 85 }, // Center bottom
      margins: { top: 2, bottom: 2, left: 2, right: 2 },
      elements: [
        {
          id: 'header',
          label: 'Header Text',
          content: 'Next Service Due',
          visible: true,
          position: { x: 50, y: 22 },
          fontSize: 1.65,
          fontWeight: 'bold',
          textAlign: 'center'
        },
        {
          id: 'serviceDate',
          label: 'Service Date',
          content: '{serviceDate}',
          visible: true,
          position: { x: 10, y: 30 },
          fontSize: 1.35,
          fontWeight: 'normal',
          textAlign: 'left'
        },
        {
          id: 'serviceMileage',
          label: 'Service Mileage',
          content: '{serviceMileage}',
          visible: true,
          position: { x: 90, y: 30 },
          fontSize: 1.35,
          fontWeight: 'normal',
          textAlign: 'right'
        },
        {
          id: 'oilType',
          label: 'Oil Type',
          content: '{oilType}',
          visible: true,
          position: { x: 50, y: 38 },
          fontSize: 1.5,
          fontWeight: 'normal',
          textAlign: 'center'
        },
        {
          id: 'companyName',
          label: 'Company Name',
          content: 'Quality Lube Express',
          visible: true,
          position: { x: 50, y: 46 },
          fontSize: 1.35,
          fontWeight: 'bold',
          textAlign: 'center'
        },
        {
          id: 'address',
          label: 'Address',
          content: '3617 HWY 19 Zachary LA 70791',
          visible: true,
          position: { x: 50, y: 52 },
          fontSize: 1,
          fontWeight: 'normal',
          textAlign: 'center'
        },
        {
          id: 'message',
          label: 'Thank You Message',
          content: 'THANK YOU',
          visible: true,
          position: { x: 50, y: 62 },
          fontSize: 1.5,
          fontWeight: 'bold',
          textAlign: 'center'
        },
        {
          id: 'decodedDetails',
          label: 'Vehicle Details',
          content: '{decodedDetails}',
          visible: true,
          position: { x: 50, y: 70 },
          fontSize: 1,
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

  // Get active stickers (using database API)
  static async getActiveStickers(): Promise<StaticSticker[]> {
    try {
      const stickers = await getStaticStickers(undefined, false);
      return stickers;
    } catch (error) {
      console.error('Error loading active stickers from database:', error);
      return [];
    }
  }

  // Get archived stickers (using both database API and localStorage for compatibility)
  static async getArchivedStickers(): Promise<StaticSticker[]> {
    try {
      // Get archived stickers from database directly
      const archivedDbStickers = await getStaticStickers(undefined, true);
      
      // Get stickers from localStorage as fallback/supplement
      const localStickers = this.getAllStickers();
      const archivedLocalStickers = localStickers.filter(sticker => sticker.archived);
      
      // Merge and deduplicate by ID, prioritizing database entries
      const allArchivedStickers = [...archivedDbStickers];
      const dbStickerIds = new Set(archivedDbStickers.map(s => s.id));
      
      // Add local stickers that aren't already in the database results
      archivedLocalStickers.forEach(localSticker => {
        if (!dbStickerIds.has(localSticker.id)) {
          allArchivedStickers.push(localSticker);
        }
      });
      
      console.log(`📊 Found ${archivedDbStickers.length} archived stickers in database, ${archivedLocalStickers.length} in localStorage, ${allArchivedStickers.length} total`);
      return allArchivedStickers;
    } catch (error) {
      console.error('Error loading archived stickers from database, falling back to localStorage:', error);
      // Fallback to localStorage only
      return this.getAllStickers().filter(sticker => sticker.archived);
    }
  }

  // Get sticker by ID (async version for database)
  static async getStickerById(id: string): Promise<StaticSticker | undefined> {
    try {
      // Get all stickers (both archived and active) to find the specific ID
      const stickers = await getStaticStickers();
      return stickers.find(sticker => sticker.id === id);
    } catch (error) {
      console.error('Error getting sticker by ID:', error);
      return undefined;
    }
  }

  // Save sticker (using database API)
  static async saveSticker(sticker: StaticSticker): Promise<StaticSticker> {
    try {
      if (sticker.id && await this.getStickerById(sticker.id)) {
        // Update existing sticker
        const updatedSticker = { ...sticker, lastUpdated: new Date().toISOString() };
        await updateStaticSticker(sticker.id, updatedSticker);
        return updatedSticker;
      } else {
        // Create new sticker
        const newSticker = {
          ...sticker,
          id: sticker.id || Date.now().toString(),
          dateCreated: sticker.dateCreated || new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        };
        await createStaticSticker(newSticker);
        return newSticker;
      }
    } catch (error) {
      console.error('Error saving sticker to database:', error);
      throw new Error('Failed to save sticker to database');
    }
  }

  // Delete sticker
  static async deleteSticker(id: string): Promise<void> {
    try {
      // First, delete from the database/API
      await deleteStaticSticker(id);
      console.log('✅ Sticker deleted from database');
      
      // Then remove from local cache
      const stickers = this.getAllStickers().filter(sticker => sticker.id !== id);
      localStorage.setItem(STICKERS_STORAGE_KEY, JSON.stringify(stickers));
    } catch (error) {
      console.error('Error deleting sticker from database:', error);
      throw error;
    }
  }

  // Archive sticker
  static async archiveSticker(id: string): Promise<void> {
    try {
      // First, archive in the database/API
      await archiveStaticSticker(id);
      console.log('✅ Sticker archived in database');
      
      // Then update local cache
      const stickers = this.getAllStickers();
      const sticker = stickers.find(s => s.id === id);
      if (sticker) {
        sticker.archived = true;
        sticker.lastUpdated = new Date().toISOString();
        localStorage.setItem(STICKERS_STORAGE_KEY, JSON.stringify(stickers));
      }
    } catch (error) {
      console.error('Error archiving sticker in database:', error);
      throw error;
    }
  }

  // Restore sticker from archive
  static async restoreSticker(id: string): Promise<void> {
    try {
      // First, restore in the database/API
      await restoreStaticSticker(id);
      console.log('✅ Sticker restored in database');
      
      // Then update local cache
      const stickers = this.getAllStickers();
      const sticker = stickers.find(s => s.id === id);
      if (sticker) {
        sticker.archived = false;
        sticker.lastUpdated = new Date().toISOString();
        localStorage.setItem(STICKERS_STORAGE_KEY, JSON.stringify(stickers));
      }
    } catch (error) {
      console.error('Error restoring sticker in database:', error);
      throw error;
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

  // Legacy location-specific settings management - for backward compatibility
  // NOTE: This is being replaced by the new LocationService system
  static getLocationSettings(): LocationStickerSettings {
    return {};
  }

  static getSettingsForLocation(locationName: string): StickerSettings {
    return JSON.parse(JSON.stringify(this.defaultSettings));
  }

  static saveLocationSettings(locationSettings: LocationStickerSettings): void {
    // Legacy method - functionality moved to LocationService
  }

  static saveSettingsForLocation(locationName: string, settings: StickerSettings): void {
    // Legacy method - functionality moved to LocationService
  }

  static resetLocationToDefaults(locationName: string): void {
    // Legacy method - functionality moved to LocationService
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