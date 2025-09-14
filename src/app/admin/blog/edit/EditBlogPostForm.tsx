"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "../adminBlog.module.css";
import editBlogPostForm from './editBlogPostForm.module.css';
import previewBox from "./previewBox.module.css";

// Hilfsfunktion zum Normalisieren von Slugs
function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return isMobile;
}

const BLOG_CONTENT_TEMPLATE = (userContent: string) => `
<style>
@media (max-width: 800px) {
  .info-cards-flex {
    flex-direction: column !important;
    gap: 12px !important;
    align-items: stretch !important;
  }
  .info-cards-flex > div {
    min-width: 0 !important;
    width: 100% !important;
    margin-right: 0 !important;
  }
  ul, li, span, h5 {
    font-size: 1em !important;
  }
}
.blog-content-outer {
  border: 1px solid #ff3b304d;
  padding: 10px;
  border-radius: 16px;
  background: linear-gradient(90deg, rgba(0,225,255,0.05) 0%, rgba(255,105,180,0.05) 100%);
  max-width: 800px;
  margin: 30px auto;
  box-sizing: border-box;
  transition: border 0.5s;
}
.blog-content-outer:hover {
  box-shadow: 0 0 24px rgba(255, 42, 0, 0.3), 0 0 0 0px rgba(255, 42, 0, 0.3);
  border: 1px solid #ff3b3070;
}
</style>
<div class="blog-content-outer">
  <div style="
    background: rgba(255,255,255,0.05);
    border-radius: 13px;
    padding: 15px;
    box-sizing: border-box;"><!-- -------------------Dein Text start---------- -->
${userContent}
<!-- -------------------Dein Text ende---------- --></div>
</div>`;

function extractUserContentFromTemplate(html: string): string {
  const match = html.match(/<!-- -------------------Dein Text start---------- -->([\s\S]*?)<!-- -------------------Dein Text ende---------- -->/);
  return match ? match[1].trim() : html;
}

