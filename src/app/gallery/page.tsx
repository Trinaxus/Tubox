"use client";
import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from 'framer-motion';
import PremiumLightbox from '../components/gallery/PremiumLightbox';
import styles from "./gallery.module.css";
import "../globals.css";
import GalleryWrapper from "../components/GalleryWrapper";
import { useAuth } from "../hooks/useAuth";

// Typdefinitionen für die Galerie-Komponenten
interface GalleryMetadata {
  jahr: string;
  galerie: string;
  kategorie: string;
  tags: string[];
  /**
   * Zugriffsberechtigung:
   * - 'public': Jeder kann sehen
   * - 'password': Passwortgeschützt
   * - 'internal': Nur für Admins
   * - 'locked': Gesperrt (ausblenden)
   */
  accessType?: 'public' | 'password' | 'internal' | 'locked';
  password?: string;
  passwordProtected?: boolean;
}

interface GalleryItem {
  name: string;
  images: string[];
  metadata?: GalleryMetadata;
}

type SelectedGallery = GalleryItem | null;

// Einfache Galerie-Komponente mit einheitlichem Grid

// Hilfsfunktion: Stelle sicher, dass nur tonband-URLs verwendet werden
function ensureTonbandUrl(url: string): string {
  // Standardisiere alle URLs auf tonband
  const tonbandBaseUrl = "https://tubox.de/WebDisk/uploads/";
  
  // Extrahiere den Pfad nach /uploads/ aus der URL, falls vorhanden
  if (url && url.includes("/uploads/")) {
    const pathAfterUploads = url.split("/uploads/")[1];
    if (pathAfterUploads) {
      return `${tonbandBaseUrl}${pathAfterUploads}`;
    }
  }
  
  // Wenn keine Anpassung nötig ist, gib die Original-URL zurück
  return url;
}

// Hilfsfunktion: Prüft, ob eine URL ein Video ist
const isVideoUrl = (url: string): boolean => {
  if (!url) {
    console.log('isVideoUrl: Keine URL angegeben');
    return false;
  }
  
  // Debug-Ausgabe
  console.log('Prüfe Video-URL:', url);
  
  // Normalisiere die URL (entferne Query-Parameter und Anker)
  let normalizedUrl = url.trim();
  if (normalizedUrl.includes('?')) {
    normalizedUrl = normalizedUrl.split('?')[0];
  }
  if (normalizedUrl.includes('#')) {
    normalizedUrl = normalizedUrl.split('#')[0];
  }
  
  // Entferne führende Schrägstriche für konsistente Prüfung
  normalizedUrl = normalizedUrl.replace(/^\/+/g, '');
  
  const lowercaseUrl = normalizedUrl.toLowerCase();
  
  // Prüfe auf bekannte Video-Dateiendungen (mit und ohne Punkt)
  const videoExtensions = [
    '.mp4', '.mov', '.webm', '.avi', '.mkv', '.wmv', 
    '.m4v', '.mpg', '.mpeg', '.3gp', '.flv', '.f4v', '.swf',
    'mp4', 'mov', 'webm', 'avi', 'mkv', 'wmv', 
    'm4v', 'mpg', 'mpeg', '3gp', 'flv', 'f4v', 'swf'
  ];
  
  // Prüfe auf Video-Ordner im Pfad (case-insensitive)
  const videoPathIndicators = [
    // Verschiedene Schreibweisen für Video-Ordner
    '-videos', 'videos', 'video_', '/video/',
    // Alternative Schreibweisen
    'video-', '/videos/', '\\videos\\', '\\video\\',
    // Für Pfade wie "sonstiges - VIDEOS"
    'video', 'videos', 'video ', 'videos ',
    // Für Pfade mit Leerzeichen
    'video ', 'videos ',
    // Für Pfade mit Bindestrichen
    'video-', 'videos-'
  ];
  
  // Prüfe, ob der Pfad auf einen Video-Ordner hinweist
  const isInVideoPath = videoPathIndicators.some(indicator => 
    lowercaseUrl.includes(indicator.toLowerCase())
  );
  
  if (isInVideoPath) {
    console.log('Erkannten Video-Pfad in URL:', url);
    return true;
  }
  
  // Prüfe, ob die URL mit einer der Video-Dateiendungen endet
  const hasVideoExtension = videoExtensions.some(ext => {
    const result = lowercaseUrl.endsWith('.' + ext) || lowercaseUrl.endsWith('/' + ext) || lowercaseUrl.endsWith(ext);
    if (result) console.log(`Erkannte Video-Erweiterung: ${ext} in ${lowercaseUrl}`);
    return result;
  });
  
  if (hasVideoExtension) return true;
  
  // Prüfe, ob die URL in einem Video-Ordner liegt (case-insensitive)
  const isInVideoFolder = [
    '-videos/', '/videos/', '/video/',
    '-videos\\', '\\videos\\', '\\video\\',
    '-videos', '/video_thumb/'
  ].some(part => lowercaseUrl.includes(part.toLowerCase()));
  
  if (isInVideoFolder) {
    console.log('Erkannte Video-Ordner in URL:', url);
    return true;
  }
  
  // Prüfe, ob der Dateiname auf eine Video-Datei hindeutet
  const filename = lowercaseUrl.split('/').pop() || '';
  const isVideoFilename = videoExtensions.some(ext => 
    filename.endsWith('.' + ext) || filename === ext
  );
  
  if (isVideoFilename) {
    console.log('Erkannten Video-Dateinamen:', filename);
    return true;
  }
  
  console.log('Keine Video-Erkennung für URL:', url);
  return false;
};

// Hilfsfunktion: Prüft, ob eine URL ein Thumbnail ist
const isThumbnailUrl = (url: string): boolean => {
  if (!url) return false;
  return url.toLowerCase().includes('_thumb.') || url.toLowerCase().includes('-thumb.');
};

