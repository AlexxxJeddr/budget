<?php
/**
 * Frontend Entry Point for Personal Budget Calculator
 * Serves the React frontend and handles API routing
 */

// Handle API requests
if (strpos($_SERVER['REQUEST_URI'], '/api/') === 0) {
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
    require __DIR__ . '/src/api/logout.php';
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
    
    <!-- Stylesheets -->
    <link rel="stylesheet" href="/assets/css/styles.css">
    
    <!-- Preconnect to external resources -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- Vite JS for development -->
    <script type="module">
      import { createRoot } from 'https://esm.sh/react-dom@18/client';
      import { StrictMode } from 'https://esm.sh/react@18';
      import { BrowserRouter, Routes, Route, Navigate } from 'https://esm.sh/react-router-dom@6';
      
      // Import App component
      import { App } from './src/App';
      
      // Mount the app
      const root = createRoot(document.getElementById('root'));
      root.render(
        <StrictMode>
          <App />
        </StrictMode>
      );
    </script>
</head>
<body>
    <div id="root"></div>
    
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
