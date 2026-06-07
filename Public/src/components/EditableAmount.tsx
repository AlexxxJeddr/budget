import React, { useState, useRef, useEffect, KeyboardEvent, FocusEvent } from 'react';

interface EditableAmountProps {
  value: number;
  onSave: (value: number) => void | Promise<void>;
  onCancel?: () => void;
  disabled?: boolean;
  className?: string;
  currency?: string;
}

export function EditableAmount({
  value,
  onSave,
  onCancel,
  disabled = false,
  className = '',
  currency = '€',
}: EditableAmountProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow empty string for clearing
    if (inputValue === '') {
      setEditValue('');
      return;
    }

    // Validate numeric input
    if (/^\d*\.?\d{0,2}$/.test(inputValue)) {
      setEditValue(inputValue);
    }
  };

  // Handle blur (save)
  const handleBlur = async (e: FocusEvent<HTMLInputElement>) => {
    if (disabled) return;

    const newValue = editValue === '' ? 0 : parseFloat(editValue);
    
    if (newValue !== value) {
      setIsSaving(true);
      try {
        await onSave(newValue);
      } catch (error) {
        console.error('Failed to save:', error);
        // Revert to original value on error
        setEditValue(value.toString());
      } finally {
        setIsSaving(false);
      }
    }

    setIsEditing(false);
  };

  // Handle key down
  const handleKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      await handleBlur(e as unknown as FocusEvent<HTMLInputElement>);
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(value.toString());
      onCancel?.();
    }
  };

  // Handle click to start editing
  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return;
    e.stopPropagation();
    setIsEditing(true);
  };

  // Format value for display
  const displayValue = value.toFixed(2);

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={editValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled || isSaving}
        className={`w-full px-2 py-1 text-right bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${className}`}
        placeholder="0.00"
        autoComplete="off"
      />
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isSaving}
      className={`w-full px-2 py-1 text-right font-medium text-gray-900 hover:bg-gray-50 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      type="button"
    >
      {isSaving ? (
        <span className="flex items-center justify-end gap-1">
          <span className="animate-spin h-3 w-3 border-2 border-primary-500 border-t-transparent rounded-full"></span>
          <span>{currency}{displayValue}</span>
        </span>
      ) : (
        <span>
          {currency}{displayValue}
        </span>
      )}
    </button>
  );
}
