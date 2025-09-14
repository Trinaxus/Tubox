import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Streams a file from external uploads (when USE_EXTERNAL=true) or from server/uploads (when USE_EXTERNAL=false)
export async function GET(req: NextRequest) {
  try {
    const useExternal = (process.env.USE_EXTERNAL || 'false').toLowerCase() === 'true';
    const url = new URL(req.url);
    const relPathParam = url.searchParams.get('path') || '';
    if (!relPathParam) {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    }

    // Build candidate relative paths (handle encoded cases and optional leading 'uploads/')
    const dec1 = relPathParam;
    let dec2: string;
    try { dec2 = decodeURIComponent(relPathParam); } catch { dec2 = relPathParam; }
    let dec3: string;
    try { dec3 = decodeURIComponent(dec2); } catch { dec3 = dec2; }

    const candidates = new Set<string>();
    [dec3, dec2, dec1].forEach(p => {
      if (!p) return;
      const cleaned = p.replace(/^\/+/, '').replace(/\.{2,}/g, '');
      candidates.add(cleaned);
      if (cleaned.startsWith('uploads/')) candidates.add(cleaned.replace(/^uploads\//, ''));
    });

    if (useExternal) {
      const base = (process.env.SERVER_BASE_URL || process.env.NEXT_PUBLIC_SERVER_BASE_URL || 'https://tubox.de/TUBOX/server').replace(/\/$/, '');
      let lastErr: any = null;
      for (const cand of candidates) {
        const remoteUrl = `${base}/uploads/${encodeURIComponent(cand)}`.replace(/%2F/g, '/');
        try {
          const res = await fetch(remoteUrl, { cache: 'no-store' });
          if (res.ok) {
            const buf = Buffer.from(await res.arrayBuffer());
            const ct = res.headers.get('content-type') || 'application/octet-stream';
            return new NextResponse(buf, { status: 200, headers: { 'Content-Type': ct, 'Cache-Control': 'no-store' } });
          }
        } catch (e) { lastErr = e; }
      }
      return NextResponse.json({ error: 'File not found (external)', tried: Array.from(candidates) }, { status: 404 });
    }

    // Local mode: resolve against server/uploads
    let foundPath: string | null = null;
    for (const cand of candidates) {
      const attempt = path.join(process.cwd(), 'server', 'uploads', cand);
      if (fs.existsSync(attempt) && fs.statSync(attempt).isFile()) {
        foundPath = attempt;
        break;
      }
    }

    if (!foundPath) {
      return NextResponse.json({ error: 'File not found', pathTried: Array.from(candidates) }, { status: 404 });
    }

    // Infer content type (basic)
    const lower = foundPath.toLowerCase();
    let contentType = 'application/octet-stream';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) contentType = 'image/jpeg';
    else if (lower.endsWith('.png')) contentType = 'image/png';
    else if (lower.endsWith('.gif')) contentType = 'image/gif';
    else if (lower.endsWith('.webp')) contentType = 'image/webp';
    else if (lower.endsWith('.mp4')) contentType = 'video/mp4';
    else if (lower.endsWith('.mov')) contentType = 'video/quicktime';
    else if (lower.endsWith('.webm')) contentType = 'video/webm';
    else if (lower.endsWith('.mkv')) contentType = 'video/x-matroska';

    const data = fs.readFileSync(foundPath);
    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('proxy-file error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
