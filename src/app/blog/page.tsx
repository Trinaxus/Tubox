export const dynamic = "force-dynamic";

import BlogList from './BlogList';

// Hilfsfunktion: Lade Blogposts über interne API (unterstützt lokalen/external Modus)
async function getBlogPosts() {
  try {
    // Nutze relative interne API-URL (funktioniert in SSR zuverlässig)
    const endpoint = `/api/json-blog`;
    const res = await fetch(endpoint, { cache: 'no-store' });
    if (!res.ok) {
      console.error(`[blog/page] API fetch failed: ${res.status} ${res.statusText}`);
      return [];
    }
    const data = await res.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    console.log(`[blog/page] results length: ${results.length}`);
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
