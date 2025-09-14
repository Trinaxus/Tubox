// Admin-Blogverwaltung: Übersicht & Management aller Blogposts
"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from 'next/link';
import AdminBlogTable from './AdminBlogTable';
import AuthCheck from "../../components/AuthCheck";
import AdminNav from "../AdminNav";
import styles from "../admin.module.css";

// Client-Komponente, die useSearchParams verwendet
function BlogContent() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);
  
  // Verwende searchParams, um eine Aktualisierung zu erzwingen
  const searchParams = useSearchParams();
  const refresh = searchParams ? searchParams.get('refresh') : null;
  
  useEffect(() => {
    // Setze loadedRef zurück, wenn refresh Parameter vorhanden ist
    if (refresh) {
      loadedRef.current = false;
    }
    
    if (loadedRef.current) return;
    loadedRef.current = true;
    
    // Lade Blogposts über interne API (funktioniert lokal und extern)
    setLoading(true);
    fetch(`/api/json-blog`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        const results = Array.isArray(data?.results) ? data.results : [];
        setPosts(results);
      })
      .catch(err => {
        console.error('Fehler beim Laden der Blog-Daten:', err);
        setError(`Fehler beim Laden der Blog-Daten: ${err.message}`);
        setPosts([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [refresh]); // Aktualisiere, wenn sich der refresh Parameter ändert

  // Filtere nach veröffentlichten und Entwürfen
  // Normalisiere die isDraft-Werte für konsistente Verarbeitung
  const normalizedPosts = posts.map((p: any) => ({
    ...p,
    // Stelle sicher, dass isDraft immer als String '0' oder '1' vorliegt
    isDraft: p.isDraft === true || p.isDraft === 1 || p.isDraft === '1' ? '1' : '0'
  }));
  
  console.log('Normalisierte Posts:', normalizedPosts);
  
  const publishedPosts = normalizedPosts.filter((p:any) => p.isDraft === '0');
  const draftPosts = normalizedPosts.filter((p:any) => p.isDraft === '1');
  
  console.log('Veröffentlichte Posts:', publishedPosts.length);
  console.log('Entwurfs-Posts:', draftPosts.length);

  return (
    <>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <Link href="/admin/blog/create" style={{
          display: 'inline-block',
          background: '#00e1ff',
          color: '#fff',
          fontWeight: 600,
          borderRadius: 14,
          padding: '10px 26px',
          marginBottom: 0,
          textDecoration: 'none',
          fontSize: 18,
          boxShadow: '0 2px 8px rgba(0,225,255,0.09)',
          transition: 'background 0.18s, color 0.18s'
        }}>Neuen Blogpost anlegen</Link>
        
        <Link href="/admin/blog/clean" style={{
          display: 'inline-block',
          background: '#333',
          color: '#fff',
          fontWeight: 600,
          borderRadius: 14,
          padding: '10px 26px',
          marginBottom: 0,
          textDecoration: 'none',
          fontSize: 18,
          boxShadow: '0 2px 8px rgba(0,0,0,0.09)',
          transition: 'background 0.18s, color 0.18s'
        }}>Blog-Index bereinigen</Link>
      </div>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p>Lade Blog-Posts...</p>
        </div>
      ) : error ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 0',
          color: '#ff3b30',
          background: 'rgba(255, 59, 48, 0.1)',
          borderRadius: '8px',
          margin: '20px 0'
        }}>
          <p>{error}</p>
          <button 
            onClick={() => {
              setLoading(true);
              setError(null);
              fetch('/api/json-blog')
                .then(res => res.json())
                .then(data => {
                  const results = Array.isArray(data?.results) ? data.results : [];
                  setPosts(results);
                })
                .catch(err => {
                  setError(`Fehler beim Laden der Blog-Daten: ${err.message}`);
                  setPosts([]);
                })
                .finally(() => setLoading(false));
            }}
            style={{
              background: '#ff3b30',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            Erneut versuchen
          </button>
        </div>
      ) : (
        <>
          <h2 style={{fontSize:22,margin:'32px 0 12px'}}>Veröffentlichte Blogposts ({publishedPosts.length})</h2>
          {publishedPosts.length > 0 ? (
            <AdminBlogTable posts={publishedPosts} mode="published" />
          ) : (
            <p style={{color: '#888'}}>Keine veröffentlichten Blogposts vorhanden.</p>
          )}
          
          <h2 style={{fontSize:22,margin:'42px 0 12px'}}>Entwürfe ({draftPosts.length})</h2>
          {draftPosts.length > 0 ? (
            <AdminBlogTable posts={draftPosts} mode="draft" />
          ) : (
            <p style={{color: '#888'}}>Keine Entwürfe vorhanden.</p>
          )}
        </>
      )}
    </>
  );
}

export default function AdminBlogPage() {
  return (
    <AuthCheck requiredRole="admin">
      <div className={styles.container}>
        <div className={styles.adminNavContainer}>
          <AdminNav />
        </div>
        <h1 className={styles.adminTitle} style={{ 
          textAlign: 'center', 
          width: '100%', 
          display: 'block',
          marginBottom: '24px'
        }}>Blog verwalten</h1>
        <main style={{ alignItems:'center', maxWidth: 900, margin: '0 auto', padding: 0 }}>
          {/* Verwende Suspense-Boundary für useSearchParams */}
          <Suspense fallback={
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p>Lade Blog-Verwaltung...</p>
            </div>
          }>
            <BlogContent />
          </Suspense>
        </main>
      </div>
    </AuthCheck>
  );
}
