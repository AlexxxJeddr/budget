/**
 * Budget Context - Vanilla JavaScript State Management
 * Manages budget items, calculations, partners, and real-time sync
 */

import { budgetItemsApi, calculationsApi, partnersApi, historyApi, undoApi, syncApi } from '../utils/api.js';

/**
 * Budget State Manager
 * Provides reactive state management for budget data
 */
export class BudgetManager {
    constructor() {
        /** @type {Array} */
        this.items = [];
        /** @type {Array} */
        this.partners = [];
        /** @type {Object|null} */
        this.calculations = null;
        /** @type {boolean} */
        this.isLoading = false;
        /** @type {string|null} */
        this.lastSync = null;
        /** @type {boolean} */
        this.isSyncing = false;
        /** @type {string|null} */
        this.syncError = null;
        /** @type {Function[]} */
        this.subscribers = [];
        /** @type {EventSource|null} */
        this.eventSource = null;
    }
    
    /**
     * Subscribe to budget state changes
     * @param {Function} callback
     * @returns {Function} - Unsubscribe function
     */
    subscribe(callback) {
        this.subscribers.push(callback);
        // Return unsubscribe function
        return () => {
            this.subscribers = this.subscribers.filter(sub => sub !== callback);
        };
    }
    
    /**
     * Notify all subscribers of state change
     */
    notifySubscribers() {
        const state = this.getState();
        this.subscribers.forEach(callback => {
            try {
                callback(state);
            } catch (error) {
                console.error('Error in budget subscriber:', error);
            }
        });
    }
    
    /**
     * Get current budget state
     * @returns {Object}
     */
    getState() {
        return {
            items: this.items,
            partners: this.partners,
            calculations: this.calculations,
            isLoading: this.isLoading,
            lastSync: this.lastSync,
            isSyncing: this.isSyncing,
            syncError: this.syncError
        };
    }
    
    /**
     * Fetch all budget data
     */
    async fetchBudget() {
        this.isLoading = true;
        this.notifySubscribers();
        
        try {
            // Fetch items, partners, and calculations in parallel
            const [itemsResponse, partnersResponse, calculationsResponse] = await Promise.all([
                budgetItemsApi.getAll(),
                partnersApi.getAll(),
                calculationsApi.getAll()
            ]);
            
            if (itemsResponse.success) {
                this.items = itemsResponse.data || [];
            }
            if (partnersResponse.success) {
                this.partners = partnersResponse.data || [];
            }
            if (calculationsResponse.success) {
                this.calculations = calculationsResponse.data || null;
            }
            
            this.lastSync = new Date().toISOString();
            this.syncError = null;
            
        } catch (error) {
            console.error('Error fetching budget:', error);
            this.syncError = error.message;
        } finally {
            this.isLoading = false;
            this.isSyncing = false;
            this.notifySubscribers();
        }
    }
    
    /**
     * Get items by category
     * @param {string} category
     * @returns {Array}
     */
    getCategoryItems(category) {
        return this.items.filter(item => item.category === category);
    }
    
    /**
     * Get total for a category
     * @param {string} category
     * @returns {number}
     */
    getCategoryTotal(category) {
        return this.items
            .filter(item => item.category === category)
            .reduce((sum, item) => sum + (item.amount || 0), 0);
    }
    
    /**
     * Add a new budget item
     * @param {Object} item
     */
    async addItem(item) {
        try {
            const response = await budgetItemsApi.create(item);
            if (response.success && response.data) {
                // Refresh all data
                await this.fetchBudget();
                return response.data;
            }
            return null;
        } catch (error) {
            console.error('Error adding item:', error);
            throw error;
        }
    }
    
    /**
     * Update a budget item
     * @param {number} id
     * @param {Object} updates
     */
    async updateItem(id, updates) {
        try {
            const response = await budgetItemsApi.update(id, updates);
            if (response.success) {
                // Update local state
                const index = this.items.findIndex(item => item.id === id);
                if (index !== -1) {
                    this.items[index] = { ...this.items[index], ...updates };
                    this.lastSync = new Date().toISOString();
                    this.notifySubscribers();
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error updating item:', error);
            throw error;
        }
    }
    
    /**
     * Delete a budget item
     * @param {number} id
     */
    async deleteItem(id) {
        try {
            const response = await budgetItemsApi.delete(id);
            if (response.success) {
                // Remove from local state
                this.items = this.items.filter(item => item.id !== id);
                this.lastSync = new Date().toISOString();
                this.notifySubscribers();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error deleting item:', error);
            throw error;
        }
    }
    
    /**
     * Undo the last action
     */
    async undoLastAction() {
        try {
            const response = await undoApi.undoLastAction();
            if (response.success) {
                // Refresh all data after undo
                await this.fetchBudget();
                return response.data;
            }
            return null;
        } catch (error) {
            console.error('Error undoing action:', error);
            throw error;
        }
    }
    
    /**
     * Start real-time sync
     */
    startSync() {
        if (this.eventSource) {
            this.eventSource.close();
        }
        
        this.eventSource = syncApi.subscribe((event) => {
            this.handleSyncEvent(event);
        });
    }
    
    /**
     * Stop real-time sync
     */
    stopSync() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
    }
    
    /**
     * Handle incoming sync event
     * @param {Object} event
     */
    async handleSyncEvent(event) {
        this.isSyncing = true;
        this.notifySubscribers();
        
        try {
            // Refresh data based on event type
            await this.fetchBudget();
            this.lastSync = new Date().toISOString();
        } catch (error) {
            console.error('Error handling sync event:', error);
            this.syncError = error.message;
        } finally {
            this.isSyncing = false;
            this.notifySubscribers();
        }
    }
    
    /**
     * Get history for an item
     * @param {number} itemId
     * @param {number} [limit]
     */
    async getHistory(itemId, limit) {
        try {
            const response = await historyApi.getByItem(itemId, limit);
            return response.success ? response.data : [];
        } catch (error) {
            console.error('Error fetching history:', error);
            return [];
        }
    }
}

// Singleton instance
export const budgetManager = new BudgetManager();

// Export for use in modules
export default budgetManager;
