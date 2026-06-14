// app/api/anime/series/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSeriesDetail } from '@/lib/anichin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const resolvedParams = await params;
    const slug = resolvedParams.slug;
    
    console.log(`[Series API] Received request for slug: ${slug}`);
    console.log(`[Series API] Full URL: ${request.url}`);
    
    if (!slug) {
      console.log('[Series API] No slug provided');
      return NextResponse.json(
        { success: false, error: 'Slug parameter is required' },
        { status: 400 }
      );
    }
    
    const decodedSlug = decodeURIComponent(slug);
    console.log(`[Series API] Decoded slug: ${decodedSlug}`);
    
    const detail = await getSeriesDetail(decodedSlug);
    console.log(`[Series API] Detail result:`, detail ? 'Found' : 'Not found');
    
    if (!detail) {
      return NextResponse.json(
        { success: false, error: 'Anime not found' },
        { status: 404 }
      );
    }
    
    console.log(`[Series API] Success: ${detail.title} - ${detail.episodes?.length || 0} episodes`);
    
    return NextResponse.json({
      success: true,
      data: detail,
    });
  } catch (error) {
    console.error('[Series API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}