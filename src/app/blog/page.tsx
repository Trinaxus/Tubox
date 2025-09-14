export const dynamic = "force-dynamic";

import BlogList from './BlogList';

// Hilfsfunktion: Lade Blogposts über interne API (unterstützt lokalen/external Modus)
async function getBlogPosts() {
  try {
    // Baue eine robuste absolute Basis-URL (Prod/Dev) und nutze summary=1 für schnelle Karten
    const isProd = !!process.env.VERCEL_URL || process.env.NODE_ENV === 'production';
    const rawBase = isProd
      ? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.NEXT_PUBLIC_SITE_URL || ''))
      : (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'http://localhost:3000');
    const base = rawBase.startsWith('http') ? rawBase.replace(/\/$/, '') : `https://${rawBase.replace(/\/$/, '')}`;
    const res = await fetch(`${base}/api/json-blog?summary=1`, { cache: 'no-store' });
    if (!res.ok) {
      console.error(`[blog/page] API fetch failed: ${res.status} ${res.statusText}`);
      return [];
    }
    const data = await res.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    // Sicherheitshalber Filter für Entwürfe
    return results.filter((post: any) => post && post.isDraft !== '1');
  } catch (error) {
    console.error(`Error fetching blog posts: ${error}`);
    return [];
  }
}

export default async function BlogPage() {
  let posts = [];
  try {
    posts = await getBlogPosts();
  } catch (e) {
    console.error('Fehler beim Laden der Blog-Posts:', e);
    posts = [];
  }
  return <BlogList posts={posts} />;
}
