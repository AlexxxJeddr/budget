<?php
/**
 * API Endpoint: Budget Items Management
 * GET /api/budget_items.php - List all items
 * POST /api/budget_items.php - Create new item
 * PUT /api/budget_items.php?id=X - Update item
 * DELETE /api/budget_items.php?id=X - Delete item
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/../Budget/BudgetManager.php';

$userId = requireAuth();
$budgetManager = new BudgetManager($pdo);

try {
    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            // List all budget items
            $category = $_GET['category'] ?? null;
            
            if ($category) {
                $items = $budgetManager->getBudgetItemsByCategory($userId, $category);
            } else {
                $items = $budgetManager->getBudgetItems($userId);
            }
            
            sendResponse(['success' => true, 'items' => $items]);
            break;

        case 'POST':
            // Create new budget item
            $input = getJsonInput();

            if (!isset($input['name']) || !isset($input['category'])) {
                sendError('Name and category are required');
            }

            $name = $input['name'];
            $category = $input['category'];
            $amount = $input['amount'] ?? 0;
            $isDefault = $input['isDefault'] ?? false;

            $itemId = $budgetManager->addBudgetItem($userId, $name, $category, $amount, $isDefault);
            
            sendResponse([
                'success' => true,
                'itemId' => $itemId,
                'message' => 'Budget item created successfully'
            ]);
            break;

        case 'PUT':
            // Update budget item
            if (!isset($_GET['id'])) {
                sendError('Item ID is required');
            }

            $itemId = (int)$_GET['id'];
            $input = getJsonInput();

            if (empty($input)) {
                sendError('No data provided for update');
            }

            $result = $budgetManager->updateBudgetItem($itemId, $userId, $input);
            
            if ($result) {
                sendResponse(['success' => true, 'message' => 'Budget item updated successfully']);
            } else {
                sendError('Failed to update budget item');
            }
            break;

        case 'DELETE':
            // Delete budget item
            if (!isset($_GET['id'])) {
                sendError('Item ID is required');
            }

            $itemId = (int)$_GET['id'];
            $result = $budgetManager->deleteBudgetItem($itemId, $userId);
            
            if ($result) {
                sendResponse(['success' => true, 'message' => 'Budget item deleted successfully']);
            } else {
                sendError('Failed to delete budget item');
            }
            break;

        default:
            sendError('Method not allowed', 405);
    }

} catch (Exception $e) {
    sendError($e->getMessage(), 500);
}
?>
