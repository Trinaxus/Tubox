<?php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// --- CORS-Header für Entwicklung und Produktion ---
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: X-API-TOKEN, Authorization, Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'message' => 'CORS preflight OK']);
    exit();
}
// file_operations.php — API für Dateioperationen (Listen, Löschen)
header('Content-Type: application/json');

// Authentifizierung - TEMPORÄR DEAKTIVIERT FÜR TESTS
$token = $_SERVER['HTTP_X_API_TOKEN'] ?? $_GET['token'] ?? '';
$validToken = getenv('FILE_OPERATIONS_TOKEN') ?: '0000';

// Debug-Ausgabe
file_put_contents('debug_log.txt', "Received token: {$token}\nValid token: {$validToken}\nRequest method: {$_SERVER['REQUEST_METHOD']}\n", FILE_APPEND);

// Token-Prüfung temporär deaktiviert
// if ($token !== $validToken) {
//     http_response_code(403);
//     echo json_encode(['error' => 'Forbidden']);
//     exit;
// }

$uploadsDir = realpath(__DIR__ . '/../uploads');
if (!$uploadsDir) {
    http_response_code(500);
    echo json_encode(['error' => 'Uploads directory not found']);
    exit;
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($action) {
    case 'list':
        // Rekursive Ordnerstruktur, wenn keine year/gallery-Parameter gesetzt sind
        function listFolderTree($dir, $base = null) {
            $result = [];
            $hiddenFiles = ['.htaccess', '.htaccess.allow', '.keep'];
            $base = $base ?? realpath(__DIR__ . '/../uploads');
            foreach (scandir($dir) as $item) {
                if ($item === '.' || $item === '..' || in_array($item, $hiddenFiles)) continue;
                $path = $dir . DIRECTORY_SEPARATOR . $item;
                $relativePath = ltrim(str_replace($base, '', $path), DIRECTORY_SEPARATOR);
                if (is_dir($path)) {
                    // Rekursiv aufrufen und sicherstellen, dass children immer ein Array ist
                    $children = listFolderTree($path, $base);
                    if (!is_array($children)) $children = [];
                    $result[] = [
                        'name' => $item,
                        'type' => 'folder',
                        'path' => $relativePath,
                        'children' => $children
                    ];
                } else {
                    $result[] = [
                        'name' => $item,
                        'type' => 'file',
                        'path' => $relativePath,
                        'size' => filesize($path)
                    ];
                }
            }
            return $result;
        }

        // Prüfe auf year/gallery Parameter
        $hasYear = isset($_GET['year']);
        $hasGallery = isset($_GET['gallery']);

        if (!$hasYear && !$hasGallery) {
            // Ganze Struktur ab uploads
            echo json_encode(['success' => true, 'folders' => listFolderTree($uploadsDir)]);
            exit;
        }

        // Teilstruktur für Jahr/Gallery
        $year = preg_replace('/[^0-9]/', '', $_GET['year'] ?? date('Y'));
        $gallery = preg_replace('/[^a-zA-Z0-9_-]/', '', $_GET['gallery'] ?? 'default');
        $targetDir = $uploadsDir . DIRECTORY_SEPARATOR . $year . DIRECTORY_SEPARATOR . $gallery;

        if (is_dir($targetDir)) {
            echo json_encode(['success' => true, 'folders' => listFolderTree($targetDir, $uploadsDir)]);
            exit;
        } else {
            // Gibt ein leeres Array zurück, falls das Zielverzeichnis nicht existiert
            echo json_encode(['success' => true, 'folders' => []]);
            exit;
        }
        // break; (wird durch exit ersetzt)
    case 'delete':
        $year = preg_replace('/[^0-9]/', '', $_POST['year'] ?? date('Y'));
        $gallery = preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST['gallery'] ?? 'default');
        $filename = basename($_POST['filename'] ?? '');
        $file = "$uploadsDir/$year/$gallery/$filename";
        if (is_file($file)) {
            if (unlink($file)) {
                echo json_encode(['success' => true]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Delete failed']);
            }
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'File not found']);
        }
        break;
        
    case 'delete_by_path':
        // Löschen einer Datei mit direktem Pfad
        $path = '';
        
        // Hole den Pfad aus dem POST-Request oder JSON-Body
        if (isset($_POST['path'])) {
            $path = $_POST['path'];
        } else if (strpos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') === 0) {
            $json = file_get_contents('php://input');
            $data = json_decode($json, true);
            if (isset($data['path'])) {
                $path = $data['path'];
            }
        }
        
        // Debug-Logging
        file_put_contents('/tmp/delete_by_path_debug.txt', 
            date('c') . ": path=$path" . PHP_EOL, 
            FILE_APPEND);
        
        if (empty($path)) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing path parameter']);
            exit;
        }
        
        // Bereinige den Pfad (entferne führende Slashes und uploads/)
        $cleanPath = ltrim($path, '/');
        $cleanPath = preg_replace('#^uploads/+#', '', $cleanPath);
        
        // Baue den vollständigen Dateipfad
        $filePath = "$uploadsDir/$cleanPath";
        
        // Weitere Debug-Informationen
        file_put_contents('/tmp/delete_by_path_debug.txt', 
            date('c') . ": cleanPath=$cleanPath filePath=$filePath" . PHP_EOL, 
            FILE_APPEND);
        
        // Sicherheitscheck: Stelle sicher, dass der Pfad innerhalb des uploads-Verzeichnisses liegt
        $realFilePath = realpath($filePath);
        $realUploadsDir = realpath($uploadsDir);
        
        if (!$realFilePath || !$realUploadsDir || strpos($realFilePath, $realUploadsDir) !== 0) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden']);
            exit;
        }
        
        // Prüfe, ob die Datei existiert
        if (!is_file($filePath)) {
            http_response_code(404);
            echo json_encode([
                'error' => 'File not found',
                'debug_path' => $path,
                'debug_cleanPath' => $cleanPath,
                'debug_filePath' => $filePath
            ]);
            exit;
        }
        
        // Lösche die Datei
        if (unlink($filePath)) {
            echo json_encode(['success' => true, 'deleted' => $cleanPath]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Delete failed']);
        }
        break;
    case 'create_folder':
        // Erstelle neuen Ordner unter uploads
        $path = $_GET['path'] ?? $_POST['path'] ?? '';
        // Falls kein path in POST/GET, prüfe JSON-Body
        if ($path === '' && strpos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') === 0) {
            $json = file_get_contents('php://input');
            $data = json_decode($json, true);
            if (isset($data['path'])) {
                $path = $data['path'];
            }
        }
        // Erlaube Umlaute und andere Sonderzeichen, entferne nur wirklich gefährliche Zeichen
        $safePath = preg_replace('/[\\*:<>|?"\x00-\x1F]/', '', $path); // Entferne nur Zeichen, die in Dateisystemen problematisch sind
        // Entferne jegliches führendes '/uploads/' oder 'uploads/' aus dem Pfad, damit alles relativ zu uploads bleibt
        $safePath = preg_replace('#^/*uploads/#', '', $safePath); // z.B. 'uploads/test', '/uploads/test', '///uploads/test' → 'test'
        $targetDir = "$uploadsDir/" . ltrim($safePath, '/');
        if (strlen($safePath) < 1) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing or invalid path']);
            exit;
        }
        if (is_dir($targetDir)) {
            echo json_encode(['error' => 'Folder already exists']);
            exit;
        }
        if (mkdir($targetDir, 0775, true)) {
            echo json_encode(['success' => true, 'created' => $safePath]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Create folder failed']);
        }
        break;
    case 'delete_folder':
        // Ordner (rekursiv) löschen
        $path = $_GET['path'] ?? $_POST['path'] ?? '';
        
        // Falls JSON-Daten gesendet wurden
        if ($path === '' && strpos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') === 0) {
            $json = file_get_contents('php://input');
            $data = json_decode($json, true);
            if (isset($data['path'])) {
                $path = $data['path'];
            }
        }
        
        // Nur minimale Prüfung: kein '..' und kein leerer Name
        if (strpos($path, '..') !== false || trim($path) === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Missing or invalid path']);
            exit;
        }
        
        // Pfadbereinigung: Entferne führende Slashes und uploads/ am Anfang
        $cleanPath = ltrim($path, '/');
        $cleanPath = preg_replace('#^uploads/+#', '', $cleanPath);
        
        // Zielverzeichnis zusammenbauen
        $targetDir = rtrim($uploadsDir, '/') . '/' . $cleanPath;
        
        // Debug-Logging für alle Löschversuche
        file_put_contents('/tmp/delete_folder_debug.txt', 
            date('c') . ": original_path=$path clean_path=$cleanPath targetDir=$targetDir" . PHP_EOL, 
            FILE_APPEND);
        
        // Prüfen, ob Verzeichnis existiert
        if (!is_dir($targetDir)) {
            http_response_code(400);
            echo json_encode([
                'error' => 'Missing or invalid path',
                'debug_path' => $path,
                'debug_clean_path' => $cleanPath,
                'debug_targetDir' => $targetDir,
                'file_exists' => file_exists($targetDir) ? 'yes' : 'no',
                'is_dir' => is_dir($targetDir) ? 'yes' : 'no',
                'uploadsDir' => $uploadsDir,
                'dir_listing' => @scandir(dirname($targetDir)) ?: ['error' => 'Cannot read directory']
            ]);
            exit;
        }
        
        // Sicherheitscheck: Stelle sicher, dass wir nicht außerhalb des uploads-Verzeichnisses löschen
        $realTargetDir = realpath($targetDir);
        $realUploadsDir = realpath($uploadsDir);
        if (!$realTargetDir || !$realUploadsDir || strpos($realTargetDir, $realUploadsDir) !== 0) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden']);
            exit;
        }
        function rrmdir($dir) {
            foreach (scandir($dir) as $item) {
                if ($item == '.' || $item == '..') continue;
                $path = $dir . DIRECTORY_SEPARATOR . $item;
                if (is_dir($path)) {
                    rrmdir($path);
                } else {
                    unlink($path);
                }
            }
            return rmdir($dir);
        }
        if (rrmdir($targetDir)) {
            echo json_encode(['success' => true, 'deleted' => $safePath]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Delete folder failed']);
        }
        break;
        
    case 'rename_file':
        // Datei umbenennen
        $old = $_POST['old'] ?? $_GET['old'] ?? '';
        $new = $_POST['new'] ?? $_GET['new'] ?? '';
        
        // Falls JSON-Daten gesendet wurden
        if (($old === '' || $new === '') && strpos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') === 0) {
            $json = file_get_contents('php://input');
            $data = json_decode($json, true);
            if (isset($data['old'])) $old = $data['old'];
            if (isset($data['new'])) $new = $data['new'];
        }
        
        // Pfadbereinigung
        $cleanOldPath = ltrim($old, '/');
        $cleanOldPath = preg_replace('#^uploads/+#', '', $cleanOldPath);
        $cleanNewPath = ltrim($new, '/');
        $cleanNewPath = preg_replace('#^uploads/+#', '', $cleanNewPath);
        
        $oldFile = rtrim($uploadsDir, '/') . '/' . $cleanOldPath;
        $newFile = rtrim($uploadsDir, '/') . '/' . $cleanNewPath;
        
        if (!is_file($oldFile)) {
            http_response_code(404);
            echo json_encode([
                'error' => 'Source file not found',
                'debug_old' => $old,
                'debug_oldFile' => $oldFile,
                'file_exists' => file_exists($oldFile) ? 'yes' : 'no',
                'is_file' => is_file($oldFile) ? 'yes' : 'no'
            ]);
            exit;
        }
        
        if (file_exists($newFile)) {
            http_response_code(400);
            echo json_encode([
                'error' => 'Target file already exists',
                'debug_new' => $new,
                'debug_newFile' => $newFile
            ]);
            exit;
        }
        
        // Stelle sicher, dass das Zielverzeichnis existiert
        $targetDir = dirname($newFile);
        if (!is_dir($targetDir)) {
            if (!mkdir($targetDir, 0775, true)) {
                http_response_code(500);
                echo json_encode(['error' => 'Could not create target directory']);
                exit;
            }
        }
        
        if (rename($oldFile, $newFile)) {
            echo json_encode([
                'success' => true, 
                'from' => $cleanOldPath, 
                'to' => $cleanNewPath
            ]);
        } else {
            http_response_code(500);
            echo json_encode([
                'error' => 'Rename failed',
                'oldFile' => $oldFile,
                'newFile' => $newFile
            ]);
        }
        break;
        
    case 'upload':
        // Debug-Ausgabe für Upload-Anfragen
        file_put_contents('upload_debug.txt', "Upload-Anfrage erhalten:\n" .
            "REQUEST_METHOD: {$_SERVER['REQUEST_METHOD']}\n" .
            "FILES: " . print_r($_FILES, true) . "\n" .
            "POST: " . print_r($_POST, true) . "\n" .
            "TOKEN: {$token}\n", FILE_APPEND);
            
        // Datei-Upload (nur POST, multipart/form-data)
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['error' => 'Only POST allowed']);
            exit;
        }
        if (!isset($_FILES['file']) || !isset($_POST['path'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing file or path', 'debug' => ['files' => isset($_FILES), 'path' => isset($_POST['path'])]]);
            exit;
        }
        
        // Weniger strenger Pfad-Filter - erlaube Zahlen, Buchstaben, Unterstriche, Bindestriche und Schrägstriche
        // Entferne nur wirklich gefährliche Zeichen
        $originalPath = $_POST['path'];
        $safePath = preg_replace('/[\*:<>|?"\x00-\x1F]/', '', $originalPath);
        
        // Debug-Ausgabe für Pfadbereinigung
        file_put_contents('upload_debug.txt', "Pfadbereinigung:\n" .
            "Original: {$originalPath}\n" .
            "Bereinigt: {$safePath}\n", FILE_APPEND);
        
        $targetDir = rtrim($uploadsDir, '/') . '/' . ltrim($safePath, '/');
        
        // Debug-Ausgabe für Zielverzeichnis
        file_put_contents('upload_debug.txt', "Zielverzeichnis:\n" .
            "Target: {$targetDir}\n" .
            "Uploads: {$uploadsDir}\n" .
            "realpath(target): " . (realpath($targetDir) ?: 'NULL') . "\n" .
            "realpath(uploads): " . (realpath($uploadsDir) ?: 'NULL') . "\n", FILE_APPEND);
            
        // Sicherheitscheck: Stelle sicher, dass der Pfad innerhalb des uploads-Verzeichnisses liegt
        if (realpath($targetDir) && realpath($uploadsDir) && strpos(realpath($targetDir), realpath($uploadsDir)) !== 0) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden - Path outside uploads directory']);
            exit;
        }
        if (!is_dir($targetDir)) {
            if (!mkdir($targetDir, 0775, true)) {
                http_response_code(500);
                echo json_encode(['error' => 'Could not create target directory']);
                exit;
            }
        }
        $file = $_FILES['file'];
        if ($file['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(['error' => 'File upload error', 'code' => $file['error']]);
            exit;
        }
        $filename = basename($file['name']);
        $targetFile = $targetDir . '/' . $filename;
        if (!move_uploaded_file($file['tmp_name'], $targetFile)) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to move uploaded file']);
            exit;
        }
        echo json_encode(['success' => true, 'filename' => $filename, 'path' => $safePath]);
        break;
    case 'rename_folder':
        // Ordner umbenennen
        $old = $_POST['old'] ?? $_GET['old'] ?? '';
        $new = $_POST['new'] ?? $_GET['new'] ?? '';
        
        // Falls JSON-Daten gesendet wurden
        if (($old === '' || $new === '') && strpos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') === 0) {
            $json = file_get_contents('php://input');
            $data = json_decode($json, true);
            if (isset($data['old'])) {
                $old = $data['old'];
            }
            if (isset($data['new'])) {
                $new = $data['new'];
            }
        }
        
        // Debug-Logging für alle Umbenennungsversuche
        file_put_contents('/tmp/rename_folder_debug.txt', 
            date('c') . ": old=$old new=$new" . PHP_EOL, 
            FILE_APPEND);
        
        // Nur minimale Prüfung: kein '..' und kein leerer Name
        if (strpos($old, '..') !== false || strpos($new, '..') !== false || trim($old) === '' || trim($new) === '') {
            http_response_code(400);
            echo json_encode([
                'error' => 'Ungültiger Ordnername',
                'debug_old' => $old,
                'debug_new' => $new
            ]);
            exit;
        }
        
        // Pfadbereinigung: Entferne führende Slashes und uploads/ am Anfang
        $cleanOldPath = ltrim($old, '/');
        $cleanOldPath = preg_replace('#^uploads/+#', '', $cleanOldPath);
        $cleanNewPath = ltrim($new, '/');
        $cleanNewPath = preg_replace('#^uploads/+#', '', $cleanNewPath);
        
        // Zielverzeichnisse zusammenbauen
        $oldDir = rtrim($uploadsDir, '/') . '/' . $cleanOldPath;
        $newDir = rtrim($uploadsDir, '/') . '/' . $cleanNewPath;
        
        // Weitere Debug-Informationen
        file_put_contents('/tmp/rename_folder_debug.txt', 
            date('c') . ": oldDir=$oldDir newDir=$newDir" . PHP_EOL, 
            FILE_APPEND);
        
        if (!is_dir($oldDir)) {
            http_response_code(400);
            echo json_encode([
                'error' => 'Source folder not found',
                'debug_old' => $old,
                'debug_cleanOld' => $cleanOldPath,
                'debug_oldDir' => $oldDir,
                'file_exists' => file_exists($oldDir) ? 'yes' : 'no',
                'is_dir' => is_dir($oldDir) ? 'yes' : 'no'
            ]);
            exit;
        }
        
        if (is_dir($newDir)) {
            http_response_code(400);
            echo json_encode([
                'error' => 'Target folder already exists',
                'debug_new' => $new,
                'debug_cleanNew' => $cleanNewPath,
                'debug_newDir' => $newDir
            ]);
            exit;
        }
        
        if (rename($oldDir, $newDir)) {
            echo json_encode([
                'success' => true, 
                'from' => $cleanOldPath, 
                'to' => $cleanNewPath
            ]);
        } else {
            http_response_code(500);
            echo json_encode([
                'error' => 'Rename failed',
                'oldDir' => $oldDir,
                'newDir' => $newDir
            ]);
        }
        break;
    case 'move_folder':
        // Ordner verschieben (ähnlich wie umbenennen, aber mit source/target)
        $source = $_POST['source'] ?? $_GET['source'] ?? '';
        $target = $_POST['target'] ?? $_GET['target'] ?? '';
        
        // Falls JSON-Daten gesendet wurden
        if (($source === '' || $target === '') && strpos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') === 0) {
            $json = file_get_contents('php://input');
            $data = json_decode($json, true);
            if (isset($data['source'])) {
                $source = $data['source'];
            }
            if (isset($data['target'])) {
                $target = $data['target'];
            }
        }
        
        // Debug-Logging für alle Verschiebungsversuche
        file_put_contents('/tmp/move_folder_debug.txt', 
            date('c') . ": source=$source target=$target" . PHP_EOL, 
            FILE_APPEND);
        
        // Nur minimale Prüfung: kein '..' und kein leerer Name
        if (strpos($source, '..') !== false || strpos($target, '..') !== false || 
            trim($source) === '' || trim($target) === '') {
            http_response_code(400);
            echo json_encode([
                'error' => 'Ungültige Pfadangabe',
                'debug_source' => $source,
                'debug_target' => $target
            ]);
            exit;
        }
        
        // Pfadbereinigung: Entferne führende Slashes und uploads/ am Anfang
        $cleanSourcePath = ltrim($source, '/');
        $cleanSourcePath = preg_replace('#^uploads/+#', '', $cleanSourcePath);
        $cleanTargetPath = ltrim($target, '/');
        $cleanTargetPath = preg_replace('#^uploads/+#', '', $cleanTargetPath);
        
        // Zielverzeichnisse zusammenbauen
        $sourceDir = rtrim($uploadsDir, '/') . '/' . $cleanSourcePath;
        $targetDir = rtrim($uploadsDir, '/') . '/' . $cleanTargetPath;
        
        // Weitere Debug-Informationen
        file_put_contents('/tmp/move_folder_debug.txt', 
            date('c') . ": sourceDir=$sourceDir targetDir=$targetDir" . PHP_EOL, 
            FILE_APPEND);
        
        if (!is_dir($sourceDir)) {
            http_response_code(400);
            echo json_encode([
                'error' => 'Source folder not found',
                'debug_source' => $source,
                'debug_cleanSource' => $cleanSourcePath,
                'debug_sourceDir' => $sourceDir,
                'file_exists' => file_exists($sourceDir) ? 'yes' : 'no',
                'is_dir' => is_dir($sourceDir) ? 'yes' : 'no'
            ]);
            exit;
        }
        
        // Prüfe, ob das Zielverzeichnis existiert
        $targetParentDir = dirname($targetDir);
        if (!is_dir($targetParentDir)) {
            // Erstelle das Zielverzeichnis, falls es nicht existiert
            if (!mkdir($targetParentDir, 0775, true)) {
                http_response_code(500);
                echo json_encode([
                    'error' => 'Could not create target directory',
                    'debug_targetParentDir' => $targetParentDir
                ]);
                exit;
            }
        }
        
        // Prüfe, ob das Ziel bereits existiert
        if (is_dir($targetDir)) {
            http_response_code(400);
            echo json_encode([
                'error' => 'Target folder already exists',
                'debug_target' => $target,
                'debug_cleanTarget' => $cleanTargetPath,
                'debug_targetDir' => $targetDir
            ]);
            exit;
        }
        
        if (rename($sourceDir, $targetDir)) {
            echo json_encode([
                'success' => true, 
                'from' => $cleanSourcePath, 
                'to' => $cleanTargetPath
            ]);
        } else {
            http_response_code(500);
            echo json_encode([
                'error' => 'Move failed',
                'sourceDir' => $sourceDir,
                'targetDir' => $targetDir
            ]);
        }
        break;
        
    case 'move_file':
        // Datei verschieben (ähnlich wie umbenennen, aber mit source/target)
        $source = $_POST['source'] ?? $_GET['source'] ?? '';
        $target = $_POST['target'] ?? $_GET['target'] ?? '';
        
        // Falls JSON-Daten gesendet wurden
        if (($source === '' || $target === '') && strpos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') === 0) {
            $json = file_get_contents('php://input');
            $data = json_decode($json, true);
            if (isset($data['source'])) {
                $source = $data['source'];
            }
            if (isset($data['target'])) {
                $target = $data['target'];
            }
        }
        
        // Debug-Logging für alle Verschiebungsversuche
        file_put_contents('/tmp/move_file_debug.txt', 
            date('c') . ": source=$source target=$target" . PHP_EOL, 
            FILE_APPEND);
        
        // Nur minimale Prüfung: kein '..' und kein leerer Name
        if (strpos($source, '..') !== false || strpos($target, '..') !== false || 
            trim($source) === '' || trim($target) === '') {
            http_response_code(400);
            echo json_encode([
                'error' => 'Ungültige Pfadangabe',
                'debug_source' => $source,
                'debug_target' => $target
            ]);
            exit;
        }
        
        // Pfadbereinigung: Entferne führende Slashes und uploads/ am Anfang
        $cleanSourcePath = ltrim($source, '/');
        $cleanSourcePath = preg_replace('#^uploads/+#', '', $cleanSourcePath);
        $cleanTargetPath = ltrim($target, '/');
        $cleanTargetPath = preg_replace('#^uploads/+#', '', $cleanTargetPath);
        
        // Zielverzeichnisse zusammenbauen
        $sourceFile = rtrim($uploadsDir, '/') . '/' . $cleanSourcePath;
        $targetFile = rtrim($uploadsDir, '/') . '/' . $cleanTargetPath;
        
        // Weitere Debug-Informationen
        file_put_contents('/tmp/move_file_debug.txt', 
            date('c') . ": sourceFile=$sourceFile targetFile=$targetFile" . PHP_EOL, 
            FILE_APPEND);
        
        if (!is_file($sourceFile)) {
            http_response_code(400);
            echo json_encode([
                'error' => 'Source file not found',
                'debug_source' => $source,
                'debug_cleanSource' => $cleanSourcePath,
                'debug_sourceFile' => $sourceFile,
                'file_exists' => file_exists($sourceFile) ? 'yes' : 'no',
                'is_file' => is_file($sourceFile) ? 'yes' : 'no'
            ]);
            exit;
        }
        
        // Prüfe, ob das Zielverzeichnis existiert
        $targetDir = dirname($targetFile);
        if (!is_dir($targetDir)) {
            // Erstelle das Zielverzeichnis, falls es nicht existiert
            if (!mkdir($targetDir, 0775, true)) {
                http_response_code(500);
                echo json_encode([
                    'error' => 'Could not create target directory',
                    'debug_targetDir' => $targetDir
                ]);
                exit;
            }
        }
        
        // Prüfe, ob das Ziel bereits existiert
        if (is_file($targetFile)) {
            http_response_code(400);
            echo json_encode([
                'error' => 'Target file already exists',
                'debug_target' => $target,
                'debug_cleanTarget' => $cleanTargetPath,
                'debug_targetFile' => $targetFile
            ]);
            exit;
        }
        
        if (rename($sourceFile, $targetFile)) {
            echo json_encode([
                'success' => true, 
                'from' => $cleanSourcePath, 
                'to' => $cleanTargetPath
            ]);
        } else {
            http_response_code(500);
            echo json_encode([
                'error' => 'Move failed',
                'sourceFile' => $sourceFile,
                'targetFile' => $targetFile
            ]);
        }
        break;
    
    default:
        http_response_code(400);
        echo json_encode(['error' => 'Invalid or missing action']);
        break;
}
