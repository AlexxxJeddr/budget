<?php
/**
 * Database Configuration for Personal Budget Calculator
 * Centralized PDO connection for the entire application
 */

// Database configuration
$host = 'localhost';
$dbname = 'budget_app';
$user = 'root';
$password = '';

// Create PDO connection
try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
} catch (PDOException $e) {
    // Log error and die
    error_log("Database connection failed: " . $e->getMessage());
    die("Unable to connect to the database. Please try again later.");
}

// Set timezone for consistent timestamp handling
$pdo->exec("SET time_zone = '+00:00'");

// Return the PDO instance for use in other files
return $pdo;
?>
