// app/api/anime/recommendations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getRecommendations } from '@/lib/anichin';

export async function GET(request: NextRequest) {
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '15');
  
  try {
    const recommendations = await getRecommendations(Math.min(limit, 20));
    
    return NextResponse.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    console.error('Get recommendations API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}