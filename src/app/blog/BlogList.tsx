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
                  src={toProxy(post.coverImage) || placeholderImg}
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
