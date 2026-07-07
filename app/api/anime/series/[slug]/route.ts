// app/api/anime/series/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSeriesDetail } from '@/lib/anichin';

// Timeout wrapper for serverless functions
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms)
    ),
  ]);
}

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
    
    const detail = await withTimeout(getSeriesDetail(decodedSlug), 25000);
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
    }, {
      headers: {
        'Cache-Control': 's-maxage=180, stale-while-revalidate=300',
      },
    });
  } catch (error: any) {
    console.error('[Series API] Error:', error);
    
    const errorMessage = error?.message || 'Internal server error';
    const statusCode = error?.message?.includes('timeout') ? 504 : 500;
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        data: null 
      },
      { status: statusCode }
    );
  }
}