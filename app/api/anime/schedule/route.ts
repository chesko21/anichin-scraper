// app/api/anime/schedule/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSchedule } from '@/lib/anichin';

export async function GET(request: NextRequest) {
  try {
    const schedule = await getSchedule();
    
    return NextResponse.json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    console.error('Get schedule API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch schedule' },
      { status: 500 }
    );
  }
}