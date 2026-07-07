// scripts/scrape-data.ts
// Build-time scraper: fetches all data from anichin.cafe and saves as static JSON files
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'https://anichin.cafe';
const TIMEOUT = 30000;
const DATA_DIR = path.join(process.cwd(), 'public', 'data');

// ==================== HELPERS ====================
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, retries = 3): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
          'Referer': BASE_URL,
        },
        timeout: TIMEOUT,
      });
      return response.data;
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`  Retry ${i + 1}/${retries} for ${url}...`);
      await delay(3000 * (i + 1));
    }
  }
  throw new Error('Failed to fetch');
}

function normaliseImage(raw: string): string {
  if (!raw) return '';
  let img = raw.trim();
  if (img.startsWith('//')) img = 'https:' + img;
  if (img.startsWith('/') && !img.startsWith('//')) img = BASE_URL + img;
  return img;
}

function extractImage($el: cheerio.Cheerio<any>, $: cheerio.CheerioAPI): string {
  const img = $el.find('img').first();
  let src = '';
  for (const attr of ['src', 'data-src', 'data-lazy-src', 'data-original', 'data-lazy']) {
    const val = img.attr(attr);
    if (val) { src = val.trim(); break; }
  }
  if (!src) {
    // Try srcset
    const srcset = img.attr('srcset');
    if (srcset) {
      src = srcset.split(',')[0]?.trim()?.split(' ')[0] || '';
    }
  }
  return normaliseImage(src);
}

function isValidImage(image: string): boolean {
  if (!image) return false;
  const lower = image.toLowerCase();
  const invalid = ['placeholder', 'no-image', 'blank', 'avatar', 'gravatar', 'default', 'spacer', 'transparent'];
  if (invalid.some(w => lower.includes(w))) return false;
  return image.startsWith('http') || image.startsWith('https') || image.startsWith('//');
}

function isValidTitle(title: string): boolean {
  if (!title || title.length < 2 || title.length > 150) return false;
  const bad = [
    'read more', 'comment', 'reply', 'next', 'prev',
    'home', 'menu', 'search', 'tag', 'genre', 'login',
    'register', 'admin', 'category', 'page'
  ];
  const lower = title.toLowerCase().trim();
  return !bad.some(b => lower === b || lower.startsWith(b + ' ') || lower.endsWith(' ' + b));
}

/**
 * Extract series slug from an episode URL.
 * Example: /renegade-immortal-episode-148-subtitle-indonesia/ -> renegade-immortal
 */
function extractSlugFromEpisodeUrl(url: string): string {
  // Remove trailing slash, get last path segment
  const path = url.replace(/\/$/, '').split('/').pop() || '';
  // Remove episode number and subtitle suffix
  let slug = path
    .replace(/-subtitle-indonesia$/i, '')
    .replace(/-sub-indo$/i, '')
    .replace(/-episode-\d+.*$/i, '')
    .replace(/-eps?-\d+.*$/i, '')
    .replace(/(?:-episode|-eps?)\s*\d+.*$/i, '')
    .replace(/-+$/, '')
    .trim();
  
  // Remove trailing numbers (e.g., "some-title-148" -> "some-title")
  slug = slug.replace(/-\d+$/, '');
  
  return slug;
}

