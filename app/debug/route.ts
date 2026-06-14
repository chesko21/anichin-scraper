// app/api/anime/debug/route.ts
import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://anichin.cafe';

export async function GET() {
  try {
    const response = await axios.get(BASE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Cari semua kemungkinan selector
    const debug: any = {};
    
    const selectorsToTest = [
      '.film-item',
      '.post-item', 
      '.anime-item',
      '.item',
      '.bs-item',
      '.bsx',
      '.listupd .bs',
      '.releases .bs',
      '.grid-item',
      '.col-item',
      '.post',
      '.article',
      '.entry',
      'li.item',
      'div.item'
    ];
    
    for (const selector of selectorsToTest) {
      const count = $(selector).length;
      debug[selector] = count;
      if (count > 0) {
        const first = $(selector).first();
        debug[`${selector}_sample`] = {
          html: first.html()?.substring(0, 500),
          title: first.find('h3, .title, a').first().text().trim(),
          link: first.find('a').first().attr('href'),
        };
      }
    }
    
    // Cari semua link yang mengandung /seri/
    const seriesLinks: string[] = [];
    $('a[href*="/seri/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && !seriesLinks.includes(href) && seriesLinks.length < 20) {
        seriesLinks.push(href);
      }
    });
    
    debug.series_links = seriesLinks;
    debug.page_title = $('title').text();
    debug.body_class = $('body').attr('class');
    
    return NextResponse.json({ success: true, debug });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) });
  }
}