<?php
/**
 * AuthManager - Handles user authentication for Personal Budget Calculator
 * Uses PHP sessions for state management
 */

require_once __DIR__ . '/../../config/database.php';

class AuthManager {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    /**
     * Start a PHP session if not already started
     */
    private function ensureSession() {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
    }

    /**
     * Register a new user (admin-only or installation)
     * @param string $email
     * @param string $password
     * @return int|false Returns user ID or false on failure
     */
    public function register($email, $password) {
        // Validate email
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new InvalidArgumentException("Invalid email address");
        }

        // Validate password strength
        if (strlen($password) < 8) {
            throw new InvalidArgumentException("Password must be at least 8 characters");
        }

        // Check if user already exists
        $stmt = $this->pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            throw new RuntimeException("User already exists");
        }

        // Hash password
        $passwordHash = password_hash($password, PASSWORD_BCRYPT);

        // Insert user
        $stmt = $this->pdo->prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)");
        $stmt->execute([$email, $passwordHash]);

        return $this->pdo->lastInsertId();
    }

    /**
     * Login a user
     * @param string $email
     * @param string $password
     * @return bool True on success, false on failure
     */
    public function login($email, $password) {
        $this->ensureSession();

        $stmt = $this->pdo->prepare("SELECT id, password_hash FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password_hash'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['logged_in'] = true;
            $_SESSION['last_activity'] = time();
            return true;
        }

        return false;
    }

    /**
     * Logout the current user
     */
    public function logout() {
        $this->ensureSession();
        session_unset();
        session_destroy();
    }

    /**
     * Get the current user ID
     * @return int|null User ID or null if not logged in
     */
    public function getUserId() {
        $this->ensureSession();
        return $_SESSION['user_id'] ?? null;
    }

    /**
     * Check if a user is logged in
     * @return bool
     */
    public function isLoggedIn() {
        $this->ensureSession();
        return isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true;
    }

    /**
     * Get user information
     * @param int $userId
     * @return array|null User data or null if not found
     */
    public function getUser($userId) {
        $stmt = $this->pdo->prepare("SELECT id, email, created_at FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        return $stmt->fetch();
    }

    /**
     * Update user password
     * @param int $userId
     * @param string $oldPassword
     * @param string $newPassword
     * @return bool True on success, false on failure
     */
    public function updatePassword($userId, $oldPassword, $newPassword) {
        // Verify old password
        $stmt = $this->pdo->prepare("SELECT password_hash FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($oldPassword, $user['password_hash'])) {
            return false;
        }

        // Validate new password
        if (strlen($newPassword) < 8) {
            throw new InvalidArgumentException("New password must be at least 8 characters");
        }

        // Update password
        $newHash = password_hash($newPassword, PASSWORD_BCRYPT);
        $stmt = $this->pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
        return $stmt->execute([$newHash, $userId]);
    }

    /**
     * Check if session is expired (30 minutes inactivity)
     * @return bool True if expired
     */
    public function isSessionExpired() {
        $this->ensureSession();
        $inactivity = time() - ($_SESSION['last_activity'] ?? 0);
        return $inactivity > 1800; // 30 minutes
    }

    /**
     * Refresh session activity timestamp
     */
    public function refreshSession() {
        $this->ensureSession();
        $_SESSION['last_activity'] = time();
    }
}

// Create a singleton instance for convenience
$pdo = require __DIR__ . '/../../config/database.php';
$authManager = new AuthManager($pdo);
?>
