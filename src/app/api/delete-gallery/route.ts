import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

function isAdmin(req: NextRequest): boolean {
  try {
    const c = req.cookies.get('tubox_session')?.value;
    if (!c) return false;
    const s = JSON.parse(decodeURIComponent(c));
    return s?.role === 'admin';
  } catch {
    return false;
  }
}

function safeJoinUploads(rel: string) {
  const clean = rel.replace(/^\/+/, '').replace(/^uploads\/?/, '');
  return path.join(process.cwd(), 'server', 'uploads', clean);
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const { galleryName } = await req.json();
    if (!galleryName || typeof galleryName !== 'string') {
      return NextResponse.json({ error: 'galleryName fehlt' }, { status: 400 });
    }

    // galleryName erwartet Form "YEAR/GALLERY"
    const parts = galleryName.split('/');
    if (parts.length < 2) {
      return NextResponse.json({ error: 'Ungültiger galleryName' }, { status: 400 });
    }

    const targetPath = safeJoinUploads(galleryName);

    if (!fs.existsSync(targetPath)) {
      return NextResponse.json({ error: 'Galerie nicht gefunden' }, { status: 404 });
    }

    // Sicherheit: Stelle sicher, dass wir innerhalb von server/uploads bleiben
    const uploadsRoot = path.join(process.cwd(), 'server', 'uploads');
    const resolved = path.resolve(targetPath);
    if (!resolved.startsWith(path.resolve(uploadsRoot))) {
      return NextResponse.json({ error: 'Ungültiger Pfad' }, { status: 400 });
    }

    // Rekursiv löschen
    fs.rmSync(targetPath, { recursive: true, force: true });

    return NextResponse.json({ success: true, removed: galleryName });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unbekannter Fehler' }, { status: 500 });
  }
}
