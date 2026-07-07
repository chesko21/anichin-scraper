// app/api/anime/schedule/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'schedule.json');
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({
        success: false,
        error: 'Data not available. Run build first.',
        data: {
          monday: [], tuesday: [], wednesday: [], thursday: [],
          friday: [], saturday: [], sunday: []
        }
      }, { status: 503 });
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(raw);
    const { updatedAt, ...schedule } = json;
    
    return NextResponse.json({
      success: true,
      data: schedule,
    }, {
      headers: {
        'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error: any) {
    console.error('Get schedule API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || 'Failed to load schedule',
        data: {
          monday: [], tuesday: [], wednesday: [], thursday: [],
          friday: [], saturday: [], sunday: []
        }
      },
      { status: 500 }
    );
  }
}