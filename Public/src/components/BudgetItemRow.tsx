import React from 'react';
import { Trash2 } from 'lucide-react';
import { BudgetItem } from '@/types';
import { EditableAmount } from './EditableAmount';

interface BudgetItemRowProps {
  item: BudgetItem;
  onUpdate: (id: number, updates: Partial<BudgetItem>) => void | Promise<void>;
  onDelete?: (id: number) => void | Promise<void>;
  canDelete?: boolean;
  currency?: string;
}

export function BudgetItemRow({
  item,
  onUpdate,
  onDelete,
  canDelete = true,
  currency = '€',
}: BudgetItemRowProps) {
  const handleAmountSave = async (newAmount: number) => {
    await onUpdate(item.id, { amount: newAmount });
  };

  const handleDelete = async () => {
    if (onDelete && canDelete && !item.is_default) {
      await onDelete(item.id);
    }
  };

  return (
    <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 truncate">{item.name}</span>
          {item.is_default && (
            <span
              className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full"
              title="Default item"
            >
              Default
            </span>
          )}
        </div>
      </div>

      <div className="w-32">
        <EditableAmount
          value={item.amount}
          onSave={handleAmountSave}
          disabled={false}
          currency={currency}
        />
      </div>

      {canDelete && !item.is_default && onDelete && (
        <button
          onClick={handleDelete}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete"
          type="button"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
