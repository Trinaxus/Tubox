<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
if (!isset($data['year'], $data['gallery'], $data['filename'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Fehlende Parameter']);
    exit;
}
$uploadsDir = __DIR__ . '/../uploads';
$year = basename($data['year']);
$gallery = basename($data['gallery']);
$filename = basename($data['filename']);
$filepath = "$uploadsDir/$year/$gallery/$filename";
if (is_file($filepath)) {
    if (unlink($filepath)) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Konnte Datei nicht löschen']);
    }
} else {
    http_response_code(404);
    echo json_encode(['error' => 'Datei nicht gefunden']);
}
