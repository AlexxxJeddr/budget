/**
 * Budget Item Types
 * @typedef {('income'|'fixed_expense'|'variable_expense'|'savings')} BudgetItemCategory
 */

/**
 * @typedef {Object} BudgetItem
 * @property {number} id
 * @property {number} user_id
 * @property {string} name
 * @property {BudgetItemCategory} category
 * @property {number} amount
 * @property {boolean} is_default
 * @property {number} sort_order
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} HistoryRecord
 * @property {number} id
 * @property {number} user_id
 * @property {number} item_id
 * @property {number} old_amount
 * @property {number} new_amount
 * @property {string} changed_at
 * @property {string} [name]
 * @property {BudgetItemCategory} [category]
 */

/**
 * @typedef {Object} UndoAction
 * @property {number} id
 * @property {number} user_id
 * @property {('insert'|'update'|'delete')} action
 * @property {string} table_name
 * @property {number} record_id
 * @property {Object|null} old_data
 * @property {Object|null} new_data
 * @property {string} created_at
 */

/**
 * @typedef {Object} Partner
 * @property {number} id
 * @property {number} user_id
 * @property {string} name
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} BudgetTotals
 * @property {number} totalIncome
 * @property {number} totalFixedExpenses
 * @property {number} totalVariableExpenses
 * @property {number} totalSavings
 * @property {number} remainingBudget
 * @property {number} savingsPerPartner
 * @property {number} personalAllowance
 */

/**
 * @typedef {Object} PartnerBreakdown
 * @property {string} name
 * @property {number} income
 * @property {number} bankContribution
 * @property {number} savingsContribution
 * @property {number} personalAllowance
 */

/**
 * @typedef {Object} Calculations
 * @property {BudgetTotals} totals
 * @property {Object.<number, PartnerBreakdown>} partnerBreakdown
 * @property {string} currency
 */

/**
 * @typedef {Object} User
 * @property {number} id
 * @property {string} email
 * @property {string} created_at
 */

/**
 * @typedef {Object} AuthState
 * @property {User|null} user
 * @property {boolean} isLoggedIn
 * @property {boolean} isLoading
 */

/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success
 * @property {*} [data]
 * @property {string} [message]
 * @property {string} [error]
 */

/**
 * @typedef {Object} LoginCredentials
 * @property {string} email
 * @property {string} password
 */

/**
 * @typedef {Object} SyncEvent
 * @property {('create'|'update'|'delete')} type
 * @property {string} table
 * @property {Object} record
 * @property {string} timestamp
 */

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // Types are available via JSDoc
    };
}
