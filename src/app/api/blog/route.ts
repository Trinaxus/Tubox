import { NextResponse } from 'next/server';
import { fetchBlogPosts } from '@/lib/blogData';

export async function GET() {
  try {
    const data = await fetchBlogPosts();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ results: [], error: e.message || 'Fehler beim Laden der Blogposts.' }, { status: 500 });
  }
}
