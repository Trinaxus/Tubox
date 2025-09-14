import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Verwende Node.js Runtime anstatt Edge Runtime
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const started = Date.now();
    const blogDir = path.join(process.cwd(), 'server', 'uploads', 'blog');
    const indexPath = path.join(blogDir, 'index.json');
    if (!fs.existsSync(indexPath)) {
      return NextResponse.json({ 
        online: false, 
        error: 'index.json nicht gefunden',
        responseTime: Date.now() - started
      }, { status: 404 });
    }
    const stat = fs.statSync(indexPath);
    const txt = fs.readFileSync(indexPath, 'utf8');
    let data: any = null;
    try { data = JSON.parse(txt); } catch {}
    let postsCount = 0;
    if (Array.isArray(data)) postsCount = data.length; else if (data?.posts && Array.isArray(data.posts)) postsCount = data.posts.length; else postsCount = 0;
    return NextResponse.json({
      online: true,
      postsCount,
      url: '/server/uploads/blog/index.json',
      responseTime: Date.now() - started,
      lastModified: stat.mtime.toISOString(),
    });
  } catch (error) {
    console.error('Fehler beim Prüfen des Blog-Index:', error);
    return NextResponse.json({ 
      online: false,
      error: `Unerwarteter Fehler: ${error instanceof Error ? error.message : String(error)}`
    }, { status: 500 });
  }
}
