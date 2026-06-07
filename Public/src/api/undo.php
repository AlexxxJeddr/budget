<?php
/**
 * API Endpoint: Undo Last Action
 * POST /api/undo.php - Undo the last action
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/../Budget/BudgetManager.php';

$userId = requireAuth();
$budgetManager = new BudgetManager($pdo);

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendError('Method not allowed', 405);
    }

    $result = $budgetManager->undoLastAction($userId);

    if ($result['success']) {
        sendResponse([
            'success' => true,
            'message' => 'Action undone successfully',
            'action' => $result['action'],
            'table' => $result['table'],
            'recordId' => $result['recordId']
        ]);
    } else {
        sendError('Failed to undo action');
    }

} catch (Exception $e) {
    sendError($e->getMessage(), 500);
}
?>
