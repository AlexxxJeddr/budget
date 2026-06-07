<?php
/**
 * Database Setup Script for Personal Budget Calculator
 * Creates all required tables for the PHP + MariaDB stack
 * 
 * NOTE: This version does NOT create triggers (for hosting providers that restrict TRIGGER privileges)
 * Cleanup logic is handled in the application code instead.
 */

header('Content-Type: text/plain');

// Database configuration (temporary for setup)
// Update these with your Infomaniak credentials
$host = 'h2web430.infomaniak.ch';
$dbname = 'nl8mjo_budget';
$user = 'nl8mjo_tolister';
$password = ''; // Add your password here

try {
    $pdo = new PDO("mysql:host=$host", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Create the database if it doesn't exist
    $pdo->exec("CREATE DATABASE IF NOT EXISTS $dbname CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE $dbname");

    // Users table (for authentication)
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ");

    // Partners table (configurable names for 1-2 partners)
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS partners (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            name VARCHAR(80) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX (user_id)
        )
    ");

    // Budget items (income, expenses, savings)
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS budget_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            name VARCHAR(80) NOT NULL,
            category ENUM('income', 'fixed_expense', 'variable_expense', 'savings') NOT NULL,
            amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
            is_default BOOLEAN NOT NULL DEFAULT FALSE,
            sort_order INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX (user_id),
            INDEX (category)
        )
    ");

    // Budget history (3 months retention - cleanup handled in app code)
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS budget_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            item_id INT NOT NULL,
            old_amount DECIMAL(10, 2),
            new_amount DECIMAL(10, 2),
            changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (item_id) REFERENCES budget_items(id) ON DELETE CASCADE,
            INDEX (user_id),
            INDEX (item_id),
            INDEX (changed_at)
        )
    ");

    // Undo stack (last 10 steps per user - cleanup handled in app code)
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS undo_stack (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            action ENUM('insert', 'update', 'delete') NOT NULL,
            table_name VARCHAR(50) NOT NULL,
            record_id INT NOT NULL,
            old_data JSON,
            new_data JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX (user_id),
            INDEX (created_at)
        )
    ");

    // Settings table (for app configuration)
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS settings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            key_name VARCHAR(80) NOT NULL,
            key_value TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE KEY (user_id, key_name),
            INDEX (user_id)
        )
    ");

    echo "Database setup complete!\n";
    echo "Tables created:\n";
    echo "- users\n";
    echo "- partners\n";
    echo "- budget_items\n";
    echo "- budget_history\n";
    echo "- undo_stack\n";
    echo "- settings\n\n";

    echo "NOTE: Database triggers were NOT created (your hosting provider restricts this).\n";
    echo "Cleanup logic (history retention, undo stack limits, default settings) is handled in the application code.\n\n";

    echo "Next steps:\n";
    echo "1. Update Public/config/database.php with your database credentials\n";
    echo "2. Run the frontend build: cd Public && npm install && npm run build\n";
    echo "3. Deploy the Public/ folder to your web server\n";

} catch (PDOException $e) {
    die("Database setup failed: " . $e->getMessage() . "\n\n");
}

// Close connection
$pdo = null;
?>
