import React from 'react';
import { Plus } from 'lucide-react';
import { BudgetItem, BudgetItemCategory } from '@/types';
import { BudgetItemRow } from './BudgetItemRow';

interface BudgetCardProps {
  title: string;
  category: BudgetItemCategory;
  items: BudgetItem[];
  total: number;
  onUpdateItem: (id: number, updates: Partial<BudgetItem>) => void | Promise<void>;
  onDeleteItem?: (id: number) => void | Promise<void>;
  onAddItem?: (name: string) => void | Promise<void>;
  canAdd?: boolean;
  canDelete?: boolean;
  currency?: string;
}

export function BudgetCard({
  title,
  category,
  items,
  total,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  canAdd = true,
  canDelete = true,
  currency = '€',
}: BudgetCardProps) {
  const [showAddInput, setShowAddInput] = React.useState(false);
  const [newItemName, setNewItemName] = React.useState('');
  const [isAdding, setIsAdding] = React.useState(false);

  const handleAddItem = async () => {
    if (!newItemName.trim() || !onAddItem) return;

    setIsAdding(true);
    try {
      await onAddItem(newItemName.trim());
      setNewItemName('');
      setShowAddInput(false);
    } catch (error) {
      console.error('Failed to add item:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleCancelAdd = () => {
    setNewItemName('');
    setShowAddInput(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <span className="text-2xl font-bold text-primary-600">
            {currency}{total.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="space-y-2">
          {items.map((item) => (
            <BudgetItemRow
              key={item.id}
              item={item}
              onUpdate={onUpdateItem}
              onDelete={canDelete ? onDeleteItem : undefined}
              canDelete={canDelete}
              currency={currency}
            />
          ))}
        </div>

        {canAdd && showAddInput && (
          <div className="mt-3 p-2 bg-gray-50 rounded-lg">
            <div className="flex gap-2">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Enter item name"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddItem();
                  if (e.key === 'Escape') handleCancelAdd();
                }}
              />
              <button
                onClick={handleAddItem}
                disabled={!newItemName.trim() || isAdding}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                type="button"
              >
                {isAdding ? 'Adding...' : 'Add'}
              </button>
              <button
                onClick={handleCancelAdd}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {canAdd && !showAddInput && (
          <button
            onClick={() => setShowAddInput(true)}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            type="button"
          >
            <Plus className="h-5 w-5" />
            <span>Add item</span>
          </button>
        )}
      </div>
    </div>
  );
}
