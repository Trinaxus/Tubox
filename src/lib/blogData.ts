"use server";

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Pfad zum Blog-Verzeichnis (extern)
// In Produktion lesen wir aus dem externen JSON-Verzeichnis auf deinem PHP-Server.
// In Entwicklung verwenden wir den lokalen Proxy, um CORS-Probleme zu vermeiden.
const EXTERNAL_BLOG_URL = process.env.NODE_ENV === 'production'
  ? (
      process.env.EXTERNAL_BLOG_URL ||
      (process.env.NEXT_PUBLIC_SERVER_BASE_URL
        ? `${process.env.NEXT_PUBLIC_SERVER_BASE_URL}/uploads/blog`
        : 'https://tubox.de/TUBOX/server/uploads/blog')
    )
  : '/api/external-blog';

// Pfad zum Blog-Verzeichnis (lokal für Entwicklung)
const BLOG_DIR = path.join(process.cwd(), 'public', 'uploads', 'blog');

// Index-Datei für schnellen Zugriff auf alle Blogs
const INDEX_FILE_PATH = process.env.NODE_ENV === 'production' 
  ? `${EXTERNAL_BLOG_URL}/index.json` 
  : path.join(BLOG_DIR, 'index.json');

// Interface für Blog-Posts
export interface BlogPostData {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  coverImage: string;
  author: string;
  published: string; // '0' oder '1'
  publishedAt: string | null;
  updatedAt: string;
  tags: string[];
  category: string;
  isDraft: string; // '0' oder '1'
  seoTitle: string;
  seoDescription: string;
}

// Interface für den Blog-Index
interface BlogIndex {
  posts: {
    id: string;
    slug: string;
    title: string;
    isDraft: string;
    updatedAt: string;
    category: string;
  }[];
}

// Hilfsfunktion, um sicherzustellen, dass das Blog-Verzeichnis existiert
function ensureBlogDirExists() {
  if (!fs.existsSync(BLOG_DIR)) {
    fs.mkdirSync(BLOG_DIR, { recursive: true });
  }
  
  // Erstelle die Index-Datei, falls sie nicht existiert
  if (!fs.existsSync(INDEX_FILE_PATH)) {
    fs.writeFileSync(INDEX_FILE_PATH, JSON.stringify({ posts: [] }, null, 2), 'utf8');
  }
}

// Hilfsfunktion zum Lesen des Blog-Index
async function readIndex(): Promise<BlogIndex> {
  if (process.env.NODE_ENV === 'production') {
    try {
      // Im Produktionsmodus: Lade die Daten über HTTP
      const response = await fetch(`${EXTERNAL_BLOG_URL}/index.json`, { 
        cache: 'no-store' 
      });
      
      if (!response.ok) {
        console.error(`Failed to fetch blog index: ${response.status}`);
        return { posts: [] };
      }
      
      const data = await response.json();
      return Array.isArray(data) ? { posts: data } : data;
    } catch (error) {
      console.error('Error fetching blog index:', error);
      return { posts: [] };
    }
  } else {
    // Im Entwicklungsmodus: Lade die Daten aus dem lokalen Dateisystem
    ensureBlogDirExists();
    try {
      const rawData = fs.readFileSync(INDEX_FILE_PATH, 'utf8');
      return JSON.parse(rawData);
    } catch (error) {
      console.error('Error reading blog index:', error);
      return { posts: [] };
    }
  }
}

// Hilfsfunktion zum Schreiben des Blog-Index
async function writeIndex(index: BlogIndex) {
  if (process.env.NODE_ENV === 'production') {
    try {
      const UPDATE_BLOG_PHP_URL = process.env.UPDATE_BLOG_PHP_URL || `${EXTERNAL_BLOG_URL}/../update-blog.php`;
      const response = await fetch(UPDATE_BLOG_PHP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_index',
          index: index,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update index: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error updating blog index:', error);
      throw error;
    }
  } else {
    // Im Entwicklungsmodus: Schreibe direkt in die Datei
    ensureBlogDirExists();
    fs.writeFileSync(INDEX_FILE_PATH, JSON.stringify(index, null, 2), 'utf8');
  }
}

// Hilfsfunktion zum Lesen eines einzelnen Blog-Posts
async function readBlogPost(slug: string): Promise<BlogPostData | null> {
  if (process.env.NODE_ENV === 'production') {
    try {
      // Im Produktionsmodus: Lade die Daten über HTTP
      const response = await fetch(`${EXTERNAL_BLOG_URL}/${slug}.json`, { 
        cache: 'no-store' 
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return null; // Blog-Post nicht gefunden
        }
        console.error(`Failed to fetch blog post ${slug}: ${response.status}`);
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error fetching blog post ${slug}:`, error);
      return null;
    }
  } else {
    // Im Entwicklungsmodus: Lade die Daten aus dem lokalen Dateisystem
    const filePath = path.join(BLOG_DIR, `${slug}.json`);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    try {
      const rawData = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(rawData);
    } catch (error) {
      console.error(`Error reading blog post ${slug}:`, error);
      return null;
    }
  }
}

// Hilfsfunktion zum Schreiben eines einzelnen Blog-Posts
async function writeBlogPost(post: BlogPostData) {
  if (process.env.NODE_ENV === 'production') {
    try {
      const UPDATE_BLOG_PHP_URL = process.env.UPDATE_BLOG_PHP_URL || `${EXTERNAL_BLOG_URL}/../update-blog.php`;
      const response = await fetch(UPDATE_BLOG_PHP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_post',
          slug: post.slug,
          post: post,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to write blog post: ${response.status}`);
      }
      
      // Aktualisiere auch den Index
      await updateIndex(post);
    } catch (error) {
      console.error('Error writing blog post:', error);
      throw error;
    }
  } else {
    // Im Entwicklungsmodus: Speichere die Daten im lokalen Dateisystem
    ensureBlogDirExists();
    const filePath = path.join(BLOG_DIR, `${post.slug}.json`);
    fs.writeFileSync(filePath, JSON.stringify(post, null, 2), 'utf8');
    
    // Aktualisiere auch den Index
    await updateIndex(post);
  }
}

