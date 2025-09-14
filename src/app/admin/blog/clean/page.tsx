'use client';

import React, { useState, useEffect } from 'react';
import AuthCheck from "../../../components/AuthCheck";
import AdminNav from "../../AdminNav";
import styles from "../../admin.module.css";
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface IndexStatus {
  online: boolean;
  postsCount?: number;
  url?: string;
  responseTime?: number;
  lastModified?: string;
  error?: string;
}

export default function CleanBlogIndexPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [indexStatus, setIndexStatus] = useState<IndexStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const router = useRouter();
  
  // Prüfe den Status der index.json-Datei beim Laden der Seite
  useEffect(() => {
    checkIndexStatus();
    
    // Prüfe den Status alle 30 Sekunden
    const intervalId = setInterval(checkIndexStatus, 30000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  const checkIndexStatus = async () => {
    setCheckingStatus(true);
    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/check-blog-index?t=${timestamp}`, {
        cache: 'no-store'
      });
      
      const data = await response.json();
      setIndexStatus(data);
    } catch (err) {
      console.error('Fehler beim Prüfen des Index-Status:', err);
      setIndexStatus({
        online: false,
        error: err instanceof Error ? err.message : 'Unbekannter Fehler'
      });
    } finally {
      setCheckingStatus(false);
    }
  };

  const cleanBlogIndex = async () => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      // Füge einen Cache-Busting-Parameter hinzu
      const timestamp = Date.now();
      const response = await fetch(`/api/clean-blog-index?t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Stelle sicher, dass keine Caching stattfindet
        cache: 'no-store',
      });
      
      let data;
      try {
        data = await response.json();
      } catch (err) {
        console.error('Fehler beim Parsen der JSON-Antwort:', err);
        throw new Error('Fehler beim Parsen der Antwort vom Server');
      }
      
      if (!response.ok) {
        throw new Error(data?.error || `Fehler beim Bereinigen des Blog-Index: ${response.status}`);
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setResult(data);
      
      // Aktualisiere den Router, um die Seite nach erfolgreicher Bereinigung zu aktualisieren
      if (data.success) {
        setTimeout(() => {
          router.refresh();
        }, 1500);
      }
    } catch (err: any) {
      console.error('Fehler beim Bereinigen des Blog-Index:', err);
      setError(err.message || 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

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
        }}>Blog-Index bereinigen</h1>
        
        <main style={{ alignItems:'center', maxWidth: 900, margin: '0 auto', padding: 0 }}>
          <div className={styles.description} style={{ color: '#ccc', marginBottom: '20px' }}>
            <p>
              Diese Funktion bereinigt den Blog-Index, indem sie doppelte Einträge mit demselben Slug entfernt.
              Bei mehreren Einträgen mit demselben Slug wird der neueste Eintrag beibehalten.
            </p>
            <p>
              <strong>Hinweis:</strong> Diese Aktion kann nicht rückgängig gemacht werden. Es wird empfohlen, 
              vor der Bereinigung eine Sicherungskopie der index.json zu erstellen.
            </p>
          </div>
          
          {/* Status der index.json-Datei */}
          <div style={{ 
            padding: '15px',
            backgroundColor: indexStatus?.online ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)',
            borderLeft: `4px solid ${indexStatus?.online ? '#00ff00' : '#ff0000'}`,
            marginBottom: '20px',
            color: indexStatus?.online ? '#7fff7f' : '#ff6b6b'
          }}>
            <h3>Status der index.json</h3>
            {checkingStatus ? (
              <p>Prüfe Status...</p>
            ) : indexStatus?.online ? (
              <>
                <p><strong>Status:</strong> <span style={{ color: '#00ff00' }}>Online</span></p>
                <p><strong>Anzahl der Einträge:</strong> {indexStatus.postsCount}</p>
                <p><strong>Letzte Änderung:</strong> {indexStatus.lastModified}</p>
                <p><strong>Antwortzeit:</strong> {indexStatus.responseTime}ms</p>
                <button 
                  onClick={checkIndexStatus}
                  style={{
                    background: '#333',
                    color: '#fff',
                    border: 'none',
                    padding: '5px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    marginTop: '10px'
                  }}
                >
                  Status aktualisieren
                </button>
              </>
            ) : (
              <>
                <p><strong>Status:</strong> <span style={{ color: '#ff0000' }}>Offline</span></p>
                <p><strong>Fehler:</strong> {indexStatus?.error}</p>
                <button 
                  onClick={checkIndexStatus}
                  style={{
                    background: '#333',
                    color: '#fff',
                    border: 'none',
                    padding: '5px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    marginTop: '10px'
                  }}
                >
                  Status erneut prüfen
                </button>
              </>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button 
              style={{
                display: 'inline-block',
                background: loading ? '#666' : '#00e1ff',
                color: '#fff',
                fontWeight: 600,
                borderRadius: 14,
                padding: '10px 26px',
                marginBottom: 0,
                textDecoration: 'none',
                fontSize: 18,
                boxShadow: '0 2px 8px rgba(0,225,255,0.09)',
                transition: 'background 0.18s, color 0.18s',
                border: 'none',
                cursor: loading ? 'default' : 'pointer'
              }}
              onClick={cleanBlogIndex}
              disabled={loading}
            >
              {loading ? 'Bereinige...' : 'Blog-Index bereinigen'}
            </button>
            
            <Link href="/admin/blog" style={{
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
            }}>
              Zurück zur Blog-Übersicht
            </Link>
          </div>
        
          {error && (
            <div style={{ 
              padding: '15px',
              backgroundColor: 'rgba(255, 0, 0, 0.1)',
              borderLeft: '4px solid #ff0000',
              marginBottom: '20px',
              color: '#ff6b6b'
            }}>
              <h3>Fehler</h3>
              <p>{error}</p>
            </div>
          )}
          
          {result && (
            <div style={{ 
              padding: '15px',
              backgroundColor: 'rgba(0, 255, 0, 0.1)',
              borderLeft: '4px solid #00ff00',
              marginBottom: '20px',
              color: '#7fff7f'
            }}>
              <h3>Erfolg!</h3>
              <p>Der Blog-Index wurde erfolgreich bereinigt.</p>
              <ul>
                <li>Ursprüngliche Anzahl an Einträgen: {result.originalCount}</li>
                <li>Bereinigte Anzahl an Einträgen: {result.cleanedCount}</li>
                <li>Entfernte doppelte Einträge: {result.removedCount}</li>
              </ul>
              <p>
                <Link href="/admin/blog" style={{ color: '#0070f3', textDecoration: 'underline' }}>
                  Zur Blog-Übersicht
                </Link>
              </p>
            </div>
          )}
        </main>
      </div>
    </AuthCheck>
  );
}
