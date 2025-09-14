import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Hole die URL aus dem Query-Parameter
    const url = request.nextUrl.searchParams.get('url');
    
    if (!url) {
      return NextResponse.json({ error: 'URL-Parameter fehlt' }, { status: 400 });
    }
    
    // Decodiere die URL
    const decodedUrl = decodeURIComponent(url);
    
    // Hole das Bild vom Server
    const response = await fetch(decodedUrl);
    
    if (!response.ok) {
      return NextResponse.json({ 
        error: `Fehler beim Abrufen des Bildes: ${response.status}` 
      }, { status: response.status });
    }
    
    // Hole die Bilddaten
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Sende das Bild zurück
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Proxy-Fehler:', error);
    return NextResponse.json({ 
      error: `Serverfehler: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  }
}