// Hilfsfunktion: Prüft, ob eine Galerie eine Video-Galerie ist
const isVideoGallery = (galleryName: string): boolean => {
  if (!galleryName) {
    console.log('isVideoGallery: Kein Galeriename angegeben');
    return false;
  }
  
  // Debug-Ausgabe
  console.log('Prüfe auf Video-Galerie:', galleryName);
  
  // Normalisiere den Galerienamen (entferne Leerzeichen am Anfang/Ende, konvertiere zu Kleinbuchstaben)
  const normalizedGalleryName = galleryName.trim().toLowerCase();
  
  // Prüfe auf verschiedene Schreibweisen von 'videos' im Pfad
  const isVideoGallery = 
    normalizedGalleryName.includes('videos') || 
    normalizedGalleryName.endsWith('-videos') ||
    normalizedGalleryName.includes('video/') ||
    normalizedGalleryName.includes('video_') ||
    normalizedGalleryName.includes('video '); // Für Verzeichnisse wie "sonstiges - VIDEOS"
  
  console.log(`Galerie '${galleryName}' ist Video-Galerie:`, isVideoGallery);
  return isVideoGallery;
};

// Hilfsfunktion: Finde ein hochgeladenes Thumbnail für ein Video
const findVideoThumbnail = (videoUrl: string, galleryFiles: string[]): string | null => {
  // Debug-Ausgabe der Video-URL
  console.log('Suche Thumbnail für Video:', videoUrl);
  
  // Extrahiere Jahr, Galerie und Dateinamen aus der URL
  let year = '';
  let gallery = '';
  let videoName = '';
  
  try {
    // Versuche, die URL zu parsen
    if (videoUrl.includes('/WebDisk/uploads/')) {
      // Extrahiere die relevanten Teile aus der URL
      const urlPath = videoUrl.split('/WebDisk/uploads/')[1];
      const pathParts = urlPath.split('/');
      
      if (pathParts.length >= 3) {
        year = pathParts[0];
        gallery = pathParts[1];
        videoName = pathParts[pathParts.length - 1].split('.')[0];
        
        console.log('Extrahierte Daten:', { year, gallery, videoName });
      } else {
        console.error('URL-Format nicht erkannt:', videoUrl);
        return null;
      }
    } else {
      // Fallback zur alten Methode
      const urlParts = videoUrl.split('/');
      videoName = urlParts[urlParts.length - 1].split('.')[0];
      year = urlParts[urlParts.length - 3] || ''; // Jahr ist 3 Teile vor dem Dateinamen
      gallery = urlParts[urlParts.length - 2] || ''; // Galerie ist 2 Teile vor dem Dateinamen
      
      console.log('Fallback-Extraktion:', { year, gallery, videoName });
    }
  } catch (error) {
    console.error('Fehler beim Extrahieren der URL-Teile:', error);
    return null;
  }
  
  // Wenn Jahr oder Galerie fehlen, gib null zurück
  if (!year || !gallery || !videoName) {
    console.error('Fehlende Daten für Thumbnail:', { year, gallery, videoName });
    return null;
  }
  
  // Suche nach einem passenden Thumbnail in der Galerie
  const thumbnail = galleryFiles.find(url => 
    (url.includes(`${videoName}_thumb.`) || url.includes(`${videoName}-thumb.`)) && !isVideoUrl(url)
  );
  
  if (thumbnail) {
    console.log('Gefundenes Thumbnail in galleryFiles:', thumbnail);
    return thumbnail;
  }
  
  // Wenn keine Galeriedateien vorhanden sind oder kein passendes Thumbnail gefunden wurde
  if (!galleryFiles || galleryFiles.length === 0) {
    // Für -VIDEOS-Ordner: Versuche, das Thumbnail im video_thumb-Ordner des Jahres zu finden
    if (gallery.endsWith('-VIDEOS')) {
      const yearThumbPath = `https://tubox.de/WebDisk/uploads/${year}/video_thumb/${videoName}.jpg`;
      console.log('Suche Thumbnail im Jahr-Ordner:', yearThumbPath);
      return yearThumbPath;
    }
    
    // Standardpfad für nicht-VIDEOS-Ordner
    const videoThumbPath = `https://tubox.de/WebDisk/uploads/${year}/${gallery}/video_thumb/${videoName}.jpg`;
    console.log('Generierter Standard-Thumbnail-Pfad:', videoThumbPath);
    return videoThumbPath;
  }
  
  // Suche nach einem passenden Thumbnail in den Galeriedateien
  const foundThumbnail = galleryFiles.find(url => {
    if (!url) return false;
    
    const urlLower = url.toLowerCase();
    const isThumbnail = urlLower.includes('thumb') || 
                       urlLower.includes('video_thumb') ||
                       urlLower.includes('/thumb/');
    
    return (
      isThumbnail && 
      !isVideoUrl(url) &&
      (urlLower.includes(videoName.toLowerCase()) ||
       urlLower.endsWith(`/${videoName.toLowerCase()}.jpg`))
    );
  });
  
  if (foundThumbnail) {
    console.log('Gefundenes Thumbnail in galleryFiles:', foundThumbnail);
    return foundThumbnail;
  }
  
  // Letzter Versuch: Generiere den erwarteten Pfad
  if (gallery.endsWith('-VIDEOS')) {
    const yearThumbPath = `https://tubox.de/WebDisk/uploads/${year}/video_thumb/${videoName}.jpg`;
    console.log('Verwende Jahr-Thumbnail-Pfad:', yearThumbPath);
    return yearThumbPath;
  }
  
  const videoThumbPath = `https://tubox.de/WebDisk/uploads/${year}/${gallery}/video_thumb/${videoName}.jpg`;
  console.log('Verwende Standard-Thumbnail-Pfad:', videoThumbPath);
  return videoThumbPath;
};

