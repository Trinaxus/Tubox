<?php
// Konfiguration
$allowedOrigins = [
    'https://tubox.de',
    'https://www.tubox.de',
    'https://tubox-de-next.vercel.app'
];

// CORS-Header setzen
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type");
}

// OPTIONS-Anfragen für CORS-Preflight behandeln
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Verzeichnis für Blog-Dateien
$blogDir = __DIR__;

// Lese die JSON-Daten aus dem Request-Body
$requestData = json_decode(file_get_contents('php://input'), true);

if (!$requestData) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON data']);
    exit;
}

// Protokolliere Anfragen für Debugging
file_put_contents($blogDir . '/api-log.txt', date('Y-m-d H:i:s') . ' - ' . json_encode($_SERVER) . ' - ' . file_get_contents('php://input') . "\n", FILE_APPEND);

$action = $requestData['action'] ?? '';

switch ($action) {
    case 'update':
        updateBlogPost($requestData, $blogDir);
        break;
    case 'update_post':
        updatePost($requestData, $blogDir);
        break;
    case 'update_index':
        updateIndex($requestData, $blogDir);
        break;
    case 'delete_post':
        deletePost($requestData, $blogDir);
        break;
    default:
        http_response_code(400);
        echo json_encode(['error' => 'Unknown action']);
        exit;
}

