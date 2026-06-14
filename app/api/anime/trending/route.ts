// app/api/anime/trending/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTrendingDonghua } from '@/lib/anichin';

export async function GET(request: NextRequest) {
  try {
    const trending = await getTrendingDonghua(15);
    
    return NextResponse.json({
      success: true,
      data: trending,
    });
  } catch (error) {
    console.error('Get trending API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trending' },
      { status: 500 }
    );
  }
}