// Hilfsfunktion zum Aktualisieren des Index für einen Blog-Post
async function updateIndex(post: BlogPostData) {
  const index = await readIndex();
  
  // Finde den Post im Index, falls vorhanden
  const existingIndex = index.posts.findIndex(p => p.id === post.id);
  
  // Erstelle den Index-Eintrag
  const indexEntry = {
    id: post.id,
    slug: post.slug,
    title: post.title,
    isDraft: post.isDraft,
    updatedAt: post.updatedAt,
    category: post.category
  };
  
  // Aktualisiere oder füge hinzu
  if (existingIndex >= 0) {
    index.posts[existingIndex] = indexEntry;
  } else {
    index.posts.push(indexEntry);
  }
  
  // Schreibe den aktualisierten Index
  await writeIndex(index);
}

// Hinweis: Die frühere Helper-Funktion updateIndexOnServer wurde entfernt,
// da alle Server-Updates zentral über UPDATE_BLOG_PHP_URL laufen.

// Hilfsfunktion zum Entfernen eines Posts aus dem Index
async function removeFromIndex(id: string) {
  const index = await readIndex();
  index.posts = index.posts.filter(post => post.id !== id);
  await writeIndex(index);
}

// Hilfsfunktion zum Normalisieren von Slugs
export async function normalizeSlug(slug: string): Promise<string> {
  // Ersetze Schrägstriche und Leerzeichen durch Bindestriche
  // Entferne Sonderzeichen und wandle in Kleinbuchstaben um
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Hilfsfunktion zum Denormalisieren von Slugs
export async function denormalizeSlug(normalizedSlug: string): Promise<string> {
  return normalizedSlug;
}

// Blog-Posts abrufen
export async function fetchBlogPosts({ draft = null } = {}) {
  try {
    const index = await readIndex();
    let results: BlogPostData[] = [];
    
    // Filtere nach Draft-Status, wenn angegeben
    let filteredPosts = index.posts;
    if (draft === false) {
      filteredPosts = filteredPosts.filter(post => post.isDraft === '0');
    } else if (draft === true) {
      filteredPosts = filteredPosts.filter(post => post.isDraft === '1');
    }
    
    // Lade die vollständigen Blog-Posts
    for (const indexEntry of filteredPosts) {
      const post = await readBlogPost(indexEntry.slug);
      if (post) {
        results.push(post);
      }
    }
    
    // Sortiere nach Aktualisierungsdatum (neueste zuerst)
    results.sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    
    return { results };
  } catch (e) {
    console.error('Error loading blog posts:', e);
    throw new Error(`Failed to load blog posts: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}

// Blog-Post anhand der ID laden
export async function fetchBlogPostById(id: string) {
  try {
    // Lade den Index, um den Slug anhand der ID zu finden
    const index = await readIndex();
    const post = index.posts.find(post => post.id === id);
    
    if (!post) {
      return null;
    }
    
    // Lade den vollständigen Blog-Post anhand des Slugs
    return await fetchBlogPostBySlug(post.slug);
  } catch (error) {
    console.error(`Error fetching blog post by ID ${id}:`, error);
    return null;
  }
}

// Blog-Post anhand des Slugs laden
export async function fetchBlogPostBySlug(slug: string) {
  try {
    const normalizedSlug = await normalizeSlug(slug);
    const post = await readBlogPost(normalizedSlug);
    
    if (!post) {
      return null;
    }
    
    // Stelle sicher, dass Tags als Array zurückgegeben werden
    let tags = post.tags;
    if (!Array.isArray(tags)) {
      if (typeof tags === 'string') {
        tags = (tags as string).split(';').map(tag => tag.trim());
      } else {
        // Fallback, wenn tags weder Array noch String ist
        tags = [];
      }
    }
    
    return {
      ...post,
      tags
    };
  } catch (e) {
    console.error('Error loading blog post by slug:', e);
    throw new Error(`Failed to load blog post: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}

// Neuen Blog-Post erstellen
export async function createBlogPost(data: Partial<BlogPostData>) {
  try {
    const now = new Date().toISOString();
    
    // Generiere eine eindeutige ID
    const id = uuidv4();
    
    // Stelle sicher, dass ein gültiger Slug vorhanden ist
    let slug = data.slug || '';
    if (!slug && data.title) {
      slug = await normalizeSlug(data.title);
    }
    
    // Bereite die Daten vor
    const postData: BlogPostData = {
      id,
      title: data.title || '',
      slug,
      content: data.content || '',
      excerpt: data.excerpt || '',
      coverImage: data.coverImage || '',
      author: data.author || '',
      published: data.published || '0',
      publishedAt: data.publishedAt || null,
      updatedAt: now,
      tags: Array.isArray(data.tags) ? data.tags : [],
      category: data.category || '',
      isDraft: data.isDraft || '1',
      seoTitle: data.seoTitle || '',
      seoDescription: data.seoDescription || ''
    };
    
    // Speichere den Blog-Post
    await writeBlogPost(postData);
    
    return postData;
  } catch (error) {
    console.error('Exception in createBlogPost:', error);
    throw error;
  }
}

// Blog-Post aktualisieren
export async function updateBlogPost(id: string, data: Partial<BlogPostData>) {
  try {
    // Finde den Post anhand der ID
    const index = await readIndex();
    const indexEntry = index.posts.find(post => post.id === id);
    
    if (!indexEntry) {
      throw new Error('Blog post not found');
    }
    
    // Lade den vollständigen Post
    const post = await readBlogPost(indexEntry.slug);
    
    if (!post) {
      throw new Error('Blog post file not found');
    }
    
    const now = new Date().toISOString();
    
    // Wenn sich der Slug ändert, müssen wir die alte Datei löschen
    let oldSlug = null;
    if (data.slug && data.slug !== post.slug) {
      oldSlug = post.slug;
      data.slug = await normalizeSlug(data.slug);
    }
    
    // Aktualisiere die Daten
    const updatedPost: BlogPostData = {
      ...post,
      ...data,
      updatedAt: now
    };
    
    // Stelle sicher, dass Tags als Array gespeichert werden
    if (data.tags) {
      updatedPost.tags = Array.isArray(data.tags) ? data.tags : [];
    }
    
    // Wenn sich der Slug geändert hat, lösche die alte Datei
    if (oldSlug) {
      const oldFilePath = path.join(BLOG_DIR, `${oldSlug}.json`);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }
    
    // Speichere den aktualisierten Post
    await writeBlogPost(updatedPost);
    
    return updatedPost;
  } catch (error) {
    console.error('Exception in updateBlogPost:', error);
    throw error;
  }
}

// Blog-Post löschen
export async function deleteBlogPost(id: string) {
  try {
    console.log(`Deleting blog post with ID: ${id}`);
    
    // Finde den Post anhand der ID
    const index = await readIndex();
    
    // Unterstütze beide Formate: direktes Array oder Objekt mit posts-Array
    let postsArray = [];
    if (Array.isArray(index)) {
      // Neues Format: direktes Array
      postsArray = index;
    } else if (index.posts && Array.isArray(index.posts)) {
      // Altes Format: Objekt mit posts-Array
      postsArray = index.posts;
    } else {
      throw new Error('Index has unexpected structure');
    }
    
    const indexEntry = postsArray.find(post => post.id === id || post.id === parseInt(id));
    
    if (!indexEntry) {
      console.error(`Blog post with ID ${id} not found in index`);
      throw new Error('Blog post not found');
    }
    
    console.log(`Found blog post with slug: ${indexEntry.slug}`);
    
    // Immer die externe URL verwenden
    const UPDATE_BLOG_PHP_URL = process.env.UPDATE_BLOG_PHP_URL || 'https://tubox.de/WebDisk/uploads/blog/update-blog.php';
    
    console.log(`Sending delete request to ${UPDATE_BLOG_PHP_URL}`);
    const response = await fetch(UPDATE_BLOG_PHP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'delete_post',
        slug: indexEntry.slug
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to delete blog post: ${response.status} ${response.statusText}`);
      console.error(`Error response: ${errorText}`);
      throw new Error(`Failed to delete blog post: ${response.status} ${response.statusText}`);
    }
    
    const responseData = await response.json();
    console.log(`Delete response:`, responseData);
    
    return true;
  } catch (error) {
    console.error('Exception in deleteBlogPost:', error);
    throw error;
  }
}

// Die frühere Migrationsfunktion aus Baserow wurde entfernt.