// Funktion zum Aktualisieren eines Blog-Posts
function updatePost($data, $blogDir) {
    if (!isset($data['slug']) || !isset($data['post'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing slug or post data']);
        exit;
    }

    $slug = $data['slug'];
    $post = $data['post'];
    
    // Speichere den Blog-Post
    $postFilePath = $blogDir . '/' . $slug . '.json';
    
    if (!file_put_contents($postFilePath, json_encode($post, JSON_PRETTY_PRINT))) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to write blog post file']);
        exit;
    }
    
    echo json_encode(['success' => true, 'message' => 'Blog post updated successfully']);
}

// Funktion zum Aktualisieren des Index
function updateIndex($data, $blogDir) {
    if (!isset($data['index'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing index data']);
        exit;
    }
    
    $index = $data['index'];
    $indexFilePath = $blogDir . '/index.json';
    
    if (!file_put_contents($indexFilePath, json_encode($index, JSON_PRETTY_PRINT))) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to write index file']);
        exit;
    }
    
    echo json_encode(['success' => true, 'message' => 'Index updated successfully']);
}

// Funktion zum Aktualisieren eines Blog-Posts mit Slug-Änderung und Index-Update
function updateBlogPost($data, $blogDir) {
    if (!isset($data['oldSlug']) || !isset($data['newSlug']) || !isset($data['data'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required data (oldSlug, newSlug, or data)']);
        exit;
    }

    $oldSlug = $data['oldSlug'];
    $newSlug = $data['newSlug'];
    $postData = $data['data'];
    
    // Speichere den Blog-Post mit dem neuen Slug
    $newFilePath = $blogDir . '/' . $newSlug . '.json';
    
    if (!file_put_contents($newFilePath, json_encode($postData, JSON_PRETTY_PRINT))) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to write blog post file']);
        exit;
    }
    
    // Wenn der Slug geändert wurde, lösche die alte Datei
    if ($oldSlug !== $newSlug) {
        $oldFilePath = $blogDir . '/' . $oldSlug . '.json';
        if (file_exists($oldFilePath)) {
            if (!unlink($oldFilePath)) {
                // Nur eine Warnung, kein Fehler
                error_log("Failed to delete old blog post file: $oldFilePath");
            }
        }
    }
    
    // Aktualisiere den Index
    $indexFilePath = $blogDir . '/index.json';
    if (file_exists($indexFilePath)) {
        $indexContent = file_get_contents($indexFilePath);
        $indexData = json_decode($indexContent, true);
        
        // Bestimme das Format des Index
        $postsArray = [];
        if (is_array($indexData)) {
            // Neues Format: direktes Array
            $postsArray = $indexData;
            $isArray = true;
        } elseif (isset($indexData['posts']) && is_array($indexData['posts'])) {
            // Altes Format: Objekt mit posts-Array
            $postsArray = $indexData['posts'];
            $isArray = false;
        } else {
            // Unbekanntes Format, erstelle neues Array
            $postsArray = [];
            $isArray = true;
        }
        
        // Debug-Ausgabe für die ID
        file_put_contents($blogDir . '/id-debug.txt', date('Y-m-d H:i:s') . ' - Post ID: ' . print_r($postData['id'], true) . ' - Type: ' . gettype($postData['id']) . "\n", FILE_APPEND);
        
        // Stelle sicher, dass die ID als Zahl behandelt wird
        $postId = $postData['id'];
        if (is_string($postId) && is_numeric($postId)) {
            $postId = (int)$postId; // Konvertiere zu Integer, wenn es ein numerischer String ist
        }
        
        // Finde den Eintrag mit der gleichen ID
        $found = false;
        foreach ($postsArray as $key => $post) {
            // Konvertiere die Post-ID zu Integer für den Vergleich, falls sie ein String ist
            $currentPostId = $post['id'];
            if (is_string($currentPostId) && is_numeric($currentPostId)) {
                $currentPostId = (int)$currentPostId;
            }
            
            // Vergleiche die IDs
            if ($currentPostId === $postId) {
                // Aktualisiere den bestehenden Eintrag
                $postsArray[$key] = [
                    'id' => $postId, // Verwende die konvertierte ID
                    'slug' => $newSlug,
                    'title' => $postData['title'],
                    'isDraft' => $postData['isDraft'],
                    'updatedAt' => $postData['updatedAt'],
                    'category' => $postData['category'],
                    // Tags als Semikolon-getrennter String für die Übersicht
                    'tags' => is_array($postData['tags']) ? implode(';', $postData['tags']) : $postData['tags']
                ];
                $found = true;
                file_put_contents($blogDir . '/id-debug.txt', date('Y-m-d H:i:s') . ' - Found and updated existing post with ID: ' . $postId . "\n", FILE_APPEND);
                break;
            }
        }
        
        // Wenn kein Eintrag gefunden wurde, füge einen neuen hinzu
        if (!$found) {
            $postsArray[] = [
                'id' => $postId, // Verwende die konvertierte ID
                'slug' => $newSlug,
                'title' => $postData['title'],
                'isDraft' => $postData['isDraft'],
                'updatedAt' => $postData['updatedAt'],
                'category' => $postData['category'],
                // Tags als Semikolon-getrennter String für die Übersicht
                'tags' => is_array($postData['tags']) ? implode(';', $postData['tags']) : $postData['tags']
            ];
            file_put_contents($blogDir . '/id-debug.txt', date('Y-m-d H:i:s') . ' - Added new post with ID: ' . $postId . "\n", FILE_APPEND);
        }
        
        // Speichere den aktualisierten Index
        $dataToWrite = $isArray ? $postsArray : ['posts' => $postsArray];
        if (!file_put_contents($indexFilePath, json_encode($dataToWrite, JSON_PRETTY_PRINT))) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update index file']);
            exit;
        }
    }
    
    echo json_encode(['success' => true, 'message' => 'Blog post updated successfully', 'slug' => $newSlug]);
}

// Funktion zum Löschen eines Blog-Posts
function deletePost($data, $blogDir) {
    if (!isset($data['slug'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing slug']);
        exit;
    }
    
    $slug = $data['slug'];
    $postFilePath = $blogDir . '/' . $slug . '.json';
    
    // Protokolliere den Löschvorgang
    file_put_contents($blogDir . '/delete-log.txt', date('Y-m-d H:i:s') . ' - Deleting: ' . $slug . "\n", FILE_APPEND);
    
    // Lösche die Blog-Post-Datei
    if (file_exists($postFilePath)) {
        if (!unlink($postFilePath)) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to delete blog post file']);
            exit;
        }
    } else {
        file_put_contents($blogDir . '/delete-log.txt', date('Y-m-d H:i:s') . ' - File not found: ' . $postFilePath . "\n", FILE_APPEND);
    }
    
    // Aktualisiere den Index
    $indexFilePath = $blogDir . '/index.json';
    if (file_exists($indexFilePath)) {
        $indexContent = file_get_contents($indexFilePath);
        $indexData = json_decode($indexContent, true);
        
        // Bestimme das Format des Index
        $postsArray = [];
        $isArray = true;
        
        if (is_array($indexData)) {
            // Neues Format: direktes Array
            $postsArray = $indexData;
        } elseif (isset($indexData['posts']) && is_array($indexData['posts'])) {
            // Altes Format: Objekt mit posts-Array
            $postsArray = $indexData['posts'];
            $isArray = false;
        } else {
            // Unbekanntes Format, erstelle neues Array
            $postsArray = [];
        }
        
        // Entferne den Eintrag mit dem angegebenen Slug
        $newPostsArray = [];
        $removed = false;
        
        foreach ($postsArray as $post) {
            if ($post['slug'] !== $slug) {
                $newPostsArray[] = $post;
            } else {
                $removed = true;
                file_put_contents($blogDir . '/delete-log.txt', date('Y-m-d H:i:s') . ' - Removed from index: ' . json_encode($post) . "\n", FILE_APPEND);
            }
        }
        
        // Speichere den aktualisierten Index
        $dataToWrite = $isArray ? $newPostsArray : ['posts' => $newPostsArray];
        if (!file_put_contents($indexFilePath, json_encode($dataToWrite, JSON_PRETTY_PRINT))) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update index file']);
            exit;
        }
        
        file_put_contents($blogDir . '/delete-log.txt', date('Y-m-d H:i:s') . ' - Index updated, removed: ' . ($removed ? 'yes' : 'no') . "\n", FILE_APPEND);
    } else {
        file_put_contents($blogDir . '/delete-log.txt', date('Y-m-d H:i:s') . ' - Index file not found: ' . $indexFilePath . "\n", FILE_APPEND);
    }
    
    echo json_encode(['success' => true, 'message' => 'Blog post deleted successfully', 'slug' => $slug]);
}
?>
