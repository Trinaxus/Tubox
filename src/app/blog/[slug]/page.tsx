export const dynamic = "force-dynamic";

// Blog-Detailseite
import { notFound } from 'next/navigation';
import Link from 'next/link';
import blogStyles from '../blogCards.module.css';

type BlogDetailProps = {
  params: {
    slug: string | string[];
  };
};

// Hilfsfunktion: Lade Blog-Post über interne API, damit lokaler Modus funktioniert
async function getBlogPost(slug: string) {
  try {
    const isProd = !!process.env.VERCEL_URL || process.env.NODE_ENV === 'production';
    const rawBase = isProd
      ? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.NEXT_PUBLIC_SITE_URL || ''))
      : (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'http://localhost:3000');
    const base = rawBase.startsWith('http') ? rawBase.replace(/\/$/, '') : `https://${rawBase.replace(/\/$/, '')}`;
    const response = await fetch(`${base}/api/json-blog/${encodeURIComponent(slug)}`, { cache: 'no-store' });
    
    if (!response.ok) {
      console.error(`Blog post not found: ${slug} (Status: ${response.status})`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching blog post: ${error}`);
    return null;
  }
}

export default async function BlogDetail({ params }: BlogDetailProps) {
  const raw = params?.slug as string | string[] | undefined;
  const slug = Array.isArray(raw) ? raw[0] : raw;
  if (!slug) return notFound();
  const decodedSlug = decodeURIComponent(slug);
  
  try {
    // Direktes Lesen der JSON-Datei statt API-Aufruf
    const post = await getBlogPost(decodedSlug);
    
    if (!post) {
      console.error(`Blog post not found: ${decodedSlug}`);
      return notFound();
    }
    
    // Bestimme das Bild (entweder coverImage oder featuredImage)    
    const displayImage = post.coverImage || post.featuredImage || null;
    
    return (
      <article style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
        <Link href="/blog" className={blogStyles.blogBackButton}>
          Zurück
        </Link>
        <h1>{post.title}</h1>
        {displayImage && (
          <img src={displayImage} alt={post.title} style={{ maxWidth: '100%', height: 'auto', borderRadius: 8 }} />
        )}
        <div style={{ margin: '24px 0' }}>
          {/* Render richtig formatiertes HTML mit verarbeiteten Zeilenumbrüchen */}
          {post.content ? (
            <div 
              className="blog-content"
              dangerouslySetInnerHTML={{ __html: post.content }} 
              style={{
                lineHeight: '1.6',
                fontSize: '16px',
              }}
            />
          ) : (
            <span style={{color:'#666'}}>Kein Inhalt vorhanden...</span>
          )}
        </div>
        <p style={{ fontSize: 14, color: '#888' }}>
          Autor: {post.author || 'Unbekannt'} |
          {' '}Geändert:{' '}
          {(() => {
            try {
              if (!post.updatedAt) return 'Unbekannt';
              const d = new Date(post.updatedAt);
              // Deterministisches Format in UTC, um Hydration-Mismatches zu vermeiden
              const fmt = new Intl.DateTimeFormat('de-DE', {
                timeZone: 'UTC',
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
              }).format(d);
              return (
                <time dateTime={d.toISOString()} suppressHydrationWarning>
                  {fmt}
                </time>
              );
            } catch {
              return 'Unbekannt';
            }
          })()}
        </p>
        {/* Tags section with semicolon format */}
        {post.tags && (
          <div style={{ marginTop: '20px' }}>
            <p style={{ fontSize: 14, color: '#888' }}>Tags: 
              {Array.isArray(post.tags) 
                ? post.tags.join('; ')
                : typeof post.tags === 'string' 
                  ? post.tags.split(';').join('; ')
                  : ''
              }
            </p>
          </div>
        )}
      </article>
    );
  } catch (error) {
    console.error('Fehler beim Laden des Blog-Posts:', error);
    return notFound();
  }
}
