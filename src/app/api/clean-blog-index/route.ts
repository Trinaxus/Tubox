import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Verwende Node.js Runtime anstatt Edge Runtime
export const runtime = 'nodejs';

// Hilfsfunktion zum Normalisieren von Slugs
function normalizeSlug(slug: string): string {
  return String(slug || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

type BlogPostEntry = {
  id: string | number;
  slug: string;
  title?: string;
  isDraft?: string | number;
  updatedAt?: string;
  [key: string]: any;
};

export async function GET(request: Request) {
  try {
    const blogDir = path.join(process.cwd(), 'server', 'uploads', 'blog');
    const indexPath = path.join(blogDir, 'index.json');
    if (!fs.existsSync(indexPath)) {
      return NextResponse.json({ error: 'index.json nicht gefunden' }, { status: 404 });
    }

    const raw = fs.readFileSync(indexPath, 'utf8');
    let indexData: any;
    try { indexData = JSON.parse(raw); } catch (e) {
      return NextResponse.json({ error: 'Ungültige index.json' }, { status: 500 });
    }

    let postsArray: BlogPostEntry[] = [];
    let isArrayFormat = false;
    if (Array.isArray(indexData)) {
      postsArray = indexData as BlogPostEntry[];
      isArrayFormat = true;
    } else if (indexData?.posts && Array.isArray(indexData.posts)) {
      postsArray = indexData.posts as BlogPostEntry[];
      isArrayFormat = false;
    } else {
      return NextResponse.json({ error: 'Unerwartetes Format der index.json' }, { status: 500 });
    }

    const originalCount = postsArray.length;

    // Gruppiere nach normalisiertem Slug
    const postsBySlug: Record<string, BlogPostEntry[]> = {};
    for (const post of postsArray) {
      const key = normalizeSlug(post.slug);
      if (!postsBySlug[key]) postsBySlug[key] = [];
      postsBySlug[key].push(post);
    }

    const cleanedPosts: BlogPostEntry[] = [];
    for (const [slug, posts] of Object.entries(postsBySlug)) {
      if (posts.length > 1) {
        posts.sort((a, b) => {
          const aDraft = String(a.isDraft ?? '0');
          const bDraft = String(b.isDraft ?? '0');
          if (aDraft === '1' && bDraft === '0') return -1;
          if (aDraft === '0' && bDraft === '1') return 1;
          const aTime = new Date(a.updatedAt || '1970-01-01').getTime();
          const bTime = new Date(b.updatedAt || '1970-01-01').getTime();
          return bTime - aTime;
        });
        cleanedPosts.push(posts[0]);
      } else {
        cleanedPosts.push(posts[0]);
      }
    }

    const cleanedCount = cleanedPosts.length;
    const removedCount = originalCount - cleanedCount;

    // Zurückschreiben im ursprünglichen Format
    if (isArrayFormat) {
      fs.writeFileSync(indexPath, JSON.stringify(cleanedPosts, null, 2), 'utf8');
    } else {
      fs.writeFileSync(indexPath, JSON.stringify({ ...indexData, posts: cleanedPosts }, null, 2), 'utf8');
    }

    return NextResponse.json({
      success: true,
      message: 'Blog-Index lokal bereinigt',
      originalCount,
      cleanedCount,
      removedCount
    });
  } catch (error) {
    console.error('Fehler beim Bereinigen des Blog-Index:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
