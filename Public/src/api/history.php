<?php
/**
 * API Endpoint: Budget History
 * GET /api/history.php - Get history for user or specific item
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/../Budget/BudgetManager.php';

$userId = requireAuth();
$budgetManager = new BudgetManager($pdo);

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        sendError('Method not allowed', 405);
    }

    $itemId = $_GET['itemId'] ?? null;
    $limit = (int)($_GET['limit'] ?? 50);

    if ($itemId) {
        $history = $budgetManager->getItemHistory((int)$itemId, $userId, $limit);
    } else {
        $history = $budgetManager->getUserHistory($userId, $limit);
    }

    sendResponse(['success' => true, 'history' => $history]);

} catch (Exception $e) {
    sendError($e->getMessage(), 500);
}
?>
