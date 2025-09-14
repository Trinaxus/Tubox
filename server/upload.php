<?php
// Fehlerausgabe für Produktion deaktivieren (optional auskommentieren)
// ini_set('display_errors', 1);
// ini_set('display_startup_errors', 1);
// error_reporting(E_ALL);

// CORS erlauben (für Entwicklung, für Produktion ggf. Domain anpassen)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: X-API-TOKEN, Content-Type');

// Preflight-Request (OPTIONS) behandeln
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// API-Upload-Endpunkt für externen Server
header('Content-Type: application/json');
$config = require(__DIR__ . '/config.php');

// Authentifizierung (per Token)
$token = $_SERVER['HTTP_X_API_TOKEN'] ?? '';
$validToken = getenv('SERVER_API_TOKEN') ?: (getenv('WEBDISK_API_TOKEN') ?: '0000');
if ($token !== $validToken) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// Upload-Limits erhöhen (optional, kann auch am Anfang der Datei stehen)
ini_set('max_file_uploads', '500');
ini_set('post_max_size', '500M');
ini_set('upload_max_filesize', '50M');
ini_set('memory_limit', '512M');
ini_set('max_execution_time', '300');
ini_set('max_input_time', '300');

// Parameter prüfen
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No file uploaded']);
    exit;
}

$year = preg_replace('/[^0-9]/', '', $_POST['year'] ?? date('Y'));
$gallery = preg_replace('/[^a-zA-Z0-9äöüÄÖÜß@_\-\.\s]/', '', $_POST['gallery'] ?? 'default');
$category = preg_replace('/[^a-zA-Z0-9äöüÄÖÜß@_\-\.\s]/', '', $_POST['kategorie'] ?? 'default');

// Prüfen, ob es sich um eine Video-Galerie handelt
$isVideoGallery = stripos($gallery, 'VIDEOS') !== false;

// Debug-Ausgabe
file_put_contents('upload_debug.log', "Verarbeite Upload für Galerie: $gallery (Video-Galerie: " . ($isVideoGallery ? 'ja' : 'nein') . ")\n", FILE_APPEND);

// Basis-Upload-Verzeichnis erstellen
$uploadDir = __DIR__ . "/uploads/$year/$gallery/";
if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0777, true)) {
        file_put_contents('upload_debug.log', "Fehler beim Erstellen des Upload-Verzeichnisses: $uploadDir\n", FILE_APPEND);
        die(json_encode(['success' => false, 'error' => 'Konnte das Upload-Verzeichnis nicht erstellen']));
    }
    file_put_contents('upload_debug.log', "Verzeichnis erstellt: $uploadDir\n", FILE_APPEND);
}

// Video-Thumbnails-Verzeichnis erstellen, wenn es sich um eine Video-Galerie handelt
$thumbsDir = $uploadDir . 'video_thumbs/';
if ($isVideoGallery) {
    if (!is_dir($thumbsDir) && !mkdir($thumbsDir, 0777, true)) {
        file_put_contents('upload_debug.log', "Fehler beim Erstellen des Thumbnail-Verzeichnisses: $thumbsDir\n", FILE_APPEND);
    } else {
        file_put_contents('upload_debug.log', "Thumbnail-Verzeichnis bereit: $thumbsDir\n", FILE_APPEND);
        // Stelle sicher, dass die Berechtigungen korrekt sind
        chmod($thumbsDir, 0777);
    }
}

$filename = basename($_FILES['file']['name']);
$target = $uploadDir . $filename;

// Prüfen, ob es sich um ein Video handelt, bevor die Datei verschoben wird
$isVideo = strpos($_FILES['file']['type'], 'video/') === 0;
$isVideoFile = $isVideo || in_array(strtolower(pathinfo($filename, PATHINFO_EXTENSION)), ['mp4', 'mov', 'webm', 'avi', 'mkv']);

