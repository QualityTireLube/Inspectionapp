import { Location, LocationFormData, LocationSettings, LocationWithSettings, PrinterSettings } from '../types/locations';
import { StickerSettings } from '../types/stickers';
import { StickerStorageService } from './stickerStorage';

const LOCATIONS_STORAGE_KEY = 'quickcheck_locations';
const LOCATION_SETTINGS_STORAGE_KEY = 'quickcheck_location_settings';

export class LocationService {
  
  // Default locations for initial setup
  private static defaultLocations: Location[] = [
    {
      id: 'quality-lube-express',
      name: 'Quality Lube Express',
      address: '3617 HWY 19 Zachary LA 70791',
      phone: '',
      email: '',
      enabled: true,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'simple-simon',
      name: 'Simple Simon',
      address: '123 Main St, Anytown USA',
      phone: '',
      email: '',
      enabled: true,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    }
  ];

  // Location CRUD operations
  static getLocations(): Location[] {
    try {
      const stored = localStorage.getItem(LOCATIONS_STORAGE_KEY);
      if (!stored) {
        // Initialize with default locations
        this.saveLocations(this.defaultLocations);
        return this.defaultLocations;
      }
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error loading locations:', error);
      return this.defaultLocations;
    }
  }

  static getLocationById(id: string): Location | null {
    const locations = this.getLocations();
    return locations.find(location => location.id === id) || null;
  }

  static saveLocations(locations: Location[]): void {
    try {
      localStorage.setItem(LOCATIONS_STORAGE_KEY, JSON.stringify(locations));
    } catch (error) {
      console.error('Error saving locations:', error);
      throw new Error('Failed to save locations');
    }
  }

  static addLocation(formData: LocationFormData): Location {
    const locations = this.getLocations();
    const newLocation: Location = {
      id: this.generateLocationId(formData.name),
      ...formData,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    // Check for duplicate names
    if (locations.some(loc => loc.name.toLowerCase() === formData.name.toLowerCase())) {
      throw new Error('A location with this name already exists');
    }

    locations.push(newLocation);
    this.saveLocations(locations);
    
    // Initialize default settings for new location
    this.initializeLocationSettings(newLocation.id, formData.name, formData.address);
    
    return newLocation;
  }

  static updateLocation(id: string, formData: LocationFormData): Location {
    const locations = this.getLocations();
    const index = locations.findIndex(loc => loc.id === id);
    
    if (index === -1) {
      throw new Error('Location not found');
    }

    // Check for duplicate names (excluding current location)
    if (locations.some(loc => loc.id !== id && loc.name.toLowerCase() === formData.name.toLowerCase())) {
      throw new Error('A location with this name already exists');
    }

    const updatedLocation: Location = {
      ...locations[index],
      ...formData,
      lastUpdated: new Date().toISOString()
    };

    locations[index] = updatedLocation;
    this.saveLocations(locations);

    return updatedLocation;
  }

  static deleteLocation(id: string): void {
    const locations = this.getLocations();
    const filteredLocations = locations.filter(loc => loc.id !== id);
    
    if (filteredLocations.length === locations.length) {
      throw new Error('Location not found');
    }

    this.saveLocations(filteredLocations);
    
    // Also delete location settings
    this.deleteLocationSettings(id);
  }

  // Location Settings Management
  static getLocationSettings(): { [locationId: string]: LocationSettings } {
    try {
      const stored = localStorage.getItem(LOCATION_SETTINGS_STORAGE_KEY);
      if (!stored) {
        return {};
      }
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error loading location settings:', error);
      return {};
    }
  }

  static getSettingsForLocation(locationId: string): LocationSettings | null {
    const allSettings = this.getLocationSettings();
    return allSettings[locationId] || null;
  }

  static saveLocationSettings(settings: { [locationId: string]: LocationSettings }): void {
    try {
      localStorage.setItem(LOCATION_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving location settings:', error);
      throw new Error('Failed to save location settings');
    }
  }

  static saveSettingsForLocation(locationId: string, settings: Partial<LocationSettings>): void {
    const allSettings = this.getLocationSettings();
    const currentSettings = allSettings[locationId] || {
      locationId,
      lastUpdated: new Date().toISOString()
    };

    allSettings[locationId] = {
      ...currentSettings,
      ...settings,
      lastUpdated: new Date().toISOString()
    };

    this.saveLocationSettings(allSettings);
  }

  static deleteLocationSettings(locationId: string): void {
    const allSettings = this.getLocationSettings();
    delete allSettings[locationId];
    this.saveLocationSettings(allSettings);
  }

  // Settings Integration by Type
  static getStickerSettingsForLocation(locationId: string): StickerSettings | null {
    const settings = this.getSettingsForLocation(locationId);
    return settings?.stickerSettings || null;
  }

  static saveStickerSettingsForLocation(locationId: string, stickerSettings: StickerSettings): void {
    this.saveSettingsForLocation(locationId, { stickerSettings });
  }

  static getLabelSettingsForLocation(locationId: string): any | null {
    const settings = this.getSettingsForLocation(locationId);
    return settings?.labelSettings || null;
  }

  static saveLabelSettingsForLocation(locationId: string, labelSettings: any): void {
    this.saveSettingsForLocation(locationId, { labelSettings });
  }

  static getPrinterSettingsForLocation(locationId: string): PrinterSettings | null {
    const settings = this.getSettingsForLocation(locationId);
    return settings?.printerSettings || null;
  }

  static savePrinterSettingsForLocation(locationId: string, printerSettings: PrinterSettings): void {
    this.saveSettingsForLocation(locationId, { printerSettings });
  }

  static getDefaultPrinterSettings(): PrinterSettings {
    return {
      defaultPrinter: '',
      orientation: 'portrait',
      paperSize: 'A4',
      margins: {
        top: 10,
        bottom: 10,
        left: 10,
        right: 10
      },
      printMethod: 'pdf',
      autoPrint: false,
      printerList: []
    };
  }

  // Helper methods
  private static generateLocationId(name: string): string {
    const base = name.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Ensure uniqueness
    const existing = this.getLocations();
    let counter = 1;
    let id = base;
    
    while (existing.some(loc => loc.id === id)) {
      id = `${base}-${counter}`;
      counter++;
    }
    
    return id;
  }

  private static initializeLocationSettings(locationId: string, name: string, address: string): void {
    // Get default sticker settings and customize for this location
    const defaultStickerSettings = StickerStorageService.getSettings();
    
    // Customize company name and address elements
    const customizedStickerSettings = JSON.parse(JSON.stringify(defaultStickerSettings));
    customizedStickerSettings.layout.elements = customizedStickerSettings.layout.elements.map((element: any) => {
      if (element.id === 'companyName') {
        return { ...element, content: name };
      }
      if (element.id === 'address') {
        return { ...element, content: address };
      }
      return element;
    });

    // Initialize all settings types for the location
    this.saveSettingsForLocation(locationId, {
      stickerSettings: customizedStickerSettings,
      labelSettings: {}, // Default empty label settings
      printerSettings: this.getDefaultPrinterSettings()
    });
  }

  // Get locations with their settings
  static getLocationsWithSettings(): LocationWithSettings[] {
    const locations = this.getLocations();
    const allSettings = this.getLocationSettings();

    return locations.map(location => ({
      ...location,
      settings: allSettings[location.id]
    }));
  }
}