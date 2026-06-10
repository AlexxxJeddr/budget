/**
 * Login Page
 * Vanilla JavaScript implementation
 */

import { authManager } from '../context/AuthContext.js';
import { router } from '../utils/router.js';

/**
 * Login Page Component
 */
export const LoginPage = {
    /**
     * Render the login page
     */
    render() {
        const appContainer = document.getElementById('app');
        if (!appContainer) return;
        
        appContainer.innerHTML = `
            <div class="login-container" style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background-color: #f9fafb;">
                <div class="login-card" style="background: white; padding: 2rem; border-radius: 0.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); width: 100%; max-width: 400px;">
                    <div class="login-header" style="text-align: center; margin-bottom: 2rem;">
                        <h1 style="font-size: 1.5rem; font-weight: 700; color: #111827; margin-bottom: 0.5rem;">Personal Budget Calculator</h1>
                        <p style="color: #6b7280; font-size: 0.875rem;">Please sign in to continue</p>
                    </div>
                    
                    <form id="loginForm" class="login-form" style="display: flex; flex-direction: column; gap: 1rem;">
                        <div class="form-group">
                            <label for="email" style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem;">Email Address</label>
                            <input 
                                type="email" 
                                id="email" 
                                name="email" 
                                required
                                autocomplete="email"
                                style="width: 100%; padding: 0.625rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.25rem; font-size: 0.875rem; transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;"
                                placeholder="you@example.com"
                            >
                        </div>
                        
                        <div class="form-group">
                            <label for="password" style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem;">Password</label>
                            <input 
                                type="password" 
                                id="password" 
                                name="password" 
                                required
                                autocomplete="current-password"
                                style="width: 100%; padding: 0.625rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.25rem; font-size: 0.875rem;"
                                placeholder="Enter your password"
                            >
                        </div>
                        
                        <div id="errorMessage" class="error-message" style="color: #ef4444; font-size: 0.875rem; display: none;"></div>
                        
                        <button 
                            type="submit" 
                            class="login-button" 
                            style="width: 100%; padding: 0.625rem 1rem; background-color: #2563eb; color: white; border: none; border-radius: 0.25rem; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: background-color 0.15s ease-in-out;"
                        >
                            Sign In
                        </button>
                    </form>
                    
                    <div class="login-footer" style="margin-top: 1.5rem; text-align: center;">
                        <p style="color: #6b7280; font-size: 0.875rem;">
                            Don't have an account? 
                            <button id="showRegister" style="background: none; border: none; color: #2563eb; cursor: pointer; font-size: 0.875rem; font-weight: 500;">
                                Register
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        // Add hover effects
        this.addStyles();
        this.bindEvents();
    },
    
    /**
     * Add CSS styles
     */
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .login-button:hover {
                background-color: #1d4ed8;
            }
            .login-button:active {
                background-color: #1e40af;
            }
            input:focus {
                outline: none;
                border-color: #2563eb;
                box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
            }
            button:focus {
                outline: none;
                box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
            }
        `;
        document.head.appendChild(style);
    },
    
    /**
     * Bind form events
     */
    bindEvents() {
        const form = document.getElementById('loginForm');
        const showRegisterBtn = document.getElementById('showRegister');
        
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleLogin(e);
            });
        }
        
        if (showRegisterBtn) {
            showRegisterBtn.addEventListener('click', () => {
                this.showRegisterForm();
            });
        }
    },
    
    /**
     * Handle login form submission
     * @param {Event} e
     */
    async handleLogin(e) {
        const form = e.target;
        const email = form.email.value;
        const password = form.password.value;
        const errorMessage = document.getElementById('errorMessage');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in...';
        
        if (errorMessage) {
            errorMessage.style.display = 'none';
        }
        
        try {
            await authManager.login(email, password);
            // On success, redirect to dashboard
            router.redirect('/');
        } catch (error) {
            if (errorMessage) {
                errorMessage.textContent = error.message || 'Invalid email or password';
                errorMessage.style.display = 'block';
            }
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In';
        }
    },
    
    /**
     * Show registration form
     */
    showRegisterForm() {
        const appContainer = document.getElementById('app');
        if (!appContainer) return;
        
        appContainer.innerHTML = `
            <div class="login-container" style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background-color: #f9fafb;">
                <div class="login-card" style="background: white; padding: 2rem; border-radius: 0.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); width: 100%; max-width: 400px;">
                    <div class="login-header" style="text-align: center; margin-bottom: 2rem;">
                        <h1 style="font-size: 1.5rem; font-weight: 700; color: #111827; margin-bottom: 0.5rem;">Create Account</h1>
                        <p style="color: #6b7280; font-size: 0.875rem;">Register a new account</p>
                    </div>
                    
                    <form id="registerForm" class="register-form" style="display: flex; flex-direction: column; gap: 1rem;">
                        <div class="form-group">
                            <label for="registerEmail" style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem;">Email Address</label>
                            <input 
                                type="email" 
                                id="registerEmail" 
                                name="email" 
                                required
                                autocomplete="email"
                                style="width: 100%; padding: 0.625rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.25rem; font-size: 0.875rem;"
                                placeholder="you@example.com"
                            >
                        </div>
                        
                        <div class="form-group">
                            <label for="registerPassword" style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem;">Password</label>
                            <input 
                                type="password" 
                                id="registerPassword" 
                                name="password" 
                                required
                                autocomplete="new-password"
                                minlength="8"
                                style="width: 100%; padding: 0.625rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.25rem; font-size: 0.875rem;"
                                placeholder="Create a password"
                            >
                        </div>
                        
                        <div class="form-group">
                            <label for="confirmPassword" style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem;">Confirm Password</label>
                            <input 
                                type="password" 
                                id="confirmPassword" 
                                name="confirmPassword" 
                                required
                                autocomplete="new-password"
                                style="width: 100%; padding: 0.625rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.25rem; font-size: 0.875rem;"
                                placeholder="Confirm your password"
                            >
                        </div>
                        
                        <div id="registerErrorMessage" class="error-message" style="color: #ef4444; font-size: 0.875rem; display: none;"></div>
                        
                        <div style="display: flex; gap: 0.5rem;">
                            <button 
                                type="button" 
                                id="backToLogin"
                                style="flex: 1; padding: 0.625rem 1rem; background-color: #f3f4f6; color: #374151; border: none; border-radius: 0.25rem; font-size: 0.875rem; font-weight: 500; cursor: pointer;"
                            >
                                Back
                            </button>
                            <button 
                                type="submit" 
                                class="register-button"
                                style="flex: 1; padding: 0.625rem 1rem; background-color: #2563eb; color: white; border: none; border-radius: 0.25rem; font-size: 0.875rem; font-weight: 500; cursor: pointer;"
                            >
                                Register
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        this.bindRegisterEvents();
    },
    
    /**
     * Bind registration form events
     */
    bindRegisterEvents() {
        const form = document.getElementById('registerForm');
        const backBtn = document.getElementById('backToLogin');
        
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleRegister(e);
            });
        }
        
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.render();
            });
        }
    },
    
    /**
     * Handle registration form submission
     * @param {Event} e
     */
    async handleRegister(e) {
        const form = e.target;
        const email = form.email.value;
        const password = form.password.value;
        const confirmPassword = form.confirmPassword.value;
        const errorMessage = document.getElementById('registerErrorMessage');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Validate passwords match
        if (password !== confirmPassword) {
            if (errorMessage) {
                errorMessage.textContent = 'Passwords do not match';
                errorMessage.style.display = 'block';
            }
            return;
        }
        
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registering...';
        
        if (errorMessage) {
            errorMessage.style.display = 'none';
        }
        
        try {
            await authManager.register(email, password);
            // On success, redirect to dashboard
            router.redirect('/');
        } catch (error) {
            if (errorMessage) {
                errorMessage.textContent = error.message || 'Registration failed';
                errorMessage.style.display = 'block';
            }
            submitBtn.disabled = false;
            submitBtn.textContent = 'Register';
        }
    }
};

export default LoginPage;
