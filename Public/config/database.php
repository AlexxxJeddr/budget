<?php
/**
 * Database Configuration for Personal Budget Calculator
 * Centralized PDO connection for the entire application
 */

// Database configuration
// For Infomaniak hosting, use the hostname provided in your control panel
// e.g., 'mysql-123456.db.infomaniak.com' or 'nl8mjo.myd.infomaniak.com'
// IMPORTANT: For Infomaniak, use the full hostname, NOT 'localhost'
// Also ensure the user has permissions on the database
$host = 'localhost';
$dbname = 'budget_app';
$user = 'root';
$password = '';

// Create PDO connection
// For Infomaniak, use: mysql:host=nl8mjo.myd.infomaniak.com;dbname=nl8mjo_budget;charset=utf8mb4
try {
    error_log("Attempting database connection to host=$host, dbname=$dbname");
    // For Infomaniak, use the full hostname directly
    // PDO should use TCP/IP by default for remote hosts
    $dsn = "mysql:host=$host;dbname=$dbname;charset=utf8mb4";
    
    // Set PDO to use TCP/IP explicitly (avoid Unix socket)
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4",
    ];
    
    $pdo = new PDO($dsn, $user, $password, $options);
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
