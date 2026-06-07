<?php
/**
 * Database Setup Script for Personal Budget Calculator
 * Creates all required tables for the PHP + MariaDB stack
 */

header('Content-Type: text/plain');

// Database configuration (temporary for setup)
$host = 'localhost';
$dbname = 'budget_app';
$user = 'root';
$password = '';

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

    // Budget history (3 months retention)
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

    // Undo stack (last 10 steps per user)
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

    // Create a trigger to cleanup old history (3 months retention)
    $pdo->exec("
        CREATE TRIGGER IF NOT EXISTS cleanup_old_history
        AFTER INSERT ON budget_history
        FOR EACH ROW
        BEGIN
            DELETE FROM budget_history 
            WHERE user_id = NEW.user_id 
            AND changed_at < DATE_SUB(NOW(), INTERVAL 3 MONTH);
        END
    ");

    // Create a trigger to limit undo stack to 10 entries per user
    $pdo->exec("
        CREATE TRIGGER IF NOT EXISTS limit_undo_stack
        AFTER INSERT ON undo_stack
        FOR EACH ROW
        BEGIN
            DELETE FROM undo_stack 
            WHERE user_id = NEW.user_id 
            AND id NOT IN (
                SELECT id FROM (
                    SELECT id FROM undo_stack 
                    WHERE user_id = NEW.user_id 
                    ORDER BY created_at DESC 
                    LIMIT 10
                ) AS latest_10
            );
        END
    ");

    // Insert default settings for new users (trigger-based)
    $pdo->exec("
        CREATE TRIGGER IF NOT EXISTS insert_default_settings
        AFTER INSERT ON users
        FOR EACH ROW
        BEGIN
            INSERT INTO settings (user_id, key_name, key_value) VALUES 
            (NEW.id, 'max_partners', '2'),
            (NEW.id, 'currency', '€'),
            (NEW.id, 'history_retention_days', '90');
        END
    ");

    echo "Database setup complete!\n";
    echo "Tables created:\n";
    echo "- users\n";
    echo "- partners\n";
    echo "- budget_items\n";
    echo "- budget_history\n";
    echo "- undo_stack\n";
    echo "- settings\n";
    echo "\nTriggers created:\n";
    echo "- cleanup_old_history (auto-cleanup history after 3 months)\n";
    echo "- limit_undo_stack (keep only last 10 undo steps)\n";
    echo "- insert_default_settings (auto-insert settings for new users)\n";

} catch (PDOException $e) {
    die("Database setup failed: " . $e->getMessage() . "\n");
}

// Close connection
$pdo = null;
?>
