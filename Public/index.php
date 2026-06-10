<?php
/**
 * Frontend Entry Point for Personal Budget Calculator
 * Serves the vanilla JavaScript frontend and handles API routing
 */

// Handle API requests
if (strpos($_SERVER['REQUEST_URI'], '/api/') === 0) {
    $apiPath = substr($_SERVER['REQUEST_URI'], 5); // Remove '/api/'
    $apiFile = __DIR__ . '/api/' . $apiPath;
    
    if (file_exists($apiFile)) {
        require $apiFile;
        exit;
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'API endpoint not found']);
        exit;
    }
}

// Handle JavaScript modules
if (strpos($_SERVER['REQUEST_URI'], '/js/') === 0) {
    $jsPath = __DIR__ . $_SERVER['REQUEST_URI'];
    
    if (file_exists($jsPath)) {
        header('Content-Type: application/javascript');
        readfile($jsPath);
        exit;
    } else {
        http_response_code(404);
        exit;
    }
}

// Handle static assets
if (strpos($_SERVER['REQUEST_URI'], '/assets/') === 0) {
    $assetPath = __DIR__ . $_SERVER['REQUEST_URI'];
    
    if (file_exists($assetPath)) {
        $mimeTypes = [
            '.css' => 'text/css',
            '.js' => 'application/javascript',
            '.json' => 'application/json',
            '.png' => 'image/png',
            '.jpg' => 'image/jpeg',
            '.jpeg' => 'image/jpeg',
            '.gif' => 'image/gif',
            '.svg' => 'image/svg+xml',
            '.woff' => 'font/woff',
            '.woff2' => 'font/woff2',
        ];
        
        $extension = strtolower(pathinfo($assetPath, PATHINFO_EXTENSION));
        $contentType = $mimeTypes['.' . $extension] ?? 'application/octet-stream';
        
        header('Content-Type: ' . $contentType);
        readfile($assetPath);
        exit;
    } else {
        http_response_code(404);
        exit;
    }
}

// Handle manifest and service worker
if ($_SERVER['REQUEST_URI'] === '/manifest.json') {
    header('Content-Type: application/json');
    readfile(__DIR__ . '/manifest.json');
    exit;
}

if ($_SERVER['REQUEST_URI'] === '/sw.js') {
    header('Content-Type: application/javascript');
    readfile(__DIR__ . '/sw.js');
    exit;
}

// Handle login page
if ($_SERVER['REQUEST_URI'] === '/login' || $_SERVER['REQUEST_URI'] === '/login/') {
    serveFrontend();
    exit;
}

// Handle logout
if ($_SERVER['REQUEST_URI'] === '/logout' || $_SERVER['REQUEST_URI'] === '/logout/') {
    require __DIR__ . '/api/logout.php';
    exit;
}

// For all other routes, serve the main app
serveFrontend();

/**
 * Serve the frontend HTML file
 */
function serveFrontend() {
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
    
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- Main Stylesheet -->
    <link rel="stylesheet" href="/assets/css/styles.css">
    
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        
        #app {
            min-height: 100vh;
        }
        
        /* Loading spinner */
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div id="app"></div>
    
    <!-- Main Application Script -->
    <script type="module">
        // Import and initialize the app
        import { initApp } from '/js/app.js';
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initApp);
        } else {
            initApp();
        }
    </script>
    
    <!-- Service Worker Registration -->
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
