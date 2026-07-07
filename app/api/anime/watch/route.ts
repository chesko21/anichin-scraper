// app/api/anime/watch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getWatchVideo } from '@/lib/anichin';

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
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return NextResponse.json(
      { success: false, error: 'URL parameter required' },
      { status: 400 }
    );
  }
  
  try {
    const videoServers = await withTimeout(getWatchVideo(url), 20000);
    
    return NextResponse.json({
      success: true,
      data: {
        videoServers,
      },
    }, {
      headers: {
        'Cache-Control': 's-maxage=180, stale-while-revalidate=300',
      },
    });
  } catch (error: any) {
    console.error('Get watch video API error:', error);
    
    const errorMessage = error?.message || 'Failed to fetch video sources';
    const statusCode = error?.message?.includes('timeout') ? 504 : 500;
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        data: { videoServers: [] }
      },
      { status: statusCode }
    );
  }
}