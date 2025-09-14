import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    // Blog-Post-Daten aus dem Request-Body extrahieren
    const blogPost = await request.json();
    
    // Validierung der Pflichtfelder
    if (!blogPost.title || !blogPost.slug) {
      return NextResponse.json(
        { error: 'Titel und Slug sind erforderlich' },
        { status: 400 }
      );
    }

    // Pfad zum Blog-Verzeichnis
    const BLOG_FS_PATH = path.join(process.cwd(), 'public', 'uploads', 'blog');
    
    // Überprüfen, ob der Slug bereits existiert
    const filePath = path.join(BLOG_FS_PATH, `${blogPost.slug}.json`);
    if (fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Ein Blog-Post mit diesem Slug existiert bereits' },
        { status: 409 }
      );
    }

    // Aktuelles Datum für createdAt und updatedAt setzen, falls nicht vorhanden
    if (!blogPost.createdAt) {
      blogPost.createdAt = new Date().toISOString();
    }
    if (!blogPost.updatedAt) {
      blogPost.updatedAt = new Date().toISOString();
    }

    // Speichern des Blog-Posts als JSON-Datei
    fs.writeFileSync(filePath, JSON.stringify(blogPost, null, 2), 'utf-8');

    // Aktualisieren der index.json-Datei
    const indexPath = path.join(BLOG_FS_PATH, 'index.json');
    let indexData = { posts: [] };
    
    if (fs.existsSync(indexPath)) {
      try {
        const indexContent = fs.readFileSync(indexPath, 'utf-8');
        indexData = JSON.parse(indexContent);
      } catch (error) {
        console.error('Fehler beim Lesen der index.json:', error);
      }
    }

    // Sicherstellen, dass posts ein Array ist
    if (!indexData.posts) {
      indexData.posts = [];
    }

    // Erstellen des Eintrags für die index.json
    const indexEntry = {
      id: blogPost.id,
      slug: blogPost.slug,
      title: blogPost.title,
      isDraft: blogPost.isDraft,
      updatedAt: blogPost.updatedAt,
      category: blogPost.category,
      // Tags als Semikolon-getrennter String für die Übersicht
      tags: Array.isArray(blogPost.tags) ? blogPost.tags.join(';') : blogPost.tags
    };

    // Hinzufügen des neuen Eintrags zur index.json
    indexData.posts.unshift(indexEntry); // Neuen Post am Anfang einfügen
    
    // Speichern der aktualisierten index.json
    fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2), 'utf-8');

    return NextResponse.json({ success: true, slug: blogPost.slug });
  } catch (error) {
    console.error('Fehler beim Erstellen des Blog-Posts:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}
