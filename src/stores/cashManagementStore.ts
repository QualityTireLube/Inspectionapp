import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  DrawerSettings, 
  DenominationCount, 
  BankDeposit, 
  DrawerCount,
  CashAnalytics 
} from '../types/cashManagement';

interface CashManagementState {
  // Drawer Settings
  drawerSettings: DrawerSettings[];
  setDrawerSettings: (settings: DrawerSettings[]) => void;
  addDrawerSettings: (settings: DrawerSettings) => void;
  updateDrawerSettings: (id: string, settings: Partial<DrawerSettings>) => void;
  removeDrawerSettings: (id: string) => void;

  // Current drawer counts
  currentDrawerCounts: Record<string, DenominationCount>;
  setDrawerCount: (drawerId: string, count: DenominationCount) => void;
  clearDrawerCount: (drawerId: string) => void;

  // Bank deposits
  bankDeposits: BankDeposit[];
  setBankDeposits: (deposits: BankDeposit[]) => void;
  addBankDeposit: (deposit: BankDeposit) => void;

  // Drawer count history
  drawerCountHistory: DrawerCount[];
  setDrawerCountHistory: (history: DrawerCount[]) => void;
  addDrawerCountHistory: (count: DrawerCount) => void;

  // Analytics
  analytics: CashAnalytics | null;
  setAnalytics: (analytics: CashAnalytics) => void;

  // UI State
  selectedDrawerId: string | null;
  setSelectedDrawerId: (id: string | null) => void;
  
  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const defaultDenominations: DenominationCount = {
  pennies: 0,
  nickels: 0,
  dimes: 0,
  quarters: 0,
  ones: 0,
  fives: 0,
  tens: 0,
  twenties: 0,
  fifties: 0,
  hundreds: 0,
};

export const useCashManagementStore = create<CashManagementState>()(
  persist(
    (set, get) => ({
      // Drawer Settings
      drawerSettings: [],
      setDrawerSettings: (settings) => set({ drawerSettings: settings }),
      addDrawerSettings: (settings) => 
        set((state) => ({ drawerSettings: [...state.drawerSettings, settings] })),
      updateDrawerSettings: (id, updates) =>
        set((state) => ({
          drawerSettings: state.drawerSettings.map((setting) =>
            setting.id === id ? { ...setting, ...updates, updatedAt: new Date().toISOString() } : setting
          ),
        })),
      removeDrawerSettings: (id) =>
        set((state) => ({
          drawerSettings: state.drawerSettings.filter((setting) => setting.id !== id),
        })),

      // Current drawer counts
      currentDrawerCounts: {},
      setDrawerCount: (drawerId, count) =>
        set((state) => ({
          currentDrawerCounts: { ...state.currentDrawerCounts, [drawerId]: count },
        })),
      clearDrawerCount: (drawerId) =>
        set((state) => {
          const newCounts = { ...state.currentDrawerCounts };
          delete newCounts[drawerId];
          return { currentDrawerCounts: newCounts };
        }),

      // Bank deposits
      bankDeposits: [],
      setBankDeposits: (deposits) => set({ bankDeposits: deposits }),
      addBankDeposit: (deposit) =>
        set((state) => ({ bankDeposits: [deposit, ...state.bankDeposits] })),

      // Drawer count history
      drawerCountHistory: [],
      setDrawerCountHistory: (history) => set({ drawerCountHistory: history }),
      addDrawerCountHistory: (count) =>
        set((state) => ({ drawerCountHistory: [count, ...state.drawerCountHistory] })),

      // Analytics
      analytics: null,
      setAnalytics: (analytics) => set({ analytics }),

      // UI State
      selectedDrawerId: null,
      setSelectedDrawerId: (id) => set({ selectedDrawerId: id }),

      // Loading states
      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'cash-management-store',
      partialize: (state) => ({
        drawerSettings: state.drawerSettings,
        currentDrawerCounts: state.currentDrawerCounts,
        selectedDrawerId: state.selectedDrawerId,
      }),
    }
  )
);

// Helper functions
export const getDefaultDrawerSettings = (id: string, name: string): DrawerSettings => ({
  id,
  name,
  targetDenominations: { ...defaultDenominations },
  totalAmount: 0,
  isActive: true,
  showDetailedCalculations: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// Initialize default drawers if none exist
export const initializeDefaultDrawers = () => {
  const { drawerSettings, setDrawerSettings } = useCashManagementStore.getState();
  
  if (drawerSettings.length === 0) {
    const defaultDrawers = [
      getDefaultDrawerSettings('state-inspector', 'State Inspector Drawer'),
      getDefaultDrawerSettings('service-writer', 'Service Writer Drawer'),
    ];
    
    setDrawerSettings(defaultDrawers);
  }
}; 