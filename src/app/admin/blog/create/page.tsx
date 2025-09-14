"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../adminBlog.module.css";
import PreviewBox from "./PreviewBox";

export default function CreateBlogPostPage() {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [author, setAuthor] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [isDraft, setIsDraft] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/createBlogPost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          excerpt,
          coverImage,
          author,
          tags,
          category,
          content,
          seoTitle,
          seoDescription,
          isDraft: isDraft ? "1" : "0"
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push("/admin/blog");
    } catch (e: any) {
      setError(e.message || "Fehler beim Erstellen");
    }
    setLoading(false);
  }

  return (
    <main className={styles.adminBlogMain}>
      <div style={{display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 36, width: '100%'}}>
        <PreviewBox
          title={title}
          slug={slug}
          excerpt={excerpt}
          coverImage={coverImage}
          author={author}
          tags={tags}
          category={category}
          content={content}
          seoTitle={seoTitle}
          seoDescription={seoDescription}
          isDraft={isDraft}
        />
        <div style={{flex:1, minWidth:320}}>
          <h1 className={styles.adminBlogHeader}>Neuen Blogpost anlegen</h1>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <input
              type="text"
              placeholder="Titel"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              style={{ padding: 12, fontSize: 18, borderRadius: 8, border: "1px solid #222", background: "#18191d", color: "#fff" }}
            />
            <input
              type="text"
              placeholder="Slug (URL)"
              value={slug}
              onChange={e => setSlug(e.target.value)}
              style={{ padding: 12, fontSize: 18, borderRadius: 8, border: "1px solid #222", background: "#18191d", color: "#fff" }}
            />
            <input
              type="text"
              placeholder="Kategorie"
              value={category}
              onChange={e => setCategory(e.target.value)}
              style={{ padding: 12, fontSize: 18, borderRadius: 8, border: "1px solid #222", background: "#18191d", color: "#fff" }}
            />
            <input
              type="text"
              placeholder="Autor"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              style={{ padding: 12, fontSize: 18, borderRadius: 8, border: "1px solid #222", background: "#18191d", color: "#fff" }}
            />
            <input
              type="text"
              placeholder="Tags (mit ; trennen)"
              value={tags}
              onChange={e => setTags(e.target.value)}
              style={{ padding: 12, fontSize: 18, borderRadius: 8, border: "1px solid #222", background: "#18191d", color: "#fff" }}
            />
            <input
              type="text"
              placeholder="Cover Image URL"
              value={coverImage}
              onChange={e => setCoverImage(e.target.value)}
              style={{ padding: 12, fontSize: 18, borderRadius: 8, border: "1px solid #222", background: "#18191d", color: "#fff" }}
            />
            <textarea
              placeholder="Excerpt (Kurzbeschreibung)"
              value={excerpt}
              onChange={e => setExcerpt(e.target.value)}
              rows={3}
              style={{ padding: 12, fontSize: 18, borderRadius: 8, border: "1px solid #222", background: "#18191d", color: "#fff" }}
            />
            <textarea
              placeholder="Inhalt"
              value={content}
              onChange={e => setContent(e.target.value)}
              required
              rows={8}
              style={{ padding: 12, fontSize: 18, borderRadius: 8, border: "1px solid #222", background: "#18191d", color: "#fff" }}
            />
            <input
              type="text"
              placeholder="SEO Title"
              value={seoTitle}
              onChange={e => setSeoTitle(e.target.value)}
              style={{ padding: 12, fontSize: 18, borderRadius: 8, border: "1px solid #222", background: "#18191d", color: "#fff" }}
            />
            <textarea
              placeholder="SEO Description"
              value={seoDescription}
              onChange={e => setSeoDescription(e.target.value)}
              rows={2}
              style={{ padding: 12, fontSize: 18, borderRadius: 8, border: "1px solid #222", background: "#18191d", color: "#fff" }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={isDraft}
                onChange={e => setIsDraft(e.target.checked)}
              />
              Als Entwurf speichern
            </label>
            <button
              type="submit"
              disabled={loading}
              className={styles.adminCreateButton}
            >
              {loading ? "Speichern..." : "Blogpost anlegen"}
            </button>
            {error && <div className={styles.adminBlogError}>{error}</div>}
          </form>
        </div>
      </div>
    </main>
  );
}