// ==================== SCRAPE ALL DONGHUA ====================
async function scrapeAllDonghua(): Promise<any[]> {
  console.log('\n=== Scraping All Donghua ===');
  const allItems: any[] = [];
  const processedSlugs = new Set<string>();
  let page = 1;
  let hasMore = true;
  const MAX_PAGES = 30;

  while (hasMore && page <= MAX_PAGES) {
    const url = page === 1 ? BASE_URL : `${BASE_URL}/page/${page}/`;
    console.log(`Fetching page ${page}...`);
    
    try {
      const html = await fetchWithRetry(url);
      const $ = cheerio.load(html);
      let itemsOnPage = 0;

      // Primary selector: article.bs on anichin.cafe
      $('article.bs').each((_, el) => {
        const $el = $(el);
        
        // Each article.bs has a link wrapping an image
        const linkEl = $el.find('a').first();
        const href = linkEl.attr('href') || '';
        if (!href || href === '#' || href.includes('javascript:')) return;

        const image = extractImage($el, $);
        if (!isValidImage(image)) return;

        // Extract title: find .tt > text node before h2, or h2 text
        let title = '';
        const $tt = $el.find('.tt');
        if ($tt.length) {
          // Get text content excluding h2
          const clone = $tt.clone();
          clone.find('h2').remove();
          title = clone.text().trim();
        }
        if (!title || title.length < 2) {
          title = $el.find('h2').first().text().trim();
        }
        if (!title || title.length < 2) {
          title = linkEl.attr('title') || '';
        }
        // Clean title - remove episode info
        title = title.replace(/\s*Episode\s*\d+.*$/i, '').replace(/\s+Subtitle\s+Indonesia\s*$/i, '').trim();
        if (!isValidTitle(title)) return;

        // Extract slug from URL
        let slug = '';
        // Check for /seri/ link
        const seriLink = $el.find('a[href*="/seri/"]').attr('href');
        if (seriLink) {
          slug = seriLink.split('/').filter(Boolean).pop() || '';
        }
        if (!slug) {
          slug = extractSlugFromEpisodeUrl(href);
        }
        if (!slug || slug.length < 2) return;
        if (processedSlugs.has(slug)) return;
        processedSlugs.add(slug);

        // Extract episode number
        let episode = $el.find('.epx, .ep, .eps, .sb').first().text().trim();
        episode = episode.replace(/[^0-9]/g, '') || 'N/A';

        allItems.push({ title, slug, image, episode, status: 'Ongoing' });
        itemsOnPage++;
      });

      // Check for next page
      hasMore = false;
      // The pagination link is "Next" linking to /page/X/
      $('a[href*="/page/"]').each((_, el) => {
        const text = $(el).text().trim().toLowerCase();
        if (text === 'next' || text === '»' || text === '›' || $(el).attr('rel') === 'next') {
          hasMore = true;
        }
      });
      // Also check for standard next selectors
      if (!hasMore) {
        for (const sel of ['a.next', '.nextpostslink', '.pagination a.next', 'link[rel="next"]']) {
          const link = $(sel).attr('href');
          if (link && link !== '#' && !link.includes('javascript:')) {
            hasMore = true;
            break;
          }
        }
      }

      console.log(`  Found ${itemsOnPage} items (total: ${allItems.length})`);
      page++;
      
      if (hasMore) await delay(1500);
    } catch (error) {
      console.log(`  Error on page ${page}:`, (error as any)?.message || error);
      hasMore = false;
    }
  }

  console.log(`Total donghua scraped: ${allItems.length}`);
  return allItems;
}

// ==================== SCRAPE TRENDING ====================
async function scrapeTrending(): Promise<any[]> {
  console.log('\n=== Scraping Trending ===');
  const items: any[] = [];
  const processedSlugs = new Set<string>();

  try {
    const html = await fetchWithRetry(BASE_URL);
    const $ = cheerio.load(html);

    // On anichin.cafe, trending might be in sidebar widgets
    // Try common selectors
    const widgetSelectors = [
      '.widget-populer li', '.popular-posts li', '.trending-posts li',
      '.populer-item', '.serieslist ul li', '.widget ul li',
      '.sidebar-popular li', '.top-series li', '.tab-content li',
      '.widget li', 'aside ul li',
    ];

    for (const sel of widgetSelectors) {
      $(sel).each((_, el) => {
        if (items.length >= 15) return false;
        const linkEl = $(el).find('a').first();
        const href = linkEl.attr('href') || '';
        if (!href) return;

        const image = extractImage($(el), $);
        if (!isValidImage(image)) return;

        let title = $(el).find('h3, h2, .title, .entry-title').first().text().trim() || linkEl.attr('title') || linkEl.text().trim();
        title = title.replace(/\s*episode\s*\d+.*/i, '').replace(/\s*subtitle indonesia$/i, '').trim();
        if (!isValidTitle(title)) return;

        let slug = extractSlugFromEpisodeUrl(href);
        if (!slug || slug.length < 2 || processedSlugs.has(slug)) return;
        processedSlugs.add(slug);

        items.push({ title, slug, image, status: 'Popular', episode: 'Trending' });
      });
      if (items.length >= 8) break;
    }

    // If still no trending items, just take top items from all list
    if (items.length === 0) {
      console.log('[Trending] No trending widget found, will use top items from all.json');
    }

    console.log(`Trending items: ${items.length}`);
  } catch (error) {
    console.error('Trending error:', (error as any)?.message || error);
  }

  return items;
}

