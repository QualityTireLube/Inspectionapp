import { create } from 'zustand';
import { 
  StateInspectionRecord, 
  FleetAccount, 
  StateInspectionFilters, 
  StateInspectionStats 
} from '../types/stateInspection';

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

interface StateInspectionStore {
  // State
  records: StateInspectionRecord[];
  fleetAccounts: FleetAccount[];
  stats: StateInspectionStats | null;
  filters: StateInspectionFilters;
  pagination: PaginationState;
  loading: boolean;
  error: string | null;
  
  // Actions
  setRecords: (records: StateInspectionRecord[]) => void;
  setPaginatedRecords: (data: StateInspectionRecord[], total: number, page: number, pageSize: number) => void;
  setFleetAccounts: (accounts: FleetAccount[]) => void;
  setStats: (stats: StateInspectionStats) => void;
  setFilters: (filters: StateInspectionFilters) => void;
  setPagination: (pagination: Partial<PaginationState>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Record actions
  addRecord: (record: StateInspectionRecord) => void;
  updateRecord: (id: string, updates: Partial<StateInspectionRecord>) => void;
  removeRecord: (id: string) => void;
  
  // Fleet account actions
  addFleetAccount: (account: FleetAccount) => void;
  updateFleetAccount: (id: string, updates: Partial<FleetAccount>) => void;
  removeFleetAccount: (id: string) => void;
  
  // Utility functions
  getActiveFleetAccounts: () => FleetAccount[];
  getTotalRevenue: () => number;
  clearError: () => void;
  resetPagination: () => void;
}

export const useStateInspectionStore = create<StateInspectionStore>((set, get) => ({
  // Initial state
  records: [],
  fleetAccounts: [],
  stats: null,
  filters: {},
  pagination: {
    currentPage: 1,
    pageSize: 50,
    totalRecords: 0,
    totalPages: 0
  },
  loading: false,
  error: null,

  // Basic setters
  setRecords: (records) => set({ records }),
  
  setPaginatedRecords: (data, total, page, pageSize) => set({
    records: data,
    pagination: {
      currentPage: page,
      pageSize,
      totalRecords: total,
      totalPages: Math.ceil(total / pageSize)
    }
  }),
  
  setFleetAccounts: (accounts) => set({ fleetAccounts: accounts }),
  setStats: (stats) => set({ stats }),
  setFilters: (filters) => set({ filters }),
  setPagination: (pagination) => set((state) => ({
    pagination: { ...state.pagination, ...pagination }
  })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Record actions
  addRecord: (record) => set((state) => ({
    records: [record, ...state.records],
    pagination: {
      ...state.pagination,
      totalRecords: state.pagination.totalRecords + 1
    }
  })),

  updateRecord: (id, updates) => set((state) => ({
    records: state.records.map(record => 
      record.id === id ? { ...record, ...updates } : record
    )
  })),

  removeRecord: (id) => set((state) => ({
    records: state.records.filter(record => record.id !== id),
    pagination: {
      ...state.pagination,
      totalRecords: Math.max(0, state.pagination.totalRecords - 1)
    }
  })),

  // Fleet account actions
  addFleetAccount: (account) => set((state) => ({
    fleetAccounts: [...state.fleetAccounts, account]
  })),

  updateFleetAccount: (id, updates) => set((state) => ({
    fleetAccounts: state.fleetAccounts.map(account => 
      account.id === id ? { ...account, ...updates } : account
    )
  })),

  removeFleetAccount: (id) => set((state) => ({
    fleetAccounts: state.fleetAccounts.filter(account => account.id !== id)
  })),

  // Utility functions
  getActiveFleetAccounts: () => {
    const { fleetAccounts } = get();
    return fleetAccounts.filter(account => account.active);
  },

  getTotalRevenue: () => {
    const { records } = get();
    return records.reduce((total, record) => total + record.paymentAmount, 0);
  },

  clearError: () => set({ error: null }),
  
  resetPagination: () => set({
    pagination: {
      currentPage: 1,
      pageSize: 50,
      totalRecords: 0,
      totalPages: 0
    }
  })
})); 