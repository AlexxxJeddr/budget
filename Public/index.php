<?php
/**
 * Frontend Entry Point for Personal Budget Calculator
 * Serves the React frontend and handles routing
 */

// Handle API requests
if (strpos($_SERVER['REQUEST_URI'], '/api/') === 0) {
    // Route to API endpoints
    $apiPath = substr($_SERVER['REQUEST_URI'], 5); // Remove '/api/'
    $apiFile = __DIR__ . '/src/api/' . $apiPath;
    
    if (file_exists($apiFile)) {
        require $apiFile;
        exit;
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'API endpoint not found']);
        exit;
    }
}

// Handle login page
if ($_SERVER['REQUEST_URI'] === '/login' || $_SERVER['REQUEST_URI'] === '/login/') {
    serveFrontend('login');
    exit;
}

// Handle logout
if ($_SERVER['REQUEST_URI'] === '/logout' || $_SERVER['REQUEST_URI'] === '/logout/') {
    require __DIR__ . '/src/api/logout.php';
    exit;
}

// For all other routes, serve the main app
serveFrontend('app');

/**
 * Serve the frontend HTML file
 * @param string $page
 */
function serveFrontend($page) {
    // In a real implementation, this would serve the compiled React app
    // For now, we'll serve a simple HTML page that loads the React app
    
    $html = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Personal Budget Calculator</title>
    <meta name="description" content="A private budgeting tool for tracking monthly income, expenses, and savings">
    
    <!-- PWA Manifest -->
    <link rel="manifest" href="/manifest.json">
    
    <!-- Theme color -->
    <meta name="theme-color" content="#2563eb">
    
    <!-- Apple Touch Icon -->
    <link rel="apple-touch-icon" href="/assets/icons/icon-192x192.png">
    
    <!-- Stylesheets -->
    <link rel="stylesheet" href="/assets/css/styles.css">
    
    <!-- Preconnect to external resources -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <div id="root"></div>
    
    <!-- Load React app -->
    <script type="module" src="/assets/js/main.js"></script>
    
    <!-- PWA Service Worker Registration -->
    <script>
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(registration => {
                        console.log('ServiceWorker registration successful');
                    })
                    .catch(err => {
                        console.log('ServiceWorker registration failed: ', err);
                    });
            });
        }
    </script>
</body>
</html>
HTML;
    
    echo $html;
}
?>
