<?php
/**
 * Partner Model - Manages partner data for Personal Budget Calculator
 * Supports 1-2 partners with configurable names
 */

require_once __DIR__ . '/../../config/database.php';

class Partner {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    /**
     * Get all partners for a user
     * @param int $userId
     * @return array Array of partner data
     */
    public function getPartners($userId) {
        $stmt = $this->pdo->prepare("SELECT * FROM partners WHERE user_id = ? ORDER BY created_at");
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }

    /**
     * Get a specific partner by ID
     * @param int $id
     * @param int $userId (for ownership verification)
     * @return array|null Partner data or null if not found
     */
    public function getPartner($id, $userId) {
        $stmt = $this->pdo->prepare("SELECT * FROM partners WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $userId]);
        return $stmt->fetch();
    }

    /**
     * Add a new partner
     * @param int $userId
     * @param string $name
     * @return int|false Partner ID or false on failure
     */
    public function addPartner($userId, $name) {
        // Validate name
        if (empty(trim($name))) {
            throw new InvalidArgumentException("Partner name cannot be empty");
        }

        if (strlen($name) > 80) {
            throw new InvalidArgumentException("Partner name must be 80 characters or less");
        }

        // Check if user already has maximum partners (default 2)
        $maxPartners = $this->getMaxPartners($userId);
        $currentCount = $this->countPartners($userId);

        if ($currentCount >= $maxPartners) {
            throw new RuntimeException("Maximum number of partners reached (" . $maxPartners . ")");
        }

        $stmt = $this->pdo->prepare("INSERT INTO partners (user_id, name) VALUES (?, ?)");
        $stmt->execute([$userId, trim($name)]);

        return $this->pdo->lastInsertId();
    }

    /**
     * Update a partner's name
     * @param int $id
     * @param int $userId
     * @param string $newName
     * @return bool True on success, false on failure
     */
    public function updatePartner($id, $userId, $newName) {
        // Validate name
        if (empty(trim($newName))) {
            throw new InvalidArgumentException("Partner name cannot be empty");
        }

        if (strlen($newName) > 80) {
            throw new InvalidArgumentException("Partner name must be 80 characters or less");
        }

        $stmt = $this->pdo->prepare("UPDATE partners SET name = ? WHERE id = ? AND user_id = ?");
        return $stmt->execute([trim($newName), $id, $userId]);
    }

    /**
     * Delete a partner
     * @param int $id
     * @param int $userId
     * @return bool True on success, false on failure
     */
    public function deletePartner($id, $userId) {
        // Check if this is the last partner (must have at least 1)
        $currentCount = $this->countPartners($userId);
        if ($currentCount <= 1) {
            throw new RuntimeException("Cannot delete the last partner");
        }

        $stmt = $this->pdo->prepare("DELETE FROM partners WHERE id = ? AND user_id = ?");
        return $stmt->execute([$id, $userId]);
    }

    /**
     * Count the number of partners for a user
     * @param int $userId
     * @return int
     */
    public function countPartners($userId) {
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM partners WHERE user_id = ?");
        $stmt->execute([$userId]);
        return (int)$stmt->fetchColumn();
    }

    /**
     * Get the maximum number of partners allowed for a user
     * @param int $userId
     * @return int
     */
    public function getMaxPartners($userId) {
        $stmt = $this->pdo->prepare("SELECT key_value FROM settings WHERE user_id = ? AND key_name = 'max_partners'");
        $stmt->execute([$userId]);
        $result = $stmt->fetch();
        return $result ? (int)$result['key_value'] : 2; // Default to 2
    }

    /**
     * Set the maximum number of partners for a user
     * @param int $userId
     * @param int $max (1 or 2)
     * @return bool
     */
    public function setMaxPartners($userId, $max) {
        if ($max < 1 || $max > 2) {
            throw new InvalidArgumentException("Maximum partners must be 1 or 2");
        }

        // Check if we need to insert or update
        $stmt = $this->pdo->prepare("SELECT id FROM settings WHERE user_id = ? AND key_name = 'max_partners'");
        $stmt->execute([$userId]);

        if ($stmt->fetch()) {
            $stmt = $this->pdo->prepare("UPDATE settings SET key_value = ? WHERE user_id = ? AND key_name = 'max_partners'");
        } else {
            $stmt = $this->pdo->prepare("INSERT INTO settings (user_id, key_name, key_value) VALUES (?, 'max_partners', ?)");
        }

        return $stmt->execute([$max, $userId]);
    }

    /**
     * Initialize default partners for a new user
     * @param int $userId
     * @return bool
     */
    public function initializeDefaultPartners($userId) {
        // Check if partners already exist
        $count = $this->countPartners($userId);
        if ($count > 0) {
            return false; // Already initialized
        }

        // Add default partners
        $this->pdo->beginTransaction();

        try {
            $stmt = $this->pdo->prepare("INSERT INTO partners (user_id, name) VALUES (?, ?)");
            $stmt->execute([$userId, 'Alexxx']);
            $stmt->execute([$userId, 'Maja']);
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
$partnerModel = new Partner($pdo);
?>
