export const dynamic = "force-dynamic";

import BlogList from './BlogList';

// Hilfsfunktion: Lade Blogposts über interne API (unterstützt lokalen/external Modus)
async function getBlogPosts() {
  try {
    // Baue eine absolute Basis-URL für serverseitiges fetch
    const rawBase = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    const base = rawBase.startsWith('http') ? rawBase.replace(/\/$/, '') : `https://${rawBase.replace(/\/$/, '')}`;
    const apiUrl = `${base}/api/json-blog`;
    const res = await fetch(apiUrl, {
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error(`Failed to fetch blog posts from API: ${res.status} ${res.statusText}`);
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
