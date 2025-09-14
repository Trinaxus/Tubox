"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ForceLogout() {
  const [status, setStatus] = useState("Starte vollständigen Logout-Prozess...");
  const router = useRouter();

  useEffect(() => {
    const performForceLogout = async () => {
      try {
        setStatus("Lösche alle Cookies...");
        // Alle Cookies löschen
        const cookies = document.cookie.split(";");
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i];
          const eqPos = cookie.indexOf("=");
          const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;";
          console.log(`Cookie gelöscht: ${name}`);
        }

        setStatus("Leere lokalen Speicher...");
        // Lokalen Speicher leeren
        localStorage.clear();
        sessionStorage.clear();

        setStatus("Rufe Logout-API auf...");
        // Logout-API aufrufen
        await fetch("/api/logout", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            "Pragma": "no-cache"
          }
        });

        setStatus("Rufe Auth-API mit Force-Logout-Parameter auf...");
        // Auth-API mit Force-Logout-Parameter aufrufen
        await fetch("/api/auth/me?force_logout=true", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            "Pragma": "no-cache"
          }
        });

        setStatus("Logout erfolgreich! Leite zur Login-Seite weiter...");
        
        // Kurze Verzögerung, dann zur Login-Seite weiterleiten
        setTimeout(() => {
          // Cache-Busting-Parameter hinzufügen
          const cacheBuster = `?t=${Date.now()}`;
          window.location.href = "/login" + cacheBuster;
        }, 1500);
      } catch (error) {
        console.error("Fehler beim Force-Logout:", error);
        setStatus("Fehler beim Logout. Versuche es erneut...");
      }
    };

    performForceLogout();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-6 text-blue-600 dark:text-blue-400">
          Vollständiger Logout
        </h1>
        
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-700 dark:text-gray-300 text-center">{status}</p>
        </div>
      </div>
    </div>
  );
}