export default function EditBlogPostForm({ post }: { post: any }) {
  const [title, setTitle] = useState(post.title || "");
  const [slug, setSlug] = useState(post.slug || "");
  const [excerpt, setExcerpt] = useState(post.excerpt || "");
  const [coverImage, setCoverImage] = useState(post.coverImage || "");
  const [author, setAuthor] = useState(post.author || "");
  const [tags, setTags] = useState(post.tags || "");
  const [category, setCategory] = useState(post.category || "");
  // Nur reinen Blogtext anzeigen
  const [content, setContent] = useState(post.content ? extractUserContentFromTemplate(post.content) : "");
  const [seoTitle, setSeoTitle] = useState(post.seoTitle || "");
  const [seoDescription, setSeoDescription] = useState(post.seoDescription || "");
  const [isDraft, setIsDraft] = useState(post.isDraft === "1");
  const [preview, setPreview] = useState(false);
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const router = useRouter();

  // Vorschau-Komponente
  function Preview() {
    return (
      <div className={previewBox.previewBox}>
        <div className={previewBox.previewHeader}>Vorschau</div>
        <div className={previewBox.previewTitle}>{title || <span style={{color:'#888'}}>Titel...</span>}</div>
        {coverImage && (
          <img src={coverImage} alt="Cover" className={previewBox.previewCover} />
        )}
        {excerpt && <div className={previewBox.previewExcerpt}>{excerpt}</div>}
        <div className={previewBox.previewContent}>
          {content
            ? <div dangerouslySetInnerHTML={{ __html: BLOG_CONTENT_TEMPLATE(content) }} />
            : <span style={{color:'#666'}}>Inhalt...</span>
          }
        </div>
        <div className={previewBox.previewMeta}>Autor: <b>{author || <span style={{color:'#666'}}>–</span>}</b></div>
        <div className={previewBox.previewMeta}>Kategorie: <b>{category || <span style={{color:'#666'}}>–</span>}</b></div>
        <div className={previewBox.previewMeta}>Tags: <b>{tags || <span style={{color:'#666'}}>–</span>}</b></div>
        <div className={previewBox.previewSeo}>
          <b>SEO Title:</b> {seoTitle || <span style={{color:'#888'}}>–</span>}<br/>
          <b>SEO Description:</b> {seoDescription || <span style={{color:'#888'}}>–</span>}
        </div>
        {isDraft && <div className={previewBox.previewDraft}>Entwurf</div>}
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Prüfe, ob alle notwendigen Daten vorhanden sind
      if (!post) {
        throw new Error('Kein Blog-Post zum Bearbeiten gefunden');
      }
      
      if (!title) {
        throw new Error('Bitte geben Sie einen Titel ein');
      }
      
      const contentWithTemplate = BLOG_CONTENT_TEMPLATE(content);
      
      // Verwende den ursprünglichen Slug für die API-Anfrage
      // Wenn kein Slug vorhanden ist, verwende die ID
      const originalSlug = post.slug || `post-${post.id}`;
      const newSlug = normalizeSlug(slug || title);
      
      console.log('Aktualisiere Blog-Post:', originalSlug, '-> Neuer Slug:', newSlug);
      
      // Verarbeite Tags je nach Format
      let formattedTags = tags;
      
      // Wenn tags ein String ist (z.B. "tag1;tag2;tag3")
      if (typeof tags === 'string' && tags.includes(';')) {
        // Konvertiere zu Array für die JSON-Datei
        formattedTags = tags.split(';').map(tag => tag.trim()).filter(tag => tag !== '');
      } 
      // Wenn tags bereits ein Array ist, belasse es so
      else if (Array.isArray(tags)) {
        formattedTags = tags;
      }
      // Sonst, wenn es ein einzelner String ohne Trennzeichen ist
      else if (typeof tags === 'string') {
        formattedTags = [tags];
      }
      
      console.log('Formatierte Tags:', formattedTags);
      
      // Erstelle die aktualisierten Daten
      const updatedPost = {
        id: post.id || `blog-${Date.now()}`, // Behalte die ursprüngliche ID bei oder erstelle eine neue
        title,
        slug: newSlug,
        excerpt,
        coverImage: coverImage, // Verwende coverImage für die Konsistenz
        featuredImage: coverImage, // Einige Dateien verwenden featuredImage
        author,
        tags: formattedTags,
        category,
        content: contentWithTemplate,
        seoTitle,
        seoDescription,
        isDraft: isDraft ? "1" : "0", // Stelle sicher, dass isDraft als String gespeichert wird
        publishedAt: post.publishedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdAt: post.createdAt || post.publishedAt || new Date().toISOString(),
      };
      
      console.log('Sende aktualisierte Daten:', updatedPost);
      
      // Stelle sicher, dass isDraft als String übergeben wird
      console.log('isDraft Status vor dem Senden:', updatedPost.isDraft, typeof updatedPost.isDraft);
      
      // Direkter Zugriff auf die API-Route
      const res = await fetch(`/api/json-blog/${originalSlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPost),
      });
      
      const responseText = await res.text();
      console.log('API-Antwort:', responseText);
      
      if (!res.ok) {
        console.error('Fehler beim Speichern:', responseText);
        throw new Error(responseText || 'Fehler beim Speichern');
      }
      
      let result;
      try {
        result = JSON.parse(responseText);
        console.log('Blog-Post erfolgreich aktualisiert:', result);
      } catch (parseError) {
        console.warn('Konnte API-Antwort nicht parsen:', parseError);
      }
      
      // Warte kurz, um sicherzustellen, dass die Änderungen übernommen wurden
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Zurück zur Blog-Übersicht und erzwinge eine Aktualisierung
      router.push("/admin/blog?refresh=" + Date.now());
    } catch (e: any) {
      console.error('Fehler beim Speichern:', e);
      setError(e.message || "Fehler beim Speichern");
    } finally {
      setLoading(false);
    }
  }

  const isMobile = useIsMobile();
  return (
    <main className={styles.adminBlogMain}>
      <div className={editBlogPostForm.editBlogWrapper}>
        {isMobile ? (
          <>
            <div style={{flex:1, minWidth:320}}>
              <h1 className={styles.adminBlogHeader}>Blogpost bearbeiten</h1>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <input type="text" placeholder="Titel" value={title} onChange={e => setTitle(e.target.value)} required style={{ padding: 12, fontSize: 18, borderRadius: 8, border: "1px solid #222", background: "#18191d", color: "#fff" }} />
            <input type="text" placeholder="Slug (URL)" value={slug} onChange={e => setSlug(e.target.value)} style={{ padding: 12, fontSize: 18, borderRadius: 8, border: "1px solid #222", background: "#18191d", color: "#fff" }} />
            <input type="text" placeholder="Kategorie" value={category} onChange={e => setCategory(e.target.value)} style={{ padding: 12, fontSize: 18, borderRadius: 8, border: "1px solid #222", background: "#18191d", color: "#fff" }} />
            <input type="text" placeholder="Autor" value={author} onChange={e => setAuthor(e.target.value)} style={{ padding: 12, fontSize: 18, borderRadius: 8, border: "1px solid #222", background: "#18191d", color: "#fff" }} />
            <input type="text" placeholder="Tags (mit ; trennen)" value={tags} onChange={e => setTags(e.target.value)} style={{ padding: 12, fontSize: 18, borderRadius: 8, border: "1px solid #222", background: "#18191d", color: "#fff" }} />
            <input type="text" placeholder="Cover Image URL" value={coverImage} onChange={e => setCoverImage(e.target.value)} style={{ padding: 12, fontSize: 18, borderRadius: 8, border: "1px solid #222", background: "#18191d", color: "#fff" }} />
            <textarea placeholder="Excerpt (Kurzbeschreibung)" value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={3} style={{ padding: 12, fontSize: 18, borderRadius: 8, border: "1px solid #222", background: "#18191d", color: "#fff" }} />
            <div>
              <label style={{marginBottom:4,display:'block',fontWeight:600}}>Inhalt</label>
              <div className={styles.editorContainer}>
                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Inhalt des Blogposts..."
                  style={{
                    width: '100%',
                    minHeight: '300px',
                    padding: '12px',
                    background: '#18191d',
                    color: '#fff',
                    border: '1px solid var(--color-primary-500)',
                    borderRadius: '8px 8px 0 0',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    fontSize: '16px',
                    lineHeight: '1.5'
                  }}
                />
                <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#242527', borderRadius: '0 0 8px 8px', borderLeft: '1px solid var(--color-primary-500)', borderRight: '1px solid var(--color-primary-500)', borderBottom: '1px solid var(--color-primary-500)'}}>
                  <div style={{fontSize: '12px', color: '#aaa'}}>
                    <i>HTML-Tags für Formatierung werden unterstützt (z.B. &lt;b&gt;, &lt;i&gt;, &lt;h2&gt;)</i>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setShowHtmlPreview(!showHtmlPreview)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-primary-500)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 600
                    }}
                  >
                    {showHtmlPreview ? 'Vorschau ausblenden' : 'Vorschau anzeigen'}
                  </button>
                </div>
                
                {showHtmlPreview && (
                  <div style={{
                    marginTop: '16px',
                    padding: '16px',
                    background: '#fff',
                    color: '#222',
                    borderRadius: '8px',
                    border: '1px solid var(--color-primary-500)',
                    maxHeight: '600px',
                    overflow: 'auto'
                  }}>
                    <h3 style={{marginTop: 0, color: '#333', borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '16px'}}>Vorschau</h3>
                    <div 
                      dangerouslySetInnerHTML={{ 
                        __html: content
                          // Ersetze alleinstehende Zeilen mit Absätzen
                          .split('\n\n')
                          .map((paragraph: string) => paragraph.trim() ? `<p>${paragraph}</p>` : '')
                          .join('')
                          // Ersetze einzelne Zeilenumbrüche mit <br>
                          .replace(/\n/g, '<br>')
                      }} 
                      style={{
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        fontSize: '16px',
                        lineHeight: '1.6'
                      }} 
                      className="blog-preview"
                    />
                  </div>
                )}
              </div>
            </div>
            <input type="text" placeholder="SEO Title" value={seoTitle} onChange={e => setSeoTitle(e.target.value)} style={{ padding: 12, fontSize: 18, borderRadius: 8, border: "1px solid #222", background: "#18191d", color: "#fff" }} />
            <textarea placeholder="SEO Description" value={seoDescription} onChange={e => setSeoDescription(e.target.value)} rows={2} style={{ padding: 12, fontSize: 18, borderRadius: 8, border: "1px solid #222", background: "#18191d", color: "#fff" }} />
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={isDraft} onChange={e => setIsDraft(e.target.checked)} />
              Als Entwurf speichern
            </label>
            <button type="submit" disabled={loading} className={styles.adminCreateButton}>{loading ? "Speichern..." : "Änderungen speichern"}</button>
            {error && <div className={styles.adminBlogError}>{error}</div>}
          </form>
            </div>
            <Preview />
          </>
        ) : (
          <>
            <Preview />
            <div style={{flex:1, minWidth:320}}>
              <h1 className={styles.adminBlogHeader}>Blogpost bearbeiten</h1>
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
  <input type="text" placeholder="Titel" value={title} onChange={e => setTitle(e.target.value)} required style={{ padding: 12, fontSize: 18, borderRadius: 8, border: "1px solid #222", background: "#18191d", color: "#fff" }} />
  <input type="text" placeholder="Slug (URL)" value={slug} onChange={e => setSlug(e.target.value)} style={{ padding: 12, fontSize: 18, borderRadius: 8, border: "1px solid #222", background: "#18191d", color: "#fff" }} />
  <input type="text" placeholder="Kategorie" value={category} onChange={e => setCategory(e.target.value)} style={{ padding: 12, fontSize: 18, borderRadius: 8, border: "1px solid #222", background: "#18191d", color: "#fff" }} />
  <input type="text" placeholder="Autor" value={author} onChange={e => setAuthor(e.target.value)} style={{ padding: 12, fontSize: 18, borderRadius: 8, border: "1px solid #222", background: "#18191d", color: "#fff" }} />
  <input type="text" placeholder="Tags (mit ; trennen)" value={tags} onChange={e => setTags(e.target.value)} style={{ padding: 12, fontSize: 18, borderRadius: 8, border: "1px solid #222", background: "#18191d", color: "#fff" }} />
  <input type="text" placeholder="Cover Image URL" value={coverImage} onChange={e => setCoverImage(e.target.value)} style={{ padding: 12, fontSize: 18, borderRadius: 8, border: "1px solid #222", background: "#18191d", color: "#fff" }} />
  <textarea placeholder="Excerpt (Kurzbeschreibung)" value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={3} style={{ padding: 12, fontSize: 18, borderRadius: 8, border: "1px solid #222", background: "#18191d", color: "#fff" }} />
  <div>
    <label style={{marginBottom:4,display:'block',fontWeight:600}}>Inhalt</label>
    <div className={styles.editorContainer}>
      <textarea 
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Inhalt des Blogposts..."
        style={{
          width: '100%',
          minHeight: '300px',
          padding: '12px',
          background: '#18191d',
          color: '#fff',
          border: '1px solid var(--color-primary-500)',
          borderRadius: '8px 8px 0 0',
          resize: 'vertical',
          fontFamily: 'inherit',
          fontSize: '16px',
          lineHeight: '1.5'
        }}
      />
      <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#242527', borderRadius: '0 0 8px 8px', borderLeft: '1px solid var(--color-primary-500)', borderRight: '1px solid var(--color-primary-500)', borderBottom: '1px solid var(--color-primary-500)'}}>
        <div style={{fontSize: '12px', color: '#aaa'}}>
          <i>HTML-Tags für Formatierung werden unterstützt (z.B. &lt;b&gt;, &lt;i&gt;, &lt;h2&gt;)</i>
        </div>
        <button 
          type="button" 
          onClick={() => setShowHtmlPreview(!showHtmlPreview)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-primary-500)',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600
          }}
        >
          {showHtmlPreview ? 'Vorschau ausblenden' : 'Vorschau anzeigen'}
        </button>
      </div>
      {showHtmlPreview && (
        <div style={{
          marginTop: '16px',
          padding: '16px',
          background: '#fff',
          color: '#222',
          borderRadius: '8px',
          border: '1px solid var(--color-primary-500)',
          maxHeight: '600px',
          overflow: 'auto'
        }}>
          <h3 style={{marginTop: 0, color: '#333', borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '16px'}}>Vorschau</h3>
          <div 
            dangerouslySetInnerHTML={{ 
              __html: content
                // Ersetze alleinstehende Zeilen mit Absätzen
                .split('\n\n')
                .map((paragraph: string) => paragraph.trim() ? `<p>${paragraph}</p>` : '')
                .join('')
                // Ersetze einzelne Zeilenumbrüche mit <br>
                .replace(/\n/g, '<br>')
            }} 
            style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: '16px',
              lineHeight: '1.6'
            }}
            className="blog-preview"
          />
        </div>
      )}
    </div>
  </div>
  <input type="text" placeholder="SEO Title" value={seoTitle} onChange={e => setSeoTitle(e.target.value)} style={{ padding: 12, fontSize: 18, borderRadius: 8, border: "1px solid #222", background: "#18191d", color: "#fff" }} />
  <textarea placeholder="SEO Description" value={seoDescription} onChange={e => setSeoDescription(e.target.value)} rows={2} style={{ padding: 12, fontSize: 18, borderRadius: 8, border: "1px solid #222", background: "#18191d", color: "#fff" }} />
  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <input type="checkbox" checked={isDraft} onChange={e => setIsDraft(e.target.checked)} />
    Als Entwurf speichern
  </label>
  <button type="submit" disabled={loading} className={styles.adminCreateButton}>{loading ? "Speichern..." : "Änderungen speichern"}</button>
  {error && <div className={styles.adminBlogError}>{error}</div>}
</form>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
