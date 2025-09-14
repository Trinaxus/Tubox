/**
 * Hilfsfunktionen für die Verarbeitung von Medien (Bilder und Videos)
 */

// Konfigurierbare Basis für Upload-URLs (Client verfügbar)
const SERVER_BASE = process.env.NEXT_PUBLIC_SERVER_BASE_URL || 'https://tubox.de/TUBOX/server';
const UPLOADS_BASE_URL = process.env.NEXT_PUBLIC_UPLOADS_BASE_URL || `${SERVER_BASE}/uploads`;

// Stellt sicher, dass eine URL auf die neue Server-Uploads-Basis zeigt
export function ensureServerUploadsUrl(url: string): string {
  if (!url) return url;

  // Wenn bereits auf die aktuelle Basis zeigt, unverändert zurückgeben
  if (url.startsWith(UPLOADS_BASE_URL)) return url;

  // Wenn die URL einen /uploads/ Teil hat, normiere auf die neue Basis
  if (url.includes('/uploads/')) {
    const pathAfterUploads = url.split('/uploads/')[1];
    if (pathAfterUploads) {
      return `${UPLOADS_BASE_URL}/${pathAfterUploads}`;
    }
  }

  // Backwards: alte WebDisk/Partycrasher-Hosts in neue Basis überführen, falls Struktur erkennbar ist
  if (url.includes('/WebDisk/uploads/')) {
    const path = url.split('/WebDisk/uploads/')[1];
    return `${UPLOADS_BASE_URL}/${path}`;
  }
  if (url.includes('/Partycrasher/uploads/')) {
    const path = url.split('/Partycrasher/uploads/')[1];
    return `${UPLOADS_BASE_URL}/${path}`;
  }

  return url;
}

// Rückwärtskompatibler Alias-Export
export function ensureWebDiskUrl(url: string): string {
  return ensureServerUploadsUrl(url);
}

// Prüft, ob eine URL ein Video ist
export const isVideoUrl = (url: string): boolean => {
  if (!url) return false;
  
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
  return videoExtensions.some(ext => lowercaseUrl.endsWith(ext));
};

// Prüft, ob eine URL ein Thumbnail ist
export const isThumbnailUrl = (url: string): boolean => {
  if (!url) return false;
  return url.toLowerCase().includes('_thumb.') || url.toLowerCase().includes('-thumb.');
};

// Prüft, ob eine Galerie eine Video-Galerie ist
export const isVideoGallery = (galleryName: string): boolean => {
  // Prüfe den Galerienamen - einfachste und zuverlässigste Methode
  return galleryName.includes('VIDEOS') || galleryName.includes('Videos') || galleryName.includes('videos');
};

// Findet ein hochgeladenes Thumbnail für ein Video
export const findVideoThumbnail = (videoUrl: string, galleryFiles: string[]): string | null => {
  // Extrahiere Jahr, Galerie und Dateinamen aus der URL
  let year = '';
  let gallery = '';
  let videoName = '';
  
  try {
    // Versuche, die URL zu parsen
    // Extrahiere die relevanten Teile aus der URL (nach /uploads/)
    if (videoUrl.includes('/uploads/')) {
      const urlPath = videoUrl.split('/uploads/')[1];
      const pathParts = urlPath.split('/');
      
      if (pathParts.length >= 3) {
        year = pathParts[0];
        gallery = pathParts[1];
        videoName = pathParts[pathParts.length - 1].split('.')[0];
      } else {
        console.error('URL-Format nicht erkannt:', videoUrl);
        return null;
      }
    } else {
      console.error('Keine WebDisk-URL:', videoUrl);
      return null;
    }
    
    // Suche nach einem passenden Thumbnail in der Galerie
    const thumbnail = galleryFiles.find(url => 
      (url.includes(`${videoName}_thumb.`) || url.includes(`${videoName}-thumb.`)) && !isVideoUrl(url)
    );
    
    if (thumbnail) {
      return thumbnail;
    }
    
    // Wenn kein Thumbnail gefunden wurde, versuche es im video_thumb/-Unterordner
    return `${UPLOADS_BASE_URL}/${year}/${gallery}/video_thumb/${videoName}_thumb.jpg`;
  } catch (error) {
    console.error('Fehler beim Extrahieren des Thumbnails:', error);
    return null;
  }
};

// Generiert eine Video-Thumbnail-URL oder verwendet den Fallback
export const getVideoThumbnail = (videoUrl: string, galleryFiles: string[] = []): string => {
  // Direkter Ansatz: Extrahiere Jahr, Galerie und Dateinamen direkt aus der URL
  if (videoUrl.includes('/WebDisk/uploads/')) {
    try {
      const urlPath = videoUrl.split('/WebDisk/uploads/')[1];
      const pathParts = urlPath.split('/');
      
      if (pathParts.length >= 3) {
        const year = pathParts[0];
        const gallery = pathParts[1];
        const videoName = pathParts[pathParts.length - 1].split('.')[0];
        
        // Direkter Pfad zum video_thumb-Ordner
        return `${UPLOADS_BASE_URL}/${year}/${gallery}/video_thumb/${videoName}_thumb.jpg`;
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
      return thumbnail;
    }
  }
  
  // Fallback: Generiere ein SVG als Platzhalter
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='240' viewBox='0 0 320 240'%3E%3Crect width='320' height='240' fill='%232a1208'/%3E%3Ctext x='160' y='120' font-family='Arial' font-size='16' fill='%23ff6b00' text-anchor='middle'%3EVideo%3C/text%3E%3C/svg%3E`;
};
