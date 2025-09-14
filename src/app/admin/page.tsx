"use client";
import React, { useEffect, useState } from "react";
import AuthCheck from "../components/AuthCheck";
import AdminNav from "./AdminNav";
import styles from "./admin.module.css";

interface GalleryMeta {
  jahr: string;
  galerie: string;
  kategorie: string;
  tags: string[];
  /**
   * Zugriffsberechtigung für die Galerie:
   * - 'public': Jeder kann sehen
   * - 'password': Passwortgeschützt
   * - 'internal': Nur für Admins
   * - 'locked': Gesperrt, für niemanden sichtbar
   */
  accessType?: 'public' | 'password' | 'internal' | 'locked';
  password?: string;
  // Für Abwärtskompatibilität
  passwordProtected?: boolean;
}

interface Gallery {
  name: string;
  images: string[];
  meta?: GalleryMeta;
}

// Hilfsfunktion: Prüft, ob eine URL ein Video ist
const isVideoUrl = (url: string): boolean => {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.wmv', '.flv', '.mkv'];
  return videoExtensions.some(ext => url.toLowerCase().endsWith(ext));
};

// Hilfsfunktion: Finde ein hochgeladenes Thumbnail für ein Video
const findVideoThumbnail = (videoUrl: string, galleryFiles: string[]): string | null => {
  // Extrahiere den Dateinamen ohne Erweiterung
  const videoName = videoUrl.split('/').pop()?.split('.')[0];
  if (!videoName) return null;
  
  // Extrahiere Jahr und Galerie aus der URL für den video_thumb-Pfad
  const urlParts = videoUrl.split('/');
  const year = urlParts[urlParts.length - 3]; // Jahr ist 3 Teile vor dem Dateinamen
  const gallery = urlParts[urlParts.length - 2]; // Galerie ist 2 Teile vor dem Dateinamen
  
  // Suche nach einem passenden Thumbnail in der Galerie
  const thumbnail = galleryFiles.find(url => 
    (url.includes(`${videoName}_thumb.`) || url.includes(`${videoName}-thumb.`)) && !isVideoUrl(url)
  );
  
  // Wenn kein Thumbnail gefunden wurde, versuche es im video_thumb/-Unterordner
  if (!thumbnail) {
    // Konstruiere den Pfad zum Thumbnail im video_thumb/-Unterordner
    const videoThumbPath = `https://tubox.de/WebDisk/uploads/${year}/${gallery}/video_thumb/${videoName}_thumb.jpg`;
    return videoThumbPath;
  }
  
  return thumbnail;
};