if (move_uploaded_file($_FILES['file']['tmp_name'], $target)) {
    // Debug-Ausgabe
    file_put_contents('upload_debug.log', "Datei erfolgreich hochgeladen: $target\n", FILE_APPEND);
    file_put_contents('upload_debug.log', "Dateityp: " . $_FILES['file']['type'] . "\n", FILE_APPEND);
    file_put_contents('upload_debug.log', "Ist Video: " . ($isVideo ? 'ja' : 'nein') . "\n", FILE_APPEND);
    
    // Wenn es sich um eine Video-Galerie handelt, aber die Datei kein Video ist, trotzdem als Video markieren
    if ($isVideoGallery && !$isVideo) {
        $isVideo = true;
        file_put_contents('upload_debug.log', "Datei wird als Video behandelt, da sie in einer Video-Galerie hochgeladen wurde\n", FILE_APPEND);
    }
    
    // Metadaten direkt im Hauptverzeichnis speichern
    $meta = [
        'jahr' => $year,
        'galerie' => $gallery,
        'kategorie' => $category,
        'tags' => [$category], // Kategorie als ersten Tag hinzufügen
        'isVideo' => $isVideo,
        'uploadDate' => date('Y-m-d H:i:s')
    ];
    
    // meta.json im entsprechenden Verzeichnis speichern
    $metaFile = $isVideoGallery ? $thumbsDir . 'meta.json' : $uploadDir . 'meta.json';
    
    // Wenn die Datei bereits existiert, vorhandene Tags beibehalten
    if (file_exists($metaFile)) {
        $existingMeta = json_decode(file_get_contents($metaFile), true);
        if (isset($existingMeta['tags']) && is_array($existingMeta['tags'])) {
            // Nur die Kategorie als Tag hinzufügen, wenn sie noch nicht existiert
            if (!in_array($category, $existingMeta['tags']) && !empty($category)) {
                $existingMeta['tags'][] = $category;
            }
            $meta['tags'] = $existingMeta['tags'];
        }
    }
    
    file_put_contents($metaFile, json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

    // Öffentliche Basis-URL für Uploads bestimmen
    $serverBase = rtrim(getenv('SERVER_BASE_URL') ?: '', '/');
    $uploadsPublicBase = rtrim(getenv('UPLOADS_PUBLIC_BASE') ?: ($serverBase ? ($serverBase . '/uploads') : '/uploads'), '/');
    $url = $uploadsPublicBase . "/$year/" . rawurlencode($gallery) . "/" . rawurlencode($filename);
    
    // Bestimme die Thumbnail-URL basierend auf dem Dateityp
    $baseName = pathinfo($filename, PATHINFO_FILENAME);
    $thumbnailUrl = null;
    $thumbnailPath = null;
    
    // Wenn es sich um ein Video handelt, erstelle einen Platzhalter-Thumbnail
    if ($isVideo) {
        $thumbnailBaseName = $baseName . '.jpg';
        
        if ($isVideoGallery) {
            // In Video-Galerien: Thumbnail im video_thumbs-Ordner
            $thumbnailPath = $thumbsDir . $thumbnailBaseName;
            $thumbnailUrl = $uploadsPublicBase . "/$year/" . rawurlencode($gallery) . "/video_thumbs/" . rawurlencode($thumbnailBaseName);
        } else {
            // In normalen Galerien: Thumbnail im video_thumb-Ordner
            $videoThumbDir = $uploadDir . 'video_thumb/';
            if (!is_dir($videoThumbDir)) {
                mkdir($videoThumbDir, 0777, true);
            }
            $thumbnailPath = $videoThumbDir . $thumbnailBaseName;
            $thumbnailUrl = $uploadsPublicBase . "/$year/" . rawurlencode($gallery) . "/video_thumb/" . rawurlencode($thumbnailBaseName);
        }
        
        // Erstelle einen Platzhalter-Thumbnail
        if ($thumbnailPath) {
            $width = 320;
            $height = 180;
            $image = imagecreatetruecolor($width, $height);
            $bgColor = imagecolorallocate($image, 42, 18, 8); // Dunkelbraun
            $textColor = imagecolorallocate($image, 255, 107, 0); // Orange
            
            imagefill($image, 0, 0, $bgColor);
            
            // Füge ein Dreieck hinzu (Play-Button)
            $points = [
                $width * 0.4, $height * 0.3,  // Punkt 1
                $width * 0.8, $height * 0.5,  // Punkt 2
                $width * 0.4, $height * 0.7   // Punkt 3
            ];
            imagefilledpolygon($image, $points, 3, $textColor);
            
            // Speichere das Thumbnail
            imagejpeg($image, $thumbnailPath, 90);
            imagedestroy($image);
            
            // Setze die korrekten Berechtigungen
            chmod($thumbnailPath, 0666);
            
            file_put_contents('upload_debug.log', "Thumbnail erstellt: $thumbnailPath\n", FILE_APPEND);
        }
    }
    
    if ($isVideo) {
        // Für Videos in Video-Galerien: Thumbnail im video_thumbs-Ordner
        if ($isVideoGallery) {
            $thumbnailUrl = $uploadsPublicBase . "/$year/" . rawurlencode($gallery) . "/video_thumbs/" . rawurlencode($baseName) . ".jpg";
            file_put_contents('upload_debug.log', "Video-Thumbnail-Pfad gesetzt: $thumbnailUrl\n", FILE_APPEND);
        } else {
            // Fallback für Videos in normalen Galerien
            $thumbnailUrl = $uploadsPublicBase . "/$year/" . rawurlencode($gallery) . "/video_thumb/" . rawurlencode($baseName) . ".jpg";
            file_put_contents('upload_debug.log', "Alternativer Video-Thumbnail-Pfad: $thumbnailUrl\n", FILE_APPEND);
        }
    } else {
        // Für Bilder: Standard-Thumbnail-Pfad
        $thumbnailUrl = $uploadsPublicBase . "/$year/" . rawurlencode($gallery) . "/thumb/" . rawurlencode($baseName) . ".jpg";
        file_put_contents('upload_debug.log', "Bild-Thumbnail-Pfad: $thumbnailUrl\n", FILE_APPEND);
    }
    
    echo json_encode([
        'success' => true,
        'url' => $url,
        'year' => $year,
        'gallery' => $gallery,
        'category' => $category,
        'isVideo' => $isVideo,
        'thumbnailUrl' => $thumbnailUrl
    ]);
    exit;
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Upload failed']);
    exit;
}

// --- AB HIER KEIN WEITERER CODE, KEIN HTML, KEINE HEADER-AUSGABEN! ---