import { NextResponse } from 'next/server';
import { fetchBlogPosts } from '@/lib/blogData';

export async function GET(request: Request) {
  try {
    // URL-Parameter auslesen
    const url = new URL(request.url);
    const draft = url.searchParams.get('draft');
    
    // Draft-Parameter konvertieren
    const draftParam = draft !== null ? draft : null;
    
    // Daten abrufen
    const data = await fetchBlogPosts({ draft: draftParam });
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in blog-data API route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blog data' },
      { status: 500 }
    );
  }
}
