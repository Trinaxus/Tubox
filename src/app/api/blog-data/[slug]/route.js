import { NextResponse } from 'next/server';
import { fetchBlogPostBySlug } from '@/lib/blogData';

// Verwende Node.js Runtime anstatt Edge Runtime
export const runtime = 'nodejs';

export async function GET(request, { params }) {
  try {
    const slug = params.slug;
    
    if (!slug) {
      return NextResponse.json(
        { error: 'Slug parameter is required' },
        { status: 400 }
      );
    }
    
    const post = await fetchBlogPostBySlug(slug);
    
    if (!post) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(post);
  } catch (error) {
    console.error('Error in blog-data/[slug] API route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blog post' },
      { status: 500 }
    );
  }
}
