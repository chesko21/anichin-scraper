// app/api/anime/schedule/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSchedule } from '@/lib/anichin';

// Timeout wrapper for serverless functions
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms)
    ),
  ]);
}

export async function GET(request: NextRequest) {
  try {
    const schedule = await withTimeout(getSchedule(), 20000);
    
    return NextResponse.json({
      success: true,
      data: schedule,
    }, {
      headers: {
        'Cache-Control': 's-maxage=180, stale-while-revalidate=300',
      },
    });
  } catch (error: any) {
    console.error('Get schedule API error:', error);
    
    const errorMessage = error?.message || 'Failed to fetch schedule';
    const statusCode = error?.message?.includes('timeout') ? 504 : 500;
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        data: {
          monday: [], tuesday: [], wednesday: [], thursday: [],
          friday: [], saturday: [], sunday: []
        }
      },
      { status: statusCode }
    );
  }
}