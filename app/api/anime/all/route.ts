// app/api/anime/all/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAllDonghua } from '@/lib/anichin';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(60, Math.max(1, parseInt(searchParams.get('limit') || '60')));
  
  try {
    const result = await getAllDonghua(page, limit);

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
    });
  } catch (error) {
    console.error('Get all donghua API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch donghua data' },
      { status: 500 }
    );
  }
}