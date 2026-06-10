<?php
/**
 * BudgetManager - Handles budget item operations and calculations
 */

class BudgetManager
{
    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Get all budget items for a user
     * @param int $userId
     * @return array
     */
    public function getBudgetItems($userId)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM budget_items WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC");
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }

    /**
     * Get budget items by category
     * @param int $userId
     * @param string $category
     * @return array
     */
    public function getBudgetItemsByCategory($userId, $category)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM budget_items WHERE user_id = ? AND category = ? ORDER BY sort_order ASC, created_at ASC");
        $stmt->execute([$userId, $category]);
        return $stmt->fetchAll();
    }

    /**
     * Add a new budget item
     * @param int $userId
     * @param string $name
     * @param string $category
     * @param float $amount
     * @param bool $isDefault
     * @return int Item ID
     */
    public function addBudgetItem($userId, $name, $category, $amount = 0, $isDefault = false)
    {
        // Get next sort order
        $stmt = $this->pdo->prepare("SELECT MAX(sort_order) FROM budget_items WHERE user_id = ?");
        $stmt->execute([$userId]);
        $maxSortOrder = (int)$stmt->fetchColumn();
        $sortOrder = $maxSortOrder + 1;

        $stmt = $this->pdo->prepare("INSERT INTO budget_items (user_id, name, category, amount, is_default, sort_order) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$userId, $name, $category, $amount, $isDefault ? 1 : 0, $sortOrder]);
        
        $itemId = $this->pdo->lastInsertId();

        // Add to history
        $this->addToHistory($userId, $itemId, null, $amount);

        return $itemId;
    }

    /**
     * Update a budget item
     * @param int $itemId
     * @param int $userId
     * @param array $data
     * @return bool
     */
    public function updateBudgetItem($itemId, $userId, $data)
    {
        // Get old amount for history
        $stmt = $this->pdo->prepare("SELECT amount FROM budget_items WHERE id = ? AND user_id = ?");
        $stmt->execute([$itemId, $userId]);
        $oldItem = $stmt->fetch();
        
        if (!$oldItem) {
            return false;
        }

        $oldAmount = $oldItem['amount'];
        $newAmount = $data['amount'] ?? $oldAmount;

        // Build update query
        $updates = [];
        $params = [];
        
        if (isset($data['name'])) {
            $updates[] = "name = ?";
            $params[] = $data['name'];
        }
        if (isset($data['category'])) {
            $updates[] = "category = ?";
            $params[] = $data['category'];
        }
        if (isset($data['amount'])) {
            $updates[] = "amount = ?";
            $params[] = $data['amount'];
        }
        if (isset($data['isDefault'])) {
            $updates[] = "is_default = ?";
            $params[] = $data['isDefault'] ? 1 : 0;
        }
        if (isset($data['sortOrder'])) {
            $updates[] = "sort_order = ?";
            $params[] = $data['sortOrder'];
        }

        if (empty($updates)) {
            return false;
        }

        $params[] = $itemId;
        $params[] = $userId;

        $query = "UPDATE budget_items SET " . implode(', ', $updates) . " WHERE id = ? AND user_id = ?";
        $stmt = $this->pdo->prepare($query);
        $result = $stmt->execute($params);

        // Add to history if amount changed
        if ($result && $oldAmount != $newAmount) {
            $this->addToHistory($userId, $itemId, $oldAmount, $newAmount);
        }

        return $result;
    }

    /**
     * Delete a budget item
     * @param int $itemId
     * @param int $userId
     * @return bool
     */
    public function deleteBudgetItem($itemId, $userId)
    {
        // Get item for history
        $stmt = $this->pdo->prepare("SELECT amount FROM budget_items WHERE id = ? AND user_id = ?");
        $stmt->execute([$itemId, $userId]);
        $item = $stmt->fetch();

        $stmt = $this->pdo->prepare("DELETE FROM budget_items WHERE id = ? AND user_id = ?");
        $result = $stmt->execute([$itemId, $userId]);

        // Add to history
        if ($result && $item) {
            $this->addToHistory($userId, $itemId, $item['amount'], 0);
        }

        return $result;
    }

    /**
     * Calculate totals for a user
     * @param int $userId
     * @return array
     */
    public function calculateTotals($userId)
    {
        $totals = [
            'income' => 0,
            'fixed_expense' => 0,
            'variable_expense' => 0,
            'savings' => 0
        ];

        $stmt = $this->pdo->prepare("SELECT category, amount FROM budget_items WHERE user_id = ?");
        $stmt->execute([$userId]);
        $items = $stmt->fetchAll();

        foreach ($items as $item) {
            $category = $item['category'];
            $amount = (float)$item['amount'];
            
            if (isset($totals[$category])) {
                $totals[$category] += $amount;
            }
        }

        $totals['remaining'] = $totals['income'] - $totals['fixed_expense'] - $totals['variable_expense'];

        return $totals;
    }

    /**
     * Calculate partner breakdown
     * @param int $userId
     * @return array
     */
    public function calculatePartnerBreakdown($userId)
    {
        $partners = $this->getPartnersForBreakdown($userId);
        $totals = $this->calculateTotals($userId);

        $savingsPerPartner = $totals['savings'] / 2;
        $personalAllowance = ($totals['remaining'] - $totals['savings']) / 2;

        $breakdown = [];
        foreach ($partners as $partner) {
            $partnerName = $partner['name'];
            
            // Get partner's income
            $partnerIncome = $this->getPartnerIncome($userId, $partnerName);
            
            $bankContribution = $partnerIncome - $savingsPerPartner - $personalAllowance;
            
            // Special case for meal vouchers
            $mealVouchers = $this->getMealVouchersAmount($userId);
            if (strtolower($partnerName) === 'alexxx') {
                $bankContribution = $partnerIncome - $savingsPerPartner - $personalAllowance - $mealVouchers;
            }

            $breakdown[] = [
                'name' => $partnerName,
                'income' => $partnerIncome,
                'bankContribution' => $bankContribution,
                'savings' => $savingsPerPartner,
                'personalAllowance' => $personalAllowance
            ];
        }

        return ['partners' => $breakdown];
    }

    /**
     * Get partners for breakdown (from partners table or default)
     * @param int $userId
     * @return array
     */
    private function getPartnersForBreakdown($userId)
    {
        $stmt = $this->pdo->prepare("SELECT name FROM partners WHERE user_id = ? ORDER BY created_at ASC");
        $stmt->execute([$userId]);
        $partners = $stmt->fetchAll();

        if (empty($partners)) {
            // Default partners
            return [['name' => 'Alexxx'], ['name' => 'Maja']];
        }

        return $partners;
    }

    /**
     * Get partner's income
     * @param int $userId
     * @param string $partnerName
     * @return float
     */
    private function getPartnerIncome($userId, $partnerName)
    {
        $stmt = $this->pdo->prepare("SELECT amount FROM budget_items WHERE user_id = ? AND category = 'income' AND name LIKE ?");
        $stmt->execute([$userId, "%{$partnerName}%"]);
        $items = $stmt->fetchAll();

        $total = 0;
        foreach ($items as $item) {
            $total += (float)$item['amount'];
        }

        return $total;
    }

    /**
     * Get meal vouchers amount
     * @param int $userId
     * @return float
     */
    private function getMealVouchersAmount($userId)
    {
        $stmt = $this->pdo->prepare("SELECT amount FROM budget_items WHERE user_id = ? AND name LIKE ?");
        $stmt->execute([$userId, "%Meal Voucher%"]);
        $item = $stmt->fetch();

        return $item ? (float)$item['amount'] : 0;
    }

    /**
     * Add entry to budget history
     * @param int $userId
     * @param int $itemId
     * @param float|null $oldAmount
     * @param float $newAmount
     */
    private function addToHistory($userId, $itemId, $oldAmount, $newAmount)
    {
        $stmt = $this->pdo->prepare("INSERT INTO budget_history (user_id, item_id, old_amount, new_amount) VALUES (?, ?, ?, ?)");
        $stmt->execute([$userId, $itemId, $oldAmount, $newAmount]);
    }

    /**
     * Get history for a specific item
     * @param int $itemId
     * @param int $userId
     * @param int $limit
     * @return array
     */
    public function getItemHistory($itemId, $userId, $limit = 50)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM budget_history WHERE item_id = ? AND user_id = ? ORDER BY changed_at DESC LIMIT ?");
        $stmt->execute([$itemId, $userId, $limit]);
        return $stmt->fetchAll();
    }

    /**
     * Get history for a user
     * @param int $userId
     * @param int $limit
     * @return array
     */
    public function getUserHistory($userId, $limit = 50)
    {
        $stmt = $this->pdo->prepare("SELECT h.*, i.name, i.category FROM budget_history h JOIN budget_items i ON h.item_id = i.id WHERE h.user_id = ? ORDER BY h.changed_at DESC LIMIT ?");
        $stmt->execute([$userId, $limit]);
        return $stmt->fetchAll();
    }

    /**
     * Initialize default budget items for a new user
     * @param int $userId
     */
    public function initializeDefaultItems($userId)
    {
        $defaultItems = [
            ['name' => "Alexxx's Income", 'category' => 'income', 'amount' => 0, 'isDefault' => true],
            ['name' => "Maja's Income", 'category' => 'income', 'amount' => 0, 'isDefault' => true],
            ['name' => 'Meal Vouchers', 'category' => 'income', 'amount' => 0, 'isDefault' => false],
            ['name' => 'Rent', 'category' => 'fixed_expense', 'amount' => 0, 'isDefault' => true],
            ['name' => 'Utilities', 'category' => 'fixed_expense', 'amount' => 0, 'isDefault' => true],
            ['name' => 'Internet', 'category' => 'fixed_expense', 'amount' => 0, 'isDefault' => true],
            ['name' => 'Insurance', 'category' => 'fixed_expense', 'amount' => 0, 'isDefault' => true],
            ['name' => 'Groceries', 'category' => 'variable_expense', 'amount' => 0, 'isDefault' => true],
            ['name' => 'Transportation', 'category' => 'variable_expense', 'amount' => 0, 'isDefault' => true],
            ['name' => 'Entertainment', 'category' => 'variable_expense', 'amount' => 0, 'isDefault' => true],
            ['name' => 'Savings', 'category' => 'savings', 'amount' => 0, 'isDefault' => true],
        ];

        foreach ($defaultItems as $index => $item) {
            $this->addBudgetItem(
                $userId,
                $item['name'],
                $item['category'],
                $item['amount'],
                $item['isDefault']
            );
        }
    }

    /**
     * Undo the last action from the undo stack
     * @param int $userId
     * @return array
     */
    public function undoLastAction($userId)
    {
        // Get the last undo entry
        $stmt = $this->pdo->prepare("SELECT * FROM undo_stack WHERE user_id = ? ORDER BY created_at DESC LIMIT 1");
        $stmt->execute([$userId]);
        $undoEntry = $stmt->fetch();

        if (!$undoEntry) {
            return ['success' => false, 'error' => 'No actions to undo'];
        }

        $action = $undoEntry['action'];
        $tableName = $undoEntry['table_name'];
        $recordId = $undoEntry['record_id'];
        $oldData = json_decode($undoEntry['old_data'], true);
        $newData = json_decode($undoEntry['new_data'], true);

        try {
            $this->pdo->beginTransaction();

            switch ($action) {
                case 'insert':
                    // Delete the inserted record
                    $stmt = $this->pdo->prepare("DELETE FROM {$tableName} WHERE id = ? AND user_id = ?");
                    $stmt->execute([$recordId, $userId]);
                    break;

                case 'update':
                    // Restore old data
                    $updates = [];
                    $params = [];
                    foreach ($oldData as $key => $value) {
                        $updates[] = "{$key} = ?";
                        $params[] = $value;
                    }
                    $params[] = $recordId;
                    $params[] = $userId;

                    $query = "UPDATE {$tableName} SET " . implode(', ', $updates) . " WHERE id = ? AND user_id = ?";
                    $stmt = $this->pdo->prepare($query);
                    $stmt->execute($params);
                    break;

                case 'delete':
                    // Re-insert the deleted record
                    $columns = [];
                    $placeholders = [];
                    $insertParams = [];
                    
                    foreach ($oldData as $key => $value) {
                        $columns[] = $key;
                        $placeholders[] = '?';
                        $insertParams[] = $value;
                    }
                    
                    $query = "INSERT INTO {$tableName} (" . implode(', ', $columns) . ") VALUES (" . implode(', ', $placeholders) . ")";
                    $stmt = $this->pdo->prepare($query);
                    $stmt->execute($insertParams);
                    break;
            }

            // Delete the undo entry
            $stmt = $this->pdo->prepare("DELETE FROM undo_stack WHERE id = ?");
            $stmt->execute([$undoEntry['id']]);

            $this->pdo->commit();

            return [
                'success' => true,
                'action' => $action,
                'table' => $tableName,
                'recordId' => $recordId
            ];

        } catch (Exception $e) {
            $this->pdo->rollBack();
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
}
