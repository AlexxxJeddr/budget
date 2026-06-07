import { useCallback } from 'react';
import { useBudget } from '@/contexts/BudgetContext';
import { BudgetItem, BudgetItemCategory } from '@/types';

/**
 * Custom hook for managing budget items
 */
export function useBudgetItems() {
  const {
    items,
    updateItem,
    addItem,
    deleteItem,
    isLoading,
  } = useBudget();

  /**
   * Get items by category
   */
  const getItemsByCategory = useCallback(
    (category: BudgetItemCategory) => {
      return items.filter((item) => item.category === category);
    },
    [items]
  );

  /**
   * Get default items (cannot be deleted)
   */
  const getDefaultItems = useCallback(
    () => items.filter((item) => item.is_default),
    [items]
  );

  /**
   * Get custom items (can be deleted)
   */
  const getCustomItems = useCallback(
    () => items.filter((item) => !item.is_default),
    [items]
  );

  /**
   * Update item amount with validation
   */
  const updateItemAmount = useCallback(
    async (id: number, amount: number) => {
      if (amount < 0) {
        throw new Error('Amount cannot be negative');
      }
      if (amount > 1000000) {
        throw new Error('Amount cannot exceed 1,000,000');
      }
      
      await updateItem(id, { amount });
    },
    [updateItem]
  );

  /**
   * Add a new custom item
   */
  const addCustomItem = useCallback(
    async (name: string, category: BudgetItemCategory, amount: number = 0) => {
      if (!name.trim()) {
        throw new Error('Item name cannot be empty');
      }
      
      return addItem({
        name: name.trim(),
        category,
        amount,
        is_default: false,
        sort_order: 0,
      });
    },
    [addItem]
  );

  /**
   * Delete a custom item
   */
  const deleteCustomItem = useCallback(
    async (id: number) => {
      const item = items.find((i) => i.id === id);
      
      if (!item) {
        throw new Error('Item not found');
      }
      
      if (item.is_default) {
        throw new Error('Cannot delete default items');
      }
      
      await deleteItem(id);
    },
    [items, deleteItem]
  );

  /**
   * Reorder items within a category
   */
  const reorderItems = useCallback(
    async (category: BudgetItemCategory, newOrder: number[]) => {
      // This would update the sort_order for each item
      // For now, we'll just log it
      console.log('Reordering items:', category, newOrder);
    },
    []
  );

  return {
    items,
    getItemsByCategory,
    getDefaultItems,
    getCustomItems,
    updateItemAmount,
    addCustomItem,
    deleteCustomItem,
    reorderItems,
    isLoading,
  };
}

/**
 * Hook for calculating budget totals
 */
export function useBudgetCalculations() {
  const { calculations, partners } = useBudget();

  const getTotals = useCallback(() => {
    return calculations?.totals || {
      totalIncome: 0,
      totalFixedExpenses: 0,
      totalVariableExpenses: 0,
      totalSavings: 0,
      remainingBudget: 0,
      savingsPerPartner: 0,
      personalAllowance: 0,
    };
  }, [calculations]);

  const getPartnerBreakdown = useCallback(() => {
    return calculations?.partnerBreakdown || {};
  }, [calculations]);

  const getPartnerById = useCallback(
    (id: number) => {
      return partners.find((p) => p.id === id);
    },
    [partners]
  );

  return {
    totals: getTotals(),
    partnerBreakdown: getPartnerBreakdown(),
    getPartnerById,
  };
}

/**
 * Hook for undo functionality
 */
export function useUndo() {
  const { undoLastAction, isLoading } = useBudget();

  const undo = useCallback(async () => {
    try {
      await undoLastAction();
      return true;
    } catch (error) {
      console.error('Undo failed:', error);
      return false;
    }
  }, [undoLastAction]);

  return {
    undo,
    isLoading,
  };
}

/**
 * Hook for history
 */
export function useHistory() {
  const { history, fetchHistory, isLoading } = useBudget();

  const getItemHistory = useCallback(
    (itemId: number, limit?: number) => {
      // This would need to be implemented in the context
      console.log('Getting history for item:', itemId);
    },
    []
  );

  return {
    history,
    fetchHistory,
    getItemHistory,
    isLoading,
  };
}
