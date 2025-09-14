import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Verwende Node.js Runtime anstatt Edge Runtime
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  console.log('DELETE BLOG POST API CALLED');
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id or slug' }, { status: 400 });

  try {
    const useExternal = (process.env.USE_EXTERNAL || 'false').toLowerCase() === 'true';
    const EXTERNAL_BLOG_URL = process.env.EXTERNAL_BLOG_URL || '';
    const UPDATE_BLOG_PHP_URL = process.env.UPDATE_BLOG_PHP_URL || '';

    console.log(`Attempting to delete blog post with ID/Slug: ${id}`);

    if (useExternal && UPDATE_BLOG_PHP_URL) {
      // Slug bestimmen: bei numerischer ID, externen Index lesen
      let slug = String(id);
      if (!isNaN(Number(id)) && EXTERNAL_BLOG_URL) {
        try {
          const res = await fetch(`${EXTERNAL_BLOG_URL}/index.json?t=${Date.now()}`, { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            const arr = Array.isArray(data) ? data : (data?.posts || []);
            const post = arr.find((p: any) => p.id === Number(id) || p.id === id);
            if (!post) return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
            slug = post.slug;
          }
        } catch {}
      }

      const response = await fetch(UPDATE_BLOG_PHP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_post', slug })
      });
      const text = await response.text();
      if (!response.ok) {
        return NextResponse.json({ error: `Failed to delete blog post: ${response.status} ${response.statusText}`, raw: text }, { status: response.status });
      }
      let json: any = null; try { json = JSON.parse(text); } catch {}
      return NextResponse.json({ success: true, response: json || text });
    }

    // Lokaler Fallback
    const blogDir = path.join(process.cwd(), 'server', 'uploads', 'blog');
    const indexPath = path.join(blogDir, 'index.json');
    if (!fs.existsSync(indexPath)) return NextResponse.json({ error: 'Index not found' }, { status: 404 });
    const indexRaw = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    let postsArray: any[] = Array.isArray(indexRaw) ? indexRaw : (indexRaw?.posts || []);
    let slug = String(id);
    if (!isNaN(Number(id))) {
      const post = postsArray.find(p => (p.id === Number(id) || p.id === id));
      if (!post) return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
      slug = post.slug;
    }
    const postPath = path.join(blogDir, `${slug}.json`);
    if (fs.existsSync(postPath)) try { fs.unlinkSync(postPath); } catch {}
    const newPosts = postsArray.filter(p => !(p.slug === slug || p.id === id || p.id === Number(id)));
    if (Array.isArray(indexRaw)) fs.writeFileSync(indexPath, JSON.stringify(newPosts, null, 2), 'utf8');
    else fs.writeFileSync(indexPath, JSON.stringify({ ...indexRaw, posts: newPosts }, null, 2), 'utf8');
    return NextResponse.json({ success: true, fallback: true });
  } catch (e: any) {
    console.error('Error deleting blog post:', e);
    return NextResponse.json({ error: e.message || 'Fehler beim Löschen' }, { status: 500 });
  }
}
