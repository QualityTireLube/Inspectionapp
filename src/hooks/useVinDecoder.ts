import React, { useState, useCallback } from 'react';
import { decodeVinCached } from '../services/api';
import { vinCacheService } from '../services/vinCache';

// VIN Decoder Hook
export const useVinDecoder = () => {
  const [vinDecodeLoading, setVinDecodeLoading] = useState(false);
  const [vinDecodeError, setVinDecodeError] = useState<string | null>(null);
  const [vehicleDetails, setVehicleDetails] = useState<any>(null);
  const [lastDecodedVin, setLastDecodedVin] = useState<string | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const decodeVin = useCallback(async (vin: string) => {
    console.log('🔍 VIN Decoder: decodeVin called with:', vin);
    
    // Clear previous state
    setVinDecodeError(null);
    setVehicleDetails(null);
    
    // Handle invalid VIN length
    if (vin.length < 17) {
      console.log('📝 VIN Decoder: VIN too short, resetting state');
      setVehicleDetails(null);
      setLastDecodedVin(null);
      return;
    }
    
    // Clear cache if VIN changed from last decoded VIN
    if (lastDecodedVin && lastDecodedVin !== vin) {
      console.log('🔄 VIN Decoder: VIN changed, clearing cache for old VIN');
      vinCacheService.clearVinCache(lastDecodedVin);
    }
    
    // Check if VIN is valid (17 characters)
    if (vin.length === 17) {
      // First check if we have cached data
      const cachedData = vinCacheService.getCachedData(vin);
      if (cachedData) {
        console.log('💾 VIN Decoder: Using cached data for:', vin);
        setVehicleDetails(cachedData);
        setLastDecodedVin(vin);
        setVinDecodeError(null);
        return;
      }
      
      // Check if we should make an API call
      if (!vinCacheService.shouldDecodeVin(vin)) {
        console.log('🚫 VIN Decoder: Skipping API call for:', vin);
        // If we have failed too many times, show a specific error
        const stats = vinCacheService.getCacheStats();
        if (stats.failedEntries > 0) {
          setVinDecodeError('VIN decoding failed after multiple attempts');
        }
        return;
      }
      
      // Skip if already decoded successfully
      if (vin === lastDecodedVin && vehicleDetails) {
        console.log('⏭️ VIN Decoder: VIN already decoded, skipping');
        return;
      }
      
      console.log('🚀 VIN Decoder: Starting decode for:', vin);
      setVinDecodeLoading(true);
      
      try {
        const data = await decodeVinCached(vin);
        console.log('✅ VIN Decoder: Success:', data);
        
        // Cache the successful result
        vinCacheService.setCachedData(vin, data);
        
        setVehicleDetails(data);
        setLastDecodedVin(vin);
        setVinDecodeError(null);
      } catch (error: any) {
        console.error('❌ VIN decode error:', error);
        
        // Increment failed attempts
        vinCacheService.incrementFailedAttempts(vin);
        
        // Check if we have a user-friendly error message from the backend
        let errorMessage = 'Failed to decode VIN.';
        
        if (error.response?.data?.userMessage) {
          errorMessage = error.response.data.userMessage;
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        // Show different error styles based on the error type
        if (error.response?.status === 503) {
          // Service unavailable - show as warning, not error
          console.warn('VIN decoding service temporarily unavailable');
          setVinDecodeError(`⚠️ ${errorMessage}`);
        } else {
          setVinDecodeError(errorMessage);
        }
        
        setVehicleDetails(null);
        setLastDecodedVin(null);
      } finally {
        setVinDecodeLoading(false);
      }
    }
  }, [lastDecodedVin, vehicleDetails]);

  const resetVinDecoder = useCallback(() => {
    console.log('🔄 VIN Decoder: Resetting');
    
    // Clear cache for last decoded VIN if it exists
    if (lastDecodedVin) {
      vinCacheService.clearVinCache(lastDecodedVin);
    }
    
    setVinDecodeLoading(false);
    setVinDecodeError(null);
    setVehicleDetails(null);
    setLastDecodedVin(null);
    setShowDetailsDialog(false);
  }, [lastDecodedVin]);

  // Helper function to extract vehicle information
  const getVehicleInfo = useCallback(() => {
    if (!vehicleDetails || !vehicleDetails.Results) return null;

    const getValue = (variable: string) => {
      const found = vehicleDetails.Results.find((r: any) => r.Variable === variable);
      return found && found.Value && found.Value !== 'Not Applicable' && found.Value !== '0' ? found.Value : '';
    };

    const year = getValue('Model Year');
    const make = getValue('Make');
    const model = getValue('Model');
    const engine = getValue('Displacement (L)');
    const cylinders = getValue('Engine Number of Cylinders');
    
    // Format engine displacement to max 2 decimal places
    const formattedEngine = engine ? parseFloat(engine).toFixed(2).replace(/\.?0+$/, '') + 'L' : '';
    
    return {
      year,
      make,
      model,
      engine,
      cylinders,
      label: [year, make, model, formattedEngine, cylinders ? cylinders + ' cyl' : ''].filter(Boolean).join(' ')
    };
  }, [vehicleDetails]);

  const openDetailsDialog = useCallback(() => {
    setShowDetailsDialog(true);
  }, []);

  const closeDetailsDialog = useCallback(() => {
    setShowDetailsDialog(false);
  }, []);

  return {
    vinDecodeLoading,
    vinDecodeError,
    vehicleDetails,
    lastDecodedVin,
    showDetailsDialog,
    decodeVin,
    resetVinDecoder,
    getVehicleInfo,
    openDetailsDialog,
    closeDetailsDialog
  };
}; 