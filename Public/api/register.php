<?php
/**
 * API Endpoint: User Registration (Admin only)
 * POST /api/register.php
 */

require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', 405);
}

try {
    $input = getJsonInput();

    if (!isset($input['email']) || !isset($input['password'])) {
        sendError('Email and password are required');
    }

    $email = $input['email'];
    $password = $input['password'];

    // For security, only allow registration if no users exist (first user)
    $stmt = $pdo->query("SELECT COUNT(*) FROM users");
    $userCount = (int)$stmt->fetchColumn();

    if ($userCount > 0) {
        sendError('Registration is disabled. Please contact administrator.', 403);
    }

    $authManager = new AuthManager($pdo);
    $userId = $authManager->register($email, $password);

    // Initialize default data for new user
    require_once __DIR__ . '/../Models/Partner.php';
    require_once __DIR__ . '/../Budget/BudgetManager.php';

    $partnerModel = new Partner($pdo);
    $budgetManager = new BudgetManager($pdo);

    $partnerModel->initializeDefaultPartners($userId);
    $budgetManager->initializeDefaultItems($userId);

    sendResponse([
        'success' => true,
        'message' => 'Registration successful',
        'userId' => $userId
    ]);

} catch (Exception $e) {
    sendError($e->getMessage(), 500);
}
?>
