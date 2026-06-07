/**
 * API Client for Personal Budget Calculator
 * Handles all API requests to the PHP backend
 */

import { ApiResponse, BudgetItem, Partner, Calculations, HistoryRecord, UndoAction, LoginCredentials } from '@/types';

const API_BASE = '/api';

// Helper function to handle API requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const defaultOptions: RequestInit = {
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

  return data as T;
}

// Auth API
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<ApiResponse<{ userId: number }>> => {
    return apiRequest<ApiResponse<{ userId: number }>>('/login.php', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  logout: async (): Promise<ApiResponse<null>> => {
    return apiRequest<ApiResponse<null>>('/logout.php', {
      method: 'POST',
    });
  },

  register: async (credentials: LoginCredentials): Promise<ApiResponse<{ userId: number }>> => {
    return apiRequest<ApiResponse<{ userId: number }>>('/register.php', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  getUser: async (): Promise<ApiResponse<{ id: number; email: string }>> => {
    return apiRequest<ApiResponse<{ id: number; email: string }>>('/user.php');
  },
};

// Budget Items API
export const budgetItemsApi = {
  getAll: async (): Promise<ApiResponse<BudgetItem[]>> => {
    return apiRequest<ApiResponse<BudgetItem[]>>('/budget_items.php');
  },

  getByCategory: async (category: string): Promise<ApiResponse<BudgetItem[]>> => {
    return apiRequest<ApiResponse<BudgetItem[]>>(`/budget_items.php?category=${category}`);
  },

  create: async (item: Omit<BudgetItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<{ itemId: number }>> => {
    return apiRequest<ApiResponse<{ itemId: number }>>('/budget_items.php', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  },

  update: async (id: number, updates: Partial<BudgetItem>): Promise<ApiResponse<null>> => {
    return apiRequest<ApiResponse<null>>(`/budget_items.php?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  delete: async (id: number): Promise<ApiResponse<null>> => {
    return apiRequest<ApiResponse<null>>(`/budget_items.php?id=${id}`, {
      method: 'DELETE',
    });
  },
};

// Calculations API
export const calculationsApi = {
  getAll: async (): Promise<ApiResponse<Calculations>> => {
    return apiRequest<ApiResponse<Calculations>>('/calculations.php');
  },
};

// Partners API
export const partnersApi = {
  getAll: async (): Promise<ApiResponse<Partner[]>> => {
    return apiRequest<ApiResponse<Partner[]>>('/partners.php');
  },

  create: async (name: string): Promise<ApiResponse<{ partnerId: number }>> => {
    return apiRequest<ApiResponse<{ partnerId: number }>>('/partners.php', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  update: async (id: number, name: string): Promise<ApiResponse<null>> => {
    return apiRequest<ApiResponse<null>>(`/partners.php?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  },

  delete: async (id: number): Promise<ApiResponse<null>> => {
    return apiRequest<ApiResponse<null>>(`/partners.php?id=${id}`, {
      method: 'DELETE',
    });
  },
};

// History API
export const historyApi = {
  getAll: async (limit?: number): Promise<ApiResponse<HistoryRecord[]>> => {
    const url = limit ? `/history.php?limit=${limit}` : '/history.php';
    return apiRequest<ApiResponse<HistoryRecord[]>>(url);
  },

  getByItem: async (itemId: number, limit?: number): Promise<ApiResponse<HistoryRecord[]>> => {
    const url = limit ? `/history.php?itemId=${itemId}&limit=${limit}` : `/history.php?itemId=${itemId}`;
    return apiRequest<ApiResponse<HistoryRecord[]>>(url);
  },
};

// Undo API
export const undoApi = {
  undoLastAction: async (): Promise<ApiResponse<{
    action: string;
    table: string;
    recordId: number;
  }>> => {
    return apiRequest<ApiResponse<{ action: string; table: string; recordId: number }>>('/undo.php', {
      method: 'POST',
    });
  },
};

// Real-time Sync API
export const syncApi = {
  // Get sync events since a specific timestamp
  getEvents: async (since?: string): Promise<ApiResponse<SyncEvent[]>> => {
    const url = since ? `/sync.php?since=${encodeURIComponent(since)}` : '/sync.php';
    return apiRequest<ApiResponse<SyncEvent[]>>(url);
  },

  // Subscribe to Server-Sent Events for real-time updates
  subscribe: (callback: (event: SyncEvent) => void): EventSource => {
    const eventSource = new EventSource('/api/sync_events.php');
    
    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as SyncEvent;
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

export default {
  auth: authApi,
  budgetItems: budgetItemsApi,
  calculations: calculationsApi,
  partners: partnersApi,
  history: historyApi,
  undo: undoApi,
  sync: syncApi,
};
