import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

function normalizeSlug(slug: string): string {
  return String(slug || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function POST(req: NextRequest) {
  const {
    title,
    slug: providedSlug,
    content,
    excerpt,
    coverImage,
    author,
    tags,
    category,
    isDraft,
    seoTitle,
    seoDescription
  } = await req.json();

  if (!title || !content) {
    return NextResponse.json({ error: 'Titel und Inhalt sind erforderlich.' }, { status: 400 });
  }

  try {
    // Slug ermitteln/normalisieren
    let slug = providedSlug as string | undefined;
    if (!slug) {
      const mixSetRegex = /trinax mix set (\d+)\s*-\s*(\d{2})\.(\d{2})\.(\d{4})/i;
      const match = title.match(mixSetRegex);
      if (match) {
        const setNumber = match[1].padStart(3, '0');
        const day = match[2];
        const month = match[3];
        const year = match[4];
        slug = `trinax-mix-set-${setNumber}-${day}${month}${year}`;
      } else {
        slug = title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
      }
    }
    slug = normalizeSlug(slug || '');

    const useExternal = (process.env.USE_EXTERNAL || 'false').toLowerCase() === 'true';
    const EXTERNAL_BLOG_URL = process.env.EXTERNAL_BLOG_URL || '';
    const UPDATE_BLOG_PHP_URL = process.env.UPDATE_BLOG_PHP_URL || '';

    // Existenz prüfen (extern bevorzugt)
    if (useExternal && EXTERNAL_BLOG_URL) {
      try {
        const check = await fetch(`${EXTERNAL_BLOG_URL}/${encodeURIComponent(slug)}.json?t=${Date.now()}`, { cache: 'no-store' });
        if (check.ok) {
          return NextResponse.json({ error: `Ein Blog-Post mit dem Slug "${slug}" existiert bereits.` }, { status: 400 });
        }
      } catch {}
    } else {
      // Lokaler Fallback
      const blogDir = path.join(process.cwd(), 'server', 'uploads', 'blog');
      if (!fs.existsSync(blogDir)) fs.mkdirSync(blogDir, { recursive: true });
      const postPath = path.join(blogDir, `${slug}.json`);
      if (fs.existsSync(postPath)) {
        return NextResponse.json({ error: `Ein Blog-Post mit dem Slug "${slug}" existiert bereits.` }, { status: 400 });
      }
    }

    const now = new Date().toISOString();
    const id = Date.now();
    const tagsArray = Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(';').map((t) => t.trim()).filter(Boolean) : []);

    const blogPost = {
      id,
      title,
      slug,
      content,
      excerpt: excerpt || '',
      coverImage: coverImage || '',
      featuredImage: coverImage || '',
      author: author || 'Trinax',
      category: category || '',
      tags: tagsArray,
      isDraft: (isDraft === '1' || isDraft === 1 || isDraft === true) ? '1' : '0',
      seoTitle: seoTitle || '',
      seoDescription: seoDescription || '',
      createdAt: now,
      updatedAt: now,
      publishedAt: (isDraft === '1' || isDraft === 1 || isDraft === true) ? null : now,
    };

    if (useExternal && UPDATE_BLOG_PHP_URL) {
      // Extern speichern
      const resp = await fetch(UPDATE_BLOG_PHP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', oldSlug: slug, newSlug: slug, data: blogPost })
      });
      const text = await resp.text();
      if (!resp.ok) {
        return NextResponse.json({ error: `Externes Speichern fehlgeschlagen: ${resp.status} ${resp.statusText}`, raw: text }, { status: 500 });
      }
      let json: any = null; try { json = JSON.parse(text); } catch {}
      return NextResponse.json({ success: true, post: { id, title, slug, isDraft: blogPost.isDraft }, response: json || text });
    }

    // Lokaler Fallback
    const blogDir = path.join(process.cwd(), 'server', 'uploads', 'blog');
    if (!fs.existsSync(blogDir)) fs.mkdirSync(blogDir, { recursive: true });
    const postPath = path.join(blogDir, `${slug}.json`);
    fs.writeFileSync(postPath, JSON.stringify(blogPost, null, 2), 'utf8');
    // Minimalantwort im Fallback
    return NextResponse.json({ success: true, post: { id, title, slug, isDraft: blogPost.isDraft }, fallback: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Fehler beim Erstellen' }, { status: 500 });
  }
}
