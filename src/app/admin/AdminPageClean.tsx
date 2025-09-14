"use client";
import React, { useEffect, useState, useCallback } from "react";
import AuthCheck from "../components/AuthCheck";
import AdminNav from "./AdminNav";
import styles from "./admin.module.css";

// Typdefinitionen
interface GalleryMeta {
  jahr: string;
  galerie: string;
  kategorie: string;
  tags: string[];
  accessType?: 'public' | 'password' | 'internal' | 'locked';
  password?: string;
  passwordProtected?: boolean;
}

interface Gallery {
  name: string;
  images: string[];
  meta?: GalleryMeta;
}

// Hilfsfunktionen
const isVideoUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.wmv', '.flv', '.mkv'];
  return videoExtensions.some(ext => url.toLowerCase().endsWith(ext));
};

const isThumbnailUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  return url.includes('_thumb.') || url.includes('-thumb.');
};

const findVideoThumbnail = (videoUrl: string, galleryFiles: string[]): string | null => {
  if (!videoUrl) return null;
  const videoName = videoUrl.split('/').pop()?.split('.')[0];
  if (!videoName) return null;
  
  return galleryFiles.find(url => 
    url && (url.includes(`${videoName}_thumb.`) || url.includes(`${videoName}-thumb.`)) && !isVideoUrl(url)
  ) || null;
};

const convertWebDiskUrl = (url: string | undefined): string => {
  if (!url) return '';
  // Hier kommt die Logik zur URL-Konvertierung
  return url;
};

