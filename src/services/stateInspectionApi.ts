/**
 * stateInspectionApi.ts — re-exports from firebase/stateInspections.ts for backwards compatibility.
 */
export {
  getStateInspections,
  getStateInspectionById,
  createStateInspection,
  updateStateInspection,
  deleteStateInspection,
} from './firebase/stateInspections';
export type { StateInspectionRecord } from './firebase/stateInspections';

// Legacy type stubs for callers that import StateInspection types
export type FleetAccount = {
  id: string;
  name: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
};

export type CreateStateInspectionFormData = import('./firebase/stateInspections').StateInspectionRecord;
export type StateInspectionFilters = { startDate?: string; endDate?: string; result?: string; locationId?: string };
export type StateInspectionStats = { total: number; pass: number; fail: number; pending: number };

// Stub API object for legacy callers
export const stateInspectionApi = {
  getAll: async (_filters?: StateInspectionFilters) => {
    const { getStateInspections } = await import('./firebase/stateInspections');
    return getStateInspections();
  },
  getById: async (id: string) => {
    const { getStateInspectionById } = await import('./firebase/stateInspections');
    return getStateInspectionById(id);
  },
  create: async (data: CreateStateInspectionFormData) => {
    const { createStateInspection } = await import('./firebase/stateInspections');
    return createStateInspection(data);
  },
  update: async (id: string, data: Partial<CreateStateInspectionFormData>) => {
    const { updateStateInspection } = await import('./firebase/stateInspections');
    return updateStateInspection(id, data);
  },
  delete: async (id: string) => {
    const { deleteStateInspection } = await import('./firebase/stateInspections');
    return deleteStateInspection(id);
  },
};

// Additional aliases used by StateInspection components
export const createStateInspectionRecord = createStateInspection;
export const updateStateInspectionRecord = updateStateInspection;
export const deleteStateInspectionRecord = deleteStateInspection;

// Fleet accounts — stub until a `fleet_accounts` collection is set up
export const getFleetAccounts = async (): Promise<FleetAccount[]> => [];
export const createFleetAccount = async (data: Omit<FleetAccount, 'id'>): Promise<FleetAccount> =>
  ({ id: `fa_${Date.now()}`, ...data });
export const updateFleetAccount = async (_id: string, _data: Partial<FleetAccount>): Promise<void> => {};
export const deleteFleetAccount = async (_id: string): Promise<void> => {};

export const getUploadUrl = async (_inspectionId: string): Promise<string> => '';

// Aliases used by StateInspectionRecords.tsx
export const getStateInspectionRecords = async (filters?: StateInspectionFilters) => {
  const recs = await getStateInspections();
  return { records: recs, total: recs.length, page: 1, totalPages: 1 } as PaginatedResponse<StateInspectionRecord>;
};
export const getStateInspectionStats = async (): Promise<StateInspectionStats> => ({
  total: 0, pass: 0, fail: 0, pending: 0,
});

export interface PaginatedResponse<T> {
  records: T[];
  total: number;
  page: number;
  totalPages: number;
}

export default stateInspectionApi;
