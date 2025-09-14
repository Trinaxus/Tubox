import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { year, gallery, filename, path: relPath } = body as { year?: string; gallery?: string; filename?: string; path?: string };

    // Fallback: Wenn ein zusammengesetzter Pfad übergeben wurde (z. B. "2000/Project/file.jpg")
    if ((!year || !gallery || !filename) && relPath && typeof relPath === 'string') {
      const clean = decodeURIComponent(relPath).replace(/^\/+/, '');
      const parts = clean.split('/');
      if (parts.length >= 3) {
        year = parts[0];
        gallery = parts[1];
        filename = parts.slice(2).join('/');
      }
    }

    if (!year || !gallery || !filename) {
      return NextResponse.json({ error: 'Fehlende Parameter: year, gallery, filename' }, { status: 400 });
    }

    const baseDir = path.join(process.cwd(), 'server', 'uploads', year, gallery);
    const filePath = path.join(baseDir, filename);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Datei nicht gefunden' }, { status: 404 });
    }
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      return NextResponse.json({ error: 'Pfad ist keine Datei' }, { status: 400 });
    }

    fs.unlinkSync(filePath);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unbekannter Fehler' }, { status: 500 });
  }
}
