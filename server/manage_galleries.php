<?php
// --- Galerie-Verwaltung für WebDisk ---
// Diese Datei bietet eine einfache Verwaltung der Galerien (Auflisten, Löschen, ggf. Umbenennen)
// Sie ist unabhängig von upload.php und gibt HTML aus

$baseDir = __DIR__ . '/uploads/';
$baseUrl = '/WebDisk/uploads/';

function listGalleries($baseDir, $baseUrl) {
    $years = array_filter(scandir($baseDir), function($y) use ($baseDir) {
        return $y !== '.' && $y !== '..' && is_dir($baseDir . $y);
    });
    $output = '';
    foreach ($years as $jahr) {
        $galleries = array_filter(scandir($baseDir . $jahr), function($g) use ($baseDir, $jahr) {
            return $g !== '.' && $g !== '..' && is_dir($baseDir . $jahr . '/' . $g);
        });
        foreach ($galleries as $gal) {
            $galleryPath = $baseDir . $jahr . '/' . $gal . '/';
            $imgFiles = glob($galleryPath . '*.{jpg,jpeg,png,gif,webp}', GLOB_BRACE);
            $thumb = count($imgFiles) ? $baseUrl . rawurlencode($jahr) . '/' . rawurlencode($gal) . '/' . rawurlencode(basename($imgFiles[0])) : '';
            $output .= '<div style="border:1px solid #333;border-radius:8px;padding:16px;margin-bottom:16px;display:flex;align-items:center;gap:20px;background:#222;">';
            if ($thumb) {
                $output .= '<img src="' . htmlspecialchars($thumb) . '" alt="Thumb" style="width:90px;height:60px;object-fit:cover;border-radius:4px;">';
            }
            $output .= '<div><strong>Jahr:</strong> ' . htmlspecialchars($jahr) . ' <strong>Galerie:</strong> ' . htmlspecialchars($gal) . '<br>';
            $output .= '<form method="post" style="display:inline;">
                <input type="hidden" name="jahr" value="' . htmlspecialchars($jahr) . '">
                <input type="hidden" name="galerie" value="' . htmlspecialchars($gal) . '">
                <button type="submit" name="delete_gallery" style="background:#b91c1c;color:#fff;padding:6px 18px;border:none;border-radius:6px;margin-top:8px;cursor:pointer;">Löschen</button>
            </form>';
            $output .= '</div></div>';
        }
    }
    return $output ?: '<p style="color:#aaa;">Keine Galerien gefunden.</p>';
}

// Galerie löschen
$deleteMsg = '';
if (isset($_POST['delete_gallery'], $_POST['jahr'], $_POST['galerie'])) {
    $delPath = $baseDir . basename($_POST['jahr']) . '/' . basename($_POST['galerie']);
    if (is_dir($delPath)) {
        // rekursiv löschen
        $it = new RecursiveDirectoryIterator($delPath, RecursiveDirectoryIterator::SKIP_DOTS);
        $files = new RecursiveIteratorIterator($it, RecursiveIteratorIterator::CHILD_FIRST);
        foreach($files as $file) {
            $file->isDir() ? rmdir($file->getRealPath()) : unlink($file->getRealPath());
        }
        rmdir($delPath);
        $deleteMsg = '<div style="color:#16b6c6;margin-bottom:18px;">Galerie erfolgreich gelöscht.</div>';
    } else {
        $deleteMsg = '<div style="color:#e74c3c;margin-bottom:18px;">Galerie nicht gefunden!</div>';
    }
}
?><!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>Galerie-Verwaltung - WebDisk</title>
    <style>
        body { background:#181a20; color:#e5e9f0; font-family:sans-serif; margin:0; padding:0; }
        .container { max-width:700px; margin:40px auto; background:#232634; border-radius:12px; box-shadow:0 4px 18px #0005; padding:32px; }
        h1 { color:#fbbf24; }
        a { color:#16b6c6; text-decoration:none; }
        a:hover { text-decoration:underline; }
        button { font-size:1em; }
    </style>
</head>
<body>
<div class="container">
    <h1>Galerie-Verwaltung</h1>
    <a href="upload.php">Zurück zum Upload</a>
    <hr style="margin:18px 0 28px 0;border:0;border-bottom:1px solid #333;">
    <?php echo $deleteMsg; ?>
    <?php echo listGalleries($baseDir, $baseUrl); ?>
</div>
</body>
</html>
