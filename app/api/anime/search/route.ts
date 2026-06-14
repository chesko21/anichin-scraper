// app/api/anime/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { searchAnime } from '@/lib/anichin';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q') || '';
  
  if (!query.trim()) {
    return NextResponse.json(
      { success: false, error: 'Query parameter required' },
      { status: 400 }
    );
  }
  
  try {
    const results = await searchAnime(query);
    
    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search anime' },
      { status: 500 }
    );
  }
}