// Hilfsfunktion: Generiere eine Video-Thumbnail-URL oder verwende den Fallback
const getVideoThumbnail = (videoUrl: string, galleryFiles: string[] = []): string => {
  // Debug-Ausgabe der Video-URL
  console.log('Video URL:', videoUrl);
  
  // Direkter Ansatz: Extrahiere Jahr, Galerie und Dateinamen direkt aus der URL
  if (videoUrl.includes('/WebDisk/uploads/')) {
    try {
      const urlPath = videoUrl.split('/WebDisk/uploads/')[1];
      const pathParts = urlPath.split('/');
      
      if (pathParts.length >= 3) {
        const year = pathParts[0];
        const gallery = pathParts[1];
        const videoName = pathParts[pathParts.length - 1].split('.')[0];
        
        console.log('Extrahierte Daten:', { year, gallery, videoName });
        
        // Direkter Pfad zum video_thumb-Ordner
        const videoThumbPath = `https://tubox.de/WebDisk/uploads/${year}/${gallery}/video_thumb/${videoName}_thumb.jpg`;
        console.log('Generierter Thumbnail-Pfad:', videoThumbPath);
        
        // Gib den direkten Pfad zurück
        return videoThumbPath;
      }
    } catch (error) {
      console.error('Fehler beim Extrahieren der URL-Teile:', error);
    }
  }
  
  // Fallback: Suche nach einem passenden Thumbnail in der Galerie
  const videoName = videoUrl.split('/').pop()?.split('.')[0];
  if (videoName && galleryFiles.length > 0) {
    const thumbnail = galleryFiles.find(url => 
      (url.includes(`${videoName}_thumb.`) || url.includes(`${videoName}-thumb.`)) && !isVideoUrl(url)
    );
    
    if (thumbnail) {
      console.log('Gefundenes Thumbnail in galleryFiles:', thumbnail);
      return thumbnail;
    }
  }
  
  // Fallback: Generiere ein SVG als Platzhalter
  console.log('Verwende SVG-Fallback für:', videoUrl);
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='240' viewBox='0 0 320 240'%3E%3Crect width='320' height='240' fill='%232a1208'/%3E%3Ctext x='160' y='120' font-family='Arial' font-size='16' fill='%23ff6b00' text-anchor='middle'%3EVideo%3C/text%3E%3C/svg%3E`;
};

export default function AdminPage() {
  // Erkennung für mobile Geräte
  const [isMobile, setIsMobile] = useState(false);
  
  // Prüfe beim Laden, ob es sich um ein mobiles Gerät handelt
  useEffect(() => {
    const checkIfMobile = () => {
      const mobile = window.innerWidth < 768; // Typischer Breakpoint für mobile Geräte
      setIsMobile(mobile);
    };
    
    // Initial prüfen
    checkIfMobile();
    
    // Event-Listener für Größenänderungen
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);
  
  // Galerie-Verwaltung State
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [openGallery, setOpenGallery] = useState<string | null>(null);
  const [activeSettingsGallery, setActiveSettingsGallery] = useState<string | null>(null);
  const [popupPosition, setPopupPosition] = useState<{top: number, left: number}>({top: 0, left: 0});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [imgDeleting, setImgDeleting] = useState<{[key:string]: boolean}>({});
  const [galleryDeleting, setGalleryDeleting] = useState<{[key:string]: boolean}>({});
  const [editingGallery, setEditingGallery] = useState<string | null>(null);
  const [editingMeta, setEditingMeta] = useState<GalleryMeta>({ 
    jahr: "", 
    galerie: "", 
    kategorie: "", 
    tags: []
  });
  const [metaSaving, setMetaSaving] = useState(false);
  const [metaLoading, setMetaLoading] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [thumbnailModalOpen, setThumbnailModalOpen] = useState(false);
  const [selectedVideoForThumbnail, setSelectedVideoForThumbnail] = useState<{url: string, galleryName: string} | null>(null);
  const [isGalleryThumbnailUpload, setIsGalleryThumbnailUpload] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  // Bild-Vorschau (Hover) & Modal (Klick)
  const [hoverPreview, setHoverPreview] = useState<{url: string; x: number; y: number; visible: boolean}>({ url: '', x: 0, y: 0, visible: false });
  const [modalImage, setModalImage] = useState<string | null>(null);

  // Upload-State
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{url: string, type: 'image' | 'video', file: File}[]>([]);
  const [year, setYear] = useState("");
  const [gallery, setGallery] = useState("");
  const [kategorie, setKategorie] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Fetch galleries
  const fetchGalleries = async () => {
    setLoading(true);
    setError("");
    try {
      // Füge is_admin=true hinzu, um alle Galerien anzuzeigen, auch interne
      const res = await fetch("/api/galleries?is_admin=true");
      if (!res.ok) throw new Error("Fehler beim Laden der Galerien");
      const data = await res.json();

      // Konvertiere das Galerieformat von {"name": ["url1", "url2"]} zu [{name: "name", images: ["url1", "url2"]}]
      if (data.galleries) {
        const formattedGalleries = Object.entries(data.galleries).map(([name, images]) => {
          // Konvertiere alle WebDisk-URLs zu Partycrasher-URLs
          let convertedImages = (images as string[]).map(url => convertWebDiskUrl(url));

          // Prüfe, ob es sich um eine Video-Galerie handelt
          if (isVideoGallery(name)) {
            // In Video-Galerien nur tatsächliche Videos anzeigen (keine Thumbnails)
            convertedImages = convertedImages.filter(url => !isThumbnailUrl(url));
            console.log(`Galerie ${name} ist eine Video-Galerie. Zeige nur Videos an:`, convertedImages);
          }

          // Prüfe, ob die Galerie Videos enthält
          const hasVideos = convertedImages.some(url => isVideoUrl(url));
          if (hasVideos) {
            console.log(`Galerie ${name} enthält Videos:`,
              convertedImages.filter(url => isVideoUrl(url)));
          }

          return {
            name,
            images: convertedImages,
            meta: data.metadata?.[name] || { jahr: "", galerie: "", kategorie: "", tags: [] }
          };
        });
        setGalleries(formattedGalleries);
      } else {
        setGalleries([]);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGalleries(); }, []);
  
  // Metadaten einer Galerie laden
  const fetchGalleryMeta = async (galleryName: string) => {
    try {
      const parts = galleryName.split("/");
      if (parts.length < 2) return;
      
      const year = parts[0];
      const gallery = parts[1];
      
      // Füge is_admin=true hinzu, um Admin-Sonderrechte zu berücksichtigen
      const res = await fetch(`/api/gallery-meta?year=${encodeURIComponent(year)}&gallery=${encodeURIComponent(gallery)}&is_admin=true`);
      if (!res.ok) throw new Error("Fehler beim Laden der Metadaten");
      
      const meta = await res.json();
      return meta;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  };
  
  // Metadaten einer Galerie bearbeiten
  const handleEditMeta = async (galleryName: string) => {
    setEditingGallery(galleryName);
    setMetaLoading(true);
    
    // Standardwerte basierend auf dem Galerienamen setzen
    const parts = galleryName.split("/");
    const year = parts[0] || "";
    const galleryPart = parts[1] || "";
    
    // Standardwerte setzen
    setEditingMeta({
      jahr: year,
      galerie: galleryPart,
      kategorie: "",
      tags: [],
      accessType: "public" // Standardmäßig öffentlich
    });
    
    try {
      const meta = await fetchGalleryMeta(galleryName);
      if (meta) {
        // Bestehende Metadaten laden
        setEditingMeta(meta);
      }
    } catch (e: any) {
      setError("Fehler beim Laden der Metadaten");
    } finally {
      setMetaLoading(false);
    }
  };
  
  // Metadaten speichern
  const saveMeta = async () => {
    if (!editingGallery) return;
    
    setMetaSaving(true);
    try {
      const parts = editingGallery.split("/");
      if (parts.length < 2) throw new Error("Ungültiger Galeriename");
      
      const year = parts[0];
      const gallery = parts[1];
      
      const res = await fetch("/api/gallery-meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          gallery,
          meta: editingMeta
        })
      });
      
      if (!res.ok) throw new Error("Fehler beim Speichern der Metadaten");
      
      // Aktualisiere die Galerie in der Liste
      setGalleries(galleries.map(g => {
        if (g.name === editingGallery) {
          return { ...g, meta: editingMeta };
        }
        return g;
      }));
      
      setSuccessMsg("Metadaten gespeichert");
      setEditingGallery(null); // Modal schließen
    } catch (e: any) {
      setError(e.message);
    } finally {
      setMetaSaving(false);
    }
  };
  
  // Tag hinzufügen
  const addTag = () => {
    if (!newTag.trim()) return;
    if (!editingMeta.tags.includes(newTag.trim())) {
      setEditingMeta({
        ...editingMeta,
        tags: [...editingMeta.tags, newTag.trim()]
      });
    }
    setNewTag("");
  };
  
  // Tag entfernen
  const removeTag = (tag: string) => {
    setEditingMeta({
      ...editingMeta,
      tags: editingMeta.tags.filter(t => t !== tag)
    });
  };

  // Galerie öffnen/schließen
  const toggleGallery = (galleryName: string) => {
    if (openGallery === galleryName) {
      setOpenGallery(null);
    } else {
      setOpenGallery(galleryName);
      // Automatisch Jahr und Galerie für Upload setzen
      const parts = galleryName.split("/");
      if (parts.length >= 2) {
        setYear(parts[0]);
        setGallery(parts[1]);
      }
    }
  };

  // Bild löschen
  const handleDeleteImage = async (galleryName: string, imgUrl: string) => {
    if (!confirm("Bild wirklich löschen?")) return;
    setImgDeleting(d => ({...d, [imgUrl]: true}));
    try {
      // Extrahiere Jahr, Galerie, Dateiname aus URL
      // Konvertiere WebDisk/Partycrasher-URLs zu tonband-URLs und extrahiere den relativen Pfad
      let cleanUrl = imgUrl;
      
      // Wenn es eine WebDisk-URL ist, konvertiere sie zu einer tonband-URL
      if (imgUrl.includes("/WebDisk/uploads/")) {
        // Ersetze nur für die Anzeige
        const tonbandUrl = imgUrl.replace("https://www.tubox.de/WebDisk/uploads/", "https://tubox.de/WebDisk/uploads/");
        console.log("WebDisk URL konvertiert zu tonband URL:", tonbandUrl);
        // Aktualisiere die URL in der Galerie
        setGalleries(galleries => galleries.map(g => {
          if (g.name === galleryName) {
            return {
              ...g,
              images: g.images.map(img => img === imgUrl ? tonbandUrl : img)
            };
          }
          return g;
        }));
        // Setze imgUrl auf die neue URL
        imgUrl = tonbandUrl;
      }
      
      // Wenn es eine Partycrasher-URL ist, konvertiere sie zu einer tonband-URL
      if (imgUrl.includes("/Partycrasher/uploads/")) {
        // Ersetze nur für die Anzeige
        const tonbandUrl = imgUrl.replace("https://www.tubox.de/Partycrasher/uploads/", "https://tubox.de/Partycrasher/uploads/");
        console.log("Partycrasher URL konvertiert zu tonband URL:", tonbandUrl);
        // Aktualisiere die URL in der Galerie
        setGalleries(galleries => galleries.map(g => {
          if (g.name === galleryName) {
            return {
              ...g,
              images: g.images.map(img => img === imgUrl ? tonbandUrl : img)
            };
          }
          return g;
        }));
        // Setze imgUrl auf die neue URL
        imgUrl = tonbandUrl;
      }
      
      // Extrahiere den relativen Pfad (funktioniert für www. und ohne www.)
      cleanUrl = imgUrl
        .replace("https://tubox.de/WebDisk/uploads/", "")
        .replace("https://www.tubox.de/WebDisk/uploads/", "");
      const urlParts = cleanUrl.split("/");
      const year = urlParts[0];
      const gallery = urlParts[1];
      const filename = urlParts.slice(2).join("/");
      console.log('[BILD-LÖSCHEN DEBUG]', { imgUrl, cleanUrl, year, gallery, filename });
      const res = await fetch("/api/delete-image", {
        method: "POST",
        headers: {
          "X-API-TOKEN": process.env.NEXT_PUBLIC_TONBAND_API_TOKEN || "mysecrettoken",
        },
        body: JSON.stringify({ year, gallery, filename })
      });
      let responseText = await res.text();
      let responseJson;
      try {
        responseJson = JSON.parse(responseText);
      } catch (e) {
        responseJson = { error: 'Antwort ist kein gültiges JSON', raw: responseText };
      }
      if (!res.ok || responseJson.error) {
        console.error('Fehler beim Löschen:', responseJson.error || responseJson.raw || responseText);
        throw new Error(`Fehler beim Löschen des Bildes: ${responseJson.error || responseJson.raw || responseText}`);
      }
      setGalleries(galleries => galleries.map(g => g.name === galleryName ? { ...g, images: g.images.filter(img => img !== imgUrl) } : g));
      setSuccessMsg("Bild gelöscht.");
      
      // Erfolgsmeldung nach 3 Sekunden ausblenden
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e: any) {
      setError(e.message);
      // Fehlermeldung nach 5 Sekunden ausblenden
      setTimeout(() => setError(""), 5000);
    } finally {
      setImgDeleting(d => ({...d, [imgUrl]: false}));
    }
  };

  // Galerie löschen
  const handleDeleteGallery = async (galleryName: string) => {
    if (!confirm(`Galerie '${galleryName}' wirklich löschen?`)) return;
    setGalleryDeleting(prev => ({ ...prev, [galleryName]: true }));
    try {
      console.log(`Lösche Galerie: ${galleryName}`);
      
      // Verwende die neue API-Route zum Löschen von Galerien
      const res = await fetch('/api/delete-gallery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ galleryName })
      });
      
      const data = await res.json();
      console.log('Antwort vom Server:', data);
      
      if (!res.ok) {
        const errorMsg = data.error || (data.details ? JSON.stringify(data.details) : 'Unbekannter Fehler');
        throw new Error(`Fehler beim Löschen der Galerie: ${errorMsg}`);
      }
      
      // Aktualisiere die Galerie-Liste
      setGalleries(galleries => galleries.filter(g => g.name !== galleryName));
      setSuccessMsg(`Galerie '${galleryName}' erfolgreich gelöscht.`);
      
      // Erfolgsmeldung nach 3 Sekunden ausblenden
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e: any) {
      console.error('Fehler beim Löschen der Galerie:', e);
      setError(e.message);
      // Fehlermeldung nach 5 Sekunden ausblenden
      setTimeout(() => setError(""), 5000);
    } finally {
      setGalleryDeleting(prev => ({ ...prev, [galleryName]: false }));
    }
  };

  // Upload-Logik
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      setFiles([]);
      setPreviews([]);
      return;
    }
    
    const fileList = Array.from(e.target.files);
    addFiles(fileList);
  };

  // Dateien hinzufügen (wird sowohl von handleFileChange als auch von handleDrop verwendet)
  const addFiles = (fileList: File[]) => {
    // Bestehende Dateien beibehalten und neue hinzufügen
    setFiles(prevFiles => [...prevFiles, ...fileList]);
    
    // Vorschaubilder und -videos erstellen
    const previewArray = fileList.map(file => ({
      url: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' as const : 'image' as const,
      file: file
    }));
    setPreviews(prevPreviews => [...prevPreviews, ...previewArray]);
  };

  // Drag & Drop Funktionen
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const fileList = Array.from(e.dataTransfer.files);
      // Nur Bild- und Videodateien akzeptieren
      const mediaFiles = fileList.filter(file => 
        file.type.startsWith('image/') || file.type.startsWith('video/'));
      
      if (mediaFiles.length > 0) {
        addFiles(mediaFiles);
      }
    }
  };

  // Test-Upload-Funktion für einfache Uploads ohne komplexe Verarbeitung
  const handleTestUpload = async () => {
    if (!files.length || !year || !gallery || !kategorie) return;
    setUploading(true);
    setUploadResults([]);
    const newResults: string[] = [];
    
    // Nur die erste Datei verwenden
    const file = files[0];
    const formData = new FormData();
    formData.append("file", file);
    formData.append("year", year);
    formData.append("gallery", gallery);
    formData.append("kategorie", kategorie);
    
    try {
      // Interne Upload-API verwenden (kein CORS)
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(async () => ({ raw: await res.text() }));
      if (!res.ok || (data && data.error)) {
        newResults.push(`❌ Test-Upload Fehler: ${data?.error || data?.raw || res.statusText}`);
      } else {
        newResults.push(`✅ Test-Upload erfolgreich: ${data.url || data.path}`);
      }
    } catch (err) {
      console.error('Test-Upload Fehler:', err);
      newResults.push(`❌ Test-Upload Fehler: ${err instanceof Error ? err.message : String(err)}`);
    }
    
    setUploadResults(newResults);
    setUploading(false);
  };

  const handleUpload = async () => {
    if (!files.length || !year || !gallery || !kategorie) return;
    setUploading(true);
    setUploadResults([]);
    setProgress(0);
    const newResults: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('year', year);
      formData.append('gallery', gallery);
      formData.append('kategorie', kategorie);
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json().catch(async () => ({ raw: await res.text() }));
        if (!res.ok || (data && data.error)) {
          newResults.push(`❌ Fehler: ${data?.error || data?.raw || res.statusText}`);
        } else {
          newResults.push(`✅ Upload erfolgreich! URL: ${data.url || data.path}`);
        }
      } catch (err) {
        console.error('Upload-Fehler:', err);
        newResults.push(`❌ Fehler beim Upload: ${err instanceof Error ? err.message : String(err)}`);
      }
      setProgress(Math.round(((i + 1) / files.length) * 100));
    }
    
    setUploadResults(newResults);
    setUploading(false);
    setSuccessMsg("Upload abgeschlossen!");
    fetchGalleries(); // Galerien neu laden
    
    // Upload-Formular zurücksetzen
    setFiles([]);
    setPreviews([]);
  };

  // Hilfsfunktion: WebDisk-URL zu tonband-URL konvertieren
  const convertWebDiskUrl = (url: string): string => {
    if (url && url.includes("/WebDisk/uploads/")) {
      return url.replace("https://www.tubox.de/WebDisk/uploads/", "https://tubox.de/WebDisk/uploads/");
    }
    // Falls es noch Partycrasher-URLs gibt, diese auch konvertieren
    if (url && url.includes("/Partycrasher/uploads/")) {
      return url.replace("https://www.tubox.de/Partycrasher/uploads/", "https://tubox.de/WebDisk/uploads/");
    }
    return url;
  };
  
  // Hilfsfunktion: Prüft, ob eine URL ein Video ist
const isVideoUrl = (url: string): boolean => {
  if (!url) return false;
  
  // Spezialbehandlung für die 3000/videos Galerie oder VIDEOS im Pfad
  if (url.includes('/3000/videos/') || url.includes('/VIDEOS/') || url.includes('/Videos/')) {
    console.log('Video in spezieller Galerie gefunden:', url);
    return true;
  }
  
  // Normalisiere die URL (entferne Query-Parameter und Anker)
  let normalizedUrl = url;
  if (normalizedUrl.includes('?')) {
    normalizedUrl = normalizedUrl.split('?')[0];
  }
  if (normalizedUrl.includes('#')) {
    normalizedUrl = normalizedUrl.split('#')[0];
  }
  
  const lowercaseUrl = normalizedUrl.toLowerCase();
  
  // Prüfe auf bekannte Video-Dateiendungen
  const videoExtensions = [
    '.mp4', '.mov', '.webm', '.avi', '.mkv', '.wmv', 
    '.m4v', '.mpg', '.mpeg', '.3gp', '.flv', '.f4v', '.swf'
  ];
  
  // Prüfe, ob die URL mit einer der Video-Dateiendungen endet
  const isVideo = videoExtensions.some(ext => lowercaseUrl.endsWith(ext));
  
  if (isVideo) {
    console.log('Video erkannt:', url);
  }
  
  return isVideo;
};

// Hilfsfunktion: Prüfe, ob eine URL ein Thumbnail ist
const isThumbnailUrl = (url: string): boolean => {
  if (!url) return false;
  return url.toLowerCase().includes('_thumb.') || url.toLowerCase().includes('-thumb.') || url.toLowerCase().includes('gallery_thumb.');
};

// Hilfsfunktion: Prüfe, ob eine URL ein Galerie-Thumbnail ist
const isGalleryThumbnail = (url: string): boolean => {
  return url.includes('gallery_thumb.');
};

// Hilfsfunktion: Prüfe, ob eine Galerie eine Video-Galerie ist
const isVideoGallery = (galleryName: string): boolean => {
  return galleryName.includes('VIDEOS') || galleryName.includes('Videos') || galleryName.includes('videos');
};

// Hilfsfunktion: Generiere eine Video-Thumbnail-URL oder verwende den Fallback
const getVideoThumbnail = (videoUrl: string): string => {
  // Versuche, eine Thumbnail-URL zu generieren, wenn möglich
  // Für jetzt verwenden wir ein Farbverlauf als Fallback
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='240' viewBox='0 0 320 240'%3E%3Crect width='320' height='240' fill='%232a1208'/%3E%3Ctext x='160' y='120' font-family='Arial' font-size='16' fill='%23ff6b00' text-anchor='middle'%3EVideo%3C/text%3E%3C/svg%3E`;
};

