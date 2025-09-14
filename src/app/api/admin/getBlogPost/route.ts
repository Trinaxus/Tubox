import { NextResponse } from 'next/server';
import { fetchBlogPostById } from '@/lib/blogData';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  try {
    // Verwende die fetchBlogPostById-Funktion aus blogData.ts
    const post = await fetchBlogPostById(id);
    
    if (!post) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
    }
    // Das Post-Objekt wird direkt von fetchBlogPostById zurückgegeben
    // und hat bereits das richtige Format

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
