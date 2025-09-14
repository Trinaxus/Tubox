"use client";

/**
 * Hilfsfunktion zur Überprüfung des Authentifizierungsstatus
 * @returns Promise<boolean> - true, wenn der Benutzer angemeldet ist, sonst false
 */
export async function checkAuthStatus(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });
    
    const data = await response.json();
    return data.isLoggedIn || false;
  } catch (error) {
    console.error('Fehler beim Überprüfen des Authentifizierungsstatus:', error);
    return false;
  }
}
