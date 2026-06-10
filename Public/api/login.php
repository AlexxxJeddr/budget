<?php
/**
 * API Endpoint: User Login
 * POST /api/login.php
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

    if ($authManager->login($email, $password)) {
        sendResponse([
            'success' => true,
            'message' => 'Login successful',
            'userId' => $authManager->getUserId()
        ]);
    } else {
        sendError('Invalid email or password', 401);
    }

} catch (Exception $e) {
    sendError($e->getMessage(), 500);
}
?>
