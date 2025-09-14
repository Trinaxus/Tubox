import { NextRequest, NextResponse } from 'next/server';

// In-Memory-Speicher für Statistiken (wird bei Server-Neustart zurückgesetzt)
let statistics = {
  totalVisits: 0,
  activeVisitors: new Map<string, { lastSeen: number, username: string | null }>(),
  uniqueVisitors: new Set<string>()
};

// Aufräumfunktion, die inaktive Besucher entfernt (älter als 15 Minuten)
function cleanupInactiveVisitors() {
  const now = Date.now();
  const inactiveThreshold = 15 * 60 * 1000; // 15 Minuten in Millisekunden
  
  for (const [visitorId, data] of statistics.activeVisitors.entries()) {
    if (now - data.lastSeen > inactiveThreshold) {
      statistics.activeVisitors.delete(visitorId);
    }
  }
}

// Führe die Aufräumfunktion alle 5 Minuten aus
setInterval(cleanupInactiveVisitors, 5 * 60 * 1000);

export async function GET(req: NextRequest) {
  // CORS-Header setzen
  const response = new NextResponse();
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  
  // OPTIONS-Anfragen für CORS-Preflight beantworten
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: response.headers });
  }
  
  // Statistiken zurückgeben
  return NextResponse.json({
    totalVisits: statistics.totalVisits,
    activeVisitors: statistics.activeVisitors.size,
    uniqueVisitors: statistics.uniqueVisitors.size
  }, { headers: response.headers });
}

export async function POST(req: NextRequest) {
  // CORS-Header setzen
  const response = new NextResponse();
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  
  // OPTIONS-Anfragen für CORS-Preflight beantworten
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: response.headers });
  }
  
  try {
    // Anfragedaten auslesen
    const data = await req.json();
    const visitorId = data.visitorId || 'anonymous';
    const username = data.username || null;
    
    // Gesamtbesuche erhöhen
    statistics.totalVisits++;
    
    // Eindeutige Besucher aktualisieren
    statistics.uniqueVisitors.add(visitorId);
    
    // Aktive Besucher aktualisieren
    statistics.activeVisitors.set(visitorId, {
      lastSeen: Date.now(),
      username
    });
    
    // Erfolgreiche Antwort
    return NextResponse.json({
      success: true,
      totalVisits: statistics.totalVisits,
      activeVisitors: statistics.activeVisitors.size,
      uniqueVisitors: statistics.uniqueVisitors.size
    }, { headers: response.headers });
  } catch (error) {
    console.error('Statistik-API Fehler:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }, { 
      status: 500,
      headers: response.headers
    });
  }
}
