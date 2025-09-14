"use client";

import { useEffect, useState } from "react";

interface VisitorStats {
  totalVisits: number;
  activeVisitors: number;
}

export default function VisitorCounter() {
  const [stats, setStats] = useState<VisitorStats>({ totalVisits: 0, activeVisitors: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Generiere eine Session-ID für diesen Besucher
    const generateSessionId = () => {
      const existingId = localStorage.getItem('visitor_session_id');
      if (existingId) return existingId;
      
      const newId = `visitor-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('visitor_session_id', newId);
      return newId;
    };
    
    const sessionId = generateSessionId();
    
    // Funktion zum Abrufen der Besucherstatistik
    const fetchVisitorStats = async () => {
      try {
        const res = await fetch("/api/visitors");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Fehler beim Abrufen der Besucherstatistik:", error);
      } finally {
        setLoading(false);
      }
    };
    
    // Funktion zum Registrieren eines Besuchs
    const registerVisit = async () => {
      try {
        const res = await fetch("/api/visitors", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ sessionId })
        });
        
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Fehler beim Registrieren des Besuchs:", error);
      } finally {
        setLoading(false);
      }
    };
    
    // Registriere den Besuch beim Laden der Komponente
    registerVisit();
    
    // Aktualisiere die Statistik regelmäßig
    const interval = setInterval(fetchVisitorStats, 60000); // Jede Minute
    
    // Bereinige den Interval beim Unmount
    return () => clearInterval(interval);
  }, []);
  
  // Ping-Funktion, um den Besucher als aktiv zu halten
  useEffect(() => {
    const pingVisitor = async () => {
      const sessionId = localStorage.getItem('visitor_session_id');
      if (!sessionId) return;
      
      try {
        await fetch("/api/visitors", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ sessionId })
        });
      } catch (error) {
        console.error("Fehler beim Ping:", error);
      }
    };
    
    // Ping alle 5 Minuten
    const pingInterval = setInterval(pingVisitor, 5 * 60 * 1000);
    
    return () => clearInterval(pingInterval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center text-gray-500 text-sm">
        <div className="w-3 h-3 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mr-2"></div>
        Lade Besucherstatistik...
      </div>
    );
  }

  return (
    <div className="flex items-center bg-blue-50 dark:bg-blue-900/30 px-3 py-2 rounded-md">
      <div className="mr-4">
        <div className="text-xs text-gray-500 dark:text-gray-400">Aktive Besucher</div>
        <div className="text-lg font-bold text-blue-600 dark:text-blue-300 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
          {stats.activeVisitors}
        </div>
      </div>
      <div>
        <div className="text-xs text-gray-500 dark:text-gray-400">Gesamt Besuche</div>
        <div className="text-lg font-bold text-gray-700 dark:text-gray-300">
          {stats.totalVisits}
        </div>
      </div>
    </div>
  );
}
