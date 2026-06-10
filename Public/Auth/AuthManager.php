<?php
/**
 * AuthManager - Handles user authentication and session management
 */

class AuthManager
{
    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Check if user is logged in
     * @return bool
     */
    public function isLoggedIn()
    {
        return isset($_SESSION['user_id']);
    }

    /**
     * Get current user ID
     * @return int|null
     */
    public function getUserId()
    {
        return $_SESSION['user_id'] ?? null;
    }

    /**
     * Login user
     * @param string $email
     * @param string $password
     * @return bool
     */
    public function login($email, $password)
    {
        // Get user from database
        $stmt = $this->pdo->prepare("SELECT id, email, password_hash FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user) {
            return false;
        }

        // Verify password
        if (password_verify($password, $user['password_hash'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_email'] = $user['email'];
            return true;
        }

        return false;
    }

    /**
     * Logout user
     */
    public function logout()
    {
        session_unset();
        session_destroy();
    }

    /**
     * Register new user
     * @param string $email
     * @param string $password
     * @return int User ID
     */
    public function register($email, $password)
    {
        // Hash password
        $passwordHash = password_hash($password, PASSWORD_BCRYPT);

        // Insert user
        $stmt = $this->pdo->prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)");
        $stmt->execute([$email, $passwordHash]);

        $userId = $this->pdo->lastInsertId();

        // Auto-login after registration
        $_SESSION['user_id'] = $userId;
        $_SESSION['user_email'] = $email;

        return $userId;
    }

    /**
     * Get current user info
     * @return array|null
     */
    public function getUser()
    {
        if (!$this->isLoggedIn()) {
            return null;
        }

        $userId = $this->getUserId();
        $stmt = $this->pdo->prepare("SELECT id, email, created_at FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        return $stmt->fetch();
    }
}
