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
    const summary = url.searchParams.get('summary') === '1';
    const useExternal = (process.env.USE_EXTERNAL || 'false').toLowerCase() === 'true';
    let EXTERNAL_BLOG_URL = (process.env.EXTERNAL_BLOG_URL && process.env.EXTERNAL_BLOG_URL.trim())
      || (process.env.NEXT_PUBLIC_SERVER_BASE_URL ? `${process.env.NEXT_PUBLIC_SERVER_BASE_URL.replace(/\/$/, '')}/uploads/blog` : '');
    if (!EXTERNAL_BLOG_URL) {
      // Letzter Fallback, falls ENV in Vercel fehlen
      EXTERNAL_BLOG_URL = 'https://tubox.de/TUBOX/server/uploads/blog';
    }
    
    console.log('API-Route /api/json-blog draft=', draft, 'useExternal=', useExternal, 'EXTERNAL_BLOG_URL=', EXTERNAL_BLOG_URL);
    
    // Index ausschließlich extern laden (vereinfachtes Modell)
    let indexData: any = null;
    let diag: any = debug === '1' ? { resolvedExternal: EXTERNAL_BLOG_URL || null } : null;
    if (EXTERNAL_BLOG_URL) {
      const idxUrl = `${EXTERNAL_BLOG_URL.replace(/\/$/, '')}/index.json?t=${Date.now()}`;
      try {
        const res = await fetch(idxUrl, { cache: 'no-store' });
        if (debug === '1') {
          diag = { ...(diag || {}), indexUrl: idxUrl, status: res.status, ok: res.ok };
        }
        if (res.ok) {
          const text = await res.text();
          if (debug === '1') diag = { ...(diag || {}), length: text.length };
          try { indexData = JSON.parse(text); } catch { indexData = null; }
        }
      } catch (e: any) {
        if (debug === '1') diag = { ...(diag || {}), error: e?.message || String(e) };
      }
    }
    if (!indexData) {
      if (debug === '1') {
        return NextResponse.json({ debug: true, results: [], diagnostics: diag || {} }, { status: 200 });
      }
      return NextResponse.json({ results: [] }, { status: 200 });
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
    if (debug === '1') diag = { ...(diag || {}), parsedCount: postsArray.length };
    
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

    // Wenn nur Zusammenfassung gewünscht: direkt Index-Einträge als Karten zurückgeben (sehr schnell)
    if (summary) {
      const summarize = (entry: any) => {
        const slug = deriveSlug(entry);
        const safe = typeof entry === 'object' && entry ? entry : {};
        const pickCover = () => {
          const c1 = typeof safe.coverImage === 'string' ? safe.coverImage : '';
          const c2 = typeof safe.featuredImage === 'string' ? safe.featuredImage : '';
          const c3 = Array.isArray(safe.images) && typeof safe.images[0] === 'string' ? safe.images[0] : '';
          const chosen = c1 || c2 || c3 || '';
          return chosen ? toProxy(String(chosen)) : undefined;
        };
        // Excerpt sanitisieren: <style>/<script> entfernen, dann HTML-Tags entfernen
        const makeExcerpt = () => {
          const raw = typeof safe.excerpt === 'string' && safe.excerpt.trim()
            ? safe.excerpt
            : (typeof safe.content === 'string' ? safe.content : '');
          if (!raw) return undefined;
          const withoutStyle = raw
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
          const textOnly = withoutStyle
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          return textOnly.length > 220 ? textOnly.slice(0, 217) + '…' : textOnly;
        };
        // Tags als Array normalisieren (Semikolon-getrennt zulassen)
        const normTags = Array.isArray(safe.tags)
          ? safe.tags
          : (typeof safe.tags === 'string' ? safe.tags.split(';').map((t: string) => t.trim()).filter(Boolean) : undefined);

        if (!safe.slug && slug) safe.slug = slug;
        return {
          id: safe.id ?? slug ?? undefined,
          slug: safe.slug ?? slug,
          title: safe.title ?? safe.name ?? slug ?? 'Ohne Titel',
          coverImage: pickCover(),
          excerpt: makeExcerpt(),
          isDraft: safe.isDraft,
          updatedAt: safe.updatedAt,
          category: safe.category,
          tags: normTags,
        };
      };
      const cards = filteredPosts.map(summarize);
      if (debug === '1') {
        return NextResponse.json({ debug: true, results: cards, diagnostics: diag || {} }, {
          headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' }
        });
      }
      return NextResponse.json({ results: cards }, {
        headers: {
          'Cache-Control': 's-maxage=60, stale-while-revalidate=300'
        }
      });
    }

    // Vollständige Blog-Posts laden (extern)
    let posts: any[] = [];
    if (EXTERNAL_BLOG_URL) {
      const base = EXTERNAL_BLOG_URL.replace(/\/$/, '');
      const diagnostics: any[] = [];
      const postsIndexed: Array<any | undefined> = new Array(filteredPosts.length);
      await Promise.all(filteredPosts.map(async (indexEntry: any, i: number) => {
        try {
          const slug = deriveSlug(indexEntry);
          if (!slug) { diagnostics.push({ entry: indexEntry, reason: 'no-slug' }); return; }
          const fetchUrl = `${base}/${encodeURIComponent(slug)}.json?t=${Date.now()}`;
          const res = await fetch(fetchUrl, { cache: 'no-store' });
          if (!res.ok) return;
          const postData = await res.json();
          if (!postData.slug) postData.slug = slug;
          postsIndexed[i] = normalizePostImages(postData);
          diagnostics.push({ slug, ok: true });
        } catch {}
      }));
      posts = postsIndexed.filter(Boolean) as any[];
      if (debug === '1') {
        return NextResponse.json({ debug: true, countIndex: filteredPosts.length, loaded: posts.length, notes: diagnostics }, {
          headers: {
            'Cache-Control': 's-maxage=30'
          }
        });
      }
    }
    
    console.log(`Geladene Blog-Posts: ${posts.length}`);
    return NextResponse.json({ results: posts }, {
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300'
      }
    });
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
