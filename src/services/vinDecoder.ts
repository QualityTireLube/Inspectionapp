import { VinDecodedDetails } from '../types/stickers';
import { truncateDecimalValues } from './api';

export class VinDecoderService {
  static async decodeVin(vin: string): Promise<VinDecodedDetails> {
    try {
      if (!vin || vin.length !== 17) {
        throw new Error('Invalid VIN length. VIN must be 17 characters.');
      }

      // Clean the VIN (remove spaces and convert to uppercase)
      const cleanVin = vin.replace(/\s/g, '').toUpperCase();
      
      // Validate VIN format (17 alphanumeric characters, no I, O, Q)
      const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
      if (!vinRegex.test(cleanVin)) {
        throw new Error('Invalid VIN format. VIN contains invalid characters.');
      }

      // Use backend proxy for comprehensive vehicle data
      const response = await fetch(`${window.location.protocol}//${window.location.hostname}:5001/api/vin/decode/${cleanVin}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `VIN decode request failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.Results || data.Results.length === 0) {
        throw new Error('No vehicle data found for this VIN');
      }

      // Helper function to extract value by variable name with decimal truncation
      const getValue = (variable: string): string => {
        const found = data.Results.find((r: any) => r.Variable === variable);
        const rawValue = found && found.Value && found.Value !== 'Not Applicable' && found.Value !== '0' ? found.Value : '';
        return truncateDecimalValues(rawValue);
      };

      return {
        make: getValue('Make'),
        model: getValue('Model'),
        year: getValue('Model Year'),
        engine: getValue('Engine Configuration'),
        engineL: getValue('Displacement (L)'),
        engineCylinders: getValue('Engine Number of Cylinders'),
        trim: getValue('Trim'),
        bodyType: getValue('Body Class'),
        bodyClass: getValue('Body Class'),
        driveType: getValue('Drive Type'),
        transmission: getValue('Transmission Style'),
        fuelType: getValue('Fuel Type - Primary'),
        manufacturer: getValue('Manufacturer Name'),
        plant: getValue('Plant Company Name'),
        vehicleType: getValue('Vehicle Type'),
      };
    } catch (error) {
      console.error('VIN decode error:', error);
      return {
        error: error instanceof Error ? error.message : 'Failed to decode VIN'
      };
    }
  }

  static validateVin(vin: string): boolean {
    if (!vin || vin.length !== 17) return false;
    const cleanVin = vin.replace(/\s/g, '').toUpperCase();
    const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
    return vinRegex.test(cleanVin);
  }

  static formatVin(vin: string): string {
    return vin.replace(/\s/g, '').toUpperCase();
  }
} 