const AdminPage: React.FC = () => {
  // UI State
  const [isMobile, setIsMobile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Galerie State
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [currentGallery, setCurrentGallery] = useState<Gallery | null>(null);
  const [openGallery, setOpenGallery] = useState<string | null>(null);
  const [editingGallery, setEditingGallery] = useState<Gallery | null>(null);
  
  // Upload State
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Array<{url: string, type: 'image' | 'video', file: File}>>([]);
  const [year, setYear] = useState('');
  const [galleryName, setGalleryName] = useState('');
  const [kategorie, setKategorie] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<string[]>([]);
  
  // Thumbnail State
  const [selectedVideoForThumbnail, setSelectedVideoForThumbnail] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [thumbnailProgress, setThumbnailProgress] = useState(0);
  
  // Mobile Detection
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);
  
  // Automatisches Ausblenden von Meldungen
  useEffect(() => {
    if (error || successMsg) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccessMsg(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, successMsg]);
  
  // Galerien laden
  const fetchGalleries = useCallback(async () => {
    try {
      // Hier kommt die Logik zum Laden der Galerien
    } catch (err) {
      setError('Fehler beim Laden der Galerien');
      console.error(err);
    }
  }, []);
  
  // Initiales Laden
  useEffect(() => {
    fetchGalleries();
  }, [fetchGalleries]);
  
  // Dateien für die Vorschau vorbereiten
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    const newPreviews = newFiles.map(file => ({
      url: URL.createObjectURL(file),
      type: isVideoUrl(file.name) ? 'video' as const : 'image' as const,
      file
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
    setPreviews(prev => [...prev, ...newPreviews]);
  };
  
  // Dateien per Drag & Drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const newFiles = Array.from(e.dataTransfer.files || []);
    const newPreviews = newFiles.map(file => ({
      url: URL.createObjectURL(file),
      type: isVideoUrl(file.name) ? 'video' as const : 'image' as const,
      file
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
    setPreviews(prev => [...prev, ...newPreviews]);
  };
  
  // Upload-Funktion
  const handleUpload = async () => {
    if (!year || !galleryName || !kategorie) {
      setError('Bitte fülle alle Pflichtfelder aus');
      return;
    }
    
    if (files.length === 0) {
      setError('Bitte wähle mindestens eine Datei aus');
      return;
    }
    
    setUploading(true);
    setError(null);
    setSuccessMsg(null);
    
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      
      formData.append('year', year);
      formData.append('gallery', galleryName);
      formData.append('category', kategorie);
      
      // Hier kommt die Upload-Logik
      
      setSuccessMsg('Upload erfolgreich abgeschlossen');
      setFiles([]);
      setPreviews([]);
      setYear('');
      setGalleryName('');
      setKategorie('');
      
      // Galerien neu laden
      await fetchGalleries();
      
    } catch (err) {
      setError('Fehler beim Hochladen der Dateien');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };
  
  // Hier kommen die fehlenden Event-Handler und Render-Logik
  
  return (
    <div className={styles.adminContainer}>
      <AuthCheck>
        <AdminNav />
        
        <div className={styles.contentContainer}>
          {/* Linke Spalte: Galerien */}
          <div className={styles.gallerySection}>
            <h2>Galerien</h2>
            {galleries.length === 0 ? (
              <p>Keine Galerien gefunden</p>
            ) : (
              <div className={styles.galleryList}>
                {galleries.map(gallery => (
                  <div key={gallery.name} className={styles.galleryItem}>
                    <h3>{gallery.name}</h3>
                    {/* Weitere Galerie-Details */}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Rechte Spalte: Upload */}
          <div className={styles.uploadSection}>
            <h2>Upload</h2>
            
            <div className={styles.uploadForm}>
              <div className={styles.formGroup}>
                <label>Jahr:</label>
                <input 
                  type="text" 
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="z.B. 2023"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Galerie-Name:</label>
                <input 
                  type="text" 
                  value={galleryName}
                  onChange={(e) => setGalleryName(e.target.value)}
                  placeholder="Name der Galerie"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Kategorie:</label>
                <input 
                  type="text" 
                  value={kategorie}
                  onChange={(e) => setKategorie(e.target.value)}
                  placeholder="Kategorie"
                />
              </div>
              
              <div 
                className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <p>Ziehe Dateien hierher oder klicke zum Auswählen</p>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className={styles.fileInput}
                  accept="image/*,video/*"
                />
              </div>
              
              {/* Vorschau der ausgewählten Dateien */}
              {previews.length > 0 && (
                <div className={styles.previews}>
                  {previews.map((preview, index) => (
                    <div key={index} className={styles.previewItem}>
                      {preview.type === 'image' ? (
                        <img src={preview.url} alt={`Vorschau ${index}`} />
                      ) : (
                        <video src={preview.url} controls />
                      )}
                      <button 
                        onClick={() => {
                          const newFiles = [...files];
                          const newPreviews = [...previews];
                          newFiles.splice(index, 1);
                          newPreviews.splice(index, 1);
                          setFiles(newFiles);
                          setPreviews(newPreviews);
                        }}
                        className={styles.removeButton}
                      >
                        Entfernen
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <button 
                onClick={handleUpload} 
                disabled={uploading || files.length === 0}
                className={styles.uploadButton}
              >
                {uploading ? 'Wird hochgeladen...' : 'Hochladen'}
              </button>
              
              {/* Fortschrittsbalken */}
              {uploading && (
                <div className={styles.progressContainer}>
                  <div 
                    className={styles.progressBar} 
                    style={{ width: `${progress}%` }}
                  />
                  <div className={styles.progressText}>{progress}%</div>
                </div>
              )}
              
              {/* Fehlermeldungen und Erfolgsmeldungen */}
              {error && <div className={styles.errorMessage}>{error}</div>}
              {successMsg && <div className={styles.successMessage}>{successMsg}</div>}
              
              {/* Upload-Ergebnisse */}
              {uploadResults.length > 0 && (
                <div className={styles.uploadResults}>
                  <h4>Upload-Ergebnisse:</h4>
                  <ul>
                    {uploadResults.map((result, index) => (
                      <li key={index}>{result}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </AuthCheck>
      
      {/* Modale Dialoge für Thumbnail-Upload usw. würden hier kommen */}
    </div>
  );
};

export default AdminPage;
