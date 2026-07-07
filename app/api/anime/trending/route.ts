// app/api/anime/trending/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTrendingDonghua } from '@/lib/anichin';

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
  try {
    const trending = await withTimeout(getTrendingDonghua(15), 20000);
    
    return NextResponse.json({
      success: true,
      data: trending,
    }, {
      headers: {
        'Cache-Control': 's-maxage=180, stale-while-revalidate=300',
      },
    });
  } catch (error: any) {
    console.error('Get trending API error:', error);
    
    const errorMessage = error?.message || 'Failed to fetch trending';
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