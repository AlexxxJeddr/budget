<?php
/**
 * Partner Model - Handles partner data operations
 */

class Partner
{
    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Get all partners for a user
     * @param int $userId
     * @return array
     */
    public function getPartners($userId)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM partners WHERE user_id = ? ORDER BY created_at ASC");
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }

    /**
     * Add a new partner
     * @param int $userId
     * @param string $name
     * @return int Partner ID
     */
    public function addPartner($userId, $name)
    {
        $stmt = $this->pdo->prepare("INSERT INTO partners (user_id, name) VALUES (?, ?)");
        $stmt->execute([$userId, $name]);
        return $this->pdo->lastInsertId();
    }

    /**
     * Update a partner
     * @param int $partnerId
     * @param int $userId
     * @param string $name
     * @return bool
     */
    public function updatePartner($partnerId, $userId, $name)
    {
        $stmt = $this->pdo->prepare("UPDATE partners SET name = ? WHERE id = ? AND user_id = ?");
        return $stmt->execute([$name, $partnerId, $userId]);
    }

    /**
     * Delete a partner
     * @param int $partnerId
     * @param int $userId
     * @return bool
     */
    public function deletePartner($partnerId, $userId)
    {
        $stmt = $this->pdo->prepare("DELETE FROM partners WHERE id = ? AND user_id = ?");
        return $stmt->execute([$partnerId, $userId]);
    }

    /**
     * Initialize default partners for a new user
     * @param int $userId
     */
    public function initializeDefaultPartners($userId)
    {
        // Add default partners
        $defaultPartners = ['Alexxx', 'Maja'];
        foreach ($defaultPartners as $name) {
            $stmt = $this->pdo->prepare("INSERT INTO partners (user_id, name) VALUES (?, ?)");
            $stmt->execute([$userId, $name]);
        }
    }
}
