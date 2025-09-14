// @ts-nocheck - Typprüfung für diese Datei deaktivieren
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

// API-Route für eine einzelne Galerie
export async function GET(request: NextRequest, { params }) {
  try {
    // Galerie-Name aus URL-Parameter
    const galleryName = decodeURIComponent(params.name);
    console.log(`API: Galerie-Details angefordert für "${galleryName}"`);

    // JSON-Datei mit allen Galerien laden
    const filePath = path.join(process.cwd(), "public", "tubox_galleries.json");
    const data = await fs.readFile(filePath, "utf-8");
    const galleries = JSON.parse(data);

    // Verfügbare Galerie-Namen
    const availableGalleries = Object.keys(galleries);
    console.log("API: Verfügbare Galerien:", availableGalleries);

    // Direkte Suche nach dem Galerie-Namen
    if (galleries[galleryName]) {
      console.log(`API: Galerie "${galleryName}" gefunden mit ${galleries[galleryName].length} Bildern`);
      return NextResponse.json({ 
        galleryName,
        images: galleries[galleryName] 
      });
    }

    // Fallback: Suche nach ähnlichem Namen
    for (const key of availableGalleries) {
      if (key.toLowerCase().includes(galleryName.toLowerCase()) || 
          galleryName.toLowerCase().includes(key.toLowerCase())) {
        console.log(`API: Ähnliche Galerie "${key}" gefunden`);
        return NextResponse.json({ 
          galleryName: key,
          images: galleries[key],
          note: `Exakter Name "${galleryName}" nicht gefunden, stattdessen "${key}" verwendet` 
        });
      }
    }

    // Keine Galerie gefunden
    console.log(`API: Keine Galerie für "${galleryName}" gefunden`);
    return NextResponse.json({ 
      galleryName,
      images: [],
      error: `Galerie "${galleryName}" nicht gefunden` 
    }, { status: 404 });
  } catch (error) {
    console.error("API-Fehler:", error);
    return NextResponse.json({ 
      error: "Fehler beim Laden der Galerie", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
