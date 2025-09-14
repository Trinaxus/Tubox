<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Debug-Modus (auf false setzen für Produktion)
$debug = true;
$debugInfo = [];

$uploadsDir = __DIR__ . '/../uploads';
// Öffentliche Basis-URL für Uploads bestimmen (z. B. https://tubox.de/TUBOX/server/uploads)
$serverBase = rtrim(getenv('SERVER_BASE_URL') ?: '', '/');
$uploadsPublicBase = rtrim(getenv('UPLOADS_PUBLIC_BASE') ?: ($serverBase ? ($serverBase . '/uploads') : '/uploads'), '/');
$galleries = [];

// Prüfe, ob das Upload-Verzeichnis existiert
if (!is_dir($uploadsDir)) {
    $errorMsg = "Upload-Verzeichnis existiert nicht: $uploadsDir";
    if ($debug) {
        echo json_encode([
            'galleries' => [],
            'error' => $errorMsg,
            'debug' => true
        ]);
    } else {
        echo json_encode(['galleries' => []]);
    }
    exit;
}

// Füge Debug-Info hinzu
if ($debug) {
    $debugInfo['uploadsDir'] = $uploadsDir;
    $debugInfo['exists'] = is_dir($uploadsDir);
    $debugInfo['readable'] = is_readable($uploadsDir);
}

// Jahre im Upload-Verzeichnis durchlaufen
try {
    $years = scandir($uploadsDir);
    if ($debug) {
        $debugInfo['years'] = $years;
    }
    
    foreach ($years as $year) {
        // Überspringe . und .. Verzeichnisse
        if ($year === '.' || $year === '..' || !is_dir("$uploadsDir/$year")) continue;
        
        $yearPath = "$uploadsDir/$year";
        if ($debug) {
            $debugInfo['yearPaths'][] = [
                'path' => $yearPath,
                'exists' => is_dir($yearPath),
                'readable' => is_readable($yearPath)
            ];
        }
        
        // Galerien im Jahr durchlaufen
        $galleriesInYear = scandir($yearPath);
        if ($debug) {
            $debugInfo['galleriesInYear'][$year] = $galleriesInYear;
        }
        
        foreach ($galleriesInYear as $gallery) {
            // Überspringe . und .. Verzeichnisse
            if ($gallery === '.' || $gallery === '..' || !is_dir("$yearPath/$gallery")) continue;
            
            $galleryPath = "$yearPath/$gallery";
            if ($debug) {
                $debugInfo['galleryPaths'][] = [
                    'path' => $galleryPath,
                    'exists' => is_dir($galleryPath),
                    'readable' => is_readable($galleryPath)
                ];
            }
            
            // Bilder in der Galerie durchlaufen
            $galleryFiles = scandir($galleryPath);
            if ($debug) {
                $debugInfo['galleryFiles']["$year/$gallery"] = $galleryFiles;
            }
            
            // Filtere nur Bilddateien
            $files = array_values(array_filter($galleryFiles, function($f) use ($galleryPath) {
                return preg_match('/\\.(jpg|jpeg|png|gif)$/i', $f) && is_file("$galleryPath/$f");
            }));
            
            if ($debug) {
                $debugInfo['imageFiles']["$year/$gallery"] = $files;
            }
            
            // Erstelle URLs für die Bilder (dynamische Basis)
            $images = array_map(function($f) use ($year, $gallery, $uploadsPublicBase) {
                return $uploadsPublicBase . '/' . rawurlencode($year) . '/' . rawurlencode($gallery) . '/' . rawurlencode($f);
            }, $files);
            
            // Füge die Galerie zur Liste hinzu
            $galleries[] = [
                'name' => "$year/$gallery",
                'images' => $images
            ];
        }
    }
} catch (Exception $e) {
    if ($debug) {
        $debugInfo['error'] = $e->getMessage();
        $debugInfo['trace'] = $e->getTraceAsString();
    }
}

// Format der Galerien in ein Objekt umwandeln, wobei die Galerienamen die Schlüssel sind
$galleriesObject = [];
foreach ($galleries as $gallery) {
    $galleriesObject[$gallery['name']] = $gallery['images'];
}

// Antwort mit Debug-Informationen, wenn Debug-Modus aktiv ist
if ($debug) {
    $response = [
        'galleries' => $galleriesObject,
        'debug' => $debugInfo,
        'count' => count($galleries),
        'timestamp' => date('Y-m-d H:i:s')
    ];
} else {
    $response = ['galleries' => $galleriesObject];
}

// Ausgabe als JSON
echo json_encode($response);
