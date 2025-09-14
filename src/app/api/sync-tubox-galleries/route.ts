import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

// Die korrekte URL zur listfiles.php im WebDisk/uploads-Verzeichnis
const TUBOX_LIST_URL = "https://www.tubox.de/WebDisk/uploads/listfiles.php";
const LOCAL_JSON_PATH = path.join(process.cwd(), "public", "tubox_galleries.json");

export async function GET() {
  try {
    // 1. Lade die JSON-Daten von Tubox
    const response = await fetch(TUBOX_LIST_URL);
    if (!response.ok) {
      return NextResponse.json({ error: `Fehler beim Abrufen von Tubox: ${response.status}` }, { status: 500 });
    }
    const images = await response.json();

    // 2. Ergänze jeden Bildpfad zu einer vollständigen URL und gruppiere nach Galerien
    const BASE_URL = "https://www.tubox.de/WebDisk/uploads/";
    
    // Gruppiere Bilder nach Galerien
    const groupedGalleries: Record<string, string[]> = {};
    
    if (Array.isArray(images)) {
      // Für jedes Bild
      images.forEach((imagePath: string) => {
        // Ignoriere Bilder, die nicht in Unterordnern liegen oder keine Bilder sind
        if (!imagePath.includes('/') || !(/\.(jpg|jpeg|png|gif|webp)$/i.test(imagePath))) {
          return;
        }
        
        // Vollständige URL erstellen
        const fullUrl = imagePath.startsWith("http") ? imagePath : BASE_URL + imagePath.replace(/^\/+/, "");
        
        // Extrahiere Galerie-Name aus dem Pfad
        // Wir betrachten Jahr + Unterordner als Galerie-Namen
        const pathParts = imagePath.split('/');
        
        if (pathParts.length >= 2) {
          const year = pathParts[0]; // z.B. "2025"
          const subFolder = pathParts[1]; // z.B. "konzertfotos"
          
          // Erstelle einen kombinierten Galerienamen aus Jahr und Unterordner
          const galleryName = `${year}/${subFolder}`;
          
          // Erstelle Galerie-Eintrag, falls noch nicht vorhanden
          if (!groupedGalleries[galleryName]) {
            groupedGalleries[galleryName] = [];
          }
          
          // Füge Bild zur Galerie hinzu
          groupedGalleries[galleryName].push(fullUrl);
        }
      });
    } else if (typeof images === 'object') {
      // Falls bereits gruppiert, nur URLs ergänzen
      Object.entries(images).forEach(([galleryName, galleryImages]) => {
        groupedGalleries[galleryName] = Array.isArray(galleryImages) 
          ? galleryImages.map((img: string) => img.startsWith("http") ? img : BASE_URL + img.replace(/^\/+/, ""))
          : [];
      });
    }
    
    // Sortiere die Galerien alphabetisch
    const galleriesWithFullUrls = Object.fromEntries(
      Object.entries(groupedGalleries).sort(([a], [b]) => a.localeCompare(b))
    );

    // 3. Speichere die JSON-Daten lokal
    await fs.writeFile(LOCAL_JSON_PATH, JSON.stringify(galleriesWithFullUrls, null, 2), "utf-8");

    return NextResponse.json({
      success: true,
      message: "Tubox-Galerien erfolgreich synchronisiert und gespeichert! (mit vollständigen Bild-URLs)",
      count: Array.isArray(galleriesWithFullUrls) ? galleriesWithFullUrls.length : 0,
      file: LOCAL_JSON_PATH,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
