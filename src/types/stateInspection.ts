export interface StateInspectionRecord {
  id: string;
  createdBy: string;
  createdDate: string;
  stickerNumber: string;
  lastName: string;
  paymentType: 'Cash' | 'Check' | 'Fleet';
  paymentAmount: 0 | 10 | 18 | 20;
  status: 'Pass' | 'Retest' | 'Fail';
  fleetAccount?: string;
  tintAffidavit?: ImageFile;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
}

export interface ImageFile {
  id: string;
  filename: string;
  url: string;
  size: number;
  type: string;
  uploadDate: string;
}

export interface FleetAccount {
  id: string;
  name: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  notes?: string;
  active: boolean;
  createdDate: string;
  updatedDate: string;
}

export interface StateInspectionFilters {
  dateFrom?: string;
  dateTo?: string;
  createdBy?: string;
  paymentType?: 'Cash' | 'Check' | 'Fleet' | 'All';
  status?: 'Pass' | 'Retest' | 'Fail' | 'All';
  fleetAccount?: string;
  stickerNumber?: string;
  lastName?: string;
}

export interface StateInspectionStats {
  totalRecords: number;
  totalRevenue: number;
  averagePayment: number;
  recordsByPaymentType: Record<string, number>;
  recordsByStatus: Record<string, number>;
  recordsByMonth: Array<{
    month: string;
    count: number;
    revenue: number;
  }>;
  recordsByCreator: Array<{
    creator: string;
    count: number;
    revenue: number;
  }>;
}

// Form data for creating new records
export interface CreateStateInspectionFormData {
  createdBy: string;
  createdDate: string;
  stickerNumber: string;
  lastName: string;
  paymentType?: 'Cash' | 'Check' | 'Fleet';
  paymentAmount?: 0 | 10 | 18 | 20;
  status?: 'Pass' | 'Retest' | 'Fail';
  fleetAccount?: string;
  tintAffidavit?: File;
  notes?: string;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
} 