// Hilfsfunktion: Generiere eine Video-Thumbnail-URL oder verwende den Fallback
const getVideoThumbnail = (videoUrl: string, galleryFiles: string[] = []): string => {
  if (!videoUrl) return '/fallback-video-thumbnail.jpg';
  
  // Extrahiere Jahr, Galerie und Dateinamen direkt aus der URL
  if (videoUrl.includes('/WebDisk/uploads/')) {
    try {
      const urlPath = videoUrl.split('/WebDisk/uploads/')[1];
      const pathParts = urlPath.split('/');
      
      if (pathParts.length >= 3) {
        const year = pathParts[0];
        const gallery = pathParts[1];
        const videoName = pathParts[pathParts.length - 1].split('.')[0];
        const isVideoGallery = gallery.endsWith('-VIDEOS');
        
        // 1. Versuch: Thumbnail im video_thumbs-Ordner der Galerie
        const videoThumbsPath = `https://tubox.de/WebDisk/uploads/${year}/${gallery}/video_thumbs/${videoName}.jpg`;
        
        // 2. Versuch: Thumbnail im video_thumb-Ordner der Galerie (für Abwärtskompatibilität)
        const videoThumbPath = `https://tubox.de/WebDisk/uploads/${year}/${gallery}/video_thumb/${videoName}.jpg`;
        
        // 3. Versuch: Thumbnail im video_thumbs-Ordner des Jahres (für -VIDEOS Galerien)
        const yearThumbsPath = `https://tubox.de/WebDisk/uploads/${year}/video_thumbs/${videoName}.jpg`;
        
        // 4. Versuch: Thumbnail im video_thumb-Ordner des Jahres (für ältere Uploads)
        const yearThumbPath = `https://tubox.de/WebDisk/uploads/${year}/video_thumb/${videoName}.jpg`;
        
        // Für -VIDEOS Galerien bevorzugen wir den video_thumbs-Ordner
        if (isVideoGallery) {
          return videoThumbsPath; // Neuer video_thumbs-Ordner hat Priorität
        }
        
        // Für normale Galerien: Zuerst den video_thumb-Ordner probieren
        return videoThumbPath;
      }
    } catch (error) {
      console.error('Fehler beim Extrahieren der URL-Teile:', error);
    }
  }
  
  // Fallback: Suche nach einem passenden Thumbnail in der Galerie
  const videoName = videoUrl.split('/').pop()?.split('.')[0];
  if (videoName && galleryFiles && galleryFiles.length > 0) {
    // Suche nach Thumbnails mit verschiedenen Namensmustern
    const thumbnail = galleryFiles.find(url => {
      if (!url) return false;
      const urlLower = url.toLowerCase();
      const baseName = videoName.toLowerCase();
      return (
        (urlLower.includes(`${baseName}_thumb.`) || 
         urlLower.includes(`${baseName}-thumb.`) ||
         urlLower.endsWith(`/thumb/${baseName}.jpg`) ||
         urlLower.endsWith(`/video_thumb/${baseName}.jpg`)) && 
        !isVideoUrl(url)
      );
    });
    
    if (thumbnail) {
      console.log('Gefundenes Thumbnail in galleryFiles:', thumbnail);
      return ensureTonbandUrl(thumbnail);
    }
  }
  
  // Fallback: Generiere ein SVG als Platzhalter
  console.log('Verwende SVG-Fallback für:', videoUrl);
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='240' viewBox='0 0 320 240'%3E%3Crect width='100%25' height='100%25' fill='%232a1208'/%3E%3Cpath d='M120 90L200 130L120 170V90Z' fill='%23ff6b00'/%3E%3C/svg%3E`;
};

// Hilfsfunktion: Generiere ein Haupt-Thumbnail für die VIDEOS-Galerie
const getVideosGalleryThumbnail = (galleryName: string, images: string[] = []): string => {
  // Verwende ein spezielles Thumbnail für die VIDEOS-Galerie
  if (isVideoGallery(galleryName)) {
    try {
      const galleryPath = galleryName.split('/');
      // Sicherstellen, dass wir gültige Pfadkomponenten haben
      if (galleryPath.length < 2) {
        console.warn('Ungültiger Galeriename:', galleryName);
        return getFallbackThumbnail();
      }
      
      const year = galleryPath[0];
      const gallery = galleryPath[1];
      
      // 1. Suche nach einem Video in der Galerie
      const videoFiles = images.filter(url => isVideoUrl(url));
      if (videoFiles.length > 0) {
        // Verwende das erste Video als Thumbnail-Quelle
        const videoThumbnail = getVideoThumbnail(videoFiles[0], images);
        if (videoThumbnail && !videoThumbnail.includes('data:image/svg+xml')) {
          return videoThumbnail;
        }
      }
      
      // 2. Suche nach Bildern in der Galerie (keine Videos, keine Thumbnails)
      const imageFiles = images.filter(url => !isVideoUrl(url) && !isThumbnailUrl(url));
      if (imageFiles.length > 0) {
        return ensureTonbandUrl(imageFiles[0]);
      }
      
      // 3. Suche nach einem speziellen Thumbnail im video_thumbs-Ordner
      const videoThumbsPath = `https://tubox.de/WebDisk/uploads/${year}/${gallery}/video_thumbs/gallery_thumb.jpg`;
      
      // 4. Fallback: Standard-Video-Thumbnail
      return videoThumbsPath;
      
    } catch (error) {
      console.error('Fehler beim Generieren des Video-Thumbnails:', error);
      return getFallbackThumbnail();
    }
  }
  
  // Für nicht-Video-Galerien: Standard-Fallback
  return getFallbackThumbnail();
};

