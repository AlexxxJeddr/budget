<?php
/**
 * API Endpoint: Get Current User
 * GET /api/user.php - Get current user information
 */

require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed', 405);
}

try {
    $userId = requireAuth();
    
    if (!$userId) {
        error_log("User not authenticated in user.php");
        sendError('Not authenticated', 401);
    }

    // Get user from database
    $stmt = $pdo->prepare("SELECT id, email, created_at FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if (!$user) {
        error_log("User not found in database: $userId");
        sendError('User not found', 404);
    }

    sendResponse(['success' => true, 'data' => $user]);

} catch (Exception $e) {
    error_log("User endpoint error: " . $e->getMessage());
    error_log("User endpoint trace: " . $e->getTraceAsString());
    sendError($e->getMessage(), 500);
}
?>
