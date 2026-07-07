// app/api/anime/recommendations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '15');
  
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'recommendations.json');
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({
        success: false,
        error: 'Data not available. Run build first.',
        data: []
      }, { status: 503 });
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(raw);
    const items = (json.items || []).slice(0, Math.min(limit, 20));
    
    return NextResponse.json({
      success: true,
      data: items,
    }, {
      headers: {
        'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error: any) {
    console.error('Get recommendations API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || 'Failed to load recommendations',
        data: [] 
      },
      { status: 500 }
    );
  }
}