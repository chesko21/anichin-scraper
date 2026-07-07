// app/api/anime/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { searchAnime } from '@/lib/anichin';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q') || '';
  
  if (!query.trim()) {
    return NextResponse.json(
      { success: false, error: 'Query parameter required' },
      { status: 400 }
    );
  }
  
  try {
    // First try searching from static data (fast, no timeout)
    const filePath = path.join(process.cwd(), 'public', 'data', 'all.json');
    let results: any[] = [];
    
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const json = JSON.parse(raw);
      const allItems = json.items || [];
      
      const q = query.toLowerCase().trim();
      results = allItems.filter((item: any) => 
        item.title.toLowerCase().includes(q)
      ).slice(0, 24).map((item: any) => ({
        title: item.title,
        slug: item.slug,
        image: item.image,
        latestEpisode: item.episode || 'N/A',
      }));
    }
    
    // If not enough results from static data, try live search
    if (results.length < 3) {
      try {
        const liveResults = await searchAnime(query);
        if (liveResults && liveResults.length > 0) {
          // Merge, deduplicate by slug
          const existingSlugs = new Set(results.map((r: any) => r.slug));
          for (const item of liveResults) {
            if (!existingSlugs.has(item.slug)) {
              results.push(item);
              existingSlugs.add(item.slug);
            }
          }
        }
      } catch (e) {
        // Live search failed, just use static results
        console.warn('[Search] Live search failed, using static data only');
      }
    }
    
    return NextResponse.json({
      success: true,
      data: results,
    }, {
      headers: {
        'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error: any) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || 'Failed to search anime',
        data: [] 
      },
      { status: 500 }
    );
  }
}