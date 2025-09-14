import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const useExternal = (process.env.USE_EXTERNAL || 'true').toLowerCase() !== 'false' ? true : false;
    // Lokaler Modus: Lese direkt aus dem Repo-Verzeichnis server/uploads
    if (!useExternal) {
      try {
        const uploadsDir = path.join(process.cwd(), 'server', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          return NextResponse.json({ galleries: {}, metadata: {}, note: 'uploads directory not found (local mode)' });
        }
        const years = fs.readdirSync(uploadsDir).filter(y => !y.startsWith('.') && fs.statSync(path.join(uploadsDir, y)).isDirectory());
        const galleries: Record<string, string[]> = {};
        const metadata: Record<string, any> = {};
        for (const year of years) {
          const yearDir = path.join(uploadsDir, year);
          const galleryNames = fs.readdirSync(yearDir).filter(g => !g.startsWith('.') && fs.statSync(path.join(yearDir, g)).isDirectory());
          for (const gallery of galleryNames) {
            const galleryDir = path.join(yearDir, gallery);
            const files = fs.readdirSync(galleryDir).filter(f => /\.(jpg|jpeg|png|gif|webp|mp4|mov|webm|mkv)$/i.test(f));
            const name = `${year}/${gallery}`;
            // Baue Proxy-URLs, damit der Browser die Dateien laden kann
            galleries[name] = files.map(f => `/api/proxy-file?path=${encodeURIComponent(`${year}/${gallery}/${f}`)}`);
            // Meta einlesen, falls vorhanden
            const metaFile = path.join(galleryDir, 'meta.json');
            if (fs.existsSync(metaFile)) {
              try { metadata[name] = JSON.parse(fs.readFileSync(metaFile, 'utf8')); } catch {}
            }
          }
        }
        return NextResponse.json({ galleries, metadata });
      } catch (e) {
        console.error('Local galleries read error:', e);
        // Fallback auf extern
      }
    }
    const SERVER_BASE = process.env.SERVER_BASE_URL || process.env.NEXT_PUBLIC_SERVER_BASE_URL || 'https://tubox.de/TUBOX/server';
    const API_BASE = `${SERVER_BASE}/api`;
    const UPLOADS_BASE = `${SERVER_BASE}/uploads`;
    // Fallback-Daten für den Fall, dass die API nicht erreichbar ist
    const fallbackGalleries = {
      "2025/Tubox.de": [
        `${UPLOADS_BASE}/2025/Tubox.de/beispiel1.jpg`,
        `${UPLOADS_BASE}/2025/Tubox.de/beispiel2.jpg`
      ],
      "2025/Demo Galerie": [
        `${UPLOADS_BASE}/2025/Demo%20Galerie/demo1.jpg`,
        `${UPLOADS_BASE}/2025/Demo%20Galerie/demo2.jpg`
      ]
    };
    
    // Fallback-Metadaten
    const fallbackMetadata = {
      "2025/Tubox.de": {
        "jahr": "2025",
        "galerie": "Tubox.de",
        "kategorie": "Website",
        "tags": ["tubox", "webdesign"]
      },
      "2025/Demo Galerie": {
        "jahr": "2025",
        "galerie": "Demo Galerie",
        "kategorie": "Fotografie",
        "tags": ["demo", "beispiel"]
      }
    };
    
    try {
      // Externer Modus: Versuche, die Daten von der neuen Server-API zu laden
      const res = await fetch(`${API_BASE}/galleries.php`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store',
        next: { revalidate: 0 }
      });
      
      if (!res.ok) {
        throw new Error(`Fehler beim Laden der Galerien vom Server: ${res.status}`);
      }
      
      const text = await res.text();
      
      try {
        const data = JSON.parse(text);
        
        // Prüfe, ob die Daten im erwarteten Format sind
        if (data.galleries && Object.keys(data.galleries).length > 0) {
          // Medien-URLs auf Proxy normalisieren: /api/proxy-file?path=...
          const normalizedGalleries: Record<string, string[]> = {};
          const remoteGalleries = data.galleries as Record<string, string[]>;
          for (const [name, urls] of Object.entries(remoteGalleries)) {
            normalizedGalleries[name] = (Array.isArray(urls) ? urls : []).map((u: string) => {
              if (!u || typeof u !== 'string') return u as any;
              // Hole Teil nach '/uploads/'
              const marker = '/uploads/';
              const idx = u.indexOf(marker);
              if (idx >= 0) {
                const rel = u.substring(idx + marker.length);
                return `/api/proxy-file?path=${encodeURIComponent(rel)}`;
              }
              // Wenn bereits ein relativer uploads-Pfad geliefert wurde
              if (/^uploads\//i.test(u) || /^\d{4}\//.test(u)) {
                const rel = u.replace(/^uploads\//i, '');
                return `/api/proxy-file?path=${encodeURIComponent(rel)}`;
              }
              return u;
            });
          }
          // Metadaten für jede Galerie abrufen
          const galleryNames = Object.keys(normalizedGalleries);
          const metadataPromises = galleryNames.map(async (galleryName) => {
            try {
              const [year, gallery] = galleryName.split('/');
              if (!year || !gallery) return null;
              
              const metaRes = await fetch(`${API_BASE}/gallery_meta.php?year=${encodeURIComponent(year)}&gallery=${encodeURIComponent(gallery)}`, {
                method: 'GET',
                headers: {
                  'Accept': 'application/json',
                  'Cache-Control': 'no-cache'
                },
                cache: 'no-store',
                next: { revalidate: 0 }
              });
              
              if (!metaRes.ok) return null;
              return { galleryName, metadata: await metaRes.json() };
            } catch (error) {
              // Fehler beim Laden der Metadaten
              return null;
            }
          });
          
          // Warte auf alle Metadaten-Anfragen
          const metadataResults = await Promise.all(metadataPromises);
          
          // Erstelle ein Objekt mit den Metadaten
          const metadata: Record<string, any> = {};
          metadataResults.forEach(result => {
            if (result) {
              metadata[result.galleryName] = result.metadata;
            }
          });
          
          return NextResponse.json({
            galleries: normalizedGalleries,
            metadata
          });
        } else {
          console.log('Keine Galerien gefunden, verwende Fallback-Daten');
          return NextResponse.json({ 
            galleries: fallbackGalleries,
            metadata: fallbackMetadata
          });
        }
      } catch (parseError) {
        console.error('Fehler beim Parsen der JSON-Antwort:', parseError);
        throw new Error('Ungültiges JSON-Format in der Antwort');
      }
    } catch (fetchError) {
      console.error('Fehler beim Abrufen der Galerien:', fetchError);
      // Bei Fehler die Fallback-Daten zurückgeben
      console.log('Verwende Fallback-Daten wegen Fehler');
      return NextResponse.json({ 
        galleries: fallbackGalleries,
        metadata: fallbackMetadata
      });
    }
  } catch (error) {
    console.error('Allgemeiner Fehler in der API-Route:', error);
    return NextResponse.json({ 
      error: 'Konnte Galerien nicht laden', 
      details: error instanceof Error ? error.message : String(error),
      galleries: {} 
    }, { status: 500 });
  }
}
