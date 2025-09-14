// Baserow API Configuration
const API_URL = process.env.NEXT_PUBLIC_BASEROW_API_URL || process.env.BASEROW_API_URL || "https://api.baserow.io/api";
const TABLE_ID = process.env.NEXT_PUBLIC_BASEROW_BLOG_TABLE_ID || process.env.BASEROW_BLOG_TABLE_ID || "599963";
const TOKEN = process.env.NEXT_PUBLIC_BASEROW_TOKEN || process.env.BASEROW_TOKEN;

// Configuration is set from environment variables

if (!API_URL || !TABLE_ID || !TOKEN) {
  throw new Error(
    'Missing Baserow configuration. Please set either:\n' +
    'NEXT_PUBLIC_BASEROW_API_URL or BASEROW_API_URL\n' +
    'NEXT_PUBLIC_BASEROW_BLOG_TABLE_ID or BASEROW_BLOG_TABLE_ID\n' +
    'NEXT_PUBLIC_BASEROW_TOKEN or BASEROW_TOKEN\n' +
    'in your .env.local file'
  );
}

const BLOG_URL = `${API_URL}/database/rows/table/${TABLE_ID}/`;

// Hilfsfunktionen für Baserow Blogposts

// Helper functions for Baserow Blogposts
export async function fetchBlogPosts({ draft = null } = {}) {
  let filter = '';
  if (draft === false) filter = '&filter__field_4858586__equal=0';
  if (draft === true) filter = '&filter__field_4858586__equal=1';
  
  const url = `${BLOG_URL}?user_field_names=true${filter}`;
  console.log('Making Baserow API request to:', url);
  
  try {
    const res = await fetch(url, { 
      headers: { 
        Authorization: `Token ${TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      next: { revalidate: 60 } // Cache for 60 seconds
    });

    console.log('API Response Status:', res.status);
    
    if (!res.ok) {
      const errorBody = await res.text();
      console.error('API Error Response:', errorBody);
      throw new Error(`Baserow API request failed (${res.status}): ${url}`);
    }

    const contentType = res.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error('Expected JSON response from Baserow');
    }

    const data = await res.json();
    
    if (!data || typeof data !== 'object' || !Array.isArray(data.results)) {
      throw new Error('Invalid response format from Baserow');
    }
    
    // Transform the data to match our BlogPostData interface
    const results = data.results.map((post: any) => {
      // Convert tags from string to array if needed
      let tags = [];
      if (Array.isArray(post.field_4858584)) {
        tags = post.field_4858584;
      } else if (typeof post.field_4858584 === 'string' && post.field_4858584.trim() !== '') {
        tags = post.field_4858584.split(',').map((tag: string) => tag.trim());
      }
      
      return {
        ...post,
        // Ensure all required fields have default values if missing
        field_4858578: post.field_4858578 || '', // excerpt
        field_4858579: post.field_4858579 || '', // coverImage
        field_4858580: post.field_4858580 || '', // author
        field_4858581: post.field_4858581 || '0', // published
        field_4858582: post.field_4858582 || null, // publishedAt
        field_4858583: post.field_4858583 || new Date().toISOString(), // updatedAt
        field_4858584: tags, // tags as array for the frontend
        field_4858585: post.field_4858585 || '', // category
        field_4858586: post.field_4858586 || '1', // isDraft (default to draft)
        field_4858587: post.field_4858587 || '', // seoTitle
        field_4858588: post.field_4858588 || '' // seoDescription
      };
    });
    
    return { ...data, results };
  } catch (e) {
    console.error('Baserow API Error:', e);
    throw new Error(`Failed to load blog posts: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}

// Hilfsfunktion zum Normalisieren von Slugs
export function normalizeSlug(slug: string): string {
  // Ersetze Schrägstriche durch Bindestriche
  return slug.replace(/\//g, '-');
}

// Hilfsfunktion zum Denormalisieren von Slugs (für die Suche in der Datenbank)
export function denormalizeSlug(normalizedSlug: string): string {
  // Hier könnte eine Umkehrlogik implementiert werden, falls nötig
  // Aktuell einfach den normalisierten Slug zurückgeben
  return normalizedSlug;
}

export async function fetchBlogPostBySlug(slug: string) {
  // Denormalisiere den Slug für die Datenbankabfrage
  // Dies ist wichtig, wenn wir in der URL normalisierte Slugs verwenden, aber in der Datenbank die Originalwerte haben
  const searchSlug = denormalizeSlug(slug);
  
  const res = await fetch(
    `${BLOG_URL}?user_field_names=true&filter__field_4858576__equal=${encodeURIComponent(searchSlug)}`,
    { 
      headers: { 
        'Authorization': `Token ${TOKEN}`,
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      next: { revalidate: 60 } // Cache for 60 seconds
    }
  );
  
  if (!res.ok) {
    const error = await res.text();
    console.error('Error fetching blog post by slug:', error);
    throw new Error('Fehler beim Laden des Blogposts');
  }
  
  const data = await res.json();
  const post = data.results?.[0];
  
  if (!post) return null;
  
  // Convert tags from string to array if needed
  let tags = [];
  if (Array.isArray(post.field_4858584)) {
    tags = post.field_4858584;
  } else if (typeof post.field_4858584 === 'string' && post.field_4858584.trim() !== '') {
    tags = post.field_4858584.split(',').map((tag: string) => tag.trim());
  }
  
  // Transform the data to match our BlogPostData interface
  return {
    ...post,
    // Ensure all required fields have default values if missing
    field_4858578: post.field_4858578 || '', // excerpt
    field_4858579: post.field_4858579 || '', // coverImage
    field_4858580: post.field_4858580 || '', // author
    field_4858581: post.field_4858581 || '0', // published
    field_4858582: post.field_4858582 || null, // publishedAt
    field_4858583: post.field_4858583 || new Date().toISOString(), // updatedAt
    field_4858584: tags, // tags as array for the frontend
    field_4858585: post.field_4858585 || '', // category
    field_4858586: post.field_4858586 || '1', // isDraft (default to draft)
    field_4858587: post.field_4858587 || '', // seoTitle
    field_4858588: post.field_4858588 || '' // seoDescription
  };
}

interface BlogPostData {
  // Mapped Baserow fields
  field_4858575: string;  // title
  field_4858576: string;  // slug
  field_4858577: string;  // content
  field_4858578: string;  // excerpt
  field_4858579: string;  // coverImage
  field_4858580: string;  // author
  field_4858581: string;  // published ("1" or "0")
  field_4858582: string | null;  // publishedAt (ISO date string or null)
  field_4858583: string;  // updatedAt (ISO date string)
  field_4858584: string[]; // tags
  field_4858585: string;  // category
  field_4858586: string;  // isDraft ("1" or "0")
  field_4858587: string;  // seoTitle
  field_4858588: string;  // seoDescription
}

export async function createBlogPost(data: Partial<BlogPostData>) {
  try {
    // Ensure we have all required fields with defaults
    const now = new Date().toISOString();
    const postData: Record<string, any> = {
      // Required fields with defaults if not provided
      field_4858575: data.field_4858575 || '',  // title
      field_4858576: data.field_4858576 || '',  // slug
      field_4858577: data.field_4858577 || '',  // content
      // Optional fields with defaults
      field_4858578: data.field_4858578 || '',  // excerpt
      field_4858579: data.field_4858579 || '',  // coverImage
      field_4858580: data.field_4858580 || '',  // author
      field_4858581: data.field_4858581 || '0', // published
      field_4858582: data.field_4858582 || null, // publishedAt
      field_4858583: now,                    // updatedAt
      field_4858584: Array.isArray(data.field_4858584) ? data.field_4858584.join(',') : (data.field_4858584 || ''), // tags as comma-separated string
      field_4858585: data.field_4858585 || '',  // category
      field_4858586: data.field_4858586 || '1', // isDraft (default to draft)
      field_4858587: data.field_4858587 || '',  // seoTitle
      field_4858588: data.field_4858588 || ''   // seoDescription
    };

    console.log('Creating blog post with data:', postData);

    const res = await fetch(BLOG_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error('Error creating blog post:', error);
      throw new Error('Fehler beim Erstellen des Blogposts');
    }

    return await res.json();
  } catch (error) {
    console.error('Exception in createBlogPost:', error);
    throw error;
  }
}

export async function updateBlogPost(id: string, data: Partial<BlogPostData> | Record<string, any>) {
  try {
    // Prüfen, ob die Daten bereits mit field_-Präfixen übergeben wurden
    const hasFieldPrefixes = Object.keys(data).some(key => key.startsWith('field_'));
    
    let updateData: Record<string, any> = {};
    
    if (hasFieldPrefixes) {
      // Wenn die Daten bereits mit field_-Präfixen übergeben wurden, verwende sie direkt
      updateData = { ...data };
      
      // Spezielle Behandlung für das Tags-Feld, wenn es ein Array ist
      if ('field_4858584' in updateData && Array.isArray(updateData.field_4858584)) {
        updateData.field_4858584 = updateData.field_4858584.join(',');
      }
    } else {
      // Andernfalls mappe die Feldnamen
      const fieldMappings = {
        // Map from frontend field names to Baserow field names
        title: 'field_4858575',
        slug: 'field_4858576',
        content: 'field_4858577',
        excerpt: 'field_4858578',
        coverImage: 'field_4858579',
        author: 'field_4858580',
        published: 'field_4858581',
        publishedAt: 'field_4858582',
        updatedAt: 'field_4858583',
        tags: 'field_4858584',
        category: 'field_4858585',
        isDraft: 'field_4858586',
        seoTitle: 'field_4858587',
        seoDescription: 'field_4858588'
      };

      // Convert the data to use Baserow field names
      for (const [key, value] of Object.entries(data)) {
        if (key in fieldMappings) {
          const fieldName = fieldMappings[key as keyof typeof fieldMappings];
          // Special handling for tags field
          if (fieldName === 'field_4858584' && Array.isArray(value)) {
            updateData[fieldName] = value.join(',');
          } else {
            updateData[fieldName] = value;
          }
        }
      }
    }

    // Always update the updatedAt field
    updateData.field_4858583 = new Date().toISOString();

    console.log('Updating blog post with data:', updateData);

    const res = await fetch(`${BLOG_URL}${id}/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Token ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error('Error updating blog post:', error);
      throw new Error('Fehler beim Aktualisieren des Blogposts');
    }

    return await res.json();
  } catch (error) {
    console.error('Exception in updateBlogPost:', error);
    throw error;
  }
}

export async function deleteBlogPost(id: string) {
  const res = await fetch(`${BLOG_URL}${id}/`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Token ${TOKEN}`,
    },
  });
  if (!res.ok) throw new Error('Fehler beim Löschen des Blogposts');
  return true;
}
