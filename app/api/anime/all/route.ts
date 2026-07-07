// app/api/anime/all/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAllDonghua } from '@/lib/anichin';

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
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(60, Math.max(1, parseInt(searchParams.get('limit') || '60')));
  
  try {
    // Add timeout to prevent Vercel function timeout
    const result = await withTimeout(getAllDonghua(page, limit), 25000);

    const items = result.items.map(item => ({
      title: item.title,
      slug: item.slug,
      image: item.image,
      latestEpisode: item.episode || 'N/A',
    }));

    return NextResponse.json({
      success: true,
      data: {
        items,
        total: result.total,
        hasMore: result.hasMore,
        currentPage: result.currentPage,
      },
    }, {
      headers: {
        'Cache-Control': 's-maxage=180, stale-while-revalidate=300',
      },
    });
  } catch (error: any) {
    console.error('Get all donghua API error:', error);
    
    // Return more informative error
    const errorMessage = error?.message || 'Failed to fetch donghua data';
    const statusCode = error?.message?.includes('timeout') ? 504 : 500;
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        data: { items: [], total: 0, hasMore: false, currentPage: page }
      },
      { status: statusCode }
    );
  }
}