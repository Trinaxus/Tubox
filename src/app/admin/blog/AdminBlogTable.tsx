"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./adminBlog.module.css";

export default function AdminBlogTable({ posts: initialPosts, mode }: { posts: any[], mode: "draft" | "published" }) {
  const [posts, setPosts] = useState(initialPosts);
  // Synchronisiere posts-State mit Props!
  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!window.confirm("Diesen Blogpost wirklich löschen?")) return;
    setLoading(id);
    setError(null);
    try {
      console.log(`Attempting to delete blog post with ID: ${id}`);
      
      // Stelle sicher, dass die ID als Zahl übergeben wird, wenn es eine numerische ID ist
      const numericId = !isNaN(Number(id)) ? Number(id) : id;
      
      const res = await fetch("/api/admin/deleteBlogPost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: numericId }),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Error deleting blog post: ${errorText}`);
        throw new Error(errorText);
      }
      
      setPosts(posts.filter((p) => p.id.toString() !== id.toString()));
    } catch (e: any) {
      console.error(`Exception during delete: ${e.message}`);
      setError(e.message || "Fehler beim Löschen");
    }
    setLoading(null);
  }

  return (
    <div style={{marginTop: 18, width: '100%'}}>
      {error && <div className={styles.adminBlogError}>{error}</div>}
      {posts.length > 0 ? (
        <div className={styles.adminBlogTableContainer}>
          <table className={styles.adminBlogTable}>
            <thead>
              <tr>
                <th>Titel</th>
                <th>Kategorie</th>
                <th>Status</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post: any, index: number) => {
                // Stelle sicher, dass jeder Post eine eindeutige und stabile ID hat
                // Verwende eine Kombination aus vorhandener ID, Slug, Titel und Index für maximale Stabilität
                const postId = post.id ? post.id.toString() : 
                               post.slug ? `slug-${post.slug}` : 
                               post.title ? `title-${post.title.replace(/\s+/g, '-').toLowerCase()}` : 
                               `post-index-${index}`;
                
                return (
                  <tr key={postId}>
                    <td data-label="Titel">{post.title || 'Ohne Titel'}</td>
                    <td data-label="Kategorie">{post.category || '-'}</td>
                    <td data-label="Status">
                      {post.isDraft === '1' || post.isDraft === 1 ? 'Entwurf' : 'Veröffentlicht'}
                    </td>
                    <td data-label="Aktionen">
                      <Link 
                        href={`/admin/blog/edit/${postId}`} 
                        className={styles.adminBlogActionLink}
                      >
                        Bearbeiten
                      </Link>
                      <button 
                        onClick={() => handleDelete(postId)} 
                        className={styles.adminBlogDeleteButton}
                        disabled={loading === postId}
                      >
                        {loading === postId ? "Lösche..." : "Löschen"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.adminBlogEmpty}>
          {mode === "draft" ? "Keine Entwürfe vorhanden." : "Keine veröffentlichten Blogposts."}
        </div>
      )}
    </div>
  );
}
