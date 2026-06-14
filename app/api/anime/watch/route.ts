// app/api/anime/watch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getWatchVideo } from '@/lib/anichin';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return NextResponse.json(
      { success: false, error: 'URL parameter required' },
      { status: 400 }
    );
  }
  
  try {
    const videoServers = await getWatchVideo(url);
    
    return NextResponse.json({
      success: true,
      data: {
        videoServers,
      },
    });
  } catch (error) {
    console.error('Get watch video API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch video sources' },
      { status: 500 }
    );
  }
}