// Hilfsfunktion für Fallback-Thumbnail
const getFallbackThumbnail = (): string => {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='240' viewBox='0 0 320 240'%3E%3Crect width='320' height='240' fill='%232a1208'/%3E%3Ctext x='160' y='120' font-family='Arial' font-size='16' fill='%23ff6b00' text-anchor='middle'%3EVideos%3C/text%3E%3C/svg%3E`;
};

export default function GalleryPage() {
  const router = useRouter();
  const authState = useAuth(); // Verwende den useAuth-Hook
  const [galleries, setGalleries] = useState<Record<string, string[]>>({});
  const [metadata, setMetadata] = useState<Record<string, GalleryMetadata>>({});
  const [loading, setLoading] = useState(true);
  const [minLoadingComplete, setMinLoadingComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("Alle");
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedGallery, setSelectedGallery] = useState<SelectedGallery>(null);
  // Lightbox-Zustandsvariablen
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string>("");
  const [lightboxType, setLightboxType] = useState<'image' | 'video'>('image')
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  // Touch-Slide-Variablen
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [galleryView, setGalleryView] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSmallMobile, setIsSmallMobile] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  // State für entsperrte passwortgeschützte Galerien
  const [unlockedGalleries, setUnlockedGalleries] = useState<string[]>([]);
  // States für das Passwort-Popup
  const [showPasswordPopup, setShowPasswordPopup] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [currentPasswordGallery, setCurrentPasswordGallery] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Responsivität erkennen
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      setIsSmallMobile(window.innerWidth <= 480);
    };
    
    // Initial beim Laden prüfen
    handleResize();
    
    // Event-Listener für Größenänderungen
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Authentifizierungsstatus prüfen
  useEffect(() => {
    async function checkAuth() {
      try {
        setAuthLoading(true);
        const response = await fetch('/api/auth/me');
        const data = await response.json();
        setIsLoggedIn(data.isLoggedIn || false);
      } catch (error) {
        console.error('Fehler beim Überprüfen des Authentifizierungsstatus:', error);
        setIsLoggedIn(false);
      } finally {
        setAuthLoading(false);
      }
    }
    
    checkAuth();
  }, []);

  // Galerien laden
  // Funktionen für die Galerie
  const openGallery = (galleryName: string) => {
    // Prüfe, ob die Galerie passwortgeschützt ist
    const galleryMeta = metadata[galleryName];
    
    if (galleryMeta?.accessType === 'password' && !unlockedGalleries.includes(galleryName)) {
      // Passwort-Popup anzeigen
      setCurrentPasswordGallery(galleryName);
      setPasswordInput('');
      setPasswordError(null);
      setShowPasswordPopup(true);
      return;
    } else {
      // Galerie ist nicht passwortgeschützt oder bereits entsperrt
      // Erstelle ein GalleryItem-Objekt aus dem Galerienamen und den Bildern
      const galleryImages = galleries[galleryName] || [];
      setSelectedGallery({
        name: galleryName,
        images: galleryImages,
        metadata: metadata[galleryName]
      });
      setGalleryView(true);
    }
  };
  
  // Funktion zum Verarbeiten der Passworteingabe
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentPasswordGallery) return;
    
    const galleryMeta = metadata[currentPasswordGallery];
    
    // Passwort überprüfen
    if (passwordInput === galleryMeta?.password) {
      // Passwort ist korrekt, Galerie zur Liste der entsperrten Galerien hinzufügen
      setUnlockedGalleries(prev => [...prev, currentPasswordGallery]);
      // Popup schließen
      setShowPasswordPopup(false);
      // Galerie öffnen
      // Erstelle ein GalleryItem-Objekt aus dem Galerienamen und den Bildern
      const galleryImages = galleries[currentPasswordGallery] || [];
      setSelectedGallery({
        name: currentPasswordGallery,
        images: galleryImages,
        metadata: metadata[currentPasswordGallery]
      });
      setGalleryView(true);
    } else {
      // Passwort ist falsch
      setPasswordError('Falsches Passwort. Bitte versuchen Sie es erneut.');
    }
  };
  
  // Funktion zum Schließen des Passwort-Popups
  const closePasswordPopup = () => {
    setShowPasswordPopup(false);
    setCurrentPasswordGallery(null);
    setPasswordInput('');
    setPasswordError(null);
  };
  
  const closeGallery = () => {
    setSelectedGallery(null);
    setGalleryView(false);
  };

  // Lightbox-Funktionen
  const openLightbox = (imageUrl: string, type: 'image' | 'video' = 'image', index?: number) => {
    setLightboxImage(imageUrl);
    setLightboxType(type);
    setLightboxOpen(true);
    // Setze den aktuellen Bildindex, wenn angegeben
    if (index !== undefined) {
      setCurrentImageIndex(index);
    }
    // Verhindere Scrollen des Hintergrunds
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    // Erlaube Scrollen wieder
    document.body.style.overflow = 'auto';
  };
  
  const nextImage = () => {
    if (!selectedGallery) return;
    
    // Filtere die Bilder, die angezeigt werden sollen
    const filteredImages = selectedGallery.images.filter(url => {
      if (isVideoGallery(selectedGallery.name)) {
        return isVideoUrl(url) || url.toLowerCase().includes('video_thumb');
      } else {
        return !isVideoUrl(url) && !isThumbnailUrl(url);
      }
    });
    
    if (!filteredImages || filteredImages.length === 0) return;
    
    const nextIndex = (currentImageIndex + 1) % filteredImages.length;
    const nextUrl = filteredImages[nextIndex];
    setCurrentImageIndex(nextIndex);
    setLightboxImage(nextUrl);
    setLightboxType(isVideoUrl(nextUrl) ? 'video' : 'image');
  };
  
  const prevImage = () => {
    if (!selectedGallery) return;
    
    // Filtere die Bilder, die angezeigt werden sollen
    const filteredImages = selectedGallery.images.filter(url => {
      if (isVideoGallery(selectedGallery.name)) {
        return isVideoUrl(url) || url.toLowerCase().includes('video_thumb');
      } else {
        return !isVideoUrl(url) && !isThumbnailUrl(url);
      }
    });
    
    if (!filteredImages || filteredImages.length === 0) return;
    
    const prevIndex = (currentImageIndex - 1 + filteredImages.length) % filteredImages.length;
    const prevUrl = filteredImages[prevIndex];
    setCurrentImageIndex(prevIndex);
    setLightboxImage(prevUrl);
    setLightboxType(isVideoUrl(prevUrl) ? 'video' : 'image');
  };
  
  // Touch-Event-Handler für Swipe-Funktionalität
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    if (isLeftSwipe) {
      nextImage();
    }
    if (isRightSwipe) {
      prevImage();
    }
    
    // Reset touch values
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Galerien laden
  useEffect(() => {
    async function fetchGalleries() {
      // Start minimum loading timer
      setMinLoadingComplete(false);
      setTimeout(() => {
        setMinLoadingComplete(true);
      }, 3000); // 3 seconds minimum loading time
      try {
        // Prüfe, ob der Benutzer angemeldet ist
        const isAuthenticated = authState.isAuthenticated;
        // Prüfe, ob der Benutzer ein Administrator ist
        const isAdmin = isAuthenticated && authState.user?.role === 'admin';
        console.log('Benutzer ist angemeldet:', isAuthenticated ? 'Ja' : 'Nein');
        console.log('Benutzer ist Administrator:', isAdmin ? 'Ja' : 'Nein');
        
        // Füge is_admin=true hinzu, aber NUR wenn der Benutzer ein Administrator ist
        // Dies stellt sicher, dass nur Administratoren interne Galerien sehen können
        const apiUrl = isAdmin ? '/api/galleries?is_admin=true' : '/api/galleries';
        console.log('Lade Galerien von:', apiUrl);
        
        const response = await fetch(apiUrl, { cache: "no-store" });
        if (!response.ok) throw new Error(`Fehler: ${response.status}`);
        const data = await response.json();
        
        let galleryData: Record<string, string[]> = {};
        let metadataData: Record<string, GalleryMetadata> = {};
        
        if (data.galleries && Object.keys(data.galleries).length > 0) {
          // Konvertiere alle WebDisk-URLs zu Partycrasher-URLs
          const convertedGalleries: Record<string, string[]> = {};
          
          Object.entries(data.galleries).forEach(([name, urls]) => {
            convertedGalleries[name] = (urls as string[]).map(url => ensureTonbandUrl(url));
          });
          
          galleryData = convertedGalleries;
          
          if (data.metadata) {
            metadataData = data.metadata;
          }
        } else {
          // Fallback-Daten mit tatsächlichen Galerien
          galleryData = {
            "2025/12.04.2025 - TonBand Geburtstags Session": [
              "https://tubox.de/WebDisk/uploads/2025/12.04.2025%20-%20TonBand%20Geburtstags%20Session/img_6806057ece9462.57891697.jpg",
              "https://tubox.de/WebDisk/uploads/2025/12.04.2025%20-%20TonBand%20Geburtstags%20Session/img_6806057ece9a72.92830942.jpg",
              "https://tubox.de/WebDisk/uploads/2025/12.04.2025%20-%20TonBand%20Geburtstags%20Session/img_6806057ece9d45.42549713.jpg"
            ],
            "2025/02.05.2025 - TonBand Session": [
              "https://tubox.de/WebDisk/uploads/2025/02.05.2025%20-%20TonBand%20Session/beispiel1.jpg"
            ],
            "2025/TON.BAND - VIDEOS": [
              "https://tubox.de/WebDisk/uploads/2025/TON.BAND%20-%20VIDEOS/beispiel_video.mp4"
            ],
            "2024/21.12.2024 - TonBand Session": [
              "https://tubox.de/WebDisk/uploads/2024/21.12.2024%20-%20TonBand%20Session/beispiel1.jpg"
            ]
          };
          
          // Fallback-Metadaten mit tatsächlichen Galerien
          metadataData = {
            "2025/12.04.2025 - TonBand Geburtstags Session": {
              jahr: "2025",
              galerie: "12.04.2025 - TonBand Geburtstags Session",
              kategorie: "Session",
              tags: ["tonband", "geburtstag", "session"]
            },
            "2025/02.05.2025 - TonBand Session": {
              jahr: "2025",
              galerie: "02.05.2025 - TonBand Session",
              kategorie: "Session",
              tags: ["tonband", "session"]
            },
            "2025/TON.BAND - VIDEOS": {
              jahr: "2025",
              galerie: "TON.BAND - VIDEOS",
              kategorie: "Video",
              tags: ["tonband", "video"]
            },
            "2024/21.12.2024 - TonBand Session": {
              jahr: "2024",
              galerie: "21.12.2024 - TonBand Session",
              kategorie: "Session",
              tags: ["tonband", "session"]
            }
          };
        }
        
        // Filtere Thumbnail-Bilder aus Video-Galerien
        Object.entries(galleryData).forEach(([galleryName, urls]) => {
          console.log(`Verarbeite Galerie: ${galleryName}`, urls);
          
          if (isVideoGallery(galleryName)) {
            // In Video-Galerien nur tatsächliche Videos anzeigen (keine Thumbnails)
            const videoUrls = urls.filter(url => isVideoUrl(url) && !isThumbnailUrl(url));
            console.log(`Galerie ${galleryName} ist eine Video-Galerie. Zeige ${videoUrls.length} Videos an:`, videoUrls);
            galleryData[galleryName] = videoUrls;
          } else {
            // In normalen Galerien keine Videos anzeigen (nur Bilder)
            galleryData[galleryName] = urls.filter(url => !isVideoUrl(url));
          }
        });
        
        // Extrahiere tatsächliche Kategorien aus den Metadaten und ordne sie nach Neuheit
        const categoriesWithYears: {category: string, latestYear: number}[] = [];
        
        // Für jede Kategorie das neueste Jahr finden
        Object.entries(metadataData).forEach(([galleryName, meta]) => {
          if (meta && meta.kategorie && meta.jahr) {
            const year = parseInt(meta.jahr, 10);
            const existingCategory = categoriesWithYears.find(c => c.category === meta.kategorie);
            
            if (existingCategory) {
              // Aktualisiere das Jahr, wenn dieses neuer ist
              if (year > existingCategory.latestYear) {
                existingCategory.latestYear = year;
              }
            } else {
              // Füge neue Kategorie hinzu
              categoriesWithYears.push({
                category: meta.kategorie,
                latestYear: year
              });
            }
          }
        });
        
        // Sortiere Kategorien nach dem neuesten Jahr (absteigend)
        categoriesWithYears.sort((a, b) => b.latestYear - a.latestYear);
        
        // Extrahiere nur die Kategorienamen in der sortierten Reihenfolge
        const sortedCategories = categoriesWithYears.map(item => item.category);
        
        setCategories(["Alle", ...sortedCategories]);
        setGalleries(galleryData);
        setMetadata(metadataData);
      } catch (err) {
        console.error("Fehler beim Laden der Galerien:", err);
        setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      } finally {
        setLoading(false);
      }
    }

    fetchGalleries();
  }, [authState.isAuthenticated, authState.user]); // Galerien neu laden, wenn sich der Auth-Status ändert

  // Zeige Ladeanzeige während der Authentifizierungsprüfung
  if (authState.isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-start', 
        alignItems: 'center', 
        minHeight: '50vh',
        marginTop: '6vh',
        backgroundColor: 'transparent',
        color: 'white'
      }}>
        <p>Lade...</p>
      </div>
    );
  }
  

  
  // Filtere die Galerien je nach Berechtigung
  const isAuthenticated = authState.isAuthenticated;
  const isAdmin = isAuthenticated && authState.user?.role === 'admin';
  
  // galleries: Record<string, string[]>  (galleryName -> images)
  // metadata: Record<string, GalleryMetadata>
  // Filterlogik für die Galerieübersicht
  const filteredGalleryNames = Object.keys(galleries).filter((galleryName) => {
    const meta = metadata[galleryName];
    if (!meta) return false;
    if (meta.accessType === 'locked') return false; // Gesperrte Galerien immer ausblenden
    if (meta.accessType === 'public') return true;
    if (meta.accessType === 'password' && isAuthenticated) return true;
    if (meta.accessType === 'internal' && isAdmin) return true;
    return false;
  });

  // Zeige Galerien entsprechend der Filterlogik
  return (
    <>
      {/* Hover-Effekte werden direkt in der GalleryGrid-Komponente angewendet */}
      <div className={styles.container}>
        {!galleryView ? (
          // Galerie-Übersicht
          <>
            {/* Kategorie-Filter */}
            <div className={styles.categories}>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`button${selectedCategory === category ? ' active' : ''}`}
                >
                  {category}
                </button>
              ))}
            </div>
            
            {(loading || !minLoadingComplete) ? (
              <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <div className={styles.loadingText}>Galerie werden geladen...</div>
              </div>
            ) : error ? (
              <div>Fehler: {error}</div>
            ) : (
              <motion.div
                className={styles.galleryGrid}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <AnimatePresence>
                  {Object.entries(galleries)
                    .filter(([galleryName]) => {
                      if (selectedCategory === "Alle") return true;
                      const meta = metadata[galleryName];
                      return meta && meta.kategorie === selectedCategory;
                    })
                    .sort((a, b) => {
                      const galleryNameA = a[0].split("/")[1] || "";
                      const galleryNameB = b[0].split("/")[1] || "";
                      const yearA = parseInt(metadata[a[0]]?.jahr || "0", 10);
                      const yearB = parseInt(metadata[b[0]]?.jahr || "0", 10);
                      
                      // Keine spezielle Behandlung für VIDEO-Galerien mehr
                      // Sie werden jetzt wie normale Galerien nach Datum sortiert
                      
                      // Spezielle Behandlung für Test-Galerien
                      // Diese sollen nach den regulären Galerien erscheinen
                      const isTestA = galleryNameA.toLowerCase().includes("test");
                      const isTestB = galleryNameB.toLowerCase().includes("test");
                      
                      if (isTestA && !isTestB) {
                        return 1; // Test-Galerien nach unten
                      }
                      if (!isTestA && isTestB) {
                        return -1; // Test-Galerien nach unten
                      }
                      
                      // Extrahiere Datum aus dem Galerie-Namen
                      // Suche genau nach dem Format DD.MM.YYYY, das in den Beispielen verwendet wird
                      const dateRegex = /(\d{1,2})\.(\d{1,2})\.(\d{4})/;
                      
                      // Versuche, ein Datum aus dem Galerie-Namen zu extrahieren
                      function extractDate(galleryName: string, year: number): Date {
                        const match = galleryName.match(dateRegex);
                        
                        if (match && match[1] && match[2] && match[3]) {
                          // Format: DD.MM.YYYY (z.B. "01.03.2025")
                          const day = parseInt(match[1]);
                          const month = parseInt(match[2]) - 1; // JavaScript-Monate beginnen bei 0
                          const year = parseInt(match[3]);
                          return new Date(year, month, day);
                        }
                        
                        // Fallback: Verwende nur das Jahr
                        return new Date(year, 0, 1);
                      }
                      
                      const dateA = extractDate(galleryNameA, yearA);
                      const dateB = extractDate(galleryNameB, yearB);
                      
                      // Sortiere nach Datum (absteigend)
                      return dateB.getTime() - dateA.getTime();
                    })
                    .map(([galleryName, images], index) => {
  const meta = metadata[galleryName];
  if (meta?.accessType === 'locked') return null; // Locked-Galerien nie anzeigen
                      const displayName = galleryName.split("/")[1] || galleryName;
                      const year = galleryName.split("/")[0] || "";
                      
                      // Verwende ein spezielles Thumbnail für Video-Galerien
                      let thumbnailUrl;
                      if (isVideoGallery(galleryName)) {
                        // Für Video-Galerien: Verwende die getVideosGalleryThumbnail-Funktion mit der Bilder-Liste
                        thumbnailUrl = getVideosGalleryThumbnail(galleryName, images);
                        console.log('Video-Galerie-Thumbnail für', galleryName, ':', thumbnailUrl);
                      } else {
                        // Für normale Galerien: Verwende das erste Bild direkt aus der Galerie
                        // Filtere zuerst alle Nicht-Thumbnail-Bilder
                        const regularImages = images.filter(url => !url.includes('/thumb/') && !isVideoUrl(url));
                        
                        if (regularImages.length > 0) {
                          // Verwende das erste reguläre Bild
                          thumbnailUrl = ensureTonbandUrl(regularImages[0]);
                          console.log('Verwende erstes Bild als Thumbnail:', thumbnailUrl);
                        } else if (images.length > 0) {
                          // Fallback: Verwende irgendein Bild aus der Galerie
                          thumbnailUrl = ensureTonbandUrl(images[0]);
                          console.log('Fallback: Verwende erstes verfügbares Bild:', thumbnailUrl);
                        } else {
                          // Wenn keine Bilder vorhanden sind, verwende den Platzhalter
                          thumbnailUrl = "/placeholder.svg";
                        }
                      }
                      const category = metadata[galleryName]?.kategorie || "";
                      
                      // Prüfen, ob die Galerie passwortgeschützt ist
                      const galleryMetadata = metadata[galleryName] || {};
                      const hasPassword = galleryMetadata.password && galleryMetadata.password.length > 0;
                      const isAuthenticated = typeof window !== 'undefined' && 
                        (sessionStorage.getItem(`gallery_token_${galleryName}`) !== null || unlockedGalleries.includes(galleryName));
                      const shouldBlur = hasPassword && !isAuthenticated;
                      
                      // Debug-Ausgabe in der Konsole
                      console.log(`Gallery ${galleryName}:`);
                      console.log(`- Password protected: ${hasPassword}`);
                      
                      return (
                        <motion.div 
                          key={galleryName}
                          className={`${styles.galleryCard} ${styles.cardHoverEffect}`}
                          data-password-protected={shouldBlur ? "true" : "false"}
                          onClick={() => openGallery(galleryName)}
                        >
                          <div className={`${styles.imageContainer} ${styles.fullWidthImageContainer}`} data-password-protected={shouldBlur ? "true" : "false"}>
                            <Image
                              src={thumbnailUrl}
                              alt={`Galerie ${displayName}`}
                              fill
                              className={styles.objectFitCover}
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              priority={index < 12}
                              onError={(e) => {
                                // Wenn das Thumbnail nicht geladen werden kann, verwende den Platzhalter
                                const target = e.target as HTMLImageElement;
                                target.onerror = null; // Verhindere endlose Fehler-Loops
                                target.src = isVideoGallery(galleryName) ? "/assets/video-placeholder.svg" : "/placeholder.svg";
                              }}
                            />
                          </div>
                          <div className={styles.captionContainer}>
                            <h3 className={styles.title}>{displayName}</h3>
{Array.isArray(metadata[galleryName]?.tags) && metadata[galleryName]?.tags.length > 0 && (
  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, margin: '6px 0 0 16px' }}>
    <span style={{ display: 'flex', alignItems: 'center', fontSize: 11, color: '#8ef2ff', fontWeight: 500, marginRight: 6, letterSpacing: '0.04em' }}>
      {/* Tag-Icon (optional) */}
      <svg style={{ marginRight: 3, borderRadius: '50%', background: 'rgba(0,225,255,0.11)' }} width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="9" stroke="#8ef2ff" strokeWidth="2" fill="rgba(0,225,255,0.12)" />
        <path d="M7.5 10.5L10 13L14 8.5" stroke="#8ef2ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      TAGS:
    </span>
    {metadata[galleryName]?.tags.map((tag: string) => (
      <span key={tag} className={styles.tagBubble}>{tag}</span>
    ))}
  </div>
)}
                            <div className={styles.captionDetails}>
                              <div className={styles.galleryInfo}>
                                <span className={styles.dateBubble}>
                                  {year}
                                </span>
                              </div>
                              <div className={styles.accessTypeContainer}>
                                {/* Zugriffstyp-Icon mit Hover-Beschreibung */}
                                {metadata[galleryName]?.accessType && (
                                <div className="relative group">
                                  <span 
                                    className={`${styles.accessTypeIcon} ${metadata[galleryName]?.accessType === 'public' ? styles.accessTypePublic : metadata[galleryName]?.accessType === 'password' ? styles.accessTypePassword : styles.accessTypeInternal}`}
                                    role="img"
                                    aria-label={metadata[galleryName]?.accessType === 'public' ? 'Öffentliche Galerie' : 
                                               metadata[galleryName]?.accessType === 'password' ? 'Passwortgeschützte Galerie' : 
                                               'Interne Galerie'}
                                  >
                                    {metadata[galleryName]?.accessType === 'public' ? (
                                      <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}>
                                          <circle cx="12" cy="12" r="10"></circle>
                                          <line x1="2" y1="12" x2="22" y2="12"></line>
                                          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                                        </svg>
                                        Öffentlich
                                      </>
                                    ) : metadata[galleryName]?.accessType === 'password' ? (
                                      <>
                                        <span className={styles.accessStatusContainer}>
                                          <span 
                                            className={`${styles.accessStatusIndicator} ${unlockedGalleries.includes(galleryName) ? styles.statusUnlocked : styles.statusLocked}`}
                                            aria-hidden="true"
                                          />
                                          {unlockedGalleries.includes(galleryName) ? 'Entsperrt' : 'Passwort'}
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}>
                                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                          <path d="M7 11V7a5 5 0 00-10 0v4"></path>
                                        </svg>
                                        Intern
                                      </>
                                    )}
                                  </span>
                                  
                                  {/* Tooltip bei Hover */}
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                                    {metadata[galleryName]?.accessType === 'public' ? 
                                      'Öffentliche Galerie: Für alle sichtbar' : 
                                     metadata[galleryName]?.accessType === 'password' ? 
                                      (unlockedGalleries.includes(galleryName) ? 
                                       'Passwortgeschützte Galerie: Bereits entsperrt' : 
                                       'Passwortgeschützte Galerie: Passwort erforderlich') : 
                                      'Interne Galerie: Nur für Administratoren'}
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                  </div>
                                </div>
                              )}
                              <span className={styles.mediaCount}>
                                {images.length} {isVideoGallery(galleryName) ? 'Videos' : 'Medien'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                      );
                    })}
                </AnimatePresence>
              </motion.div>
            )}
          </>
        ) : (
          // Galerie-Detailansicht
          selectedGallery && (
            <>
              <div className={styles.galleryHeader}>
                <button className={styles.backButton} onClick={closeGallery}>
                  &larr; Zurück zur Übersicht
                </button>
                <h1 className={styles.galleryTitle}>
                  <span>{selectedGallery.name.split("/")[1] || selectedGallery.name}</span>
                </h1>
                <p className={styles.gallerySubtitle}>
                  {selectedGallery.name.split("/")[0]} • {selectedGallery.images.length || 0} {isVideoGallery(selectedGallery.name) ? 'Videos' : 'Bilder'}
                  {isVideoGallery(selectedGallery.name) && (
                    <span>🎥</span>
                  )}
                </p>
              </div>
              
              <div className={styles.detailGrid}>
                {/* In Video-Galerien Videos und video_thumb anzeigen, in normalen Galerien nur Bilder anzeigen */}
                {selectedGallery.images.filter((url: string) => {
                  if (isVideoGallery(selectedGallery.name)) {
                    // In Video-Galerien Videos und video_thumb anzeigen, aber andere Thumbnails ausblenden
                    return isVideoUrl(url) || url.toLowerCase().includes('video_thumb');
                  } else {
                    // In normalen Galerien nur Bilder anzeigen (keine Videos) und Thumbnails ausblenden
                    return !isVideoUrl(url) && !isThumbnailUrl(url);
                  }
                }).map((imageUrl, index) => {
                  // Extrahiere den Dateinamen ohne Erweiterung für die Anzeige
                  const fileName = imageUrl.split('/').pop()?.split('.')[0].replace(/_/g, ' ') || '';
                  
                  return (
                    <div 
                      key={imageUrl} 
                      className={styles.imageCard}
                    >
                      <div 
                        onClick={() => openLightbox(imageUrl, isVideoUrl(imageUrl) ? 'video' : 'image', index)}
                        className={styles.detailImageContainer}
                      >
                        {isVideoUrl(imageUrl) ? (
                          <>
                            <Image
                              src={(() => {
                                // Direkter Pfad zum Thumbnail generieren
                                if (imageUrl.includes('/WebDisk/uploads/')) {
                                  try {
                                    const urlPath = imageUrl.split('/WebDisk/uploads/')[1];
                                    const pathParts = urlPath.split('/');
                                    
                                    if (pathParts.length >= 3) {
                                      const year = pathParts[0];
                                      const gallery = pathParts[1];
                                      const videoName = pathParts[pathParts.length - 1].split('.')[0];
                                      
                                      // Direkter Pfad zum video_thumb-Ordner
                                      console.log('Generiere direkten Thumbnail-Pfad für:', imageUrl);
                                      return `https://tubox.de/WebDisk/uploads/${year}/${gallery}/video_thumb/${videoName}_thumb.jpg`;
                                    }
                                  } catch (error) {
                                    console.error('Fehler beim Generieren des Thumbnail-Pfads:', error);
                                  }
                                }
                                return getVideoThumbnail(imageUrl, selectedGallery ? selectedGallery.images : []);
                              })()}
                              alt="Video Thumbnail"
                              fill
                              className={styles.objectFitCover}
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              priority={index < 12}
                              onError={(e) => {
                                // Wenn das Thumbnail nicht geladen werden kann, versuche verschiedene Fallbacks
                                const target = e.target as HTMLImageElement;
                                const currentSrc = target.src;
                                target.onerror = null; // Verhindere endlose Fehler-Loops
                                
                                console.log('Thumbnail konnte nicht geladen werden:', currentSrc);
                                
                                // Extrahiere Informationen aus dem Galerie-Namen
                                if (currentSrc.includes('/video_thumb/')) {
                                  // Versuche zuerst den alten Pfad ohne video_thumb-Ordner
                                  const oldPath = currentSrc.replace('/video_thumb/', '/');
                                  console.log('Versuche Fallback-Pfad:', oldPath);
                                  target.src = oldPath;
                                } else if (selectedGallery && isVideoGallery(selectedGallery.name)) {
                                  // Extrahiere Pfadkomponenten
                                  const galleryPath = selectedGallery.name.split('/');
                                  const year = galleryPath[0];
                                  const gallery = galleryPath[1];
                                  
                                  console.log('Thumbnail-Fehler für Video-Galerie:', selectedGallery.name);
                                  console.log('Aktuelle Quelle:', target.src);
                                  
                                  // Vereinfachte Fallback-Logik: Versuche direkt den thumb/-Ordner, wenn das video_thumb/-Thumbnail nicht funktioniert
                                  if (target.src.includes('/video_thumb/')) {
                                    // Versuche direkt das gallery_thumb.jpg im thumb/-Ordner
                                    const thumbPath = `https://tubox.de/WebDisk/uploads/${year}/${gallery}/thumb/gallery_thumb.jpg`;
                                    console.log('Versuche direkten Fallback zum thumb/-Ordner:', thumbPath);
                                    target.src = thumbPath;
                                  } else if (target.src.includes('/thumb/')) {
                                    // Wenn der thumb/-Pfad nicht funktioniert, versuche das Legacy-Thumbnail im Hauptverzeichnis
                                    const legacyPath = `https://tubox.de/WebDisk/uploads/${year}/${gallery}/gallery_thumb.jpg`;
                                    target.src = legacyPath;
                                  } else {
                                    // Wenn alle Pfade fehlschlagen, verwende ein einheitliches Fallback-Bild
                                    target.src = "/assets/video-placeholder.jpg";
                                  }
                                } else {
                                  target.src = "/placeholder.jpg";
                                }
                              }}
                            />
                          </>
                        ) : (
                          <Image
                            src={ensureTonbandUrl(imageUrl)}
                            alt={`Bild ${index + 1}`}
                            fill
                            className={styles.objectFitCover}
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            priority={index < 12}
                          />
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
              
              {/* Zurück-Button am Ende der Galerie */}
              <div className={styles.bottomNavContainer}>
                <button 
                  className={styles.backButton} 
                  onClick={closeGallery}
                >
                  &larr; Zurück zur Übersicht
                </button>
              </div>
            </>
          )
        )}
      </div>

      {/* Premium Lightbox mit erweiterten Funktionen */}
      <PremiumLightbox
        isOpen={lightboxOpen}
        onCloseAction={closeLightbox}
        images={selectedGallery ? selectedGallery.images.filter(url => !isVideoUrl(url)) : []}
        videos={selectedGallery ? selectedGallery.images.filter(url => isVideoUrl(url)) : []}
        currentIndex={selectedGallery ? selectedGallery.images.findIndex(url => url === lightboxImage) : 0}
        onNavigateAction={(newIndex) => {
          if (selectedGallery) {
            const allMedia = selectedGallery.images;
            if (allMedia[newIndex]) {
              setLightboxImage(allMedia[newIndex]);
              setLightboxType(isVideoUrl(allMedia[newIndex]) ? 'video' : 'image');
            }
          }
        }}
        galleryName={selectedGallery ? selectedGallery.name : ''}
      />

      {/* Modernes Passwort-Popup mit Overlay */}
      {showPasswordPopup && (
        <>
          {/* Dunkler Overlay-Hintergrund */}
          <div 
            className={styles.passwordOverlay}
            onClick={closePasswordPopup}
          />
          <div className={styles.passwordPopupContainer}>
            <div className={styles.passwordPopup}>
              <div className={styles.passwordHeader}>
                <h3 className={styles.passwordTitle}>
                  Passwort erforderlich
                </h3>
                <button 
                  onClick={closePasswordPopup}
                  className={styles.closeButton}
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handlePasswordSubmit}>
                <div className={styles.passwordInputContainer}>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className={styles.passwordInput}
                    placeholder="Passwort eingeben"
                    autoFocus
                  />
                  <div className={styles.passwordIcon}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
                
                {passwordError && (
                  <p className={styles.passwordError}>{passwordError}</p>
                )}
                
                <div className={styles.passwordActions}>
                  <button
                    type="button"
                    onClick={closePasswordPopup}
                    className={styles.cancelButton}
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className={styles.unlockButton}
                  >
                    Entsperren
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
}