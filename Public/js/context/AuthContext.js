/**
 * Auth Context - Vanilla JavaScript State Management
 * Manages authentication state and user session
 */

import { authApi } from '../utils/api.js';

/**
 * Auth State Manager
 * Provides reactive state management for authentication
 */
export class AuthManager {
    constructor() {
        /** @type {Object|null} */
        this.user = null;
        /** @type {boolean} */
        this.isLoggedIn = false;
        /** @type {boolean} */
        this.isLoading = true;
        /** @type {Function[]} */
        this.subscribers = [];
        
        // Initialize by checking current session
        this.initialize();
    }
    
    /**
     * Initialize auth state by checking current user
     */
    async initialize() {
        try {
            const response = await authApi.getUser();
            if (response.success && response.data) {
                this.user = response.data;
                this.isLoggedIn = true;
            }
        } catch (error) {
            this.user = null;
            this.isLoggedIn = false;
        } finally {
            this.isLoading = false;
            this.notifySubscribers();
        }
    }
    
    /**
     * Login user
     * @param {string} email
     * @param {string} password
     * @returns {Promise<Object>}
     */
    async login(email, password) {
        this.isLoading = true;
        this.notifySubscribers();
        
        try {
            const response = await authApi.login({ email, password });
            if (response.success) {
                // Refresh user data after login
                const userResponse = await authApi.getUser();
                if (userResponse.success && userResponse.data) {
                    this.user = userResponse.data;
                    this.isLoggedIn = true;
                    this.notifySubscribers();
                    return { success: true, user: this.user };
                }
            }
            // If login failed, throw an error so the caller can handle it
            throw new Error(response.error || 'Login failed');
        } catch (error) {
            this.user = null;
            this.isLoggedIn = false;
            this.isLoading = false;
            this.notifySubscribers();
            throw error;
        } finally {
            this.isLoading = false;
            this.notifySubscribers();
        }
    }
    
    /**
     * Logout user
     * @returns {Promise<Object>}
     */
    async logout() {
        try {
            await authApi.logout();
            this.user = null;
            this.isLoggedIn = false;
            this.notifySubscribers();
            return { success: true };
        } catch (error) {
            this.user = null;
            this.isLoggedIn = false;
            this.notifySubscribers();
            throw error;
        }
    }
    
    /**
     * Register new user
     * @param {string} email
     * @param {string} password
     * @returns {Promise<Object>}
     */
    async register(email, password) {
        this.isLoading = true;
        this.notifySubscribers();
        
        try {
            const response = await authApi.register({ email, password });
            if (response.success) {
                // Auto-login after registration
                return await this.login(email, password);
            }
            return { success: false, error: response.error || 'Registration failed' };
        } catch (error) {
            this.isLoading = false;
            this.notifySubscribers();
            throw error;
        }
    }
    
    /**
     * Subscribe to auth state changes
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
                console.error('Error in auth subscriber:', error);
            }
        });
    }
    
    /**
     * Get current auth state
     * @returns {Object}
     */
    getState() {
        return {
            user: this.user,
            isLoggedIn: this.isLoggedIn,
            isLoading: this.isLoading
        };
    }
}

// Singleton instance
export const authManager = new AuthManager();

// Export for use in modules
export default authManager;
