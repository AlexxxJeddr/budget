/**
 * Main Application Entry Point
 * Vanilla JavaScript version of the Personal Budget Calculator
 */

import { authManager } from './context/AuthContext.js';
import { budgetManager } from './context/BudgetContext.js';
import { router } from './utils/router.js';
import { LoginPage } from './pages/Login.js';
import { BudgetDashboardPage } from './pages/BudgetDashboard.js';

/**
 * Application State
 */
const appState = {
    isInitialized: false,
    auth: authManager,
    budget: budgetManager
};

/**
 * Protected Route Handler
 * Redirects to login if not authenticated
 */
function protectedRoute() {
    const authState = authManager.getState();
    
    if (authState.isLoading) {
        // Show loading state
        renderLoading();
        return;
    }
    
    if (!authState.isLoggedIn) {
        router.redirect('/login');
        return;
    }
    
    // Render the dashboard
    BudgetDashboardPage.render();
}

/**
 * Login Route Handler
 */
function loginRoute() {
    const authState = authManager.getState();
    
    if (authState.isLoading) {
        renderLoading();
        return;
    }
    
    if (authState.isLoggedIn) {
        router.redirect('/');
        return;
    }
    
    LoginPage.render();
}

/**
 * Render loading spinner
 */
function renderLoading() {
    const appContainer = document.getElementById('app');
    if (appContainer) {
        appContainer.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh;">
                <div style="width: 40px; height: 40px; border: 4px solid #3b82f6; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <style>
                    @keyframes spin { to { transform: rotate(360deg); } }
                </style>
            </div>
        `;
    }
}

/**
 * Initialize the application
 */
export function initApp() {
    if (appState.isInitialized) return;
    
    // Setup routes
    router.on('/', protectedRoute);
    router.on('/login', loginRoute);
    router.on('/budget', protectedRoute);
    
    // Default to dashboard for any other route
    router.setNotFound(() => {
        router.redirect('/');
    });
    
    // Initialize router with app container
    router.init('#app');
    
    // Start real-time sync when authenticated
    authManager.subscribe((authState) => {
        if (authState.isLoggedIn) {
            budgetManager.startSync();
        } else {
            budgetManager.stopSync();
        }
    });
    
    appState.isInitialized = true;
    
    console.log('Personal Budget Calculator initialized');
}

/**
 * Get application state
 * @returns {Object}
 */
export function getAppState() {
    return {
        auth: authManager.getState(),
        budget: budgetManager.getState()
    };
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

export default {
    initApp,
    getAppState,
    authManager,
    budgetManager,
    router
};
