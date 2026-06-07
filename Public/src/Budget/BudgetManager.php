<?php
/**
 * BudgetManager - Core business logic for Personal Budget Calculator
 * Handles budget items, calculations, history, and undo functionality
 * 
 * NOTE: Cleanup logic (history retention, undo stack limits) is handled here
 * instead of database triggers (for hosting providers that restrict TRIGGER privileges)
 */

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../Models/Partner.php';

class BudgetManager {
    private $pdo;
    private $partnerModel;

    public function __construct($pdo) {
        $this->pdo = $pdo;
        $this->partnerModel = new Partner($pdo);
    }

    // ==================== BUDGET ITEMS ====================

    /**
     * Get all budget items for a user
     * @param int $userId
     * @return array
     */
    public function getBudgetItems($userId) {
        $stmt = $this->pdo->prepare("
            SELECT * FROM budget_items 
            WHERE user_id = ? 
            ORDER BY 
                CASE category 
                    WHEN 'income' THEN 1 
                    WHEN 'fixed_expense' THEN 2 
                    WHEN 'variable_expense' THEN 3 
                    WHEN 'savings' THEN 4 
                END,
                sort_order
        ");
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }

    /**
     * Get budget items by category
     * @param int $userId
     * @param string $category
     * @return array
     */
    public function getBudgetItemsByCategory($userId, $category) {
        $stmt = $this->pdo->prepare("SELECT * FROM budget_items WHERE user_id = ? AND category = ? ORDER BY sort_order");
        $stmt->execute([$userId, $category]);
        return $stmt->fetchAll();
    }

    /**
     * Get a specific budget item
     * @param int $id
     * @param int $userId
     * @return array|null
     */
    public function getBudgetItem($id, $userId) {
        $stmt = $this->pdo->prepare("SELECT * FROM budget_items WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $userId]);
        return $stmt->fetch();
    }

    /**
     * Add a new budget item
     * @param int $userId
     * @param string $name
     * @param string $category
     * @param float $amount
     * @param bool $isDefault
     * @return int
     */
    public function addBudgetItem($userId, $name, $category, $amount = 0, $isDefault = false) {
        // Validate inputs
        $this->validateBudgetItem($name, $category, $amount);

        // Get next sort order
        $stmt = $this->pdo->prepare("SELECT MAX(sort_order) FROM budget_items WHERE user_id = ? AND category = ?");
        $stmt->execute([$userId, $category]);
        $maxOrder = (int)$stmt->fetchColumn();
        $sortOrder = $maxOrder + 1;

        $stmt = $this->pdo->prepare("INSERT INTO budget_items (user_id, name, category, amount, is_default, sort_order) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$userId, trim($name), $category, $amount, $isDefault ? 1 : 0, $sortOrder]);

        $itemId = $this->pdo->lastInsertId();

        // Log to undo stack
        $this->logUndoAction($userId, 'insert', 'budget_items', $itemId, null, [
            'name' => $name,
            'category' => $category,
            'amount' => $amount,
            'is_default' => $isDefault,
            'sort_order' => $sortOrder
        ]);

        // Cleanup undo stack (keep only last 10 entries)
        $this->cleanupUndoStack($userId);

        return $itemId;
    }

    /**
     * Update a budget item
     * @param int $id
     * @param int $userId
     * @param array $data
     * @return bool
     */
    public function updateBudgetItem($id, $userId, $data) {
        $item = $this->getBudgetItem($id, $userId);
        if (!$item) {
            throw new RuntimeException("Budget item not found");
        }

        // Validate inputs
        if (isset($data['name'])) {
            $this->validateBudgetItem($data['name'], $item['category'], $data['amount'] ?? $item['amount']);
        }

        // Build update query
        $updates = [];
        $params = [];

        if (isset($data['name'])) {
            $updates[] = "name = ?";
            $params[] = trim($data['name']);
        }
        if (isset($data['amount'])) {
            $updates[] = "amount = ?";
            $params[] = $data['amount'];
        }
        if (isset($data['category'])) {
            $updates[] = "category = ?";
            $params[] = $data['category'];
        }
        if (isset($data['sort_order'])) {
            $updates[] = "sort_order = ?";
            $params[] = $data['sort_order'];
        }

        if (empty($updates)) {
            return false;
        }

        $params[] = $id;
        $params[] = $userId;

        $query = "UPDATE budget_items SET " . implode(', ', $updates) . " WHERE id = ? AND user_id = ?";
        $stmt = $this->pdo->prepare($query);
        $result = $stmt->execute($params);

        if ($result && isset($data['amount']) && $data['amount'] != $item['amount']) {
            // Log to history
            $this->logHistory($userId, $id, $item['amount'], $data['amount']);

            // Log to undo stack
            $this->logUndoAction($userId, 'update', 'budget_items', $id, ['amount' => $item['amount']], ['amount' => $data['amount']]);

            // Cleanup undo stack (keep only last 10 entries)
            $this->cleanupUndoStack($userId);

            // Cleanup old history (3 months retention)
            $this->cleanupHistory($userId);
        }

        return $result;
    }

    /**
     * Delete a budget item
     * @param int $id
     * @param int $userId
     * @return bool
     */
    public function deleteBudgetItem($id, $userId) {
        $item = $this->getBudgetItem($id, $userId);
        if (!$item) {
            throw new RuntimeException("Budget item not found");
        }

        // Cannot delete default items
        if ($item['is_default']) {
            throw new RuntimeException("Cannot delete default budget items");
        }

        // Log to undo stack before deletion
        $this->logUndoAction($userId, 'delete', 'budget_items', $id, $item, null);

        $stmt = $this->pdo->prepare("DELETE FROM budget_items WHERE id = ? AND user_id = ?");
        $result = $stmt->execute([$id, $userId]);

        // Cleanup undo stack (keep only last 10 entries)
        $this->cleanupUndoStack($userId);

        return $result;
    }

    /**
     * Validate budget item data
     * @param string $name
     * @param string $category
     * @param float $amount
     */
    private function validateBudgetItem($name, $category, $amount) {
        if (empty(trim($name))) {
            throw new InvalidArgumentException("Item name cannot be empty");
        }
        if (strlen($name) > 80) {
            throw new InvalidArgumentException("Item name must be 80 characters or less");
        }
        if (!in_array($category, ['income', 'fixed_expense', 'variable_expense', 'savings'])) {
            throw new InvalidArgumentException("Invalid category");
        }
        if ($amount < 0 || $amount > 1000000) {
            throw new InvalidArgumentException("Amount must be between 0 and 1,000,000");
        }
    }

    // ==================== CLEANUP METHODS (for hosting without TRIGGER privileges) ====================

    /**
     * Cleanup old history (3 months retention)
     * Called after history insertions
     * @param int $userId
     */
    private function cleanupHistory($userId) {
        $stmt = $this->pdo->prepare("DELETE FROM budget_history WHERE user_id = ? AND changed_at < DATE_SUB(NOW(), INTERVAL 3 MONTH)");
        $stmt->execute([$userId]);
    }

    /**
     * Cleanup undo stack (keep only last 10 entries per user)
     * Called after undo stack insertions
     * @param int $userId
     */
    private function cleanupUndoStack($userId) {
        $stmt = $this->pdo->prepare("
            DELETE FROM undo_stack 
            WHERE user_id = ? 
            AND id NOT IN (
                SELECT id FROM (
                    SELECT id FROM undo_stack 
                    WHERE user_id = ? 
                    ORDER BY created_at DESC 
                    LIMIT 10
                ) AS latest_10
            )
        ");
        $stmt->execute([$userId, $userId]);
    }

    // ==================== CALCULATIONS ====================

    /**
     * Calculate all budget totals
     * @param int $userId
     * @return array
     */
    public function calculateTotals($userId) {
        $income = $this->getBudgetItemsByCategory($userId, 'income');
        $fixedExpenses = $this->getBudgetItemsByCategory($userId, 'fixed_expense');
        $variableExpenses = $this->getBudgetItemsByCategory($userId, 'variable_expense');
        $savings = $this->getBudgetItemsByCategory($userId, 'savings');

        $totalIncome = array_sum(array_column($income, 'amount'));
        $totalFixedExpenses = array_sum(array_column($fixedExpenses, 'amount'));
        $totalVariableExpenses = array_sum(array_column($variableExpenses, 'amount'));
        $totalSavings = array_sum(array_column($savings, 'amount'));

        $remainingBudget = $totalIncome - $totalFixedExpenses - $totalVariableExpenses;
        $savingsPerPartner = $totalSavings / 2;
        $personalAllowance = ($remainingBudget - $totalSavings) / 2;

        return [
            'totalIncome' => $totalIncome,
            'totalFixedExpenses' => $totalFixedExpenses,
            'totalVariableExpenses' => $totalVariableExpenses,
            'totalSavings' => $totalSavings,
            'remainingBudget' => $remainingBudget,
            'savingsPerPartner' => $savingsPerPartner,
            'personalAllowance' => $personalAllowance
        ];
    }

    /**
     * Calculate per-partner breakdown
     * @param int $userId
     * @return array
     */
    public function calculatePartnerBreakdown($userId) {
        $partners = $this->partnerModel->getPartners($userId);
        $items = $this->getBudgetItems($userId);
        $totals = $this->calculateTotals($userId);

        $breakdown = [];
        $partnerIncomes = [];

        // Calculate income per partner
        foreach ($items as $item) {
            if ($item['category'] === 'income') {
                foreach ($partners as $partner) {
                    if (strpos($item['name'], $partner['name']) !== false) {
                        $partnerIncomes[$partner['id']] = ($partnerIncomes[$partner['id']] ?? 0) + $item['amount'];
                    }
                }
            }
        }

        // Calculate bank contributions
        foreach ($partners as $partner) {
            $partnerIncome = $partnerIncomes[$partner['id']] ?? 0;
            $isAlexxx = (strpos($partner['name'], 'Alexxx') !== false);

            // Alexxx's bank contribution: income - savings/2 - personal allowance - meal vouchers
            // Maja's bank contribution: income - savings/2 - personal allowance
            if ($isAlexxx) {
                $mealVouchers = 0;
                foreach ($items as $item) {
                    if (strpos($item['name'], 'Meal Vouchers') !== false) {
                        $mealVouchers = $item['amount'];
                        break;
                    }
                }
                $bankContribution = $partnerIncome - ($totals['totalSavings'] / 2) - $totals['personalAllowance'] - $mealVouchers;
            } else {
                $bankContribution = $partnerIncome - ($totals['totalSavings'] / 2) - $totals['personalAllowance'];
            }

            $breakdown[$partner['id']] = [
                'name' => $partner['name'],
                'income' => $partnerIncome,
                'bankContribution' => $bankContribution,
                'savingsContribution' => $totals['totalSavings'] / 2,
                'personalAllowance' => $totals['personalAllowance']
            ];
        }

        return [
            'partners' => $breakdown,
            'totals' => $totals
        ];
    }

    // ==================== HISTORY ====================

    /**
     * Get history for a specific item
     * @param int $itemId
     * @param int $userId
     * @param int $limit
     * @return array
     */
    public function getItemHistory($itemId, $userId, $limit = 10) {
        $stmt = $this->pdo->prepare("
            SELECT * FROM budget_history 
            WHERE item_id = ? AND user_id = ? 
            ORDER BY changed_at DESC 
            LIMIT ?
        ");
        $stmt->execute([$itemId, $userId, $limit]);
        return $stmt->fetchAll();
    }

    /**
     * Get all history for a user
     * @param int $userId
     * @param int $limit
     * @return array
     */
    public function getUserHistory($userId, $limit = 50) {
        $stmt = $this->pdo->prepare("
            SELECT h.*, i.name, i.category 
            FROM budget_history h
            JOIN budget_items i ON h.item_id = i.id
            WHERE h.user_id = ? 
            ORDER BY h.changed_at DESC 
            LIMIT ?
        ");
        $stmt->execute([$userId, $limit]);
        return $stmt->fetchAll();
    }

    /**
     * Log a change to history
     * @param int $userId
     * @param int $itemId
     * @param float $oldAmount
     * @param float $newAmount
     */
    private function logHistory($userId, $itemId, $oldAmount, $newAmount) {
        if ($oldAmount != $newAmount) {
            $stmt = $this->pdo->prepare("INSERT INTO budget_history (user_id, item_id, old_amount, new_amount) VALUES (?, ?, ?, ?)");
            $stmt->execute([$userId, $itemId, $oldAmount, $newAmount]);
            
            // Cleanup old history (3 months retention)
            $this->cleanupHistory($userId);
        }
    }

    // ==================== UNDO FUNCTIONALITY ====================

    /**
     * Get the undo stack for a user
     * @param int $userId
     * @param int $limit
     * @return array
     */
    public function getUndoStack($userId, $limit = 10) {
        $stmt = $this->pdo->prepare("
            SELECT * FROM undo_stack 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT ?
        ");
        $stmt->execute([$userId, $limit]);
        return $stmt->fetchAll();
    }

    /**
     * Log an action to the undo stack
     * @param int $userId
     * @param string $action
     * @param string $tableName
     * @param int $recordId
     * @param array|null $oldData
     * @param array|null $newData
     */
    private function logUndoAction($userId, $action, $tableName, $recordId, $oldData, $newData) {
        $stmt = $this->pdo->prepare("
            INSERT INTO undo_stack (user_id, action, table_name, record_id, old_data, new_data) 
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $userId,
            $action,
            $tableName,
            $recordId,
            $oldData ? json_encode($oldData) : null,
            $newData ? json_encode($newData) : null
        ]);
        
        // Cleanup undo stack (keep only last 10 entries)
        $this->cleanupUndoStack($userId);
    }

    /**
     * Undo the last action
     * @param int $userId
     * @return array Result of the undo operation
     */
    public function undoLastAction($userId) {
        $this->pdo->beginTransaction();

        try {
            // Get the last action
            $stmt = $this->pdo->prepare("
                SELECT * FROM undo_stack 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT 1
            ");
            $stmt->execute([$userId]);
            $lastAction = $stmt->fetch();

            if (!$lastAction) {
                throw new RuntimeException("No actions to undo");
            }

            $result = [
                'success' => false,
                'action' => $lastAction['action'],
                'table' => $lastAction['table_name'],
                'recordId' => $lastAction['record_id']
            ];

            switch ($lastAction['action']) {
                case 'insert':
                    // Undo insert = delete
                    $stmt = $this->pdo->prepare("DELETE FROM {$lastAction['table_name']} WHERE id = ?");
                    $stmt->execute([$lastAction['record_id']]);
                    $result['success'] = true;
                    break;

                case 'update':
                    // Undo update = restore old data
                    $oldData = json_decode($lastAction['old_data'], true);
                    if ($oldData) {
                        $updates = [];
                        $params = [];
                        foreach ($oldData as $key => $value) {
                            $updates[] = "$key = ?";
                            $params[] = $value;
                        }
                        $params[] = $lastAction['record_id'];

                        $query = "UPDATE {$lastAction['table_name']} SET " . implode(', ', $updates) . " WHERE id = ?";
                        $stmt = $this->pdo->prepare($query);
                        $stmt->execute($params);
                        $result['success'] = true;

                        // Log the undo as a new action
                        $this->logUndoAction($userId, 'update', $lastAction['table_name'], $lastAction['record_id'], $oldData, json_decode($lastAction['new_data'], true));
                    }
                    break;

                case 'delete':
                    // Undo delete = restore from old data
                    $oldData = json_decode($lastAction['old_data'], true);
                    if ($oldData) {
                        $columns = [];
                        $placeholders = [];
                        $params = [];

                        foreach ($oldData as $key => $value) {
                            $columns[] = $key;
                            $placeholders[] = "?";
                            $params[] = $value;
                        }

                        $query = "INSERT INTO {$lastAction['table_name']} (" . implode(', ', $columns) . ") VALUES (" . implode(', ', $placeholders) . ")";
                        $stmt = $this->pdo->prepare($query);
                        $stmt->execute($params);
                        $result['success'] = true;

                        // Log the undo as a new action
                        $this->logUndoAction($userId, 'insert', $lastAction['table_name'], $this->pdo->lastInsertId(), null, $oldData);
                    }
                    break;
            }

            // Remove the undone action from the stack
            $stmt = $this->pdo->prepare("DELETE FROM undo_stack WHERE id = ?");
            $stmt->execute([$lastAction['id']]);

            $this->pdo->commit();
            return $result;

        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    // ==================== DEFAULT ITEMS ====================

    /**
     * Initialize default budget items for a new user
     * @param int $userId
     * @return bool
     */
    public function initializeDefaultItems($userId) {
        // Check if items already exist
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM budget_items WHERE user_id = ?");
        $stmt->execute([$userId]);
        if ($stmt->fetchColumn() > 0) {
            return false; // Already initialized
        }

        $this->pdo->beginTransaction();

        try {
            // Default income items
            $incomeItems = [
                ['name' => "Alexxx's Income", 'category' => 'income', 'amount' => 0, 'sort_order' => 1],
                ['name' => "Maja's Income", 'category' => 'income', 'amount' => 0, 'sort_order' => 2],
                ['name' => "Juul's Child Support", 'category' => 'income', 'amount' => 0, 'sort_order' => 3],
                ['name' => "Elma's Child Support", 'category' => 'income', 'amount' => 0, 'sort_order' => 4],
                ['name' => "Meal Vouchers", 'category' => 'income', 'amount' => 0, 'sort_order' => 5]
            ];

            // Default fixed expenses
            $fixedExpenses = [
                ['name' => 'Mortgage', 'category' => 'fixed_expense', 'amount' => 0, 'sort_order' => 1],
                ['name' => 'Internet', 'category' => 'fixed_expense', 'amount' => 0, 'sort_order' => 2],
                ['name' => 'Phone', 'category' => 'fixed_expense', 'amount' => 0, 'sort_order' => 3],
                ['name' => 'Car Gas', 'category' => 'fixed_expense', 'amount' => 0, 'sort_order' => 4],
                ['name' => 'School', 'category' => 'fixed_expense', 'amount' => 0, 'sort_order' => 5],
                ['name' => 'Food', 'category' => 'fixed_expense', 'amount' => 0, 'sort_order' => 6],
                ['name' => 'House Keeper', 'category' => 'fixed_expense', 'amount' => 0, 'sort_order' => 7],
                ['name' => 'Energy', 'category' => 'fixed_expense', 'amount' => 0, 'sort_order' => 8],
                ['name' => 'Dog Insurance', 'category' => 'fixed_expense', 'amount' => 0, 'sort_order' => 9]
            ];

            // Default variable expenses
            $variableExpenses = [
                ['name' => 'Credit Card', 'category' => 'variable_expense', 'amount' => 0, 'sort_order' => 1]
            ];

            // Default savings
            $savings = [
                ['name' => 'Total Savings', 'category' => 'savings', 'amount' => 0, 'sort_order' => 1]
            ];

            $allItems = array_merge($incomeItems, $fixedExpenses, $variableExpenses, $savings);

            $stmt = $this->pdo->prepare("INSERT INTO budget_items (user_id, name, category, amount, is_default, sort_order) VALUES (?, ?, ?, ?, 1, ?)");

            foreach ($allItems as $item) {
                $stmt->execute([$userId, $item['name'], $item['category'], $item['amount'], $item['sort_order']]);
            }

            $this->pdo->commit();
            return true;

        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
}

// Create a singleton instance for convenience
$pdo = require __DIR__ . '/../../config/database.php';
$budgetManager = new BudgetManager($pdo);
?>
