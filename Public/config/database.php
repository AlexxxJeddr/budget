<?php
/**
 * Database Configuration for Personal Budget Calculator
 * Centralized PDO connection for the entire application
 */

// Database configuration
// For Infomaniak hosting, use the hostname provided in your control panel
// e.g., 'mysql-123456.db.infomaniak.com'
// For local development, use 'localhost' or '127.0.0.1'
$host = 'localhost';
$dbname = 'budget_app';
$user = 'root';
$password = '';

// Create PDO connection
try {
    error_log("Attempting database connection to host=$host, dbname=$dbname");
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
    error_log("Database connection successful");
} catch (PDOException $e) {
    // Log error and die with JSON for API requests
    error_log("Database connection failed: " . $e->getMessage());
    error_log("Database connection error code: " . $e->getCode());
    header('Content-Type: application/json');
    http_response_code(500);
    die(json_encode(['error' => 'Unable to connect to the database. Please try again later.']));
}

// Set timezone for consistent timestamp handling
$pdo->exec("SET time_zone = '+00:00'");

// Return the PDO instance for use in other files
return $pdo;
?>
