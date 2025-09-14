#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const fetch = require('node-fetch');

// Erstelle eine Readline-Schnittstelle für die Benutzereingabe
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Konfiguration
const PROJECT_ROOT = '/Volumes/SSD 1TB/PROJECTE/design-system/tubox.de-next';
const BLOG_FS_PATH = path.join(PROJECT_ROOT, 'public', 'uploads', 'blog');
const EXTERNAL_BLOG_URL = 'https://tubox.de/WebDisk/uploads/blog';
const USE_EXTERNAL = true; // Auf true setzen, um den externen Webspace zu verwenden

console.log(`Blog-Verzeichnis: ${USE_EXTERNAL ? EXTERNAL_BLOG_URL : BLOG_FS_PATH}`);

// Funktion zum Generieren eines Slugs aus dem Titel
function generateSlug(title) {
  // Prüfe, ob der Titel dem Format "Trinax Mix Set XXX - DD.MM.YYYY" entspricht
  const mixSetRegex = /trinax mix set (\d+)\s*-\s*(\d{2})\.(\d{2})\.(\d{4})/i;
  const match = title.match(mixSetRegex);
  
  if (match) {
    // Extrahiere die Nummer und das Datum
    const setNumber = match[1].padStart(3, '0'); // Stelle sicher, dass die Nummer 3-stellig ist
    const day = match[2];
    const month = match[3];
    const year = match[4];
    
    // Erstelle den Slug im Format "trinax-mix-set-066-01042021"
    return `trinax-mix-set-${setNumber}-${day}${month}${year}`;
  } else {
    // Standardmäßige Slug-Generierung für andere Titel
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
}

// Funktion zum Erstellen eines neuen Blog-Posts
async function createBlogPost() {
  try {
    // Im externen Modus müssen wir nicht prüfen, ob das Verzeichnis existiert
    if (!USE_EXTERNAL && !fs.existsSync(BLOG_FS_PATH)) {
      console.error(`Blog-Verzeichnis nicht gefunden: ${BLOG_FS_PATH}`);
      process.exit(1);
    }

    // Frage nach den Blog-Post-Details
    const title = await askQuestion('Titel des Blog-Posts: ');
    let slug = await askQuestion(`Slug (leer lassen für automatische Generierung aus Titel): `);
    
    if (!slug) {
      slug = generateSlug(title);
      console.log(`Generierter Slug: ${slug}`);
    }

    // Überprüfen, ob der Slug bereits existiert
    let slugExists = false;
    
    if (USE_EXTERNAL) {
      try {
        // Prüfe, ob der Slug im externen Webspace existiert
        const response = await fetch(`${EXTERNAL_BLOG_URL}/${slug}.json`);
        slugExists = response.ok;
      } catch (error) {
        console.log(`Fehler beim Prüfen des Slugs: ${error.message}`);
        // Wir nehmen an, dass der Slug nicht existiert, wenn ein Fehler auftritt
      }
    } else {
      // Lokale Prüfung
      const filePath = path.join(BLOG_FS_PATH, `${slug}.json`);
      slugExists = fs.existsSync(filePath);
    }
    
    if (slugExists) {
      console.error(`Ein Blog-Post mit dem Slug "${slug}" existiert bereits.`);
      process.exit(1);
    }

    const excerpt = await askQuestion('Auszug: ');
    const content = await askQuestion('Inhalt (HTML): ');
    const author = await askQuestion('Autor (Standard: Trinax): ') || 'Trinax';
    const category = await askQuestion('Kategorie (Standard: Music): ') || 'Music';
    const tagsInput = await askQuestion('Tags (mit Semikolon getrennt): ');
    const featuredImage = await askQuestion('Bild-URL: ');
    const isDraft = (await askQuestion('Ist es ein Entwurf? (j/n, Standard: n): ')).toLowerCase() === 'j' ? '1' : '0';

    // Konvertiere Tags-String in ein Array
    const tagsArray = tagsInput.split(';')
      .map(tag => tag.trim())
      .filter(tag => tag !== '');

    // Erstelle das Blog-Post-Objekt
    const id = Date.now(); // Einfache ID-Generierung
    const now = new Date().toISOString();
    
    const blogPost = {
      id,
      title,
      slug,
      excerpt,
      content,
      author,
      category,
      tags: tagsArray,
      featuredImage,
      isDraft,
      createdAt: now,
      updatedAt: now
    };

    // Speichern des Blog-Posts als JSON-Datei
    if (USE_EXTERNAL) {
      // Im externen Modus: Sende die Daten an das PHP-Skript
      try {
        console.log('Sende Blog-Post an externen Webspace...');
        const response = await fetch(`${EXTERNAL_BLOG_URL}/update-blog.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'update',
            oldSlug: slug, // Gleicher Slug, da es ein neuer Post ist
            newSlug: slug,
            data: blogPost
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Fehler beim Speichern des Blog-Posts: ${errorText}`);
        }
        
        console.log(`Blog-Post erfolgreich im externen Webspace gespeichert: ${slug}.json`);
      } catch (error) {
        console.error('Fehler beim Speichern im externen Webspace:', error);
        process.exit(1);
      }
    } else {
      // Im lokalen Modus: Speichere die Datei lokal
      const filePath = path.join(BLOG_FS_PATH, `${slug}.json`);
      fs.writeFileSync(filePath, JSON.stringify(blogPost, null, 2), 'utf-8');
      console.log(`Blog-Post-Datei erstellt: ${filePath}`);

      // Aktualisieren der index.json-Datei
      const indexPath = path.join(BLOG_FS_PATH, 'index.json');
      console.log(`Index-Pfad: ${indexPath}`);
      let indexPosts = [];
      
      if (fs.existsSync(indexPath)) {
      console.log('index.json existiert, wird gelesen...');
      try {
        const indexContent = fs.readFileSync(indexPath, 'utf-8');
        console.log('index.json Inhalt gelesen');
        indexPosts = JSON.parse(indexContent);
        console.log(`index.json geparst, Typ: ${Array.isArray(indexPosts) ? 'Array' : 'Objekt'}`);
        
        // Prüfen, ob es sich um ein Array oder ein Objekt mit posts-Array handelt
        if (indexPosts.posts && Array.isArray(indexPosts.posts)) {
          // Alte Struktur: { posts: [...] }
          console.log('Alte Struktur erkannt: { posts: [...] }');
          indexPosts = indexPosts.posts;
        } else if (!Array.isArray(indexPosts)) {
          console.error('Unerwartetes Format der index.json');
          indexPosts = [];
        } else {
          console.log(`Array mit ${indexPosts.length} Einträgen gefunden`);
        }
      } catch (error) {
        console.error('Fehler beim Lesen der index.json:', error);
      }
    } else {
      console.error(`index.json nicht gefunden unter: ${indexPath}`);
    }

    // Erstellen des Eintrags für die index.json
    const indexEntry = {
      id,
      slug,
      title,
      isDraft,
      updatedAt: now,
      category,
      // Tags als Semikolon-getrennter String für die Übersicht
      tags: tagsArray.join(';')
    };

    // Hinzufügen des neuen Eintrags zur index.json
    console.log('Füge neuen Eintrag hinzu:', indexEntry);
    indexPosts.unshift(indexEntry); // Neuen Post am Anfang einfügen
    
    // Speichern der aktualisierten index.json
    try {
      fs.writeFileSync(indexPath, JSON.stringify(indexPosts, null, 2), 'utf-8');
      console.log(`index.json erfolgreich aktualisiert mit ${indexPosts.length} Einträgen.`);
    } catch (error) {
      console.error('Fehler beim Schreiben der index.json:', error);
    }

    console.log(`\nBlog-Post "${title}" wurde erfolgreich erstellt!`);
    console.log(`Du kannst ihn unter /blog/${slug} ansehen.`);
  } catch (error) {
    console.error('Fehler beim Erstellen des Blog-Posts:', error);
  } finally {
    rl.close();
  }
}

// Hilfsfunktion zum Stellen einer Frage und Warten auf die Antwort
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Starte den Prozess
createBlogPost();
