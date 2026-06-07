import React, { useEffect, useCallback } from 'react';
import { Undo2, History, RefreshCw, Settings } from 'lucide-react';
import { BudgetItem, BudgetItemCategory } from '@/types';
import { useBudget } from '@/contexts/BudgetContext';
import { BudgetCard } from '@/components/BudgetCard';
import { PartnerSummary } from '@/components/PartnerSummary';

interface BudgetDashboardProps {
  onLogout?: () => void;
}

export function BudgetDashboard({ onLogout }: BudgetDashboardProps) {
  const {
    items,
    partners,
    calculations,
    fetchBudget,
    updateItem,
    addItem,
    deleteItem,
    undoLastAction,
    isLoading,
    lastSync,
    isSyncing,
    syncError,
  } = useBudget();

  // Calculate totals by category
  const getCategoryTotal = useCallback(
    (category: BudgetItemCategory) => {
      return items
        .filter((item) => item.category === category)
        .reduce((sum, item) => sum + item.amount, 0);
    },
    [items]
  );

  // Get items by category
  const getCategoryItems = useCallback(
    (category: BudgetItemCategory) => {
      return items.filter((item) => item.category === category);
    },
    [items]
  );

  // Handle add item
  const handleAddItem = useCallback(
    async (category: BudgetItemCategory, name: string) => {
      await addItem({
        name,
        category,
        amount: 0,
        is_default: false,
        sort_order: 0,
      });
    },
    [addItem]
  );

  // Handle undo
  const handleUndo = useCallback(async () => {
    try {
      await undoLastAction();
    } catch (error) {
      console.error('Undo failed:', error);
    }
  }, [undoLastAction]);

  // Refresh data
  const handleRefresh = useCallback(async () => {
    await fetchBudget();
  }, [fetchBudget]);

  // Load initial data
  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  if (isLoading && items.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-900">Personal Budget Calculator</h1>
              
              {/* Sync Status */}
              <div className="flex items-center gap-2">
                {isSyncing && (
                  <span className="flex items-center gap-1 text-sm text-primary-600">
                    <span className="animate-pulse h-2 w-2 bg-primary-500 rounded-full"></span>
                    Syncing...
                  </span>
                )}
                {lastSync && (
                  <span className="text-sm text-gray-500">
                    Last sync: {new Date(lastSync).toLocaleTimeString()}
                  </span>
                )}
                {syncError && (
                  <span className="text-sm text-red-500">{syncError}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                title="Refresh"
                type="button"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              
              <button
                onClick={handleUndo}
                className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                title="Undo"
                type="button"
              >
                <Undo2 className="h-5 w-5" />
              </button>
              
              <button
                className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                title="History"
                type="button"
              >
                <History className="h-5 w-5" />
              </button>
              
              <button
                className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                title="Settings"
                type="button"
              >
                <Settings className="h-5 w-5" />
              </button>
              
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  type="button"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Income & Expenses */}
          <div className="space-y-6">
            <BudgetCard
              title="Income"
              category="income"
              items={getCategoryItems('income')}
              total={getCategoryTotal('income')}
              onUpdateItem={updateItem}
              onDeleteItem={deleteItem}
              onAddItem={(name) => handleAddItem('income', name)}
              canAdd={true}
              canDelete={true}
            />

            <BudgetCard
              title="Fixed Expenses"
              category="fixed_expense"
              items={getCategoryItems('fixed_expense')}
              total={getCategoryTotal('fixed_expense')}
              onUpdateItem={updateItem}
              onDeleteItem={deleteItem}
              onAddItem={(name) => handleAddItem('fixed_expense', name)}
              canAdd={true}
              canDelete={true}
            />

            <BudgetCard
              title="Variable Expenses"
              category="variable_expense"
              items={getCategoryItems('variable_expense')}
              total={getCategoryTotal('variable_expense')}
              onUpdateItem={updateItem}
              onDeleteItem={deleteItem}
              onAddItem={(name) => handleAddItem('variable_expense', name)}
              canAdd={true}
              canDelete={true}
            />
          </div>

          {/* Right Column - Savings & Summary */}
          <div className="lg:col-span-1 space-y-6">
            <BudgetCard
              title="Savings"
              category="savings"
              items={getCategoryItems('savings')}
              total={getCategoryTotal('savings')}
              onUpdateItem={updateItem}
              onDeleteItem={deleteItem}
              canAdd={false}
              canDelete={false}
            />

            {/* Summary Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Income</span>
                  <span className="font-semibold text-gray-900">
                    €{getCategoryTotal('income').toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Expenses</span>
                  <span className="font-semibold text-red-600">
                    -€{(getCategoryTotal('fixed_expense') + getCategoryTotal('variable_expense')).toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Savings</span>
                  <span className="font-semibold text-green-600">
                    €{getCategoryTotal('savings').toFixed(2)}
                  </span>
                </div>
                
                <div className="border-t border-gray-100 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Remaining Budget</span>
                    <span className="text-2xl font-bold text-primary-600">
                      €{(getCategoryTotal('income') - getCategoryTotal('fixed_expense') - getCategoryTotal('variable_expense')).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Partner Summary - Full width on large screens */}
          <div className="lg:col-span-3">
            {calculations && (
              <PartnerSummary 
                breakdown={calculations.partnerBreakdown} 
                currency={calculations.currency}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
