import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';

// Pfad zum Blog-Verzeichnis
const BLOG_FS_PATH = path.join(process.cwd(), 'public', 'uploads', 'blog');

export async function POST(req: NextRequest) {
  const {
    id,
    title,
    slug: providedSlug,
    content,
    excerpt,
    coverImage,
    author,
    tags,
    category,
    isDraft,
    seoTitle,
    seoDescription
  } = await req.json();

  console.log('Received update request with data:', {
    id, title, providedSlug, content, excerpt, coverImage, 
    author, tags, category, isDraft, seoTitle, seoDescription
  });

  if (!id || !title || !content) {
    console.error('Validation failed: Missing required fields');
    return NextResponse.json({ error: 'ID, Titel und Inhalt sind erforderlich.' }, { status: 400 });
  }

  try {
    // Suche den Blog-Post anhand der ID in der index.json
    const indexPath = path.join(BLOG_FS_PATH, 'index.json');
    if (!fs.existsSync(indexPath)) {
      return NextResponse.json({ error: 'index.json nicht gefunden' }, { status: 404 });
    }
    
    const indexContent = await fsPromises.readFile(indexPath, 'utf-8');
    const indexPosts = JSON.parse(indexContent);
    
    if (!Array.isArray(indexPosts)) {
      return NextResponse.json({ error: 'Ungültiges Format der index.json' }, { status: 500 });
    }
    
    // Finde den zu aktualisierenden Post in der index.json
    const postIndex = indexPosts.findIndex(post => post.id.toString() === id.toString());
    if (postIndex === -1) {
      return NextResponse.json({ error: `Blog-Post mit ID ${id} nicht gefunden` }, { status: 404 });
    }
    
    // Hole den aktuellen Slug aus der index.json
    const currentSlug = indexPosts[postIndex].slug;
    
    // Bestimme den zu verwendenden Slug
    let slug = providedSlug;
    
    if (!slug) {
      // Wenn kein neuer Slug angegeben wurde, behalte den aktuellen bei
      slug = currentSlug;
      
      // Wenn der Titel geändert wurde, aber kein neuer Slug angegeben wurde,
      // generiere einen neuen Slug basierend auf dem neuen Titel
      if (title !== indexPosts[postIndex].title) {
        // Prüfe, ob der neue Titel dem Format "Trinax Mix Set XXX - DD.MM.YYYY" entspricht
        const mixSetRegex = /trinax mix set (\d+)\s*-\s*(\d{2})\.(\d{2})\.(\d{4})/i;
        const match = title.match(mixSetRegex);
        
        if (match) {
          // Extrahiere die Nummer und das Datum
          const setNumber = match[1].padStart(3, '0'); // Stelle sicher, dass die Nummer 3-stellig ist
          const day = match[2];
          const month = match[3];
          const year = match[4];
          
          // Erstelle den Slug im Format "trinax-mix-set-066-01042021"
          const newSlug = `trinax-mix-set-${setNumber}-${day}${month}${year}`;
          
          // Verwende den neuen Slug nur, wenn er sich vom aktuellen unterscheidet
          if (newSlug !== currentSlug) {
            slug = newSlug;
          }
        }
      }
    }
    
    // Prüfe, ob der neue Slug bereits existiert (falls er geändert wurde)
    if (slug !== currentSlug) {
      const slugExists = indexPosts.some((post, idx) => 
        idx !== postIndex && post.slug === slug
      );
      
      if (slugExists) {
        return NextResponse.json({ error: `Ein Blog-Post mit dem Slug "${slug}" existiert bereits.` }, { status: 400 });
      }
    }
    
    // Pfad zur aktuellen JSON-Datei des Blog-Posts
    const currentFilePath = path.join(BLOG_FS_PATH, `${currentSlug}.json`);
    
    // Prüfe, ob die Datei existiert
    if (!fs.existsSync(currentFilePath)) {
      return NextResponse.json({ error: `Blog-Post-Datei ${currentSlug}.json nicht gefunden` }, { status: 404 });
    }
    
    // Lese den aktuellen Blog-Post
    const currentPostContent = await fsPromises.readFile(currentFilePath, 'utf-8');
    const currentPost = JSON.parse(currentPostContent);
    
    // Zeitstempel generieren
    const now = new Date().toISOString();
    
    // Erstelle das aktualisierte Blog-Post-Objekt
    const updatedPost = {
      ...currentPost,
      title,
      slug,
      content,
      excerpt: excerpt || '',
      coverImage: coverImage || '',
      featuredImage: coverImage || '', // Für Kompatibilität mit bestehenden Posts
      author: author || currentPost.author || 'Trinax',
      category: category || currentPost.category || 'Music',
      tags: Array.isArray(tags) ? tags : tags ? tags.split(';').map(tag => tag.trim()).filter(Boolean) : [],
      isDraft: (isDraft === "1" || isDraft === true) ? "1" : "0",
      seoTitle: seoTitle || '',
      seoDescription: seoDescription || '',
      updatedAt: now,
      publishedAt: (isDraft === "1" || isDraft === true) ? null : (currentPost.publishedAt || now)
    };
    
    // Bestimme den Pfad für die aktualisierte Datei
    const newFilePath = path.join(BLOG_FS_PATH, `${slug}.json`);
    
    // Speichere den aktualisierten Blog-Post
    await fsPromises.writeFile(newFilePath, JSON.stringify(updatedPost, null, 2), 'utf-8');
    
    // Lösche die alte Datei, wenn der Slug geändert wurde
    if (slug !== currentSlug && fs.existsSync(currentFilePath)) {
      await fsPromises.unlink(currentFilePath);
    }
    
    // Aktualisiere den Eintrag in der index.json
    const indexEntry = {
      id: updatedPost.id,
      slug,
      title,
      isDraft: updatedPost.isDraft,
      updatedAt: now,
      category: updatedPost.category,
      tags: Array.isArray(updatedPost.tags) ? updatedPost.tags.join(';') : ''
    };
    
    // Ersetze den alten Eintrag in der index.json
    indexPosts[postIndex] = indexEntry;
    
    // Speichere die aktualisierte index.json
    await fsPromises.writeFile(indexPath, JSON.stringify(indexPosts, null, 2), 'utf-8');
    
    console.log(`Blog-Post "${title}" erfolgreich aktualisiert unter ${newFilePath}`);
    return NextResponse.json({ 
      success: true, 
      post: {
        id,
        title,
        slug,
        isDraft: updatedPost.isDraft
      } 
    });
  } catch (e: any) {
    console.error('Complete error object:', e);
    console.error('Error updating blog post:', e.message);
    if (e.response) {
      console.error('Baserow response:', await e.response.text());
    }
    return NextResponse.json({ error: e.message || 'Fehler beim Aktualisieren' }, { status: 500 });
  }
}
