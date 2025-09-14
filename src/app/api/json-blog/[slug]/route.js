import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Verwende Node.js Runtime anstatt Edge Runtime
export const runtime = 'nodejs';

// Extern bevorzugen, lokal als Fallback

// Hilfsfunktion zum Normalisieren von Slugs
function normalizeSlug(slug) {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    
    if (!slug) {
      return NextResponse.json(
        { error: 'Slug parameter is required' },
        { status: 400 }
      );
    }
    
    // Normalisiere den Slug für die Dateiabfrage
    const normalizedSlug = normalizeSlug(slug);
    
    // helper to map URLs to local proxy
    const toProxy = (u) => {
      if (!u || typeof u !== 'string') return u;
      if (u.startsWith('/api/proxy-file')) return u;
      const marker = '/uploads/';
      const idx = u.indexOf(marker);
      if (idx >= 0) {
        const rel = u.substring(idx + marker.length);
        return `/api/proxy-file?path=${encodeURIComponent(rel)}`;
      }
      if (/^\d{4}\//.test(u) || u.startsWith('blog/')) {
        return `/api/proxy-file?path=${encodeURIComponent(u)}`;
      }
      return u;
    };
    const normalizePostImages = (p) => {
      if (!p || typeof p !== 'object') return p;
      if (p.coverImage) p.coverImage = toProxy(p.coverImage);
      if (p.featuredImage) p.featuredImage = toProxy(p.featuredImage);
      if (Array.isArray(p.images)) p.images = p.images.map(toProxy);
      if (typeof p.content === 'string') {
        p.content = p.content.replace(/src=["']([^"']+)["']/g, (m, url) => {
          const proxied = toProxy(url);
          return `src="${proxied}"`;
        });
      }
      return p;
    };

    const useExternal = (process.env.USE_EXTERNAL || 'false').toLowerCase() === 'true';
    const EXTERNAL_BLOG_URL = process.env.EXTERNAL_BLOG_URL || '';
    if (useExternal && EXTERNAL_BLOG_URL) {
      try {
        const res = await fetch(`${EXTERNAL_BLOG_URL}/${encodeURIComponent(normalizedSlug)}.json?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const post = await res.json();
          return NextResponse.json(normalizePostImages(post));
        }
      } catch (e) {}
    }
    // Lokaler Fallback: Datei aus server/uploads/blog lesen
    const blogDir = path.join(process.cwd(), 'server', 'uploads', 'blog');
    const postPath = path.join(blogDir, `${normalizedSlug}.json`);
    if (fs.existsSync(postPath)) {
      const post = JSON.parse(fs.readFileSync(postPath, 'utf8'));
      return NextResponse.json(normalizePostImages(post));
    }
    return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
  } catch (error) {
    console.error('Error in json-blog/[slug] API route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blog post' },
      { status: 500 }
    );
  }
}

// PUT-Methode zum Aktualisieren eines Blog-Posts
// Hilfsfunktion zum Aktualisieren des externen Index
async function updateExternalIndex(newSlug, updatedPost) {
  try {
    console.log('Manuelles Update des externen Index...');
    
    // 1. Hole den aktuellen Index
    const indexUrl = `${EXTERNAL_BLOG_URL}/index.json`;
    const indexRes = await fetch(indexUrl, { cache: 'no-store' });
    
    if (!indexRes.ok) {
      console.error(`Fehler beim Laden des Index: ${indexRes.status}`);
      return false;
    }
    
    let indexData = await indexRes.json();
    let postsArray;
    
    // Bestimme das Format der index.json
    if (Array.isArray(indexData)) {
      // Neues Format: direktes Array
      postsArray = indexData;
    } else if (indexData.posts && Array.isArray(indexData.posts)) {
      // Altes Format: Objekt mit posts-Array
      postsArray = indexData.posts;
    } else {
      console.error('Unerwartetes Format der index.json');
      postsArray = [];
    }
    
    // Erstelle den Eintrag für den Index
    const indexEntry = {
      id: updatedPost.id,
      slug: newSlug,
      title: updatedPost.title,
      isDraft: updatedPost.isDraft,
      updatedAt: updatedPost.updatedAt,
      category: updatedPost.category,
      tags: Array.isArray(updatedPost.tags) ? updatedPost.tags.join(';') : updatedPost.tags
    };
    
    // Finde alle Einträge mit demselben Slug (es könnten mehrere sein)
    const entriesWithSameSlug = postsArray.filter(p => p.slug === newSlug);
    
    // Finde den Eintrag mit der gleichen ID
    let existingIndex = postsArray.findIndex(p => p.id && p.id === updatedPost.id);
    
    // Wenn kein Eintrag mit der gleichen ID gefunden wurde, aber Einträge mit demselben Slug existieren
    if (existingIndex === -1 && entriesWithSameSlug.length > 0) {
      // Verwende den ersten Eintrag mit demselben Slug
      existingIndex = postsArray.findIndex(p => p.slug === newSlug);
      console.log(`Kein Eintrag mit ID ${updatedPost.id} gefunden, aber Eintrag mit Slug ${newSlug} gefunden an Index ${existingIndex}`);
    }
    
    // Lösche alle anderen Einträge mit demselben Slug (Duplikate)
    if (entriesWithSameSlug.length > 1) {
      console.log(`${entriesWithSameSlug.length} Einträge mit Slug ${newSlug} gefunden, bereinige Duplikate...`);
      
      // Behalte nur den Eintrag am existingIndex und entferne alle anderen
      for (let i = postsArray.length - 1; i >= 0; i--) {
        if (i !== existingIndex && postsArray[i].slug === newSlug) {
          console.log(`Lösche doppelten Eintrag an Index ${i} mit ID ${postsArray[i].id}`);
          postsArray.splice(i, 1);
          
          // Aktualisiere existingIndex, falls nötig
          if (i < existingIndex) {
            existingIndex--;
          }
        }
      }
    }
    
    if (existingIndex !== -1) {
      // Aktualisiere den bestehenden Eintrag
      postsArray[existingIndex] = indexEntry;
      console.log(`Index-Eintrag aktualisiert für ID: ${updatedPost.id}, Slug: ${newSlug}`);
    } else {
      // Füge einen neuen Eintrag hinzu
      postsArray.push(indexEntry);
      console.log(`Neuer Index-Eintrag hinzugefügt für ID: ${updatedPost.id}, Slug: ${newSlug}`);
    }
    
    // 2. Sende den aktualisierten Index an das PHP-Skript
    const updateIndexResponse = await fetch(UPDATE_BLOG_PHP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'updateIndex',
        indexData: Array.isArray(indexData) ? postsArray : { ...indexData, posts: postsArray }
      })
    });
    
    if (!updateIndexResponse.ok) {
      console.error(`Fehler beim Aktualisieren des Index: ${updateIndexResponse.status}`);
      return false;
    }
    
    console.log('Index erfolgreich aktualisiert');
    return true;
  } catch (error) {
    console.error('Fehler beim Aktualisieren des externen Index:', error);
    return false;
  }
}

export async function PUT(request, { params }) {
  try {
    // Await params and normalize
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ error: 'Slug parameter is required' }, { status: 400 });
    }

    const normalizedSlug = normalizeSlug(slug);
    const updatedPost = await request.json();
    const newSlug = normalizeSlug(updatedPost.slug || normalizedSlug);

    // Lokale Pfade
    const blogDir = path.join(process.cwd(), 'server', 'uploads', 'blog');
    const oldFile = path.join(blogDir, `${normalizedSlug}.json`);
    const newFile = path.join(blogDir, `${newSlug}.json`);

    if (!fs.existsSync(blogDir)) fs.mkdirSync(blogDir, { recursive: true });

    // Speichern unter neuem Pfad
    fs.writeFileSync(newFile, JSON.stringify(updatedPost, null, 2));
    if (normalizedSlug !== newSlug && fs.existsSync(oldFile)) {
      try { fs.unlinkSync(oldFile); } catch {}
    }

    // Index aktualisieren (unterstützt Array oder {posts: []})
    const indexPath = path.join(blogDir, 'index.json');
    let indexData = [];
    let isArrayFormat = true;
    if (fs.existsSync(indexPath)) {
      try {
        const raw = fs.readFileSync(indexPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          indexData = parsed;
          isArrayFormat = true;
        } else if (parsed && Array.isArray(parsed.posts)) {
          indexData = parsed.posts;
          isArrayFormat = false;
        }
      } catch {}
    }

    const indexEntry = {
      id: updatedPost.id,
      slug: newSlug,
      title: updatedPost.title,
      isDraft: updatedPost.isDraft,
      updatedAt: updatedPost.updatedAt,
      category: updatedPost.category,
      tags: Array.isArray(updatedPost.tags) ? updatedPost.tags.join(';') : updatedPost.tags
    };

    let idx = -1;
    if (updatedPost.id) {
      idx = indexData.findIndex(p => p.id && p.id === updatedPost.id);
    }
    if (idx === -1) {
      // Fallback: match by old or new slug
      idx = indexData.findIndex(p => p.slug === normalizedSlug || p.slug === newSlug);
    }
    if (idx >= 0) indexData[idx] = indexEntry; else indexData.push(indexEntry);

    if (isArrayFormat) {
      fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
    } else {
      fs.writeFileSync(indexPath, JSON.stringify({ posts: indexData }, null, 2));
    }

    return NextResponse.json({ success: true, post: updatedPost });
  } catch (error) {
    console.error('Error updating blog post:', error);
    return NextResponse.json(
      { error: 'Failed to update blog post' },
      { status: 500 }
    );
  }
}
