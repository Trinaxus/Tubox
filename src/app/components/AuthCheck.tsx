"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface AuthCheckProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "user";
}

export default function AuthCheck({ children, requiredRole = "user" }: AuthCheckProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Prüfe, ob ein Session-Cookie vorhanden ist
    const checkAuth = async () => {
      try {
        console.log("AuthCheck: Prüfe Authentifizierung...");
        
        // Prüfe zuerst, ob ein Session-Cookie vorhanden ist
        const sessionCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('tubox_session='));
        
        console.log("AuthCheck: Session-Cookie gefunden?", !!sessionCookie);
        
        if (!sessionCookie) {
          console.log("AuthCheck: Kein Session-Cookie gefunden, leite zur Login-Seite weiter");
          router.push("/login?message=Bitte melde dich an, um fortzufahren");
          setIsLoading(false);
          return;
        }
        
        // Versuche, Benutzerinformationen aus dem API-Endpunkt zu laden
        console.log("AuthCheck: Rufe /api/auth/me auf...");
        const res = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include", // Wichtig für Cookies
          headers: {
            "Cache-Control": "no-cache"
          }
        });
        
        console.log("AuthCheck: Antwort erhalten, Status:", res.status);
        
        if (res.ok) {
          const data = await res.json();
          console.log("AuthCheck: Daten erhalten:", data);
          
          // Prüfe, ob der Benutzer eingeloggt ist
          if (data.isLoggedIn) {
            // Prüfe, ob der Benutzer die erforderliche Rolle hat
            if (requiredRole === "admin" && data.role !== "admin") {
              console.log("AuthCheck: Benutzer hat nicht die Admin-Rolle");
              router.push("/login?message=Zugriff verweigert. Bitte melde dich mit einem Admin-Konto an.");
            } else {
              console.log("AuthCheck: Benutzer ist authentifiziert");
              setIsAuthenticated(true);
            }
          } else {
            console.log("AuthCheck: Benutzer ist nicht eingeloggt");
            router.push("/login?message=Bitte melde dich an, um fortzufahren");
          }
        } else {
          // Versuche, die Fehlermeldung zu lesen
          try {
            const errorData = await res.json();
            console.error("AuthCheck: API-Fehler:", errorData);
            setError(`Authentifizierungsfehler: ${errorData.message || res.statusText}`);
          } catch (parseError) {
            console.error("AuthCheck: Fehler beim Parsen der Fehlerantwort:", parseError);
            setError(`Authentifizierungsfehler: ${res.status} ${res.statusText}`);
          }
          
          // Zur Login-Seite weiterleiten
          router.push(`/login?message=Bitte melde dich an, um fortzufahren&error=${encodeURIComponent(res.statusText)}`);
        }
      } catch (error) {
        console.error("AuthCheck: Unbehandelter Fehler:", error);
        setError(`Unerwarteter Fehler: ${error instanceof Error ? error.message : String(error)}`);
        
        // Zur Login-Seite weiterleiten mit Fehlermeldung
        const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler";
        router.push(`/login?message=Fehler bei der Authentifizierung&error=${encodeURIComponent(errorMessage)}`);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, requiredRole]);

  // Zeige Ladeindikator während der Authentifizierungsprüfung
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#00e1ff] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Authentifizierung wird überprüft...</p>
        </div>
      </div>
    );
  }
  
  // Zeige Fehler an, falls vorhanden
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center bg-red-50 p-6 rounded-lg shadow-md max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Authentifizierungsfehler</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button 
            onClick={() => router.push('/login')}
            className="bg-[#ff6b00] hover:bg-[#e05e00] text-white font-semibold py-2 px-4 rounded"
          >
            Zum Login
          </button>
        </div>
      </div>
    );
  }

  // Wenn authentifiziert, zeige den geschützten Inhalt
  return isAuthenticated ? <>{children}</> : null;
}
