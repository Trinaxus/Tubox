"use client";

import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";

interface VisitorStatsProps {
  className?: string;
}

interface StatsData {
  totalVisits: number;
  activeVisitors: number;
  uniqueVisitors: number;
}

export default function VisitorStats({ className = "" }: VisitorStatsProps) {
  const [stats, setStats] = useState<StatsData>({
    totalVisits: 0,
    activeVisitors: 0,
    uniqueVisitors: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Generiere eine eindeutige Besucher-ID, falls noch nicht vorhanden
    let visitorId = localStorage.getItem("visitor_id");
    if (!visitorId) {
      visitorId = uuidv4();
      localStorage.setItem("visitor_id", visitorId);
    }

    // Funktion zum Abrufen der Statistiken
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/statistics", {
          method: "GET",
          headers: {
            "Cache-Control": "no-cache",
            "Pragma": "no-cache"
          }
        });

        if (!response.ok) {
          throw new Error(`Fehler beim Abrufen der Statistiken: ${response.status}`);
        }

        const data = await response.json();
        setStats(data);
        setLoading(false);
      } catch (err) {
        console.error("Fehler beim Laden der Statistiken:", err);
        setError(err instanceof Error ? err.message : "Unbekannter Fehler");
        setLoading(false);
      }
    };

    // Funktion zum Registrieren eines Besuchs
    const registerVisit = async () => {
      try {
        // Vereinfachter Ansatz ohne Cookie-Verarbeitung
        let username = null;

        const response = await fetch("/api/statistics", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache"
          },
          body: JSON.stringify({
            visitorId,
            username
          })
        });

        if (!response.ok) {
          throw new Error(`Fehler beim Registrieren des Besuchs: ${response.status}`);
        }

        const data = await response.json();
        setStats(data);
        setLoading(false);
      } catch (err) {
        console.error("Fehler beim Registrieren des Besuchs:", err);
        setError(err instanceof Error ? err.message : "Unbekannter Fehler");
        setLoading(false);
      }
    };

    // Beim ersten Laden einen Besuch registrieren
    registerVisit();

    // Statistiken regelmäßig aktualisieren
    const interval = setInterval(fetchStats, 30000); // Alle 30 Sekunden aktualisieren

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className={`p-4 bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
        <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
          Besucherstatistik
        </h2>
        <div className="flex justify-center items-center h-24">
          <div className="w-8 h-8 border-4 border-[#00e1ff] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
        <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
          Besucherstatistik
        </h2>
        <div className="bg-red-100 dark:bg-red-900 p-3 rounded-md text-red-700 dark:text-red-200">
          <p>Fehler beim Laden der Statistiken: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
      <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
        Besucherstatistik
      </h2>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#fff0e6] dark:bg-[#2a1208] p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-[#ff6b00] dark:text-[#ff6b00]">
            {stats.activeVisitors}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Aktive Besucher</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.uniqueVisitors}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Eindeutige Besucher</div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/30 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {stats.totalVisits}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Gesamt Besuche</div>
        </div>
      </div>
    </div>
  );
}
