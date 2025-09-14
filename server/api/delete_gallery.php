<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-TOKEN');

// Debugging-Informationen in eine Logdatei schreiben
function debug_log($message) {
    $logfile = __DIR__ . '/../logs/delete_gallery.log';
    $dir = dirname($logfile);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logfile, "[$timestamp] $message\n", FILE_APPEND);
}

// Preflight-Request (OPTIONS) behandeln
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// API-Token prüfen
$token = $_SERVER['HTTP_X_API_TOKEN'] ?? '';
$validToken = getenv('PARTYCRASHER_API_TOKEN') ?: 'mysecrettoken';
debug_log("Empfangenes Token: $token, Gültiges Token: $validToken");

// Für Testzwecke Token-Prüfung deaktivieren
// if ($token !== $validToken) {
//     http_response_code(401);
//     echo json_encode(['error' => 'Unauthorized']);
//     exit;
// }

// Daten aus dem Request-Body lesen
$input = file_get_contents('php://input');
debug_log("Empfangene Daten: $input");
$data = json_decode($input, true);

if (!isset($data['year'], $data['gallery'])) {
    debug_log("Fehlende Parameter: year oder gallery nicht gesetzt");
    http_response_code(400);
    echo json_encode(['error' => 'Fehlende Parameter']);
    exit;
}

// Pfad zur Galerie erstellen
$uploadsDir = __DIR__ . '/../uploads';
$year = basename($data['year']);
$gallery = basename($data['gallery']);
$galleryPath = "$uploadsDir/$year/$gallery";

debug_log("Galeriepfad: $galleryPath");

// Überprüfe Berechtigungen
$permissions = substr(sprintf('%o', fileperms($uploadsDir)), -4);
debug_log("Berechtigungen für uploads-Verzeichnis: $permissions");
if ($year && is_dir("$uploadsDir/$year")) {
    $permissions = substr(sprintf('%o', fileperms("$uploadsDir/$year")), -4);
    debug_log("Berechtigungen für Jahr-Verzeichnis: $permissions");
}

// Prüfen, ob die Galerie existiert
if (!is_dir($galleryPath)) {
    debug_log("Galerie nicht gefunden: $galleryPath");
    http_response_code(404);
    echo json_encode(['error' => 'Galerie nicht gefunden', 'path' => $galleryPath]);
    exit;
}

debug_log("Galerie gefunden: $galleryPath");

// Funktion zum rekursiven Löschen eines Verzeichnisses
function deleteDirectory($dir) {
    if (!file_exists($dir)) {
        return true;
    }
    if (!is_dir($dir)) {
        return unlink($dir);
    }
    foreach (scandir($dir) as $item) {
        if ($item == '.' || $item == '..') {
            continue;
        }
        if (!deleteDirectory($dir . DIRECTORY_SEPARATOR . $item)) {
            return false;
        }
    }
    return rmdir($dir);
}

// Galerie löschen
debug_log("Versuche Galerie zu löschen: $galleryPath");

// Für Testzwecke: Prüfe, ob wir Dateien im Verzeichnis löschen können
$files = scandir($galleryPath);
debug_log("Dateien im Verzeichnis: " . implode(", ", $files));

try {
    if (deleteDirectory($galleryPath)) {
        debug_log("Galerie erfolgreich gelöscht: $galleryPath");
        echo json_encode([
            'success' => true,
            'message' => "Galerie '$year/$gallery' wurde erfolgreich gelöscht"
        ]);
    } else {
        $error = error_get_last();
        debug_log("Fehler beim Löschen der Galerie: " . ($error ? json_encode($error) : 'Unbekannter Fehler'));
        http_response_code(500);
        echo json_encode([
            'error' => 'Konnte Galerie nicht löschen',
            'details' => $error,
            'path' => $galleryPath
        ]);
    }
} catch (Exception $e) {
    debug_log("Exception beim Löschen der Galerie: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Exception beim Löschen der Galerie',
        'message' => $e->getMessage(),
        'path' => $galleryPath
    ]);
}
