// app/api/anime/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { searchAnime } from '@/lib/anichin';

// Timeout wrapper for serverless functions
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms)
    ),
  ]);
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q') || '';
  
  if (!query.trim()) {
    return NextResponse.json(
      { success: false, error: 'Query parameter required' },
      { status: 400 }
    );
  }
  
  try {
    const results = await withTimeout(searchAnime(query), 15000);
    
    return NextResponse.json({
      success: true,
      data: results,
    }, {
      headers: {
        'Cache-Control': 's-maxage=180, stale-while-revalidate=300',
      },
    });
  } catch (error: any) {
    console.error('Search API error:', error);
    
    const errorMessage = error?.message || 'Failed to search anime';
    const statusCode = error?.message?.includes('timeout') ? 504 : 500;
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        data: [] 
      },
      { status: statusCode }
    );
  }
}