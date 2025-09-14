"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import blogStyles from './blogCards.module.css';

// Hilfsfunktion zum Normalisieren von Slugs (lokal definiert, um Abhängigkeit von baserow.ts zu entfernen)
function normalizeSlug(slug: string): string {
  // Ersetze Schrägstriche und andere Sonderzeichen durch Bindestriche
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}


function CategoryFilter({ categories, selected, setSelected }: { categories: string[]; selected: string; setSelected: (cat: string) => void }) {
  return (
    <div className={blogStyles.blogCategories}>
      <button
        className={blogStyles['blog-filter-button'] + (selected === 'Alle' ? ' ' + blogStyles.active : '')}
        onClick={() => setSelected('Alle')}
      >Alle</button>
      {categories.map(cat => (
        <button
          key={cat}
          className={blogStyles['blog-filter-button'] + (selected === cat ? ' ' + blogStyles.active : '')}
          onClick={() => setSelected(cat)}
        >{cat}</button>
      ))}
    </div>
  );
}

export default function BlogList({ posts }: { posts: any[] }) {
  const [selected, setSelected] = useState<string>('Alle');
  const [error, setError] = useState<string | null>(null);
  const [clientPosts, setClientPosts] = useState<any[]>(Array.isArray(posts) ? posts : []);
  const [loading, setLoading] = useState<boolean>(false);
  const [enriched, setEnriched] = useState<boolean>(false);

  // Client-Fallback: Wenn SSR keine Posts geliefert hat, lade sie clientseitig
  useEffect(() => {
    if (!clientPosts || clientPosts.length === 0) {
      setLoading(true);
      fetch('/api/json-blog', { cache: 'no-store' })
        .then(async (res) => {
          if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
          const data = await res.json();
          const results = Array.isArray(data?.results) ? data.results : [];
          setClientPosts(results);
        })
        .catch((e) => setError(`Konnte Blogposts nicht laden: ${e.message}`))
        .finally(() => setLoading(false));
    }
  }, []);

  // Enrichment: Falls Metadaten/Bild fehlen, lade Detail-Post nach und übernehme fehlende Felder
  useEffect(() => {
    if (enriched) return; // nur einmal versuchen
    const needsMeta = (p: any) => {
      const noImg = !p?.coverImage && !p?.featuredImage && !(Array.isArray(p?.images) && p.images[0]);
      const noExcerpt = !p?.excerpt || (typeof p.excerpt === 'string' && p.excerpt.trim() === '');
      const noTags = !p?.tags || (Array.isArray(p.tags) ? p.tags.length === 0 : (typeof p.tags === 'string' && p.tags.trim() === ''));
      const noCat = !p?.category;
      const noAuthorOrDate = !p?.author || !p?.updatedAt;
      return noImg || noExcerpt || noTags || noCat || noAuthorOrDate;
    };
    const missing = (clientPosts || []).map((p, i) => ({ p, i })).filter(({ p }) => p?.slug && needsMeta(p));
    if (missing.length === 0) {
      setEnriched(true);
      return;
    }
    (async () => {
      try {
        const updated = [...clientPosts];
        await Promise.all(missing.map(async ({ p, i }) => {
          try {
            const res = await fetch(`/api/json-blog/${encodeURIComponent(p.slug)}`, { cache: 'no-store' });
            if (!res.ok) return;
            const full = await res.json();
            const cover = full?.coverImage || full?.featuredImage || (Array.isArray(full?.images) ? full.images[0] : '');
            // Excerpt ableiten: zuerst <style>/<script>-Blöcke entfernen, dann HTML-Tags strippen
            const excerpt = (typeof full?.excerpt === 'string' && full.excerpt.trim())
              ? full.excerpt
              : (typeof full?.content === 'string'
                  ? (() => {
                      const withoutStyle = full.content
                        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
                      const textOnly = withoutStyle
                        .replace(/<[^>]*>/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                      return textOnly.length > 220 ? textOnly.slice(0, 217) + '…' : textOnly;
                    })()
                  : undefined);
            const tags = Array.isArray(full?.tags)
              ? full.tags
              : (typeof full?.tags === 'string' ? full.tags.split(';').map((t: string) => t.trim()).filter(Boolean) : undefined);
            const category = full?.category ?? p.category;
            const author = full?.author ?? p.author;
            const updatedAt = full?.updatedAt ?? p.updatedAt;

            updated[i] = {
              ...p,
              ...(cover ? { coverImage: cover } : {}),
              ...(excerpt ? { excerpt } : {}),
              ...(tags ? { tags } : {}),
              ...(category ? { category } : {}),
              ...(author ? { author } : {}),
              ...(updatedAt ? { updatedAt } : {}),
            };
          } catch {}
        }));
        setClientPosts(updated);
      } finally {
        setEnriched(true);
      }
    })();
  }, [clientPosts, enriched]);
  const placeholderImg = "https://placehold.co/600x300?text=Kein+Bild";
  const toProxy = (u: string | null | undefined) => {
    if (!u || typeof u !== 'string') return u || '';
    if (u.startsWith('/api/proxy-file')) return u;
    const marker = '/uploads/';
    const idx = u.indexOf(marker);
    if (idx >= 0) {
      const rel = u.substring(idx + marker.length);
      return `/api/proxy-file?path=${encodeURIComponent(rel)}`;
    }
    // Allow direct relative like 2000/... or blog/...
    if (/^\d{4}\//.test(u) || u.startsWith('blog/')) {
      return `/api/proxy-file?path=${encodeURIComponent(u)}`;
    }
    return u;
  };

  // Sicherstellen, dass posts ein Array ist
  const validPosts = Array.isArray(clientPosts) ? clientPosts : [];
  
  // Debug-Ausgabe der Posts-Struktur
  console.log('BlogList received posts:', validPosts);
  
  // Sicheres Extrahieren von Kategorien
  const categories = Array.from(new Set(
    validPosts
      .map((p: any) => p && typeof p === 'object' ? p.category : null)
      .filter(Boolean)
  ));
  
  // Robustere Filterung der Posts
  const filteredPosts = selected === 'Alle'
    ? validPosts.filter((post: any) => 
        post && typeof post === 'object' && 
        (post.isDraft === '0' || post.isDraft === 0 || post.isDraft === false || post.isDraft === undefined))
    : validPosts.filter((post: any) => 
        post && typeof post === 'object' && 
        (post.isDraft === '0' || post.isDraft === 0 || post.isDraft === false || post.isDraft === undefined) && 
        post.category === selected);

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <CategoryFilter categories={categories} selected={selected} setSelected={setSelected} />
      {error && <div style={{ color: 'red', marginBottom: 16 }}>Fehler: {error}</div>}
      <div className={blogStyles.blogGrid}>
        {loading && (
          <div style={{ color: '#888', marginTop: 16 }}>Lade Blogposts…</div>
        )}
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post: any, index: number) => (
            <div className={blogStyles.blogCard} key={post.id || `post-${index}`}>
              <div className={blogStyles.blogImageContainer}>
                <img
                  src={toProxy((post.coverImage || post.featuredImage || (Array.isArray(post.images) ? post.images[0] : '')) as string) || placeholderImg}
                  alt={post.title || 'Blog-Beitrag'}
                  className={blogStyles.blogImage}
                  loading="lazy"
                  onError={(e) => {
                    // Fallback bei Bild-Ladefehler
                    (e.target as HTMLImageElement).src = placeholderImg;
                  }}
                />
              </div>
              <div className={blogStyles.blogContent}>
                <h2 className={blogStyles.blogTitle}>{post.title || 'Ohne Titel'}</h2>
                <div className={blogStyles.blogCardLine} />
                <div className={blogStyles.blogMetaRow}>
                  {post.tags && (
                    Array.isArray(post.tags) 
                      ? post.tags
                          .filter((t: string) => t && t.trim())
                          .map((tag: string, i: number) => (
                            <span key={i} className={blogStyles.blogTag}>{tag.trim()}</span>
                          ))
                      : typeof post.tags === 'string'
                        ? post.tags.split(';')
                            .filter((t: string) => t && t.trim())
                            .map((tag: string, i: number) => (
                              <span key={i} className={blogStyles.blogTag}>{tag.trim()}</span>
                            ))
                        : null
                  )}
                </div>
                <div className={blogStyles.blogCardLine} />
                <div className={blogStyles.blogMetaRow}>
                  {post.publishedAt && (
                    <span className={blogStyles.blogDate}>
                      {new Date(post.publishedAt).toLocaleString('de-DE', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  )}
                  {post.author && (
                    <span className={blogStyles.blogAuthor}>{post.author}</span>
                  )}
                </div>
                <div
                  className={blogStyles.blogExcerpt}
                  dangerouslySetInnerHTML={{ 
                    __html: ((post.excerpt && typeof post.excerpt === 'string') ? 
                      post.excerpt.replace(/\n/g, "<br>") : 
                      "Keine Beschreibung vorhanden.")
                  }}
                />
                {post.slug && (
                  <Link 
                    className={blogStyles.blogReadMore} 
                    href={`/blog/${normalizeSlug(post.slug)}`}
                  >
                    Weiterlesen
                  </Link>
                )}
              </div>
            </div>
          ))
        ) : (
          <div style={{ color: '#888', marginTop: 32, fontSize: 18 }}>Keine Blogposts gefunden.</div>
        )}
      </div>
    </main>
  );
}
