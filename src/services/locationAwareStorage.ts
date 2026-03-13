import { StickerStorageService } from './stickerStorage';
import { GeneratedLabelStorageService } from './generatedLabelStorage';
import { LocationService } from './locationService';
import { StaticSticker } from '../types/stickers';
import { GeneratedLabel, CreateGeneratedLabelRequest } from '../types/labels';

export class LocationAwareStorageService {
  
  // Create a location-aware sticker
  static async createLocationAwareSticker(stickerData: Omit<StaticSticker, 'locationId'>, locationId: string): Promise<StaticSticker> {
    const location = LocationService.getLocationById(locationId);
    
    const stickerWithLocation: StaticSticker = {
      ...stickerData,
      locationId: locationId,
      companyName: location?.name || stickerData.companyName,
      address: location?.address || stickerData.address
    };
    
    console.log('Creating location-aware sticker:', stickerWithLocation);
    const savedSticker = await StickerStorageService.saveSticker(stickerWithLocation);
    console.log('Saved sticker result:', savedSticker);
    return savedSticker;
  }

  // Create a location-aware label
  static async createLocationAwareLabel(labelRequest: Omit<CreateGeneratedLabelRequest, 'locationId'>, locationId: string): Promise<GeneratedLabel> {
    const labelRequestWithLocation: CreateGeneratedLabelRequest = {
      ...labelRequest,
      locationId: locationId
    };
    
    return await GeneratedLabelStorageService.saveGeneratedLabel(labelRequestWithLocation);
  }

  // Get stickers filtered by location
  static async getActiveStickersByLocation(locationId?: string): Promise<StaticSticker[]> {
    if (!locationId) return [];
    
    const allStickers = await StickerStorageService.getActiveStickers();
    
    return allStickers.filter(sticker => {
      // Check direct location match
      if (sticker.locationId) {
        return sticker.locationId === locationId;
      }
      
      // Fallback: check if company name matches location name
      const location = LocationService.getLocationById(locationId);
      if (location && sticker.companyName) {
        return sticker.companyName === location.name;
      }
      
      return false;
    });
  }

  // Get labels filtered by location
  static async getActiveLabelsByLocation(locationId?: string): Promise<GeneratedLabel[]> {
    if (!locationId) return [];
    
    const allLabels = await GeneratedLabelStorageService.getActiveGeneratedLabels();
    
    return allLabels.filter(label => {
      // Check direct location match
      if (label.locationId) {
        return label.locationId === locationId;
      }
      
      // Fallback: check if company name matches location name
      const location = LocationService.getLocationById(locationId);
      if (location && label.labelData?.companyName) {
        return label.labelData.companyName === location.name;
      }
      
      return false;
    });
  }

  // Get archived stickers filtered by location
  static async getArchivedStickersByLocation(locationId?: string): Promise<StaticSticker[]> {
    if (!locationId) return [];
    
    const allStickers = await StickerStorageService.getArchivedStickers();
    
    return allStickers.filter(sticker => {
      if (sticker.locationId) {
        return sticker.locationId === locationId;
      }
      
      const location = LocationService.getLocationById(locationId);
      if (location && sticker.companyName) {
        return sticker.companyName === location.name;
      }
      
      return false;
    });
  }

  // Get archived labels filtered by location
  static async getArchivedLabelsByLocation(locationId?: string): Promise<GeneratedLabel[]> {
    if (!locationId) return [];
    
    const allLabels = await GeneratedLabelStorageService.getArchivedGeneratedLabels();
    
    return allLabels.filter(label => {
      if (label.locationId) {
        return label.locationId === locationId;
      }
      
      const location = LocationService.getLocationById(locationId);
      if (location && label.labelData?.companyName) {
        return label.labelData.companyName === location.name;
      }
      
      return false;
    });
  }

  // Initialize location data for existing items without locationId
  static async initializeLocationData(): Promise<void> {
    console.log('Initializing location data for existing items...');
    
    try {
      // Get all available locations
      const locations = LocationService.getLocations();
      if (locations.length === 0) {
        console.log('No locations available for initialization');
        return;
      }

      // Initialize stickers
      const allStickers = await StickerStorageService.getActiveStickers();
      for (const sticker of allStickers) {
        if (!sticker.locationId) {
          // Try to match by company name
          const matchingLocation = locations.find(loc => 
            sticker.companyName && loc.name === sticker.companyName
          );
          
          if (matchingLocation) {
            const updatedSticker = { ...sticker, locationId: matchingLocation.id };
            await StickerStorageService.saveSticker(updatedSticker);
            console.log(`Assigned location ${matchingLocation.name} to sticker ${sticker.id}`);
          }
        }
      }

      // Initialize labels
      const allLabels = await GeneratedLabelStorageService.getActiveGeneratedLabels();
      for (const label of allLabels) {
        if (!label.locationId) {
          // Try to match by company name in label data
          const matchingLocation = locations.find(loc => 
            label.labelData?.companyName && loc.name === label.labelData.companyName
          );
          
          if (matchingLocation) {
            const updatedLabel = { ...label, locationId: matchingLocation.id };
            await GeneratedLabelStorageService.saveGeneratedLabel(updatedLabel);
            console.log(`Assigned location ${matchingLocation.name} to label ${label.id}`);
          }
        }
      }

      console.log('Location data initialization completed');
    } catch (error) {
      console.error('Error initializing location data:', error);
    }
  }
}