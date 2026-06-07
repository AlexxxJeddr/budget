// Budget Item Types
export type BudgetItemCategory = 'income' | 'fixed_expense' | 'variable_expense' | 'savings';

export interface BudgetItem {
  id: number;
  user_id: number;
  name: string;
  category: BudgetItemCategory;
  amount: number;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface HistoryRecord {
  id: number;
  user_id: number;
  item_id: number;
  old_amount: number;
  new_amount: number;
  changed_at: string;
  name?: string;
  category?: BudgetItemCategory;
}

export interface UndoAction {
  id: number;
  user_id: number;
  action: 'insert' | 'update' | 'delete';
  table_name: string;
  record_id: number;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

// Partner Types
export interface Partner {
  id: number;
  user_id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

// Calculation Types
export interface BudgetTotals {
  totalIncome: number;
  totalFixedExpenses: number;
  totalVariableExpenses: number;
  totalSavings: number;
  remainingBudget: number;
  savingsPerPartner: number;
  personalAllowance: number;
}

export interface PartnerBreakdown {
  name: string;
  income: number;
  bankContribution: number;
  savingsContribution: number;
  personalAllowance: number;
}

export interface Calculations {
  totals: BudgetTotals;
  partnerBreakdown: Record<number, PartnerBreakdown>;
  currency: string;
}

// Auth Types
export interface User {
  id: number;
  email: string;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  // Additional fields if needed
}

// Real-time Sync Types
export interface SyncEvent {
  type: 'create' | 'update' | 'delete';
  table: string;
  record: Record<string, unknown>;
  timestamp: string;
}
