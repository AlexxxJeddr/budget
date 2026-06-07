<?php
/**
 * API Endpoint: Budget Calculations
 * GET /api/calculations.php - Get all totals and partner breakdown
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/../Budget/BudgetManager.php';

$userId = requireAuth();
$budgetManager = new BudgetManager($pdo);

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        sendError('Method not allowed', 405);
    }

    $totals = $budgetManager->calculateTotals($userId);
    $breakdown = $budgetManager->calculatePartnerBreakdown($userId);

    sendResponse([
        'success' => true,
        'totals' => $totals,
        'partnerBreakdown' => $breakdown['partners'],
        'currency' => '€'
    ]);

} catch (Exception $e) {
    sendError($e->getMessage(), 500);
}
?>
