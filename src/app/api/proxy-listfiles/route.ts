import { NextResponse } from 'next/server';

// Diese Route dient als Proxy für die listfiles.php im bildupload-Verzeichnis
export async function GET() {
  try {
    // Verwende die URL der listfiles.php im bildupload-Verzeichnis
    const response = await fetch('https://www.tubox.de/bildupload/listfiles.php');
    
    if (!response.ok) {
      return NextResponse.json({ 
        error: `Fehler beim Abrufen der Dateiliste: ${response.status}` 
      }, { status: response.status });
    }
    
    // Hole die Dateiliste
    const files = await response.json();
    
    // Passe die Pfade an, um auf WebDisk statt bildupload zu verweisen
    let adaptedFiles;
    
    if (Array.isArray(files)) {
      // Wenn es ein Array von Dateipfaden ist
      adaptedFiles = files.map(file => {
        // Ersetze bildupload durch WebDisk im Pfad
        return file.replace(/^bildupload\//, 'WebDisk/');
      });
    } else {
      // Falls es ein anderes Format hat
      adaptedFiles = files;
    }
    
    return NextResponse.json(adaptedFiles);
  } catch (error) {
    console.error('Proxy-Fehler:', error);
    return NextResponse.json({ 
      error: `Serverfehler: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  }
}
