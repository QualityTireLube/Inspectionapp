// Cash Management Types

export interface Denomination {
  name: string;
  value: number;
  quantity: number;
}

export interface DenominationCount {
  pennies: number;
  nickels: number;
  dimes: number;
  quarters: number;
  ones: number;
  fives: number;
  tens: number;
  twenties: number;
  fifties: number;
  hundreds: number;
}

export type DrawerCountType = 'opening' | 'closing';

export interface DrawerCount {
  id?: number;
  drawerId: string;
  drawerName: string;
  countType: DrawerCountType;
  denominations: DenominationCount;
  cashOut: DenominationCount;
  totalCash: number;
  totalForDeposit: number;
  smsCash?: number; // SMS Cash collected (only for opening counts)
  timestamp: string;
  userId: string;
  userName: string;
}

export interface BankDeposit {
  id?: number;
  totalCash: number;
  totalChecks: number;
  images: string[];
  notes: string;
  timestamp: string;
  userId: string;
  userName: string;
}

export interface DrawerSettings {
  id: string;
  name: string;
  targetDenominations: DenominationCount;
  totalAmount: number;
  isActive: boolean;
  showDetailedCalculations: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CashAnalytics {
  drawerTotals: {
    drawerId: string;
    drawerName: string;
    totalCash: number;
    date: string;
  }[];
  cashInOutTrends: {
    date: string;
    cashIn: number;
    cashOut: number;
    netFlow: number;
  }[];
  drawerDiscrepancies: {
    drawerId: string;
    drawerName: string;
    expected: number;
    actual: number;
    discrepancy: number;
    date: string;
  }[];
}

export interface CashManagementFilters {
  drawerId?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
}

// Constants for denominations
export const DENOMINATIONS = [
  { name: 'pennies', value: 0.01, label: 'Pennies' },
  { name: 'nickels', value: 0.05, label: 'Nickels' },
  { name: 'dimes', value: 0.10, label: 'Dimes' },
  { name: 'quarters', value: 0.25, label: 'Quarters' },
  { name: 'ones', value: 1.00, label: '$1 Bills' },
  { name: 'fives', value: 5.00, label: '$5 Bills' },
  { name: 'tens', value: 10.00, label: '$10 Bills' },
  { name: 'twenties', value: 20.00, label: '$20 Bills' },
  { name: 'fifties', value: 50.00, label: '$50 Bills' },
  { name: 'hundreds', value: 100.00, label: '$100 Bills' },
] as const;

export type DenominationKey = keyof DenominationCount; 