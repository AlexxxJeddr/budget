<?php
/**
 * API Endpoint: User Logout
 * POST /api/logout.php
 */

require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', 405);
}

try {
    $authManager->logout();
    sendResponse(['success' => true, 'message' => 'Logged out successfully']);

} catch (Exception $e) {
    sendError($e->getMessage(), 500);
}
?>
