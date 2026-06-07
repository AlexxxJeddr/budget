import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { BudgetItem, Partner, BudgetTotals, Calculations, HistoryRecord, SyncEvent } from '@/types';
import { budgetItemsApi, calculationsApi, partnersApi, historyApi, undoApi, syncApi } from '@/utils/api';

interface BudgetState {
  items: BudgetItem[];
  partners: Partner[];
  calculations: Calculations | null;
  history: HistoryRecord[];
  isLoading: boolean;
  lastSync: string | null;
  isSyncing: boolean;
  syncError: string | null;
}

interface BudgetContextType extends BudgetState {
  fetchBudget: () => Promise<void>;
  fetchCalculations: () => Promise<void>;
  fetchPartners: () => Promise<void>;
  fetchHistory: (limit?: number) => Promise<void>;
  updateItem: (id: number, updates: Partial<BudgetItem>) => Promise<void>;
  addItem: (item: Omit<BudgetItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<number>;
  deleteItem: (id: number) => Promise<void>;
  undoLastAction: () => Promise<void>;
  addPartner: (name: string) => Promise<number>;
  updatePartner: (id: number, name: string) => Promise<void>;
  deletePartner: (id: number) => Promise<void>;
  startSync: () => void;
  stopSync: () => void;
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

interface BudgetProviderProps {
  children: ReactNode;
}

export function BudgetProvider({ children }: BudgetProviderProps) {
  const [state, setState] = useState<BudgetState>({
    items: [],
    partners: [],
    calculations: null,
    history: [],
    isLoading: true,
    lastSync: null,
    isSyncing: false,
    syncError: null,
  });

  const [syncEventSource, setSyncEventSource] = useState<EventSource | null>(null);

  // Fetch all budget data
  const fetchBudget = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, syncError: null }));
      
      const [itemsResponse, partnersResponse, calculationsResponse] = await Promise.all([
        budgetItemsApi.getAll(),
        partnersApi.getAll(),
        calculationsApi.getAll(),
      ]);

      if (itemsResponse.success && partnersResponse.success && calculationsResponse.success) {
        setState((prev) => ({
          ...prev,
          items: itemsResponse.data || [],
          partners: partnersResponse.data || [],
          calculations: calculationsResponse.data || null,
          isLoading: false,
          lastSync: new Date().toISOString(),
        }));
      }
    } catch (error) {
      console.error('Failed to fetch budget data:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        syncError: error instanceof Error ? error.message : 'Failed to fetch data',
      }));
    }
  }, []);

  // Fetch calculations only
  const fetchCalculations = useCallback(async () => {
    try {
      const response = await calculationsApi.getAll();
      if (response.success) {
        setState((prev) => ({
          ...prev,
          calculations: response.data || null,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch calculations:', error);
    }
  }, []);

  // Fetch partners only
  const fetchPartners = useCallback(async () => {
    try {
      const response = await partnersApi.getAll();
      if (response.success) {
        setState((prev) => ({
          ...prev,
          partners: response.data || [],
        }));
      }
    } catch (error) {
      console.error('Failed to fetch partners:', error);
    }
  }, []);

  // Fetch history
  const fetchHistory = useCallback(async (limit?: number) => {
    try {
      const response = await historyApi.getAll(limit);
      if (response.success) {
        setState((prev) => ({
          ...prev,
          history: response.data || [],
        }));
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  }, []);

  // Update a budget item
  const updateItem = useCallback(async (id: number, updates: Partial<BudgetItem>) => {
    try {
      // Optimistic update
      setState((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        ),
      }));

      const response = await budgetItemsApi.update(id, updates);
      
      if (!response.success) {
        // Revert on failure
        await fetchBudget();
        throw new Error(response.error || 'Failed to update item');
      }

      // Refresh calculations and fetch new data
      await Promise.all([fetchCalculations(), fetchBudget()]);
    } catch (error) {
      console.error('Failed to update item:', error);
      throw error;
    }
  }, [fetchBudget, fetchCalculations]);

  // Add a new budget item
  const addItem = useCallback(async (item: Omit<BudgetItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const response = await budgetItemsApi.create(item);
      
      if (response.success && response.data?.itemId) {
        await fetchBudget();
        return response.data.itemId;
      }
      
      throw new Error(response.error || 'Failed to add item');
    } catch (error) {
      console.error('Failed to add item:', error);
      throw error;
    }
  }, [fetchBudget]);

  // Delete a budget item
  const deleteItem = useCallback(async (id: number) => {
    try {
      // Optimistic update
      setState((prev) => ({
        ...prev,
        items: prev.items.filter((item) => item.id !== id),
      }));

      const response = await budgetItemsApi.delete(id);
      
      if (!response.success) {
        // Revert on failure
        await fetchBudget();
        throw new Error(response.error || 'Failed to delete item');
      }

      await fetchBudget();
    } catch (error) {
      console.error('Failed to delete item:', error);
      throw error;
    }
  }, [fetchBudget]);

  // Undo last action
  const undoLastAction = useCallback(async () => {
    try {
      const response = await undoApi.undoLastAction();
      
      if (response.success) {
        await fetchBudget();
      } else {
        throw new Error(response.error || 'Failed to undo action');
      }
    } catch (error) {
      console.error('Failed to undo action:', error);
      throw error;
    }
  }, [fetchBudget]);

  // Partner management
  const addPartner = useCallback(async (name: string) => {
    try {
      const response = await partnersApi.create(name);
      
      if (response.success && response.data?.partnerId) {
        await fetchPartners();
        return response.data.partnerId;
      }
      
      throw new Error(response.error || 'Failed to add partner');
    } catch (error) {
      console.error('Failed to add partner:', error);
      throw error;
    }
  }, [fetchPartners]);

  const updatePartner = useCallback(async (id: number, name: string) => {
    try {
      const response = await partnersApi.update(id, name);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update partner');
      }
      
      await fetchPartners();
    } catch (error) {
      console.error('Failed to update partner:', error);
      throw error;
    }
  }, [fetchPartners]);

  const deletePartner = useCallback(async (id: number) => {
    try {
      const response = await partnersApi.delete(id);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete partner');
      }
      
      await fetchPartners();
    } catch (error) {
      console.error('Failed to delete partner:', error);
      throw error;
    }
  }, [fetchPartners]);

  // Real-time sync
  const startSync = useCallback(() => {
    if (syncEventSource) {
      return; // Already syncing
    }

    setState((prev) => ({ ...prev, isSyncing: true, syncError: null }));

    const eventSource = syncApi.subscribe((event: SyncEvent) => {
      // Handle sync events
      console.log('Sync event received:', event);
      
      // Refresh data based on the event
      if (event.table === 'budget_items' || event.table === 'partners') {
        fetchBudget().catch(console.error);
      }

      setState((prev) => ({
        ...prev,
        lastSync: new Date().toISOString(),
      }));
    });

    setSyncEventSource(eventSource);

    // Also set up periodic polling as fallback
    const pollingInterval = setInterval(() => {
      fetchBudget().catch(console.error);
    }, 30000); // Poll every 30 seconds

    // Cleanup function
    const stopPolling = () => {
      clearInterval(pollingInterval);
      if (eventSource) {
        eventSource.close();
      }
    };

    // Store cleanup function
    return stopPolling;
  }, [fetchBudget, syncEventSource]);

  const stopSync = useCallback(() => {
    if (syncEventSource) {
      syncEventSource.close();
      setSyncEventSource(null);
    }
    
    setState((prev) => ({ ...prev, isSyncing: false }));
  }, [syncEventSource]);

  // Auto-start sync when logged in
  useEffect(() => {
    const stop = startSync();
    return () => {
      if (stop) stop();
      stopSync();
    };
  }, [startSync, stopSync]);

  const value: BudgetContextType = {
    ...state,
    fetchBudget,
    fetchCalculations,
    fetchPartners,
    fetchHistory,
    updateItem,
    addItem,
    deleteItem,
    undoLastAction,
    addPartner,
    updatePartner,
    deletePartner,
    startSync,
    stopSync,
  };

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget(): BudgetContextType {
  const context = useContext(BudgetContext);
  if (context === undefined) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
}
