import { NextRequest, NextResponse } from "next/server";

// Tubox Konfiguration
const TUBOX_BASE_URL = process.env.TUBOX_BASE_URL || "https://www.tubox.de/WebDisk";
const KATEGORIEN_URL = `${TUBOX_BASE_URL}/kategorien.json`;

export async function GET(req: NextRequest) {
  try {
    console.log("Kategorien API aufgerufen");
    
    // Kategorien von Tubox laden
    const response = await fetch(KATEGORIEN_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; WebDiskApp/1.0)",
        "Cache-Control": "no-cache"
      },
      next: { revalidate: 60 } // Cache für 60 Sekunden
    });
    
    if (!response.ok) {
      console.error(`Fehler beim Laden der Kategorien: ${response.status} ${response.statusText}`);
      
      // Fallback-Kategorien, falls die Datei nicht geladen werden kann
      return NextResponse.json({
        source: "fallback",
        categories: ["Kunst", "Natur", "Technik", "Personen", "Sonstiges"]
      });
    }
    
    // Kategorien aus der JSON-Datei parsen
    const categories = await response.json();
    console.log(`${categories.length} Kategorien geladen`);
    
    return NextResponse.json({
      source: "tubox",
      categories
    });
    
  } catch (error) {
    console.error("Kategorien API Fehler:", error);
    
    // Fallback bei Fehlern
    return NextResponse.json({
      source: "error",
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
      categories: ["Kunst", "Natur", "Technik", "Personen", "Sonstiges"]
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("Kategorie hinzufügen API aufgerufen");
    
    // Neue Kategorie aus dem Request-Body lesen
    const { category } = await req.json();
    
    if (!category) {
      return NextResponse.json({ error: "Kategorie fehlt" }, { status: 400 });
    }
    
    // Aktuelle Kategorien laden
    const response = await fetch(KATEGORIEN_URL);
    
    if (!response.ok) {
      return NextResponse.json({ 
        error: `Fehler beim Laden der Kategorien: ${response.status}` 
      }, { status: 500 });
    }
    
    // Kategorien aus der JSON-Datei parsen
    const categories = await response.json();
    
    // Prüfen, ob die Kategorie bereits existiert
    if (categories.includes(category)) {
      return NextResponse.json({ 
        error: "Kategorie existiert bereits",
        categories
      }, { status: 409 });
    }
    
    // Neue Kategorie hinzufügen
    categories.push(category);
    
    // Kategorien zu Tubox hochladen - HINWEIS: Dies würde normalerweise eine
    // Server-Funktion erfordern, da wir direkt keine Dateien auf Tubox schreiben können
    // Dies ist nur ein Platzhalter für die eigentliche Implementierung
    
    console.log(`Neue Kategorie "${category}" würde hinzugefügt werden`);
    console.log("HINWEIS: Das tatsächliche Speichern erfordert Servercode auf Tubox");
    
    return NextResponse.json({
      success: true,
      message: `Kategorie "${category}" hinzugefügt (simuliert)`,
      categories
    });
    
  } catch (error) {
    console.error("Kategorie hinzufügen API Fehler:", error);
    return NextResponse.json({ 
      error: `Server-Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}` 
    }, { status: 500 });
  }
}
