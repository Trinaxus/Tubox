import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  console.log('Logout-API aufgerufen');
  
  // Erstelle eine Antwort
  const response = NextResponse.json({ 
    success: true, 
    message: 'Erfolgreich abgemeldet' 
  });
  
  // Session-Cookie löschen
  response.cookies.delete('tubox_session');
  
  // CORS-Header setzen
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  console.log('Logout-API: Session-Cookie gelöscht');
  
  return response;
}

// OPTIONS-Handler für CORS
export async function OPTIONS(req: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  return response;
}
