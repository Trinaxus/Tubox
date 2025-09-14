#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Absoluter Pfad zum Blog-Verzeichnis
const PROJECT_ROOT = '/Volumes/SSD 1TB/PROJECTE/design-system/tubox.de-next';
const BLOG_FS_PATH = path.join(PROJECT_ROOT, 'public', 'uploads', 'blog');
const INDEX_PATH = path.join(BLOG_FS_PATH, 'index.json');

console.log(`Blog-Verzeichnis: ${BLOG_FS_PATH}`);
console.log(`Index-Pfad: ${INDEX_PATH}`);

// Funktion zum Aktualisieren der index.json
async function updateIndex() {
  try {
    // Überprüfen, ob die index.json existiert
    if (!fs.existsSync(INDEX_PATH)) {
      console.error(`index.json nicht gefunden unter: ${INDEX_PATH}`);
      return;
    }

    // Lesen der index.json
    console.log('Lese index.json...');
    const indexContent = fs.readFileSync(INDEX_PATH, 'utf-8');
    let indexPosts = JSON.parse(indexContent);
    
    console.log(`index.json gelesen, Typ: ${Array.isArray(indexPosts) ? 'Array' : 'Objekt'}`);
    
    // Sicherstellen, dass indexPosts ein Array ist
    if (!Array.isArray(indexPosts)) {
      if (indexPosts.posts && Array.isArray(indexPosts.posts)) {
        indexPosts = indexPosts.posts;
      } else {
        console.error('Unerwartetes Format der index.json');
        return;
      }
    }
    
    console.log(`Aktuelle Anzahl der Einträge: ${indexPosts.length}`);
    
    // Lesen aller Blog-Post-Dateien
    console.log('Lese Blog-Post-Dateien...');
    const files = fs.readdirSync(BLOG_FS_PATH).filter(file => 
      file.endsWith('.json') && file !== 'index.json'
    );
    
    console.log(`Gefundene Blog-Post-Dateien: ${files.length}`);
    
    // Sammeln aller Slugs in der index.json
    const indexSlugs = new Set(indexPosts.map(post => post.slug));
    console.log(`Anzahl der Slugs in index.json: ${indexSlugs.size}`);
    
    let addedCount = 0;
    
    // Überprüfen jeder Blog-Post-Datei
    for (const file of files) {
      const slug = file.replace('.json', '');
      
      // Wenn der Slug nicht in der index.json ist, füge ihn hinzu
      if (!indexSlugs.has(slug)) {
        console.log(`Neuer Slug gefunden: ${slug}`);
        
        try {
          // Lesen des Blog-Posts
          const postPath = path.join(BLOG_FS_PATH, file);
          const postContent = fs.readFileSync(postPath, 'utf-8');
          const post = JSON.parse(postContent);
          
          // Erstellen des Eintrags für die index.json
          const indexEntry = {
            id: post.id || Date.now(),
            slug: post.slug || slug,
            title: post.title || slug,
            isDraft: post.isDraft || "1",
            updatedAt: post.updatedAt || new Date().toISOString(),
            category: post.category || "Uncategorized",
            tags: Array.isArray(post.tags) ? post.tags.join(';') : post.tags
          };
          
          // Hinzufügen des Eintrags zur index.json
          indexPosts.unshift(indexEntry);
          console.log(`Eintrag hinzugefügt: ${indexEntry.title}`);
          addedCount++;
        } catch (error) {
          console.error(`Fehler beim Verarbeiten von ${file}:`, error);
        }
      }
    }
    
    if (addedCount > 0) {
      // Speichern der aktualisierten index.json
      console.log(`Speichere aktualisierte index.json mit ${indexPosts.length} Einträgen...`);
      fs.writeFileSync(INDEX_PATH, JSON.stringify(indexPosts, null, 2), 'utf-8');
      console.log(`index.json erfolgreich aktualisiert. ${addedCount} neue Einträge hinzugefügt.`);
    } else {
      console.log('Keine neuen Einträge gefunden. index.json bleibt unverändert.');
    }
    
  } catch (error) {
    console.error('Fehler beim Aktualisieren der index.json:', error);
  }
}

// Starte den Prozess
updateIndex();
