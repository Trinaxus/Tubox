<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Basis-Verzeichnis für Uploads
$uploadsDir = __DIR__ . '/../uploads';

// GET: Metadaten einer Galerie abrufen
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!isset($_GET['year'], $_GET['gallery'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Fehlende Parameter']);
        exit;
    }
    
    $year = basename($_GET['year']);
    $gallery = basename($_GET['gallery']);
    
    $galleryDir = "$uploadsDir/$year/$gallery";
    $metaFile = "$galleryDir/meta.json";
    
    // Prüfen, ob es eine meta.json im Hauptverzeichnis gibt
    if (file_exists($metaFile)) {
        $meta = json_decode(file_get_contents($metaFile), true);
        echo json_encode($meta);
        exit;
    }
    
    // Wenn keine Metadaten existieren, geben wir Standardwerte zurück
    echo json_encode([
        'jahr' => $year,
        'galerie' => $gallery,
        'kategorie' => '',
        'tags' => []
    ]);
    exit;
}

// POST: Metadaten einer Galerie aktualisieren
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['year'], $data['gallery'], $data['meta'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Fehlende Parameter']);
        exit;
    }
    
    $year = basename($data['year']);
    $gallery = basename($data['gallery']);
    $meta = $data['meta'];
    
    // Verzeichnisse erstellen, falls sie nicht existieren
    $galleryDir = "$uploadsDir/$year/$gallery";
    if (!is_dir($galleryDir)) {
        if (!mkdir($galleryDir, 0777, true)) {
            http_response_code(500);
            echo json_encode(['error' => 'Konnte Verzeichnis nicht erstellen']);
            exit;
        }
    }
    
    // Metadaten im einheitlichen Format speichern (meta.json im Hauptverzeichnis)
    $metaFile = "$galleryDir/meta.json";
    if (file_put_contents($metaFile, json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT))) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Konnte Metadaten nicht speichern']);
    }
    exit;
    
    echo json_encode(['success' => true]);
    exit;
}

// Andere HTTP-Methoden werden nicht unterstützt
http_response_code(405);
echo json_encode(['error' => 'Methode nicht erlaubt']);
