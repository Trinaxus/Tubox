import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';

// Lokale Galerie-Metadaten unter server/uploads/<year>/<gallery>/meta.json

// GET: Metadaten einer Galerie abrufen
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const year = searchParams.get("year");
    const gallery = searchParams.get("gallery");

    if (!year || !gallery) {
      return NextResponse.json({ error: "Fehlende Parameter" }, { status: 400 });
    }

    const baseDir = path.join(process.cwd(), 'server', 'uploads', year, gallery);
    const metaPath = path.join(baseDir, 'meta.json');

    if (!fs.existsSync(metaPath)) {
      // Liefere sinnvolle Defaults, damit die UI kein 404 zeigt
      const defaults = { jahr: year, galerie: gallery, kategorie: "", tags: [], accessType: 'public' };
      return NextResponse.json(defaults);
    }

    const raw = fs.readFileSync(metaPath, 'utf8');
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unbekannter Fehler" }, { status: 500 });
  }
}

// POST: Metadaten einer Galerie aktualisieren
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { year, gallery, meta } = body;

    if (!year || !gallery || !meta) {
      return NextResponse.json({ error: "Fehlende Parameter" }, { status: 400 });
    }

    const baseDir = path.join(process.cwd(), 'server', 'uploads', year, gallery);
    fs.mkdirSync(baseDir, { recursive: true });
    const metaPath = path.join(baseDir, 'meta.json');

    // Minimal validieren und mit Defaults mergen
    const data = {
      jahr: meta.jahr ?? year,
      galerie: meta.galerie ?? gallery,
      kategorie: meta.kategorie ?? "",
      tags: Array.isArray(meta.tags) ? meta.tags : (typeof meta.tags === 'string' ? meta.tags.split(';').map((t: string) => t.trim()).filter(Boolean) : []),
      accessType: meta.accessType || 'public',
      password: meta.password || undefined,
      passwordProtected: meta.passwordProtected || undefined,
    };

    fs.writeFileSync(metaPath, JSON.stringify(data, null, 2), 'utf8');
    return NextResponse.json({ success: true, meta: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unbekannter Fehler" }, { status: 500 });
  }
}
