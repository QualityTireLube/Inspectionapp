declare module 'vin-decode' {
  interface VinData {
    make?: string;
    model?: string;
    year?: number;
    engine?: string;
    trim?: string;
    bodyType?: string;
    driveType?: string;
    transmission?: string;
    fuelType?: string;
  }

  class VinDecoder {
    constructor(vin: string);
    decode(): VinData;
  }

  export = VinDecoder;
} 