// app/api/anime/recommendations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getRecommendations } from '@/lib/anichin';

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
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '15');
  
  try {
    const recommendations = await withTimeout(getRecommendations(Math.min(limit, 20)), 30000);
    
    return NextResponse.json({
      success: true,
      data: recommendations,
    }, {
      headers: {
        'Cache-Control': 's-maxage=180, stale-while-revalidate=300',
      },
    });
  } catch (error: any) {
    console.error('Get recommendations API error:', error);
    
    const errorMessage = error?.message || 'Failed to fetch recommendations';
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