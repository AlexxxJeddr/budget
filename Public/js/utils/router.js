/**
 * Vanilla JavaScript Router
 * Simple client-side routing without dependencies
 */

/**
 * Router class for handling client-side navigation
 */
export class Router {
    constructor() {
        /** @type {Object} */
        this.routes = {};
        /** @type {string} */
        this.currentPath = window.location.pathname;
        /** @type {Function|null} */
        this.notFoundHandler = null;
        /** @type {HTMLElement|null} */
        this.rootElement = null;
        
        // Handle browser navigation
        window.addEventListener('popstate', () => {
            this.currentPath = window.location.pathname;
            this.navigate(this.currentPath, false);
        });
    }
    
    /**
     * Initialize the router
     * @param {HTMLElement|string} root - The root element or its selector
     */
    init(root) {
        if (typeof root === 'string') {
            this.rootElement = document.querySelector(root);
        } else {
            this.rootElement = root;
        }
        
        if (!this.rootElement) {
            console.error('Router root element not found');
            return;
        }
        
        // Initial navigation
        this.navigate(this.currentPath, false);
    }
    
    /**
     * Add a route
     * @param {string} path - The route path (e.g., '/', '/login', '/budget')
     * @param {Function} handler - Function to call when route matches
     */
    on(path, handler) {
        this.routes[path] = handler;
    }
    
    /**
     * Set the not found handler
     * @param {Function} handler
     */
    setNotFound(handler) {
        this.notFoundHandler = handler;
    }
    
    /**
     * Navigate to a path
     * @param {string} path - The path to navigate to
     * @param {boolean} [pushState=true] - Whether to push to history
     */
    navigate(path, pushState = true) {
        // Clean up path
        path = path.replace(/\/+$/, ''); // Remove trailing slashes
        
        if (pushState) {
            window.history.pushState({}, '', path);
        }
        
        this.currentPath = path;
        
        // Find matching route
        let matched = false;
        for (const routePath in this.routes) {
            const pattern = this.pathToRegex(routePath);
            if (pattern.test(path)) {
                const params = this.extractParams(path, routePath);
                this.routes[routePath](params);
                matched = true;
                break;
            }
        }
        
        // Handle 404
        if (!matched && this.notFoundHandler) {
            this.notFoundHandler();
        }
    }
    
    /**
     * Redirect to a path
     * @param {string} path
     */
    redirect(path) {
        this.navigate(path, true);
    }
    
    /**
     * Go back in history
     */
    back() {
        window.history.back();
    }
    
    /**
     * Go forward in history
     */
    forward() {
        window.history.forward();
    }
    
    /**
     * Convert path to regex pattern
     * @param {string} path
     * @returns {RegExp}
     */
    pathToRegex(path) {
        // Escape special regex characters except for :param
        const escaped = path.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
        // Replace :param with named capture group
        const pattern = escaped.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '(?<$1>[^/]+)');
        return new RegExp(`^${pattern}$`);
    }
    
    /**
     * Extract params from path
     * @param {string} path
     * @param {string} routePath
     * @returns {Object}
     */
    extractParams(path, routePath) {
        const pattern = this.pathToRegex(routePath);
        const match = path.match(pattern);
        if (!match) return {};
        
        const params = {};
        for (const [key, value] of Object.entries(match.groups || {})) {
            params[key] = decodeURIComponent(value);
        }
        return params;
    }
    
    /**
     * Get current path
     * @returns {string}
     */
    getCurrentPath() {
        return this.currentPath;
    }
    
    /**
     * Check if current path matches a pattern
     * @param {string} pattern
     * @returns {boolean}
     */
    isCurrentPath(pattern) {
        const regex = this.pathToRegex(pattern);
        return regex.test(this.currentPath);
    }
}

// Singleton instance
export const router = new Router();

// Export for use in modules
export default router;
