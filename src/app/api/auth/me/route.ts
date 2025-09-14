import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  console.log('API /auth/me: Anfrage erhalten');
  
  // Cache-Control-Header setzen, um Caching zu verhindern
  const response = new NextResponse();
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  response.headers.set('Surrogate-Control', 'no-store');
  
  // OPTIONS-Anfragen für CORS-Preflight beantworten
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: response.headers });
  }
  
  // Prüfe, ob ein Logout-Parameter in der URL ist
  const url = new URL(req.url);
  if (url.searchParams.has('force_logout')) {
    console.log('API /auth/me: Force-Logout Parameter gefunden, lösche Session');
    const logoutResponse = NextResponse.json({ 
      isLoggedIn: false,
      message: 'Session zurückgesetzt' 
    }, { 
      status: 200,
      headers: response.headers
    });
    
    logoutResponse.cookies.delete('tubox_session');
    return logoutResponse;
  }
  
  try {
    // Cookie auslesen
    const sessionCookie = req.cookies.get('tubox_session')?.value;
    console.log('API /auth/me: Session-Cookie vorhanden?', !!sessionCookie);
    
    // Wenn kein Cookie vorhanden ist, ist der Benutzer nicht eingeloggt
    if (!sessionCookie) {
      console.log('API /auth/me: Kein Session-Cookie gefunden');
      return NextResponse.json({ 
        isLoggedIn: false,
        message: 'Nicht eingeloggt' 
      }, { 
        status: 401,
        headers: response.headers
      });
    }
    
    try {
      // Session-Daten dekodieren
      const sessionData = JSON.parse(decodeURIComponent(sessionCookie));
      console.log('API /auth/me: Session-Daten dekodiert:', { 
        username: sessionData.username || null,
        email: sessionData.email || null,
        role: sessionData.role || 'user'
      });
      
      // Prüfe, ob die Session-Daten vollständig sind
      if (!sessionData.username || !sessionData.email || !sessionData.role) {
        console.log('API /auth/me: Unvollständige Session-Daten gefunden, lösche Session');
        const invalidResponse = NextResponse.json({ 
          isLoggedIn: false,
          message: 'Unvollständige Session-Daten' 
        }, { 
          status: 401,
          headers: response.headers
        });
        
        invalidResponse.cookies.delete('tubox_session');
        return invalidResponse;
      }
      
      // Prüfe, ob die Session einen Timestamp hat und nicht zu alt ist
      const now = Date.now();
      const sessionTime = sessionData.timestamp || 0;
      const maxSessionAge = 24 * 60 * 60 * 1000; // 24 Stunden
      
      if (now - sessionTime > maxSessionAge) {
        console.log('API /auth/me: Session ist abgelaufen, lösche Session');
        const expiredResponse = NextResponse.json({ 
          isLoggedIn: false,
          message: 'Session abgelaufen' 
        }, { 
          status: 401,
          headers: response.headers
        });
        
        expiredResponse.cookies.delete('tubox_session');
        return expiredResponse;
      }
      
      // Erfolgreiche Antwort mit Benutzerdaten
      return NextResponse.json({
        isLoggedIn: true,
        username: sessionData.username,
        email: sessionData.email,
        role: sessionData.role,
        sessionId: sessionData.sessionId || null
      }, {
        headers: response.headers
      });
    } catch (parseError) {
      console.error('API /auth/me: Fehler beim Parsen des Session-Cookies:', parseError);
      
      // Cookie ist ungültig, löschen
      const errorResponse = NextResponse.json({ 
        isLoggedIn: false,
        message: 'Ungültige Session' 
      }, { 
        status: 401,
        headers: response.headers
      });
      
      errorResponse.cookies.delete('tubox_session');
      return errorResponse;
    }
  } catch (error) {
    console.error('API /auth/me: Unbehandelter Fehler:', error);
    return NextResponse.json({ 
      isLoggedIn: false,
      error: 'Serverfehler',
      details: error instanceof Error ? error.message : String(error)
    }, { 
      status: 500,
      headers: response.headers
    });
  }
}
