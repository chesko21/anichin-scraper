// app/api/anime/trending/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'trending.json');
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({
        success: false,
        error: 'Data not available. Run build first.',
        data: []
      }, { status: 503 });
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(raw);
    
    return NextResponse.json({
      success: true,
      data: json.items || [],
    }, {
      headers: {
        'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error: any) {
    console.error('Get trending API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || 'Failed to load trending data',
        data: [] 
      },
      { status: 500 }
    );
  }
}