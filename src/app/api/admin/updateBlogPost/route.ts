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

  if (!title || !content) {
    console.error('Validation failed: Missing required fields');
    return NextResponse.json({ error: 'Titel und Inhalt sind erforderlich.' }, { status: 400 });
  }

  try {
    // ENV: externer Betrieb
    const useExternal = (process.env.USE_EXTERNAL || 'false').toLowerCase() === 'true';
    const EXTERNAL_BLOG_URL = process.env.EXTERNAL_BLOG_URL || '';
    const UPDATE_BLOG_PHP_URL = process.env.UPDATE_BLOG_PHP_URL || '';

    // EXTERNER PFAD (bevorzugt, EARLY RETURN): kein lokales Lesen nötig
    if (useExternal) {
      if (!UPDATE_BLOG_PHP_URL) {
        return NextResponse.json({ error: 'UPDATE_BLOG_PHP_URL fehlt in den ENV-Variablen.' }, { status: 500 });
      }
      // Bestimme currentSlug (alter Slug) und neuer Slug
      let currentSlug: string | undefined = providedSlug;
      let newSlug: string | undefined = providedSlug;
      // Falls kein Slug mitgegeben: versuche über externen Index anhand ID zu finden
      if ((!currentSlug || !newSlug) && EXTERNAL_BLOG_URL) {
        try {
          const resIdx = await fetch(`${EXTERNAL_BLOG_URL.replace(/\/$/, '')}/index.json?t=${Date.now()}`, { cache: 'no-store' });
          if (resIdx.ok) {
            const idxText = await resIdx.text();
            let idxData: any = null; try { idxData = JSON.parse(idxText); } catch {}
            const arr = Array.isArray(idxData) ? idxData : (idxData?.posts || idxData?.items || idxData?.entries || []);
            if (Array.isArray(arr)) {
              const found = arr.find((p: any) => p && (
                (id && p.id?.toString() === id?.toString()) ||
                (providedSlug && p.slug === providedSlug)
              ));
              if (found?.slug) {
                currentSlug = found.slug;
                newSlug = found.slug;
              }
            }
          }
        } catch {}
      }

      // Slug-Fallback: aus Titel generieren, wenn gewünscht (nur wenn kein Slug vorhanden)
      if (!newSlug && title) {
        const mixSetRegex = /trinax mix set (\d+)\s*-\s*(\d{2})\.(\d{2})\.(\d{4})/i;
        const match = title.match(mixSetRegex);
        if (match) {
          const setNumber = match[1].padStart(3, '0');
          const day = match[2];
          const month = match[3];
          const year = match[4];
          newSlug = `trinax-mix-set-${setNumber}-${day}${month}${year}`;
        } else {
          newSlug = title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
        }
      }

      // Updated Post zusammenbauen (so vollständig wie möglich)
      const now = new Date().toISOString();
      const tagsArray = Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(';').map((t) => t.trim()).filter(Boolean) : []);
      const updatedPost = {
        id,
        title,
        slug: newSlug,
        content,
        excerpt: excerpt || '',
        coverImage: coverImage || '',
        featuredImage: coverImage || '',
        author: author || 'Trinax',
        category: category || '',
        tags: tagsArray,
        isDraft: (isDraft === '1' || isDraft === 1 || isDraft === true) ? '1' : '0',
        seoTitle: seoTitle || '',
        seoDescription: seoDescription || '',
        updatedAt: now,
      };

      try {
        const resp = await fetch(UPDATE_BLOG_PHP_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update', oldSlug: currentSlug || newSlug, newSlug, data: updatedPost })
        });
        const raw = await resp.text();
        if (!resp.ok) {
          return NextResponse.json({ error: `Externes Update fehlgeschlagen: ${resp.status} ${resp.statusText}`, raw }, { status: 500 });
        }
        let json: any = null; try { json = JSON.parse(raw); } catch {}
        return NextResponse.json({ success: true, post: { id, title, slug: newSlug, isDraft: updatedPost.isDraft }, response: json || raw });
      } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Externes Update fehlgeschlagen' }, { status: 500 });
      }
    }

    // LOKALER MODUS: Suche den Blog-Post anhand der ID in der index.json
    const indexPath = path.join(BLOG_FS_PATH, 'index.json');
    if (!fs.existsSync(indexPath)) {
      if (!(useExternal && UPDATE_BLOG_PHP_URL)) {
        return NextResponse.json({ error: 'index.json nicht gefunden' }, { status: 404 });
      }
    }
    
    const indexContent = fs.existsSync(indexPath) ? await fsPromises.readFile(indexPath, 'utf-8') : '[]';
    const indexPosts = (() => { try { const parsed = JSON.parse(indexContent); return Array.isArray(parsed) ? parsed : (parsed.posts || []); } catch { return []; } })();
    
    if (!Array.isArray(indexPosts)) {
      return NextResponse.json({ error: 'Ungültiges Format der index.json' }, { status: 500 });
    }
    
    // Finde den zu aktualisierenden Post in der index.json (nach ID oder Slug)
    const postIndex = indexPosts.findIndex((post: any) => {
      const byId = id ? post.id?.toString() === id.toString() : false;
      const bySlug = providedSlug ? post.slug === providedSlug : false;
      return byId || bySlug;
    });
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
    
    // Prüfe, ob der neue Slug bereits existiert (falls er geändert wurde) – nur im lokalen Modus relevant
    if (!(useExternal && UPDATE_BLOG_PHP_URL)) {
      if (slug !== currentSlug) {
        const slugExists = indexPosts.some((post: any, idx: number) => 
          idx !== postIndex && post.slug === slug
        );
        if (slugExists) {
          return NextResponse.json({ error: `Ein Blog-Post mit dem Slug "${slug}" existiert bereits.` }, { status: 400 });
        }
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
    const tagsArray = Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(';').map((t) => t.trim()).filter(Boolean) : []);
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
      tags: tagsArray,
      isDraft: (isDraft === "1" || isDraft === true) ? "1" : "0",
      seoTitle: seoTitle || '',
      seoDescription: seoDescription || '',
      updatedAt: now,
      publishedAt: (isDraft === "1" || isDraft === true) ? null : (currentPost.publishedAt || now)
    };

    // EXTERNER PFAD (bevorzugt): aktualisiere direkt über PHP-Endpoint
    if (useExternal && UPDATE_BLOG_PHP_URL) {
      try {
        const resp = await fetch(UPDATE_BLOG_PHP_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update', oldSlug: currentSlug, newSlug: slug, data: updatedPost })
        });
        const raw = await resp.text();
        if (!resp.ok) {
          return NextResponse.json({ error: `Externes Update fehlgeschlagen: ${resp.status} ${resp.statusText}`, raw }, { status: 500 });
        }
        let json: any = null; try { json = JSON.parse(raw); } catch {}
        return NextResponse.json({ success: true, post: { id, title, slug, isDraft: updatedPost.isDraft }, response: json || raw });
      } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Externes Update fehlgeschlagen' }, { status: 500 });
      }
    }
    
    // Bestimme den Pfad für die aktualisierte Datei
    const newFilePath = path.join(BLOG_FS_PATH, `${slug}.json`);
    
    // LOKALER FALLBACK: Speichere den aktualisierten Blog-Post
    await fsPromises.writeFile(newFilePath, JSON.stringify(updatedPost, null, 2), 'utf-8');
    
    // Lösche die alte Datei, wenn der Slug geändert wurde
    if (slug !== currentSlug && fs.existsSync(currentFilePath)) {
      await fsPromises.unlink(currentFilePath);
    }
    
    // Aktualisiere den Eintrag in der index.json (lokal)
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
