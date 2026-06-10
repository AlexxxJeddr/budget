/**
 * API Client for Personal Budget Calculator
 * Handles all API requests to the PHP backend
 * Vanilla JavaScript version
 */

const API_BASE = '/api';

/**
 * Helper function to handle API requests
 * @param {string} endpoint - API endpoint path
 * @param {Object} [options] - Fetch options
 * @returns {Promise<Object>} - Parsed JSON response
 */
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        credentials: 'include', // Include cookies for session
    };

    const response = await fetch(url, { ...defaultOptions, ...options });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
        throw new Error(data.error);
    }

    return data;
}

// Auth API
export const authApi = {
    /**
     * Login user
     * @param {LoginCredentials} credentials
     * @returns {Promise<Object>}
     */
    login: async (credentials) => {
        return apiRequest('/login.php', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });
    },

    /**
     * Logout user
     * @returns {Promise<Object>}
     */
    logout: async () => {
        return apiRequest('/logout.php', {
            method: 'POST',
        });
    },

    /**
     * Register user
     * @param {LoginCredentials} credentials
     * @returns {Promise<Object>}
     */
    register: async (credentials) => {
        return apiRequest('/register.php', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });
    },

    /**
     * Get current user info
     * @returns {Promise<Object>}
     */
    getUser: async () => {
        return apiRequest('/user.php');
    },
};

// Budget Items API
export const budgetItemsApi = {
    /**
     * Get all budget items
     * @returns {Promise<Object>}
     */
    getAll: async () => {
        return apiRequest('/budget_items.php');
    },

    /**
     * Get budget items by category
     * @param {string} category
     * @returns {Promise<Object>}
     */
    getByCategory: async (category) => {
        return apiRequest(`/budget_items.php?category=${category}`);
    },

    /**
     * Create a new budget item
     * @param {Object} item
     * @returns {Promise<Object>}
     */
    create: async (item) => {
        return apiRequest('/budget_items.php', {
            method: 'POST',
            body: JSON.stringify(item),
        });
    },

    /**
     * Update a budget item
     * @param {number} id
     * @param {Object} updates
     * @returns {Promise<Object>}
     */
    update: async (id, updates) => {
        return apiRequest(`/budget_items.php?id=${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    },

    /**
     * Delete a budget item
     * @param {number} id
     * @returns {Promise<Object>}
     */
    delete: async (id) => {
        return apiRequest(`/budget_items.php?id=${id}`, {
            method: 'DELETE',
        });
    },
};

// Calculations API
export const calculationsApi = {
    /**
     * Get all calculations
     * @returns {Promise<Object>}
     */
    getAll: async () => {
        return apiRequest('/calculations.php');
    },
};

// Partners API
export const partnersApi = {
    /**
     * Get all partners
     * @returns {Promise<Object>}
     */
    getAll: async () => {
        return apiRequest('/partners.php');
    },

    /**
     * Create a new partner
     * @param {string} name
     * @returns {Promise<Object>}
     */
    create: async (name) => {
        return apiRequest('/partners.php', {
            method: 'POST',
            body: JSON.stringify({ name }),
        });
    },

    /**
     * Update a partner
     * @param {number} id
     * @param {string} name
     * @returns {Promise<Object>}
     */
    update: async (id, name) => {
        return apiRequest(`/partners.php?id=${id}`, {
            method: 'PUT',
            body: JSON.stringify({ name }),
        });
    },

    /**
     * Delete a partner
     * @param {number} id
     * @returns {Promise<Object>}
     */
    delete: async (id) => {
        return apiRequest(`/partners.php?id=${id}`, {
            method: 'DELETE',
        });
    },
};

// History API
export const historyApi = {
    /**
     * Get all history records
     * @param {number} [limit]
     * @returns {Promise<Object>}
     */
    getAll: async (limit) => {
        const url = limit ? `/history.php?limit=${limit}` : '/history.php';
        return apiRequest(url);
    },

    /**
     * Get history by item ID
     * @param {number} itemId
     * @param {number} [limit]
     * @returns {Promise<Object>}
     */
    getByItem: async (itemId, limit) => {
        const url = limit ? `/history.php?itemId=${itemId}&limit=${limit}` : `/history.php?itemId=${itemId}`;
        return apiRequest(url);
    },
};

// Undo API
export const undoApi = {
    /**
     * Undo the last action
     * @returns {Promise<Object>}
     */
    undoLastAction: async () => {
        return apiRequest('/undo.php', {
            method: 'POST',
        });
    },
};

// Real-time Sync API
export const syncApi = {
    /**
     * Get sync events since a specific timestamp
     * @param {string} [since]
     * @returns {Promise<Object>}
     */
    getEvents: async (since) => {
        const url = since ? `/sync.php?since=${encodeURIComponent(since)}` : '/sync.php';
        return apiRequest(url);
    },

    /**
     * Subscribe to Server-Sent Events for real-time updates
     * @param {Function} callback - Function to call with each event
     * @returns {EventSource} - The EventSource connection
     */
    subscribe: (callback) => {
        const eventSource = new EventSource('/api/sync_events.php');
        
        eventSource.onmessage = (e) => {
            try {
                const event = JSON.parse(e.data);
                callback(event);
            } catch (error) {
                console.error('Error parsing sync event:', error);
            }
        };

        eventSource.onerror = (e) => {
            console.error('Sync event source error:', e);
            eventSource.close();
        };

        return eventSource;
    },
};

// Export all APIs
export default {
    auth: authApi,
    budgetItems: budgetItemsApi,
    calculations: calculationsApi,
    partners: partnersApi,
    history: historyApi,
    undo: undoApi,
    sync: syncApi,
};
