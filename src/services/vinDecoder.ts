/**
 * VIN Decoder — calls NHTSA public API directly from the browser.
 * No backend or authentication required.
 * https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/{vin}?format=json
 */

import { VinDecodedDetails } from '../types/stickers';

const NHTSA_BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles/decodevin';

/** Trim unnecessary decimal precision from NHTSA values (e.g. "1.9999" → "2"). */
function truncateDecimalValues(value: string): string {
  if (!value || value === '' || value === 'Not Applicable' || value === '0') return value;
  const numMatch = value.match(/^\d+\.\d+/);
  if (numMatch) {
    const num = parseFloat(numMatch[0]);
    const decimals = (numMatch[0].split('.')[1] || '').replace(/0+$/, '');
    return decimals.length === 0 ? String(Math.round(num)) : num.toFixed(decimals.length);
  }
  return value;
}

export class VinDecoderService {
  static async decodeVin(vin: string): Promise<VinDecodedDetails> {
    try {
      if (!vin || vin.length !== 17) {
        throw new Error('Invalid VIN length. VIN must be 17 characters.');
      }

      const cleanVin = vin.replace(/\s/g, '').toUpperCase();
      const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
      if (!vinRegex.test(cleanVin)) {
        throw new Error('Invalid VIN format. VIN contains invalid characters.');
      }

      const response = await fetch(`${NHTSA_BASE}/${cleanVin}?format=json`);
      if (!response.ok) {
        throw new Error(`NHTSA VIN decode failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.Results || data.Results.length === 0) {
        throw new Error('No vehicle data found for this VIN');
      }

      const getValue = (variable: string): string => {
        const found = data.Results.find((r: any) => r.Variable === variable);
        const raw = found?.Value && found.Value !== 'Not Applicable' && found.Value !== '0' ? found.Value : '';
        return truncateDecimalValues(raw);
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
      return { error: error instanceof Error ? error.message : 'Failed to decode VIN' };
    }
  }

  static validateVin(vin: string): boolean {
    if (!vin || vin.length !== 17) return false;
    const clean = vin.replace(/\s/g, '').toUpperCase();
    return /^[A-HJ-NPR-Z0-9]{17}$/.test(clean);
  }

  static formatVin(vin: string): string {
    return vin.replace(/\s/g, '').toUpperCase();
  }
}

/** In-memory VIN cache to avoid duplicate NHTSA requests. */
const vinCache = new Map<string, VinDecodedDetails>();

export async function decodeVinCached(vin: string): Promise<VinDecodedDetails> {
  const key = vin.replace(/\s/g, '').toUpperCase();
  if (vinCache.has(key)) return vinCache.get(key)!;
  const result = await VinDecoderService.decodeVin(key);
  if (!result.error) vinCache.set(key, result);
  return result;
}

/** Raw NHTSA response (for components that need the full Results array). */
export async function decodeVinNHTSA(vin: string): Promise<any> {
  const cleanVin = vin.replace(/\s/g, '').toUpperCase();
  const response = await fetch(`${NHTSA_BASE}/${cleanVin}?format=json`);
  if (!response.ok) throw new Error(`NHTSA request failed: ${response.status}`);
  const data = await response.json();
  // Normalise decimal values in Results
  return {
    ...data,
    Results: (data.Results ?? []).map((r: any) => ({
      ...r,
      Value: r.Value ? truncateDecimalValues(r.Value) : r.Value,
    })),
  };
}
