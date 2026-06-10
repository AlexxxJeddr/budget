<?php
/**
 * API Configuration - Common setup for all API endpoints
 */

// Set content type to JSON
header('Content-Type: application/json');

// Start session for authentication
session_start();

// Enable CORS (for development)
// When using credentials, we cannot use wildcard origin
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigins = [
    'https://budget.alxdrx.me',
    'http://budget.alxdrx.me',
    'http://localhost',
    'http://localhost:8080',
    'http://127.0.0.1',
];

if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
}

header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle OPTIONS requests (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include database configuration
require_once __DIR__ . '/../config/database.php';

// Include AuthManager
require_once __DIR__ . '/../Auth/AuthManager.php';

// AuthManager instance
$authManager = new AuthManager($pdo);

// Check authentication for protected endpoints
function requireAuth() {
    global $authManager;
    if (!$authManager->isLoggedIn()) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }
    return $authManager->getUserId();
}

// Helper function to send JSON responses
function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

// Helper function to send error responses
function sendError($message, $statusCode = 400) {
    http_response_code($statusCode);
    echo json_encode(['error' => $message]);
    exit;
}

// Get JSON input
function getJsonInput() {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true);
}
?>
