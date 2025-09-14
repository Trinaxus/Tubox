/**
 * Zentrale API-Schicht für alle Datenzugriffe
 * 
 * Diese Datei kapselt alle API-Aufrufe und bietet eine einheitliche Schnittstelle
 * für den Zugriff auf Daten aus verschiedenen Quellen (Next.js API Routes, PHP-API, etc.)
 */

import { ensureWebDiskUrl } from './mediaHelpers';

// User type for authentication
interface User {
  id: string;
  email: string;
  username: string;
  role: string;
}

// Response types for API calls
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

// Typen für die API-Antworten
export interface GalleryMetadata {
  jahr: string;
  galerie: string;
  kategorie: string;
  tags: string[];
}

export interface GalleriesResponse {
  galleries: Record<string, string[]>;
  metadata: Record<string, GalleryMetadata>;
}

// Konstanten für API-Endpunkte
const API_ENDPOINTS = {
  GALLERIES: '/api/galleries',
  GALLERY_META: '/api/gallery-meta',
  DELETE_GALLERY: '/api/delete-gallery',
  DELETE_IMAGE: '/api/delete-image',
  LOGIN: '/api/login',
  REGISTER: '/api/register',
  AUTH_ME: '/api/auth/me',
};

// Fehlerklasse für API-Fehler
export class ApiError extends Error {
  status: number;
  
  constructor(message: string, status: number = 500) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Hilfsfunktion für API-Aufrufe
 */
async function fetchApi<T>(url: string, options: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      let errorMessage = `API-Fehler: ${response.status} ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // Ignoriere Fehler beim Parsen der Fehlerantwort
      }
      
      throw new ApiError(errorMessage, response.status);
    }
    
    return await response.json() as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Wandle andere Fehler in ApiError um
    throw new ApiError(
      error instanceof Error ? error.message : 'Unbekannter Fehler',
      0
    );
  }
}

/**
 * Lade alle Galerien mit Metadaten
 */
export async function fetchGalleries(): Promise<GalleriesResponse> {
  const data = await fetchApi<GalleriesResponse>(API_ENDPOINTS.GALLERIES);
  
  // Konvertiere alle WebDisk-URLs zu WebDisk-URLs
  if (data.galleries) {
    const convertedGalleries: Record<string, string[]> = {};
    
    for (const [name, images] of Object.entries(data.galleries)) {
      // Konvertiere alle URLs
      const convertedImages = images.map(url => ensureWebDiskUrl(url));
      convertedGalleries[name] = convertedImages;
    }
    
    return {
      galleries: convertedGalleries,
      metadata: data.metadata || {},
    };
  }
  
  return data;
}

/**
 * Lade Metadaten für eine bestimmte Galerie
 */
export async function fetchGalleryMeta(year: string, gallery: string): Promise<GalleryMetadata | null> {
  try {
    const url = `${API_ENDPOINTS.GALLERY_META}?year=${encodeURIComponent(year)}&gallery=${encodeURIComponent(gallery)}`;
    return await fetchApi<GalleryMetadata>(url);
  } catch (error) {
    console.error('Fehler beim Laden der Metadaten:', error);
    return null;
  }
}

/**
 * Lösche eine Galerie
 */
export async function deleteGallery(galleryName: string): Promise<{ success: boolean; message: string }> {
  return await fetchApi<{ success: boolean; message: string }>(API_ENDPOINTS.DELETE_GALLERY, {
    method: 'POST',
    body: JSON.stringify({ galleryName }),
  });
}

/**
 * Lösche ein Bild aus einer Galerie
 */
export async function deleteImage(year: string, gallery: string, filename: string): Promise<{ success: boolean; message: string }> {
  return await fetchApi<{ success: boolean; message: string }>(API_ENDPOINTS.DELETE_IMAGE, {
    method: 'POST',
    headers: {
      'X-API-TOKEN': process.env.NEXT_PUBLIC_SERVER_API_TOKEN || 'mysecrettoken',
    },
    body: JSON.stringify({ year, gallery, filename }),
  });
}

/**
 * Login-Funktion
 */
export async function login(email: string, password: string): Promise<{ success: boolean; user?: User }> {
  return await fetchApi<{ success: boolean; user?: User }>(API_ENDPOINTS.LOGIN, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/**
 * Registrierungs-Funktion
 */
export async function register(username: string, email: string, password: string): Promise<{ success: boolean; message: string }> {
  return await fetchApi<{ success: boolean; message: string }>(API_ENDPOINTS.REGISTER, {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
}

/**
 * Prüfe Authentifizierung
 */
export async function checkAuth(): Promise<{ isLoggedIn: boolean; user?: User }> {
  try {
    return await fetchApi<{ isLoggedIn: boolean; user?: User }>(API_ENDPOINTS.AUTH_ME, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    return { isLoggedIn: false };
  }
}
