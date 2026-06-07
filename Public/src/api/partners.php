<?php
/**
 * API Endpoint: Partner Management
 * GET /api/partners.php - List all partners
 * POST /api/partners.php - Add new partner
 * PUT /api/partners.php?id=X - Update partner
 * DELETE /api/partners.php?id=X - Delete partner
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/../Models/Partner.php';

$userId = requireAuth();
$partnerModel = new Partner($pdo);

try {
    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            // List all partners
            $partners = $partnerModel->getPartners($userId);
            sendResponse(['success' => true, 'partners' => $partners]);
            break;

        case 'POST':
            // Add new partner
            $input = getJsonInput();

            if (!isset($input['name'])) {
                sendError('Partner name is required');
            }

            $partnerId = $partnerModel->addPartner($userId, $input['name']);
            
            sendResponse([
                'success' => true,
                'partnerId' => $partnerId,
                'message' => 'Partner added successfully'
            ]);
            break;

        case 'PUT':
            // Update partner
            if (!isset($_GET['id'])) {
                sendError('Partner ID is required');
            }

            $partnerId = (int)$_GET['id'];
            $input = getJsonInput();

            if (!isset($input['name'])) {
                sendError('Partner name is required');
            }

            $result = $partnerModel->updatePartner($partnerId, $userId, $input['name']);
            
            if ($result) {
                sendResponse(['success' => true, 'message' => 'Partner updated successfully']);
            } else {
                sendError('Failed to update partner');
            }
            break;

        case 'DELETE':
            // Delete partner
            if (!isset($_GET['id'])) {
                sendError('Partner ID is required');
            }

            $partnerId = (int)$_GET['id'];
            $result = $partnerModel->deletePartner($partnerId, $userId);
            
            if ($result) {
                sendResponse(['success' => true, 'message' => 'Partner deleted successfully']);
            } else {
                sendError('Failed to delete partner');
            }
            break;

        default:
            sendError('Method not allowed', 405);
    }

} catch (Exception $e) {
    sendError($e->getMessage(), 500);
}
?>
