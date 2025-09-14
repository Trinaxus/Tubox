import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('file') as File | null;
    const year = String(form.get('year') || '').trim();
    const gallery = String(form.get('gallery') || '').trim();
    const kategorie = String(form.get('kategorie') || '').trim(); // optional

    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }
    if (!year || !gallery) {
      return NextResponse.json({ error: 'Missing year or gallery' }, { status: 400 });
    }

    // Sanitize segments
    const safeSeg = (s: string) => s.replace(/[^a-zA-Z0-9._\-\s]/g, '').replace(/\s+/g, ' ').trim();
    const safeYear = safeSeg(year);
    const safeGallery = safeSeg(gallery);

    // Prepare dir
    const baseDir = path.join(process.cwd(), 'server', 'uploads', safeYear, safeGallery);
    fs.mkdirSync(baseDir, { recursive: true });

    // Sanitize filename
    const origName = (file as any).name || 'upload.bin';
    const safeName = safeSeg(origName).replace(/\s+/g, ' ');
    const target = path.join(baseDir, safeName);

    // Write file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(target, buffer);

    const relPath = `${safeYear}/${safeGallery}/${safeName}`;
    const proxyUrl = `/api/proxy-file?path=${encodeURIComponent(relPath)}`;

    return NextResponse.json({ success: true, url: proxyUrl, path: relPath, kategorie: kategorie || null });
  } catch (err: any) {
    console.error('Upload API error:', err);
    return NextResponse.json({ error: err?.message || 'Upload failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
