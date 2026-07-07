// app/api/anime/all/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(60, Math.max(1, parseInt(searchParams.get('limit') || '60')));

  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'all.json');
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({
        success: false,
        error: 'Data not available. Run build first.',
        data: { items: [], total: 0, hasMore: false, currentPage: page }
      }, { status: 503 });
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(raw);
    const allItems = json.items || [];

    const start = (page - 1) * limit;
    const end = start + limit;
    const items = allItems.slice(start, end).map((item: any) => ({
      title: item.title,
      slug: item.slug,
      image: item.image,
      latestEpisode: item.episode || 'N/A',
    }));

    const hasMore = end < allItems.length;

    return NextResponse.json({
      success: true,
      data: {
        items,
        total: allItems.length,
        hasMore,
        currentPage: page,
      },
    }, {
      headers: {
        'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error: any) {
    console.error('Get all donghua API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || 'Failed to load data',
        data: { items: [], total: 0, hasMore: false, currentPage: page }
      },
      { status: 500 }
    );
  }
}