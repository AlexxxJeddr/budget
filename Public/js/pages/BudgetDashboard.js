/**
 * Budget Dashboard Page
 * Vanilla JavaScript implementation
 */

import { authManager } from '../context/AuthContext.js';
import { budgetManager } from '../context/BudgetContext.js';
import { router } from '../utils/router.js';

/**
 * Category configuration
 */
const CATEGORIES = [
    { id: 'income', name: 'Income', color: '#10b981', icon: '💰' },
    { id: 'fixed_expense', name: 'Fixed Expenses', color: '#ef4444', icon: '📋' },
    { id: 'variable_expense', name: 'Variable Expenses', color: '#f59e0b', icon: '🛒' },
    { id: 'savings', name: 'Savings', color: '#8b5cf6', icon: '🏦' }
];

/**
 * Format currency
 * @param {number} amount
 * @param {string} [currency='CHF']
 * @returns {string}
 */
function formatCurrency(amount, currency = 'CHF') {
    return new Intl.NumberFormat('en-CH', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

/**
 * Budget Dashboard Page Component
 */
export const BudgetDashboardPage = {
    /**
     * Render the budget dashboard
     */
    render() {
        const appContainer = document.getElementById('app');
        if (!appContainer) return;
        
        const budgetState = budgetManager.getState();
        const authState = authManager.getState();
        
        // Show loading state
        if (budgetState.isLoading && budgetState.items.length === 0) {
            appContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh;">
                    <div style="width: 40px; height: 40px; border: 4px solid #3b82f6; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <style>
                        @keyframes spin { to { transform: rotate(360deg); } }
                    </style>
                </div>
            `;
            return;
        }
        
        // Render the full dashboard
        appContainer.innerHTML = `
            <div class="dashboard" style="min-height: 100vh; display: flex; flex-direction: column; background-color: #f9fafb;">
                <!-- Header -->
                <header style="background: white; border-bottom: 1px solid #e5e7eb; position: sticky; top: 0; z-index: 10;">
                    <div style="max-width: 1200px; margin: 0 auto; padding: 0 1rem; height: 64px; display: flex; align-items: center; justify-content: space-between;">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <h1 style="font-size: 1.25rem; font-weight: 700; color: #111827;">Personal Budget Calculator</h1>
                            
                            <!-- Sync Status -->
                            <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem;">
                                ${budgetState.isSyncing ? '<span style="color: #2563eb;">● Syncing...</span>' : ''}
                                ${budgetState.lastSync ? `<span style="color: #6b7280;" title="Last sync: ${new Date(budgetState.lastSync).toLocaleTimeString()}">✓ Synced</span>` : ''}
                                ${budgetState.syncError ? `<span style="color: #ef4444;">⚠ Error</span>` : ''}
                            </div>
                        </div>
                        
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <button 
                                id="refreshBtn"
                                style="padding: 0.5rem 1rem; background: #f3f4f6; border: none; border-radius: 0.25rem; cursor: pointer; font-size: 0.875rem;"
                                title="Refresh data"
                            >
                                🔄 Refresh
                            </button>
                            <button 
                                id="undoBtn"
                                style="padding: 0.5rem 1rem; background: #f3f4f6; border: none; border-radius: 0.25rem; cursor: pointer; font-size: 0.875rem;"
                                title="Undo last action"
                            >
                                ⏪ Undo
                            </button>
                            <button 
                                id="logoutBtn"
                                style="padding: 0.5rem 1rem; background: #ef4444; color: white; border: none; border-radius: 0.25rem; cursor: pointer; font-size: 0.875rem;"
                            >
                                🔒 Logout
                            </button>
                        </div>
                    </div>
                </header>
                
                <!-- Main Content -->
                <main style="flex: 1; max-width: 1200px; margin: 0 auto; padding: 1.5rem; width: 100%;">
                    <!-- Summary Cards -->
                    <div class="summary-cards" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                        ${this.renderSummaryCards(budgetState)}
                    </div>
                    
                    <!-- Budget Categories -->
                    <div class="categories" style="display: grid; gap: 1.5rem;">
                        ${CATEGORIES.map(category => this.renderCategorySection(category, budgetState)).join('')}
                    </div>
                    
                    <!-- Partner Summary -->
                    ${budgetState.partners && budgetState.partners.length > 0 ? this.renderPartnerSummary(budgetState) : ''}
                </main>
                
                <!-- Add Item Modal -->
                <div id="addItemModal" class="modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); z-index: 100; align-items: center; justify-content: center;">
                    <div class="modal-content" style="background: white; padding: 1.5rem; border-radius: 0.5rem; width: 100%; max-width: 400px;">
                        <h3 id="modalTitle" style="font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem;">Add New Item</h3>
                        <form id="addItemForm" style="display: flex; flex-direction: column; gap: 1rem;">
                            <input type="hidden" id="modalCategory" value="">
                            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                                <label for="itemName" style="font-size: 0.875rem; font-weight: 500; color: #374151;">Item Name</label>
                                <input 
                                    type="text" 
                                    id="itemName" 
                                    required
                                    style="padding: 0.625rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.25rem; font-size: 0.875rem;"
                                    placeholder="e.g., Salary, Rent, Groceries"
                                >
                            </div>
                            <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                                <button 
                                    type="button" 
                                    id="cancelAddItem"
                                    style="padding: 0.625rem 1rem; background: #f3f4f6; border: none; border-radius: 0.25rem; cursor: pointer; font-size: 0.875rem;"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    style="padding: 0.625rem 1rem; background: #2563eb; color: white; border: none; border-radius: 0.25rem; cursor: pointer; font-size: 0.875rem;"
                                >
                                    Add Item
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        this.addStyles();
        this.bindEvents();
    },
    
    /**
     * Render summary cards
     * @param {Object} budgetState
     * @returns {string}
     */
    renderSummaryCards(budgetState) {
        const calculations = budgetState.calculations || {};
        const totals = calculations.totals || {};
        
        const cards = [
            {
                title: 'Total Income',
                value: totals.totalIncome || 0,
                color: '#10b981',
                icon: '💰'
            },
            {
                title: 'Total Expenses',
                value: (totals.totalFixedExpenses || 0) + (totals.totalVariableExpenses || 0),
                color: '#ef4444',
                icon: '💸'
            },
            {
                title: 'Total Savings',
                value: totals.totalSavings || 0,
                color: '#8b5cf6',
                icon: '🏦'
            },
            {
                title: 'Remaining Budget',
                value: totals.remainingBudget || 0,
                color: totals.remainingBudget >= 0 ? '#10b981' : '#ef4444',
                icon: totals.remainingBudget >= 0 ? '😊' : '😟'
            }
        ];
        
        return cards.map(card => `
            <div class="summary-card" style="background: white; padding: 1.25rem; border-radius: 0.5rem; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);">
                <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                    <span style="font-size: 1.5rem;">${card.icon}</span>
                    <span style="font-size: 0.875rem; color: #6b7280;">${card.title}</span>
                </div>
                <div style="font-size: 1.5rem; font-weight: 700; color: ${card.color};">
                    ${formatCurrency(card.value)}
                </div>
            </div>
        `).join('');
    },
    
    /**
     * Render a category section
     * @param {Object} category
     * @param {Object} budgetState
     * @returns {string}
     */
    renderCategorySection(category, budgetState) {
        const items = budgetManager.getCategoryItems(category.id);
        const total = budgetManager.getCategoryTotal(category.id);
        
        return `
            <div class="category-section" style="background: white; border-radius: 0.5rem; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1); overflow: hidden;">
                <!-- Category Header -->
                <div class="category-header" style="display: flex; align-items: center; justify-content: space-between; padding: 1rem; border-bottom: 1px solid #e5e7eb; background: ${category.color}10;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <span style="font-size: 1.25rem;">${category.icon}</span>
                        <h2 style="font-size: 1rem; font-weight: 600; color: #111827;">${category.name}</h2>
                        <span style="font-size: 0.875rem; color: #6b7280;">Total: ${formatCurrency(total)}</span>
                    </div>
                    <button 
                        class="add-item-btn" 
                        data-category="${category.id}"
                        style="padding: 0.5rem 1rem; background: ${category.color}; color: white; border: none; border-radius: 0.25rem; cursor: pointer; font-size: 0.875rem; font-weight: 500;"
                    >
                        + Add Item
                    </button>
                </div>
                
                <!-- Category Items -->
                <div class="category-items" style="padding: 1rem;">
                    ${items.length > 0 ? this.renderCategoryItems(items, category) : this.renderEmptyState(category)}
                </div>
            </div>
        `;
    },
    
    /**
     * Render category items
     * @param {Array} items
     * @param {Object} category
     * @returns {string}
     */
    renderCategoryItems(items, category) {
        return items.map(item => `
            <div class="budget-item" data-id="${item.id}" style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; margin-bottom: 0.5rem; background: white;">
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 500; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</div>
                    <div style="font-size: 0.75rem; color: #9ca3af;">${category.name}</div>
                </div>
                <div 
                    class="amount" 
                    data-id="${item.id}"
                    style="font-weight: 600; color: ${category.color}; cursor: pointer; padding: 0.25rem 0.5rem; border-radius: 0.25rem; transition: background-color 0.15s;"
                    title="Click to edit"
                >
                    ${formatCurrency(item.amount)}
                </div>
                <button 
                    class="delete-item" 
                    data-id="${item.id}"
                    style="padding: 0.25rem; background: none; border: none; cursor: pointer; color: #ef4444; border-radius: 0.25rem; transition: background-color 0.15s;"
                    title="Delete"
                >
                    ❌
                </button>
            </div>
        `).join('');
    },
    
    /**
     * Render empty state for a category
     * @param {Object} category
     * @returns {string}
     */
    renderEmptyState(category) {
        return `
            <div style="text-align: center; padding: 2rem; color: #6b7280;">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">📭</div>
                <div>No ${category.name.toLowerCase()} yet</div>
                <div style="font-size: 0.875rem; margin-top: 0.5rem;">Click "Add Item" to get started</div>
            </div>
        `;
    },
    
    /**
     * Render partner summary
     * @param {Object} budgetState
     * @returns {string}
     */
    renderPartnerSummary(budgetState) {
        const calculations = budgetState.calculations || {};
        const partnerBreakdown = calculations.partnerBreakdown || {};
        
        if (Object.keys(partnerBreakdown).length === 0) return '';
        
        return `
            <div class="partner-summary" style="background: white; border-radius: 0.5rem; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1); padding: 1.5rem; margin-top: 1.5rem;">
                <h2 style="font-size: 1.125rem; font-weight: 600; color: #111827; margin-bottom: 1rem;">Partner Breakdown</h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
                    ${Object.entries(partnerBreakdown).map(([partnerId, breakdown]) => {
                        const partner = budgetState.partners.find(p => p.id == partnerId);
                        const partnerName = partner ? partner.name : `Partner ${partnerId}`;
                        
                        return `
                            <div style="background: #f9fafb; padding: 1rem; border-radius: 0.375rem;">
                                <h3 style="font-size: 0.875rem; font-weight: 600; color: #111827; margin-bottom: 0.75rem;">${partnerName}</h3>
                                <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.875rem;">
                                    <div style="display: flex; justify-content: space-between;">
                                        <span style="color: #6b7280;">Income:</span>
                                        <span style="font-weight: 500;">${formatCurrency(breakdown.income)}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between;">
                                        <span style="color: #6b7280;">Bank Contribution:</span>
                                        <span style="font-weight: 500;">${formatCurrency(breakdown.bankContribution)}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between;">
                                        <span style="color: #6b7280;">Savings Contribution:</span>
                                        <span style="font-weight: 500;">${formatCurrency(breakdown.savingsContribution)}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; border-top: 1px solid #e5e7eb; padding-top: 0.5rem; margin-top: 0.25rem;">
                                        <span style="color: #111827; font-weight: 600;">Personal Allowance:</span>
                                        <span style="font-weight: 600; color: #10b981;">${formatCurrency(breakdown.personalAllowance)}</span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    },
    
    /**
     * Add CSS styles
     */
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Button hover effects */
            button:hover:not(:disabled) {
                opacity: 0.9;
            }
            button:active:not(:disabled) {
                opacity: 0.8;
            }
            
            /* Amount field hover */
            .amount:hover {
                background-color: #f3f4f6;
            }
            
            /* Delete button hover */
            .delete-item:hover {
                background-color: #fee2e2;
            }
            
            /* Modal backdrop animation */
            .modal {
                animation: fadeIn 0.15s ease-out;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            /* Input focus styles */
            input:focus {
                outline: none;
                border-color: #2563eb;
                box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
            }
            
            /* Budget item hover */
            .budget-item:hover {
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            }
        `;
        document.head.appendChild(style);
    },
    
    /**
     * Bind all events
     */
    bindEvents() {
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await authManager.logout();
                router.redirect('/login');
            });
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                await budgetManager.fetchBudget();
                this.render();
            });
        }
        
        // Undo button
        const undoBtn = document.getElementById('undoBtn');
        if (undoBtn) {
            undoBtn.addEventListener('click', async () => {
                await budgetManager.undoLastAction();
            });
        }
        
        // Add item buttons
        const addItemBtns = document.querySelectorAll('.add-item-btn');
        addItemBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.dataset.category;
                this.showAddItemModal(category);
            });
        });
        
        // Modal events
        const modal = document.getElementById('addItemModal');
        const cancelBtn = document.getElementById('cancelAddItem');
        const addItemForm = document.getElementById('addItemForm');
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.hideAddItemModal();
            });
        }
        
        if (addItemForm) {
            addItemForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleAddItem(e);
            });
        }
        
        // Close modal on backdrop click
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideAddItemModal();
                }
            });
        }
        
        // Amount click to edit
        const amountElements = document.querySelectorAll('.amount');
        amountElements.forEach(el => {
            el.addEventListener('click', () => {
                this.editAmount(el);
            });
        });
        
        // Delete item buttons
        const deleteBtns = document.querySelectorAll('.delete-item');
        deleteBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                const itemId = parseInt(btn.dataset.id);
                if (confirm('Are you sure you want to delete this item?')) {
                    await budgetManager.deleteItem(itemId);
                    this.render();
                }
            });
        });
        
        // Subscribe to budget changes
        budgetManager.subscribe(() => {
            this.render();
        });
    },
    
    /**
     * Show add item modal
     * @param {string} category
     */
    showAddItemModal(category) {
        const modal = document.getElementById('addItemModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalCategory = document.getElementById('modalCategory');
        const itemName = document.getElementById('itemName');
        
        if (modal && modalTitle && modalCategory && itemName) {
            const categoryInfo = CATEGORIES.find(c => c.id === category);
            modalTitle.textContent = `Add ${categoryInfo ? categoryInfo.name : 'Item'}`;
            modalCategory.value = category;
            itemName.value = '';
            itemName.focus();
            modal.style.display = 'flex';
        }
    },
    
    /**
     * Hide add item modal
     */
    hideAddItemModal() {
        const modal = document.getElementById('addItemModal');
        if (modal) {
            modal.style.display = 'none';
        }
    },
    
    /**
     * Handle add item form submission
     * @param {Event} e
     */
    async handleAddItem(e) {
        const form = e.target;
        const category = document.getElementById('modalCategory').value;
        const name = document.getElementById('itemName').value;
        const submitBtn = form.querySelector('button[type="submit"]');
        
        if (!name.trim()) return;
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Adding...';
        
        try {
            await budgetManager.addItem({
                name: name.trim(),
                category: category,
                amount: 0,
                is_default: false,
                sort_order: 0
            });
            
            this.hideAddItemModal();
        } catch (error) {
            console.error('Error adding item:', error);
            alert('Error adding item: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add Item';
        }
    },
    
    /**
     * Edit amount inline
     * @param {HTMLElement} element
     */
    editAmount(element) {
        const itemId = parseInt(element.dataset.id);
        const currentAmount = parseFloat(element.textContent.replace(/[^0-9.-]/g, '')) || 0;
        const category = CATEGORIES.find(c => c.color === element.style.color);
        
        // Create input element
        const input = document.createElement('input');
        input.type = 'number';
        input.step = '0.01';
        input.value = currentAmount;
        input.style.cssText = 'width: 100%; padding: 0.25rem; border: 1px solid #d1d5db; border-radius: 0.25rem; font-size: 0.875rem; text-align: right;';
        
        // Replace amount with input
        element.textContent = '';
        element.appendChild(input);
        input.focus();
        
        // Handle blur (save)
        input.addEventListener('blur', async () => {
            await this.saveAmountEdit(itemId, input.value, element, category);
        });
        
        // Handle Enter key (save)
        input.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                await this.saveAmountEdit(itemId, input.value, element, category);
            } else if (e.key === 'Escape') {
                // Cancel edit
                element.textContent = formatCurrency(currentAmount);
                if (category) {
                    element.style.color = category.color;
                }
            }
        });
    },
    
    /**
     * Save amount edit
     * @param {number} itemId
     * @param {string} newValue
     * @param {HTMLElement} element
     * @param {Object} category
     */
    async saveAmountEdit(itemId, newValue, element, category) {
        const amount = parseFloat(newValue) || 0;
        
        try {
            await budgetManager.updateItem(itemId, { amount });
            element.textContent = formatCurrency(amount);
            if (category) {
                element.style.color = category.color;
            }
        } catch (error) {
            console.error('Error updating amount:', error);
            // Revert to original value
            const originalAmount = parseFloat(element.dataset.originalAmount) || 0;
            element.textContent = formatCurrency(originalAmount);
            if (category) {
                element.style.color = category.color;
            }
        }
    }
};

export default BudgetDashboardPage;