// ==================== SCRAPE SCHEDULE ====================
async function scrapeSchedule(): Promise<any> {
  console.log('\n=== Scraping Schedule ===');
  const emptySchedule: any = {
    monday: [], tuesday: [], wednesday: [], thursday: [],
    friday: [], saturday: [], sunday: []
  };

  try {
    const html = await fetchWithRetry(`${BASE_URL}/schedule/`);
    const $ = cheerio.load(html);
    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

    for (const day of dayKeys) {
      const items: any[] = [];
      $(`.sch_${day} .bsx`).each((_, el) => {
        const $el = $(el);
        const linkEl = $el.find('a').first();
        const href = linkEl.attr('href') || '';
        if (!href) return;

        const title = $el.find('.tt').text().trim();
        if (!title) return;

        const image = extractImage($el, $);
        if (!isValidImage(image)) return;

        const slug = extractSlugFromEpisodeUrl(href);
        if (!slug) return;

        items.push({
          title, slug, image,
          currentEpisode: $el.find('.sb').text().trim(),
          releaseDay: day,
          url: href.startsWith('http') ? href : `${BASE_URL}${href}`,
        });
      });
      emptySchedule[day] = items;
      console.log(`  ${day}: ${items.length} items`);
    }
  } catch (error) {
    console.error('Schedule error:', (error as any)?.message || error);
  }

  return emptySchedule;
}

// ==================== MAIN ====================
async function main() {
  console.log('=== Build-Time Scraper ===');
  console.log(`Data directory: ${DATA_DIR}`);
  
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const allDonghua = await scrapeAllDonghua();
  const trending = await scrapeTrending();
  const schedule = await scrapeSchedule();

  // If trending is empty, use first 8 from all donghua
  const finalTrending = trending.length > 0 ? trending : allDonghua.slice(0, 8);

  // Recommendations: shuffled subset
  const recommendations = [...allDonghua]
    .sort(() => Math.random() - 0.5)
    .slice(0, 20);

  const timestamp = new Date().toISOString();
  
  fs.writeFileSync(
    path.join(DATA_DIR, 'all.json'),
    JSON.stringify({ items: allDonghua, total: allDonghua.length, updatedAt: timestamp }, null, 2)
  );
  console.log(`\nSaved all.json: ${allDonghua.length} items`);

  fs.writeFileSync(
    path.join(DATA_DIR, 'trending.json'),
    JSON.stringify({ items: finalTrending, updatedAt: timestamp }, null, 2)
  );
  console.log(`Saved trending.json: ${finalTrending.length} items`);

  fs.writeFileSync(
    path.join(DATA_DIR, 'recommendations.json'),
    JSON.stringify({ items: recommendations, updatedAt: timestamp }, null, 2)
  );
  console.log(`Saved recommendations.json: ${recommendations.length} items`);

  fs.writeFileSync(
    path.join(DATA_DIR, 'schedule.json'),
    JSON.stringify({ ...schedule, updatedAt: timestamp }, null, 2)
  );
  console.log(`Saved schedule.json`);

  fs.writeFileSync(
    path.join(DATA_DIR, 'meta.json'),
    JSON.stringify({
      lastUpdated: timestamp,
      totalDonghua: allDonghua.length,
      totalTrending: finalTrending.length,
      totalRecommendations: recommendations.length,
    }, null, 2)
  );

  console.log('\n=== Scraping Complete! ===');
  console.log(`Total donghua: ${allDonghua.length}`);
  console.log(`Total trending: ${finalTrending.length}`);
  console.log(`Total recommendations: ${recommendations.length}`);
}

main().catch(console.error);