<?php
/**
 * API Endpoint: Server-Sent Events for Real-time Sync
 * GET /api/sync_events.php - Subscribe to real-time updates
 */

header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('Connection: keep-alive');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Cache-Control');

// Start session for authentication
session_start();

require_once __DIR__ . '/../../config/database.php';

// Check authentication
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo "data: {\"error\": \"Unauthorized\"}\n\n";
    flush();
    exit;
}

$userId = $_SESSION['user_id'];

// Get the last event ID from the client
$lastEventId = isset($_SERVER['HTTP_LAST_EVENT_ID']) ? (int)$_SERVER['HTTP_LAST_EVENT_ID'] : 0;

// Function to send an event
function sendEvent($id, $data) {
    echo "id: $id\n";
    echo "data: " . json_encode($data) . "\n\n";
    flush();
}

// Function to check for changes
function checkForChanges($pdo, $userId, $lastEventId) {
    // Check budget_items table for changes
    $stmt = $pdo->prepare("
        SELECT id, name, category, amount, updated_at
        FROM budget_items
        WHERE user_id = ? AND updated_at > (SELECT COALESCE(created_at, '1970-01-01') FROM undo_stack WHERE id = ?)
        ORDER BY updated_at DESC
        LIMIT 10
    ");
    $stmt->execute([$userId, $lastEventId]);
    $items = $stmt->fetchAll();

    $events = [];
    foreach ($items as $item) {
        $events[] = [
            'type' => 'update',
            'table' => 'budget_items',
            'record' => $item,
            'timestamp' => $item['updated_at']
        ];
    }

    // Check partners table for changes
    $stmt = $pdo->prepare("
        SELECT id, name, updated_at
        FROM partners
        WHERE user_id = ? AND updated_at > (SELECT COALESCE(created_at, '1970-01-01') FROM undo_stack WHERE id = ?)
        ORDER BY updated_at DESC
        LIMIT 10
    ");
    $stmt->execute([$userId, $lastEventId]);
    $partners = $stmt->fetchAll();

    foreach ($partners as $partner) {
        $events[] = [
            'type' => 'update',
            'table' => 'partners',
            'record' => $partner,
            'timestamp' => $partner['updated_at']
        ];
    }

    return $events;
}

// Main event loop
$lastSentId = $lastEventId;

try {
    while (true) {
        // Check for new changes
        $events = checkForChanges($pdo, $userId, $lastSentId);

        foreach ($events as $event) {
            $lastSentId++;
            sendEvent($lastSentId, $event);
        }

        // If no events, send a heartbeat every 30 seconds
        if (empty($events)) {
            // Check if connection is still alive
            if (connection_aborted()) {
                break;
            }

            // Send heartbeat
            echo "data: {\"type\": \"heartbeat\"}\n\n";
            flush();
        }

        // Sleep for a short time to prevent high CPU usage
        sleep(1);

        // Check if connection is still alive
        if (connection_aborted()) {
            break;
        }
    }
} catch (Exception $e) {
    // Connection error
    echo "data: {\"error\": \"Connection error\"}\n\n";
    flush();
}

// Close connection
$pdo = null;
?>
