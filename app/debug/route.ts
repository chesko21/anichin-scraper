// app/debug/route.ts
import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://anichin.cafe';

// Timeout wrapper
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms)
    ),
  ]);
}

export async function GET() {
  try {
    console.log('[Debug] Testing connection to anichin.cafe...');
    
    const response = await withTimeout(axios.get(BASE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
      },
      timeout: 15000,
    }), 20000);
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Debug info
    const debug: any = {
      status: 'success',
      page_title: $('title').text(),
      page_url: BASE_URL,
      response_length: html.length,
    };
    
    // Test selectors
    const selectorsToTest = [
      'article.bs',
      '.listupd article',
      '.bsx',
      '.post-item',
      '.list-item',
      '.card',
      '.anime-card',
      '.series-card',
    ];
    
    for (const selector of selectorsToTest) {
      const count = $(selector).length;
      debug[selector] = count;
      if (count > 0) {
        const first = $(selector).first();
        const linkEl = first.find('a').first();
        const imgEl = first.find('img').first();
        
        debug[`${selector}_sample`] = {
          title: linkEl.attr('title') || imgEl.attr('alt') || '',
          link: linkEl.attr('href') || '',
          image: imgEl.attr('src') || imgEl.attr('data-src') || '',
        };
      }
    }
    
    // Find all series links
    const seriesLinks: string[] = [];
    $('a[href*="/seri/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && !seriesLinks.includes(href) && seriesLinks.length < 10) {
        seriesLinks.push(href);
      }
    });
    
    debug.series_links = seriesLinks;
    
    return NextResponse.json({ 
      success: true, 
      debug,
      message: 'Connection to anichin.cafe successful' 
    });
  } catch (error: any) {
    console.error('[Debug] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error?.message || String(error),
      debug: {
        status: 'failed',
        page_url: BASE_URL,
      }
    }, { status: 500 });
  }
}