// Hilfsfunktion: Erstes Bild einer Galerie als Vorschau verwenden
const getGalleryThumb = (gallery: Gallery): string => {
  if (gallery.images.length > 0) {
    // Stelle sicher, dass das Thumbnail eine tonband-URL ist
    const convertedUrl = convertWebDiskUrl(gallery.images[0]);
    // Prüfe, ob es ein Bild ist (für Thumbnails bevorzugen wir Bilder)
    const isVideo = isVideoUrl(convertedUrl);
    
    // Wenn das erste Element ein Video ist, suche nach einem Bild
    if (isVideo && gallery.images.length > 1) {
      for (let i = 1; i < gallery.images.length; i++) {
        const imgUrl = convertWebDiskUrl(gallery.images[i]);
        if (!isVideoUrl(imgUrl) && !isThumbnailUrl(imgUrl)) {
          return imgUrl; // Erstes Nicht-Video und Nicht-Thumbnail zurückgeben
        }
      }
    }
    
    return convertedUrl;
  }
  return getVideoThumbnail(''); // Fallback, wenn keine Bilder vorhanden sind
};

  // Automatisch Fehlermeldungen und Erfolgsmeldungen ausblenden
  useEffect(() => {
    if (error || successMsg) {
      const timer = setTimeout(() => {
        setError("");
        setSuccessMsg("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, successMsg]);
  
  return (
  <AuthCheck requiredRole="admin">
    <AdminNav />
    <div className={styles.container}>
      {/* Feedback-Bereich */}
  {/* Feedback-Bereich */}
        {(error || successMsg) && (
          <div className={`${styles.feedback} ${error ? styles.error : styles.success}`}>
            {error || successMsg}
          </div>
        )}

      <div className={styles.contentContainer}>
        {/* Linke Spalte: Galerien */}
        <div className={styles.gallerySection}>
          <h2 className={styles.sectionTitle}>Galerien</h2>
          {loading && <div className={styles.loading}>Lade Galerien...</div>}
          {!loading && galleries.length === 0 && <div>Keine Galerien gefunden.</div>}
          
          <div className={styles.galleriesList}>
            {galleries.map(gallery => {
              const isOpen = openGallery === gallery.name;
              const thumb = getGalleryThumb(gallery);
              return (
                <div key={gallery.name} className={`${styles.galleryCard} ${isOpen ? styles.open : ''}`}>
                  <div className={styles.galleryHeader}>
                    <div 
                      onClick={() => toggleGallery(gallery.name)}
                      className={styles.galleryContent}
                    >
                      {thumb ? (
                        <div className={styles.imageMini}>
                          <img
                            src={thumb}
                            alt="mini"
                            className={styles.imageMiniBild}
                          />
                          {isVideoUrl(thumb) && (
                            <div className={styles.videoIndicator}>
                              <span>🎥</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className={styles.galleryMini}>Keine Medien</div>
                      )}
                      <div className={styles.galleryInfo}>
                        <div className={styles.galleryName}>{gallery.name}</div>
                        <div className={styles.galleryMeta}>
                          <span className={styles.metaBubble}>
                            {gallery.meta?.jahr || 'Kein Jahr'}
                          </span>
                          
                          <span className={styles.metaBubble}>
                            {gallery.images.length} {gallery.images.length === 1 ? 'Bild' : 'Bilder'}
                          </span>
                          
                          {gallery.meta?.accessType === 'password' ? (
                            <span className={`${styles.metaBubble} ${styles.accessTypePassword}`}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}>
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                              </svg>
                              Passwortgeschützt
                            </span>
                          ) : gallery.meta?.accessType === 'internal' ? (
                            <span className={`${styles.metaBubble} ${styles.accessTypeInternal}`}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}>
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                              </svg>
                              Intern
                            </span>
                          ) : gallery.meta?.accessType === 'locked' ? (
                            <span className={`${styles.metaBubble} ${styles.accessTypeLocked}`}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}>
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                <line x1="12" y1="17" x2="12" y2="17"></line>
                              </svg>
                              Gesperrt
                            </span>
                          ) : (
                            <span className={`${styles.metaBubble} ${styles.accessTypePublic}`}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}>
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="2" y1="12" x2="22" y2="12"></line>
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                              </svg>
                              Öffentlich
                            </span>
                          )}
                          
                          <div className={styles.settingsIcon} onClick={(e) => {
                            e.stopPropagation();
                            if (activeSettingsGallery === gallery.name) {
                              setActiveSettingsGallery(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setPopupPosition({
                                top: rect.bottom + 8,
                                left: rect.left - 140, // Zentriert das Popup unter dem Icon
                              });
                              setActiveSettingsGallery(gallery.name);
                            }
                          }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="3"></circle>
                              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                            </svg>
                          </div>
                        </div>
                      </div>
                       <span className={`${styles.toggleIcon} ${isOpen ? styles.toggleIconOpen : styles.toggleIconClosed}`}>{isOpen ? '+ ' : '- '}</span>
                     </div>
                   </div>
                  
                  {/* Ausgeklappte Bilder */}
                  {isOpen && (
                    <div className={styles.galleryImagesContainer}>
                      {gallery.images.length === 0 && <div className={styles.noImagesMessage}>Keine Medien in dieser Galerie</div>}
                      {gallery.images.map(img => {
                        // Konvertiere WebDisk-URLs zu Partycrasher-URLs
                        const convertedImg = convertWebDiskUrl(img);
                        // Prüfe, ob es sich um ein Video handelt
                        const isVideo = isVideoUrl(convertedImg);
                        
                        // Debug-Ausgabe für jedes Element in der Galerie
                        console.log(`Galerie-Element: ${convertedImg}, isVideo: ${isVideo}`);
                        
                        return (
                          <div key={convertedImg} className={styles.galleryImageItem}>
                            {isVideo ? (
                              <div className={styles.galleryVideoContainer}>
                                {/* Verwende ein dynamisch generiertes Thumbnail für Videos */}
                                <div className={styles.videoThumbnailOverlay}>
                                  <img 
                                    src={(() => {
                                      // Direkter Pfad zum Thumbnail generieren
                                      if (convertedImg.includes('/WebDisk/uploads/')) {
                                        try {
                                          const urlPath = convertedImg.split('/WebDisk/uploads/')[1];
                                          const pathParts = urlPath.split('/');
                                          
                                          if (pathParts.length >= 3) {
                                            const year = pathParts[0];
                                            const gallery = pathParts[1];
                                            const videoName = pathParts[pathParts.length - 1].split('.')[0];
                                            
                                            // Direkter Pfad zum video_thumb-Ordner
                                            return `https://tubox.de/WebDisk/uploads/${year}/${gallery}/video_thumb/${videoName}_thumb.jpg`;
                                          }
                                        } catch (error) {
                                          console.error('Fehler beim Generieren des Thumbnail-Pfads:', error);
                                        }
                                      }
                                      return getVideoThumbnail(convertedImg);
                                    })()}
                                    alt="Video Thumbnail"
                                    className={styles.videoThumbnailImage}
                                    onError={(e) => {
                                      // Wenn das Thumbnail nicht geladen werden kann, versuche verschiedene Fallbacks
                                      const target = e.target as HTMLImageElement;
                                      const currentSrc = target.src;
                                      target.onerror = null; // Verhindere endlose Fehler-Loops
                                      
                                      console.log('Thumbnail konnte nicht geladen werden:', currentSrc);
                                      
                                      // Extrahiere Informationen aus der aktuellen URL und Pfadkomponenten
                                      const videoUrlPath = convertedImg.split('/WebDisk/uploads/')[1];
                                      const videoPathParts = videoUrlPath.split('/');
                                      const videoYear = videoPathParts[0];
                                      const videoGallery = videoPathParts[1];
                                      const videoFileName = videoPathParts[videoPathParts.length - 1].split('.')[0];
                                      
                                      console.log('Video-Komponenten:', { videoYear, videoGallery, videoFileName });
                                      
                                      if (currentSrc.includes('/video_thumb/')) {
                                        // Versuche zuerst im thumb/-Ordner nach einem Thumbnail zu suchen
                                        const thumbPath = `https://tubox.de/WebDisk/uploads/${videoYear}/${videoGallery}/thumb/${videoFileName}_thumb.jpg`;
                                        console.log('Versuche Thumbnail im thumb/-Ordner:', thumbPath);
                                        target.src = thumbPath;
                                      } else if (currentSrc.includes('/thumb/')) {
                                        // Wenn der thumb/-Pfad nicht funktioniert, versuche den alten Pfad
                                        const oldPath = `https://tubox.de/WebDisk/uploads/${videoYear}/${videoGallery}/${videoFileName}_thumb.jpg`;
                                        console.log('Versuche Legacy-Pfad:', oldPath);
                                        target.src = oldPath;
                                      } else {
                                        // Wenn das auch nicht funktioniert, generiere ein SVG
                                        console.log('Verwende SVG-Fallback');
                                        target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='240' viewBox='0 0 320 240'%3E%3Crect width='320' height='240' fill='%232a1208'/%3E%3Ctext x='160' y='120' font-family='Arial' font-size='16' fill='%23ff6b00' text-anchor='middle'%3EVideo%3C/text%3E%3C/svg%3E`;
                                      }
                                    }}
                                  />
                                </div>
                                
                                {/* Play-Button-Overlay */}
                                <div 
                                  className={styles.videoOverlayClickable}
                                  onClick={() => {
                                    // Öffne das Video in einem neuen Tab
                                    window.open(convertedImg, '_blank');
                                  }}
                                >
                                  <div className={styles.playIconContainer}>
                                    <div className={styles.videoPlayIcon}>▶</div>
                                  </div>
                                </div>
                                {/* Thumbnail-Button für Videos */}
                                <div 
                                  style={{
                                    position: 'absolute',
                                    bottom: '5px',
                                    right: '5px',
                                    background: 'rgba(0,0,0,0.7)',
                                    borderRadius: '4px',
                                    padding: '3px 6px',
                                    fontSize: '10px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    zIndex: 10,
                                    border: '1px solid rgba(255,255,255,0.3)'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedVideoForThumbnail({url: convertedImg, galleryName: gallery.name});
                                  }}
                                >
                                  Thumbnail
                                </div>
                              </div>
                            ) : (
                              <img 
                                src={convertedImg} 
                                alt="thumb" 
                                style={{ 
                                  width: '100%', 
                                  height: '100%', 
                                  objectFit: "cover", 
                                  borderRadius: 8, 
                                  filter: imgDeleting[img] ? 'grayscale(1) blur(2px)' : 'none', 
                                  opacity: imgDeleting[img] ? 0.4 : 1, 
                                  transition: 'filter 0.2s, opacity 0.2s',
                                  cursor: 'zoom-in'
                                }} 
                                onMouseEnter={(e) => {
                                  const rect = (e.currentTarget as HTMLImageElement).getBoundingClientRect();
                                  setHoverPreview({ url: convertedImg, x: rect.right + 12, y: rect.top, visible: true });
                                }}
                                onMouseMove={(e) => {
                                  setHoverPreview(prev => ({ ...prev, x: e.clientX + 16, y: e.clientY + 16, visible: true }));
                                }}
                                onMouseLeave={() => setHoverPreview(prev => ({ ...prev, visible: false }))}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setModalImage(convertedImg);
                                }}
                              />
                            )}
                            <button
                              onClick={() => handleDeleteImage(gallery.name, convertedImg)}
                              disabled={!!imgDeleting[img] || !!imgDeleting[convertedImg]}
                              className={`${styles.imageDeleteButton} ${imgDeleting[img] ? styles.deleteLoading : ''}`}
                              title={isVideo ? "Video löschen" : "Bild löschen"}
                            >
                              {imgDeleting[img] || imgDeleting[convertedImg] ? <span className={styles.deleteLoading}>⏳</span> : (
                                <span className={styles.deleteIcon}>
                                  <svg className={styles.trashIcon} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                                    <path d="M10 11v6M14 11v6" />
                                  </svg>
                                </span>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Rechte Spalte: Upload */}
        <div className={styles.uploadSection}>
          <h2 className={styles.uploadTitle}>Upload</h2>
          
          <div className={styles.uploadForm}>
            <label className={styles.formLabel}>Jahr:</label>
            <input
              type="text"
              value={year}
              onChange={e => setYear(e.target.value)}
              placeholder="z.B. 2025"
              className={styles.formInput}
            />
            <label className={styles.formLabel}>Galerie:</label>
            <input
              type="text"
              value={gallery}
              onChange={e => setGallery(e.target.value)}
              placeholder="z.B. TestUpload"
              className={styles.formInput}
            />
            <label className={styles.formLabel}>Kategorie:</label>
            <input
              type="text"
              value={kategorie}
              onChange={e => setKategorie(e.target.value)}
              placeholder="z.B. Natur"
              className={styles.formInput}
            />
          </div>
          
          <div className={styles.dropzoneContainer}>
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <div className={styles.dropzoneIcon}>📁</div>
              <p className={styles.dropzoneText}>
                {isDragging 
                  ? 'Dateien hier ablegen...' 
                  : 'Dateien hierher ziehen oder klicken zum Auswählen'}
              </p>
              <p className={styles.dropzoneHelpText}>
                Unterstützt werden Bilder und Videos
              </p>
              <input
                id="file-upload"
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileChange}
                className={styles.fileInput}
              />
            </div>
            {files.length > 0 && (
              <div className={styles.selectedFiles}>
                {files.length === 1 ? files[0].name : `${files.length} Dateien ausgewählt`}
              </div>
            )}
          </div>
          
          {/* Preview-Medien */}
          {previews.length > 0 && (
            <div className={styles.previewContainer}>
              {previews.map((preview, idx) => (
                <div key={idx} className={styles.previewItem}>
                  {preview.type === 'image' ? (
                    <img src={preview.url} alt={`Preview ${idx + 1}`} className={styles.previewImage} />
                  ) : (
                    <div className={styles.previewVideo}>
                      <div className={styles.videoOverlay}>
                        <div className={styles.playIcon}>▶</div>
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setFiles(files => files.filter((_, i) => i !== idx));
                      setPreviews(previews => previews.filter((_, i) => i !== idx));
                    }}
                    className={styles.previewDeleteButton}
                    aria-label={`Medium ${idx + 1} entfernen`}
                    title={`Medium entfernen`}
                  >×</button>
                </div>
              ))}
            </div>
          )}
          
          <button 
            onClick={handleUpload} 
            disabled={!files.length || !year || !gallery || !kategorie || uploading} 
            className={styles.uploadButton}
          >
            {uploading ? "Hochladen..." : `Upload${files.length > 1 ? ` (${files.length})` : ''} starten`}
          </button>
          
          {/* Fortschrittsbalken */}
          {uploading && (
            <div style={{ margin: '18px 0 0 0', width: '100%', background: '#2a1208', borderRadius: 8, height: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, background: '#ff6b00', height: '100%', borderRadius: 8, transition: 'width 0.22s' }} />
              <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', color: '#fff', fontWeight: 700, fontSize: 13, textAlign: 'center', lineHeight: '18px', letterSpacing: 1, userSelect: 'none' }}>
                {progress}% ({Math.round(files.length * progress / 100)} / {files.length})
              </div>
            </div>
          )}
          
          {/* Upload-Ergebnisse */}
          <div style={{ marginTop: 24, minHeight: 32 }}>
            {uploadResults.map((res, idx) => (
              <div key={idx} style={{ color: '#ffffff', fontSize: 15, marginBottom: 4 }}>{res}</div>
            ))}
            {uploadResults.map((res, idx) => {
              if (!res.startsWith("✅")) return null;
              
              // Extrahiere die URL aus der Erfolgsmeldung
              let url = "";
              if (res.includes("Video-URL: ")) {
                url = res.split("Video-URL: ")[1];
              } else if (res.includes("Bild-URL: ")) {
                url = res.split("Bild-URL: ")[1];
              } else {
                return null;
              }
              
              // Prüfe, ob es ein Video ist
              const isVideo = isVideoUrl(url);
              
              return isVideo ? (
                <div key={"vid-"+idx} style={{ marginTop: 16, position: 'relative', maxWidth: "100%" }}>
                  <video 
                    src={url} 
                    controls 
                    style={{ width: "100%", maxHeight: 400, borderRadius: 8 }} 
                  />
                </div>
              ) : (
                <img 
                  key={"img-"+idx} 
                  src={url} 
                  alt={`Upload Preview ${idx + 1}`} 
                  style={{ marginTop: 16, maxWidth: "100%", borderRadius: 8 }} 
                />
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Metadaten-Editor Modal */}
      {editingGallery && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(20,22,34,0.92)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'rgba(20, 22, 34, 0.85)',
            backdropFilter: 'blur(8px)',
            borderRadius: 18,
            border: '1.5px solid #00e1ff55',
            boxShadow: '0 0 40px #00e1ff22',
            padding: 32,
            color: '#e0f7fa',
            minWidth: 340,
            maxWidth: 480,
            width: '90%',
            fontFamily: 'inherit',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{
              color: '#00e1ff',
              marginTop: 0,
              marginBottom: 8,
              fontWeight: 800,
              letterSpacing: 1
            }}>Galerie bearbeiten</h2>
            <p style={{
              color: '#b2ebf2',
              marginTop: 0,
              marginBottom: 24,
              fontWeight: 400,
              fontSize: 17
            }}>{editingGallery}</p>
            
            {metaLoading && (
              <div className={styles.modalLoading}>
                <div className={styles.loadingText}>Lade Metadaten...</div>
                <div className={styles.loadingSpinner}></div>
              </div>
            )}
            
            <div className={styles.modalFormGroup}>
              <label className={styles.modalLabel}>Jahr:</label>
              <input
                type="text"
                value={editingMeta.jahr}
                onChange={e => setEditingMeta({...editingMeta, jahr: e.target.value})}
                placeholder="Jahr"
                className={styles.modalInput}
              />
            </div>
            
            <div className={styles.modalFormGroup}>
              <label className={styles.modalLabel}>Galerie:</label>
              <input
                type="text"
                value={editingMeta.galerie}
                onChange={e => setEditingMeta({...editingMeta, galerie: e.target.value})}
                placeholder="Galerie"
                className={styles.modalInput}
              />
            </div>
            
            <div className={styles.modalFormGroup}>
              <label className={styles.modalLabel}>Kategorie:</label>
              <input
                type="text"
                value={editingMeta.kategorie}
                onChange={e => setEditingMeta({...editingMeta, kategorie: e.target.value})}
                placeholder="Kategorie"
                className={styles.modalInput}
              />
            </div>
            
            <div className={styles.modalFormGroup}>
              <label className={styles.modalLabel}>Tags:</label>
              <div className={styles.tagInputContainer}>
                <input
                  type="text"
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  placeholder="Neuer Tag"
                  className={styles.tagInput}
                  onKeyDown={e => e.key === 'Enter' && addTag()}
                />
                <button
                  onClick={addTag}
                  className={styles.tagAddButton}
                >
                  +
                </button>
              </div>
              <div className={styles.tagsContainer}>
                {editingMeta.tags.map(tag => (
                  <div key={tag} className={styles.tagItem}>
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className={styles.tagRemoveButton}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <p className={styles.modalSubtitle}>
                Hinweis: Die Kategorie aus dem Upload wird als Tag angezeigt.
              </p>
              
              {/* Zugriffsoptionen */}
              <div className={styles.modalFormGroup}>
                <label className={styles.modalLabel}>
                  Zugriffsberechtigung:
                </label>
                
                <div style={{
                  display: 'flex',
                  gap: 10,
                  margin: '18px 0 12px 0',
                  flexWrap: 'wrap',
                }}>
                  {[
                    { value: 'public' as const, label: 'Öffentlich', desc: 'Jeder kann diese Galerie sehen' },
                    { value: 'password' as const, label: 'Passwort', desc: 'Zugriff nur mit Passwort' },
                    { value: 'internal' as const, label: 'Nur Admins', desc: 'Nur für eingeloggte Admins' },
                    { value: 'locked' as const, label: 'Gesperrt', desc: 'Für niemanden sichtbar' },
                  ].map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setEditingMeta({ ...editingMeta, accessType: option.value })}
                      style={{
                        background: editingMeta.accessType === option.value ? 'linear-gradient(90deg,#00e1ff 0%,#00bcd4 100%)' : 'rgba(0,0,0,0.15)',
                        color: editingMeta.accessType === option.value ? '#fff' : '#00e1ff',
                        border: editingMeta.accessType === option.value ? '1.5px solid #00e1ff' : '1.5px solid #00e1ff55',
                        borderRadius: 7,
                        fontWeight: 700,
                        padding: '8px 18px',
                        fontSize: 15,
                        cursor: 'pointer',
                        boxShadow: editingMeta.accessType === option.value ? '0 0 10px #00e1ff66' : 'none',
                        outline: 'none',
                        transition: 'all 0.18s',
                        minWidth: 110,
                        marginBottom: 2,
                        marginRight: 0,
                        marginTop: 0,
                        marginLeft: 0,
                      }}
                      aria-pressed={editingMeta.accessType === option.value}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div style={{ color: '#b2ebf2', fontSize: 13, marginBottom: 8, marginTop: -4 }}>
                  {[
                    { value: 'public', desc: 'Jeder kann diese Galerie sehen' },
                    { value: 'password', desc: 'Zugriff nur mit Passwort' },
                    { value: 'internal', desc: 'Nur für eingeloggte Admins' },
                    { value: 'locked', desc: 'Für niemanden sichtbar (Ordner/ Galerie komplett ausgeblendet)' },
                  ].find(option => option.value === editingMeta.accessType)?.desc}
                </div>
                
                {/* Passwortfeld (nur anzeigen, wenn 'password' ausgewählt ist) */}
                {editingMeta.accessType === 'password' && (
                  <div style={{ marginTop: 16 }}>
                    <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 16, color: '#ffffff' }}>
                      Passwort:
                    </label>
                    <input
                      type="text"
                      value={editingMeta.password || ''}
                      onChange={e => setEditingMeta({...editingMeta, password: e.target.value})}
                      placeholder="Passwort eingeben"
                      style={{ 
                        width: '100%', 
                        padding: '10px 14px', 
                        fontSize: 16, 
                        borderRadius: 6, 
                        border: '1px solid #005b66', 
                        background: '#fff', 
                        color: '#232634', 
                        outline: 'none' 
                      }}
                    />
                  </div>
                )}
              </div>
              
              {/* Galerie-Thumbnail-Button nur für Video-Galerien anzeigen */}
              {isVideoGallery(editingGallery) && (
                <div style={{ marginTop: 20, borderTop: '1px solid #444', paddingTop: 20 }}>
                  <h3 style={{ fontSize: 18, marginBottom: 10, color: '#ff6b00' }}>Galerie-Thumbnail</h3>
                  <p style={{ fontSize: 14, color: '#ccc', marginBottom: 15 }}>
                    Lade ein Haupt-Thumbnail für diese Video-Galerie hoch. Dieses wird in der Galerie-Übersicht angezeigt.
                  </p>
                  <button
                    onClick={() => {
                      setIsGalleryThumbnailUpload(true);
                      setSelectedVideoForThumbnail({
                        url: `https://tubox.de/WebDisk/uploads/${editingGallery}/gallery_thumb.jpg`,
                        galleryName: editingGallery
                      });
                      setThumbnailModalOpen(true);
                    }}
                    style={{
                      padding: '8px 16px',
                      fontSize: 14,
                      borderRadius: 8,
                      background: '#ffffff10',
                      color: '#fff',
                      border: '1px solid #ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <span style={{ fontSize: 18 }}>🖼️</span> Galerie-Thumbnail hochladen
                  </button>
                </div>
              )}
            </div>
            

            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 20 }}>
              <button
                onClick={() => setEditingGallery(null)}
                style={{ padding: '10px 24px', fontSize: 16, borderRadius: 8, background: '#374151', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
              >
                Abbrechen
              </button>
              <button
                onClick={saveMeta}
                disabled={metaSaving}
                style={{ padding: '10px 24px', fontSize: 16, borderRadius: 8, background: '#005b66', color: '#fff', border: 'none', fontWeight: 700, cursor: metaSaving ? 'not-allowed' : 'pointer', opacity: metaSaving ? 0.7 : 1 }}
              >
                {metaSaving ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
      {/* Modal für Thumbnail-Upload */}
      {selectedVideoForThumbnail && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#00000010',
            backdropFilter: 'blur(10px)', 
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 0 30px rgba(255, 107, 0, 0.3)',
            border: '1px solid #00e1ff50'
          }}>
            <h3 style={{ marginTop: 0, color: '#ff6b00' }}>Vorschaubild für Video hochladen</h3>
            <p style={{ marginBottom: '20px', color: '#ccc' }}>
              Wähle ein Vorschaubild für das Video aus. Das Bild wird im selben Ordner wie das Video gespeichert und automatisch als Vorschau verwendet.
            </p>
            
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '14px', color: '#aaa' }}>
                Video: {selectedVideoForThumbnail.url.split('/').pop()}
              </p>
              
              <div style={{ 
                marginTop: '10px',
                padding: '15px',
                border: '2px dashed #00e1ff',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 107, 0, 0.1)',
                textAlign: 'center',
                cursor: 'pointer'
              }} onClick={() => document.getElementById('thumbnail-upload')?.click()}>
                {thumbnailFile ? (
                  <div>
                    <p style={{ margin: '0 0 10px', color: '#fff' }}>{thumbnailFile.name}</p>
                    <img 
                      src={URL.createObjectURL(thumbnailFile)} 
                      alt="Vorschau" 
                      style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px' }} 
                    />
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '40px', marginBottom: '10px' }}>🖼️</div>
                    <p style={{ margin: 0, color: '#fff' }}>Klicke, um ein Bild auszuwählen</p>
                  </div>
                )}
              </div>
              
              <input
                id="thumbnail-upload"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setThumbnailFile(e.target.files[0]);
                  }
                }}
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => {
                  setSelectedVideoForThumbnail(null);
                  setThumbnailFile(null);
                  setIsGalleryThumbnailUpload(false);
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: '#374151',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Abbrechen
              </button>
              
              <button
                onClick={async () => {
                  if (!thumbnailFile) return;
                  
                  try {
                    setUploadingThumbnail(true);
                    
                    // Extrahiere Jahr und Galerie aus der URL
                    const urlParts = selectedVideoForThumbnail.url.replace('https://tubox.de/WebDisk/uploads/', '').split('/');
                    const year = urlParts[0];
                    const gallery = urlParts[1];
                    
                    // Finde die ursprüngliche Kategorie
                    const galleryObj = galleries.find(g => g.name === selectedVideoForThumbnail.galleryName);
                    const originalKategorie = galleryObj?.meta?.kategorie || '';
                    
                    // FormData erstellen
                    const formData = new FormData();
                    formData.append('file', thumbnailFile);
                    formData.append('year', year);
                    formData.append('gallery', gallery);
                    formData.append('kategorie', originalKategorie); // Verwende die ursprüngliche Kategorie
                    
                    // Unterschiedliche Dateinamen für Galerie-Thumbnails und Video-Thumbnails
                    let thumbnailName;
                    if (isGalleryThumbnailUpload) {
                      // Für Galerie-Thumbnails verwenden wir einen festen Namen
                      thumbnailName = 'gallery_thumb.jpg';
                      formData.append('isGalleryThumb', 'true');
                    } else {
                      // Für Video-Thumbnails verwenden wir den Video-Namen + _thumb
                      const videoName = urlParts[urlParts.length - 1];
                      thumbnailName = videoName.split('.')[0] + '_thumb.jpg';
                      formData.append('isVideoThumb', 'true');
                    }
                    formData.append('customFilename', thumbnailName);
                    
                    // Thumbnail hochladen
                    // Debug-Informationen anzeigen
                    console.log(`Uploading thumbnail: ${thumbnailName}, size: ${thumbnailFile.size}`);
                    console.log(`Year: ${year}, Gallery: ${gallery}`);
                    console.log(`API Token: ${process.env.NEXT_PUBLIC_TONBAND_API_TOKEN?.substring(0, 2)}...`);
                    
                    // Direkte Kommunikation mit der PHP-API
                    const uploadUrl = "https://tubox.de/upload.php";
                    console.log(`Uploading thumbnail to: ${uploadUrl}`);
                    
                    // Füge alle Felder zur FormData hinzu, die die PHP-API erwartet
                    if (!formData.has('year')) formData.append('year', year);
                    if (!formData.has('gallery')) formData.append('gallery', gallery);
                    
                    // Alternative Upload-Methode mit XMLHttpRequest
                    // Diese Methode kann in einigen Fällen besser mit Serverberechtigungen umgehen
                    await new Promise<void>((resolve, reject) => {
                      const xhr = new XMLHttpRequest();
                      xhr.open('POST', uploadUrl, true);
                      xhr.setRequestHeader('X-API-TOKEN', process.env.NEXT_PUBLIC_TONBAND_API_TOKEN || "0000");
                      
                      xhr.onload = function() {
                        console.log(`XHR status: ${xhr.status}, response: ${xhr.responseText}`);
                        if (xhr.status === 200) {
                          try {
                            const response = JSON.parse(xhr.responseText);
                            if (response.success) {
                              setSuccessMsg(`Thumbnail erfolgreich hochgeladen: ${response.url}`);
                              setThumbnailModalOpen(false);
                              setSelectedVideoForThumbnail(null);
                              setThumbnailFile(null);
                              setIsGalleryThumbnailUpload(false);
                              
                              // Aktualisiere die Galerie-Ansicht
                              fetchGalleries();
                              resolve();
                            } else {
                              setError(`Fehler beim Hochladen des Thumbnails: ${response.error || 'Unbekannter Fehler'}`);
                              reject(new Error(response.error || 'Unbekannter Fehler'));
                            }
                          } catch (e) {
                            console.error('Fehler beim Parsen der JSON-Antwort:', e);
                            // Wenn die Antwort kein gültiges JSON ist, aber der Status 200 ist,
                            // gehen wir davon aus, dass der Upload erfolgreich war
                            setSuccessMsg(`Thumbnail hochgeladen, aber ungültiges JSON in der Antwort`);
                            setThumbnailModalOpen(false);
                            setSelectedVideoForThumbnail(null);
                            setThumbnailFile(null);
                            setIsGalleryThumbnailUpload(false);
                            
                            // Aktualisiere die Galerie-Ansicht
                            fetchGalleries();
                            resolve();
                          }
                        } else {
                          setError(`Server-Fehler: ${xhr.status} - ${xhr.responseText}`);
                          reject(new Error(`Server returned ${xhr.status}: ${xhr.responseText}`));
                        }
                      };
                      
                      xhr.onerror = function() {
                        console.error('XHR error:', xhr.statusText);
                        setError(`Netzwerkfehler beim Upload: ${xhr.statusText}`);
                        reject(new Error('Netzwerkfehler beim Upload'));
                      };
                      
                      xhr.upload.onprogress = function(e) {
                        if (e.lengthComputable) {
                          const percentComplete = (e.loaded / e.total) * 100;
                          console.log(`Thumbnail upload progress: ${percentComplete.toFixed(2)}%`);
                        }
                      };
                      
                      xhr.send(formData);
                    });
                  } catch (err: any) {
                    setError(`Fehler beim Hochladen: ${err.message || 'Unbekannter Fehler'}`);
                  } finally {
                    setUploadingThumbnail(false);
                  }
                }}
                disabled={!thumbnailFile || uploadingThumbnail}
                style={{
                  padding: '10px 20px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: '#ff6b00',
                  color: 'white',
                  cursor: (!thumbnailFile || uploadingThumbnail) ? 'not-allowed' : 'pointer',
                  opacity: (!thumbnailFile || uploadingThumbnail) ? 0.7 : 1
                }}
              >
                {uploadingThumbnail ? 'Wird hochgeladen...' : 'Hochladen'}
              </button>
              <button
                onClick={handleTestUpload}
                disabled={!thumbnailFile || uploadingThumbnail}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "var(--color-secondary-500, #555)",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: !thumbnailFile || uploadingThumbnail ? "not-allowed" : "pointer",
                  opacity: !thumbnailFile || uploadingThumbnail ? 0.7 : 1,
                }}
              >
                Test-Upload
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Settings Popup */}
      {activeSettingsGallery && (
        <div 
          className={`${styles.settingsPopup} ${styles.settingsPopupVisible}`}
          style={{ top: `${popupPosition.top}px`, left: `${popupPosition.left}px`, position: 'fixed', zIndex: 1000 }}
        >
          <button 
            className={`${styles.popupButton} ${styles.popupEditButton}`}
            onClick={(e) => {
              e.stopPropagation();
              if (activeSettingsGallery) {
                handleEditMeta(activeSettingsGallery);
              }
              setActiveSettingsGallery(null);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Bearbeiten
          </button>
          <button 
            className={`${styles.popupButton} ${styles.popupDeleteButton}`}
            onClick={(e) => {
              e.stopPropagation();
              if (activeSettingsGallery) {
                handleDeleteGallery(activeSettingsGallery);
              }
              setActiveSettingsGallery(null);
            }}
            disabled={activeSettingsGallery && galleryDeleting[activeSettingsGallery] ? true : false}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Löschen
          </button>
        </div>
      )}
      
      {/* Hover-Preview */}
      {hoverPreview.visible && hoverPreview.url && (
        <div
          style={{
            position: 'fixed',
            left: hoverPreview.x,
            top: hoverPreview.y,
            zIndex: 1000,
            pointerEvents: 'none',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(0,0,0,0.8)',
            padding: 6,
            borderRadius: 8,
            maxWidth: 360,
            maxHeight: 240,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
          }}
        >
          <img
            src={hoverPreview.url}
            alt="preview"
            style={{ display: 'block', maxWidth: 340, maxHeight: 220, borderRadius: 6 }}
          />
        </div>
      )}

      {/* Modal für großes Bild */}
      {modalImage && (
        <div
          onClick={() => setModalImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#111',
              padding: 10,
              borderRadius: 12,
              maxWidth: '90vw',
              maxHeight: '90vh',
              boxShadow: '0 12px 32px rgba(0,0,0,0.6)'
            }}
          >
            <img
              src={modalImage}
              alt="Großansicht"
              style={{ display: 'block', maxWidth: '86vw', maxHeight: '80vh', borderRadius: 8 }}
            />
            <div style={{ textAlign: 'right', marginTop: 8 }}>
              <button
                onClick={() => setModalImage(null)}
                style={{
                  background: 'var(--color-primary-500)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 14px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthCheck>
  );
}
