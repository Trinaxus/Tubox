"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface UserData {
  isLoggedIn: boolean;
  username?: string;
  email?: string;
  role?: string;
}

export default function UserStatus() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          headers: {
            "Cache-Control": "no-cache"
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          setUserData(data);
        } else {
          setUserData({ isLoggedIn: false });
        }
      } catch (error) {
        console.error("Fehler beim Abrufen des Benutzerstatus:", error);
        setUserData({ isLoggedIn: false });
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      console.log("Starte vollständigen Logout-Prozess...");
      
      // 1. Alle Cookies löschen
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;";
        console.log(`Cookie gelöscht: ${name}`);
      }
      
      // 2. Lokalen Speicher vollständig leeren
      localStorage.clear();
      sessionStorage.clear();
      console.log("Lokaler Speicher geleert");
      
      // 3. Logout-API aufrufen
      console.log("Rufe Logout-API auf...");
      try {
        const response = await fetch("/api/logout", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            "Pragma": "no-cache"
          }
        });
        
        if (response.ok) {
          console.log("Logout-API erfolgreich aufgerufen");
        } else {
          console.warn("Logout-API-Fehler:", response.status);
        }
      } catch (e) {
        console.warn("Fehler beim Aufruf der Logout-API:", e);
      }
      
      // 4. Hard-Reload der Seite erzwingen
      console.log("Erzwinge Hard-Reload...");
      
      // Kurze Verzögerung, um sicherzustellen, dass alle Anfragen abgeschlossen sind
      setTimeout(() => {
        // Cache-Parameter hinzufügen, um Browser-Cache zu umgehen
        const cacheBuster = `?logout=${Date.now()}`;
        window.location.href = "/login" + cacheBuster;
      }, 100);
    } catch (error) {
      console.error("Unerwarteter Fehler beim Abmelden:", error);
      alert("Fehler beim Abmelden. Bitte lade die Seite neu.");
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center text-gray-500 text-sm">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-[#00e1ff] rounded-full animate-spin mr-2"></div>
        Lade...
      </div>
    );
  }

  if (!userData?.isLoggedIn) {
    return (
      <button 
        onClick={() => router.push("/login")}
        className="flex items-center text-sm text-[#ff6b00] hover:text-[#e05e00]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
        Anmelden
      </button>
    );
  }

  return (
    <div className="flex items-center">
      <div className="mr-3 flex items-center">
        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
        <div className="text-sm">
          <span className="font-semibold">{userData.username || "Benutzer"}</span>
        </div>
      </div>
      <button 
        onClick={handleLogout}
        className="text-red-600 hover:text-red-800"
        title="Abmelden"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>
    </div>
  );
}
