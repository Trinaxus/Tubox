import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Verwende Node.js Runtime anstatt Edge Runtime
export const runtime = 'nodejs';

// Externe Pfade deaktiviert: wir arbeiten ausschließlich lokal im Entwicklungsmodus

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const draft = url.searchParams.get('draft');
    const debug = url.searchParams.get('debug');
    const useExternal = (process.env.USE_EXTERNAL || 'false').toLowerCase() === 'true';
    const EXTERNAL_BLOG_URL = process.env.EXTERNAL_BLOG_URL || '';
    
    console.log('API-Route /api/json-blog aufgerufen mit draft=', draft, 'useExternal=', useExternal);
    
    // Index laden (extern oder lokal Fallback)
    let indexData: any = null;
    if (useExternal && EXTERNAL_BLOG_URL) {
      try {
        const res = await fetch(`${EXTERNAL_BLOG_URL}/index.json?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const text = await res.text();
          try { indexData = JSON.parse(text); } catch { indexData = null; }
        }
      } catch (e) {
        console.warn('Externe Blog index.json nicht erreichbar, falle auf lokal zurück');
      }
    }
    if (!indexData) {
      try {
        const blogDir = path.join(process.cwd(), 'server', 'uploads', 'blog');
        const indexPath = path.join(blogDir, 'index.json');
        if (fs.existsSync(indexPath)) {
          indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        } else {
          console.warn('Lokale Blog index.json nicht gefunden');
          return NextResponse.json({ results: [] });
        }
      } catch (e) {
        console.error('Lokales Lesen der Blog-Index-Datei fehlgeschlagen:', e);
        return NextResponse.json({ results: [] });
      }
    }
    
    // Unterstütze verschiedene Index-Formate: Array, {posts:[]}, {items:[]}, {entries:[]}, oder Objekt mit Values als Einträge
    let postsArray: any[] = [];
    if (Array.isArray(indexData)) {
      postsArray = indexData;
    } else if (indexData && typeof indexData === 'object') {
      if (Array.isArray((indexData as any).posts)) postsArray = (indexData as any).posts;
      else if (Array.isArray((indexData as any).items)) postsArray = (indexData as any).items;
      else if (Array.isArray((indexData as any).entries)) postsArray = (indexData as any).entries;
      else postsArray = Object.values(indexData as any);
    }
    if (!Array.isArray(postsArray)) postsArray = [];
    
    // Blogposts filtern, wenn draft-Parameter gesetzt ist
    let filteredPosts = postsArray;
    if (draft === '0') {
      filteredPosts = postsArray.filter((post: any) => post.isDraft === '0');
    } else if (draft === '1') {
      filteredPosts = postsArray.filter((post: any) => post.isDraft === '1');
    }
    
    console.log(`Gefilterte Posts: ${filteredPosts.length}`);
    
    // Hilfsfunktionen zur URL-Normalisierung auf Proxy
    const toProxy = (u: string) => {
      if (!u || typeof u !== 'string') return u;
      // Falls schon Proxy
      if (u.startsWith('/api/proxy-file')) return u;
      // extrahiere Teil nach /uploads/
      const marker = '/uploads/';
      const idx = u.indexOf(marker);
      if (idx >= 0) {
        const rel = u.substring(idx + marker.length);
        return `/api/proxy-file?path=${encodeURIComponent(rel)}`;
      }
      // Wenn es wie "2000/..." beginnt, direkt nehmen
      if (/^\d{4}\//.test(u) || u.startsWith('blog/')) {
        return `/api/proxy-file?path=${encodeURIComponent(u)}`;
      }
      return u;
    };
    const normalizePostImages = (p: any) => {
      if (!p || typeof p !== 'object') return p;
      if (p.coverImage) p.coverImage = toProxy(p.coverImage);
      if (p.featuredImage) p.featuredImage = toProxy(p.featuredImage);
      if (Array.isArray(p.images)) p.images = p.images.map(toProxy);
      if (typeof p.content === 'string') {
        // ersetze src-Attribute, die auf uploads zeigen
        p.content = p.content.replace(/src=["']([^"']+)["']/g, (m: string, url: string) => {
          const proxied = toProxy(url);
          return `src="${proxied}"`;
        });
      }
      return p;
    };

    // Hilfsfunktion: Slug aus Eintrag ableiten
    const deriveSlug = (entry: any): string | null => {
      const tryVal = (v?: any) => (typeof v === 'string' && v.trim() ? v.trim() : null);
      let s = tryVal(entry?.slug);
      if (!s) s = tryVal(entry?.file) || tryVal(entry?.filename) || tryVal(entry?.path) || tryVal(entry?.url);
      if (!s) return null;
      // Wenn Pfad/URL übergeben wurde, Basename ohne .json extrahieren
      try {
        const noQuery = s.split('?')[0];
        const parts = noQuery.split('/');
        const base = parts[parts.length - 1];
        return base.replace(/\.json$/i, '');
      } catch {
        return s.replace(/\.json$/i, '');
      }
    };

    // Vollständige Blog-Posts laden (extern bevorzugt)
    const posts: any[] = [];
    if (useExternal && EXTERNAL_BLOG_URL) {
      const base = EXTERNAL_BLOG_URL.replace(/\/$/, '');
      const diagnostics: any[] = [];
      for (const indexEntry of filteredPosts) {
        try {
          const slug = deriveSlug(indexEntry);
          if (!slug) {
            diagnostics.push({ entry: indexEntry, reason: 'no-slug' });
            continue;
          }
          const fetchUrl = `${base}/${encodeURIComponent(slug)}.json?t=${Date.now()}`;
          const res = await fetch(fetchUrl, { cache: 'no-store' });
          if (!res.ok) continue;
          const postData = await res.json();
          if (!postData.slug) postData.slug = slug; // sicherstellen, dass slug vorhanden ist
          posts.push(normalizePostImages(postData));
          diagnostics.push({ slug, ok: true });
        } catch {}
      }
      if (debug === '1') {
        return NextResponse.json({ debug: true, countIndex: filteredPosts.length, loaded: posts.length, notes: diagnostics });
      }
    } else {
      const blogDir = path.join(process.cwd(), 'server', 'uploads', 'blog');
      for (const indexEntry of filteredPosts) {
        try {
          const slug = deriveSlug(indexEntry);
          if (!slug) continue;
          const postPath = path.join(blogDir, `${slug}.json`);
          if (!fs.existsSync(postPath)) continue;
          const postData = JSON.parse(fs.readFileSync(postPath, 'utf8'));
          if (!postData.slug) postData.slug = slug; // sicherstellen, dass slug vorhanden ist
          posts.push(normalizePostImages(postData));
        } catch {}
      }
    }
    
    console.log(`Geladene Blog-Posts: ${posts.length}`);
    return NextResponse.json({ results: posts });
  } catch (error) {
    console.error('Fehler in der API-Route /api/json-blog:', error);
    return NextResponse.json({ 
      error: 'Interner Serverfehler', 
      results: [] 
    }, { status: 500 });
  }
}

// POST-Methode zum Erstellen neuer Blog-Posts
export async function POST(request: Request) {
  try {
    // Daten aus dem Request-Body lesen
    const data = await request.json();
    
    if (!data.title || !data.slug) {
      return NextResponse.json({ 
        error: 'Titel und Slug sind erforderlich' 
      }, { status: 400 });
    }
    
    console.log(`Erstelle neuen Blog-Post: ${data.title} (${data.slug})`);
    
    // Generiere eine ID, falls keine vorhanden ist
    if (!data.id) {
      data.id = Date.now();
    }
    
    // Setze Zeitstempel, falls nicht vorhanden
    const now = new Date().toISOString();
    if (!data.createdAt) {
      data.createdAt = now;
    }
    if (!data.updatedAt) {
      data.updatedAt = now;
    }
    
    // Konvertiere Tags in ein Array, falls es ein String ist
    if (typeof data.tags === 'string') {
      data.tags = data.tags.split(';').map((tag: string) => tag.trim()).filter((tag: string) => tag !== '');
    }
    
    // Direkt ins lokale Filesystem schreiben
    try {
      const blogDir = path.join(process.cwd(), 'server', 'uploads', 'blog');
      if (!fs.existsSync(blogDir)) fs.mkdirSync(blogDir, { recursive: true });
      const postPath = path.join(blogDir, `${data.slug}.json`);
      fs.writeFileSync(postPath, JSON.stringify(data, null, 2), 'utf8');

      // Index laden/aktualisieren
      const indexPath = path.join(blogDir, 'index.json');
      let indexData: any = [];
      if (fs.existsSync(indexPath)) {
        try {
          const cur = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
          indexData = Array.isArray(cur) ? cur : (cur.posts || []);
        } catch {}
      }
      if (!Array.isArray(indexData)) indexData = [];
      const entry = {
        id: data.id,
        slug: data.slug,
        title: data.title,
        isDraft: data.isDraft,
        updatedAt: data.updatedAt,
        category: data.category,
        tags: Array.isArray(data.tags) ? data.tags.join(';') : (data.tags || '')
      };
      // upsert by slug (or id if present)
      let idx = indexData.findIndex((p: any) => (data.id && p.id === data.id) || p.slug === data.slug);
      if (idx >= 0) indexData[idx] = entry; else indexData.push(entry);
      fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2), 'utf8');

      return NextResponse.json({ success: true, message: 'Blog-Post lokal gespeichert' });
    } catch (err) {
      console.error('Lokales Speichern fehlgeschlagen:', err);
      return NextResponse.json({ error: 'Lokales Speichern fehlgeschlagen' }, { status: 500 });
    }
  } catch (error) {
    console.error('Fehler in der API-Route /api/json-blog (POST):', error);
    return NextResponse.json({ 
      error: 'Interner Serverfehler' 
    }, { status: 500 });
  }
}
