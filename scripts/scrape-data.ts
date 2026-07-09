// scripts/scrape-data.ts
// Build-time scraper: uses @zhadev/anichin library to fetch all data and save as static JSON files
import AnichinScraper from '@zhadev/anichin';
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== SCRAPE ALL ONGOING ====================
async function scrapeAllOngoing(scraper: AnichinScraper): Promise<any[]> {
  console.log('\n=== Scraping All Ongoing Donghua ===');
  const allItems: any[] = [];
  const processedSlugs = new Set<string>();
  let page = 1;
  let hasMore = true;
  const MAX_PAGES = 50;

  while (hasMore && page <= MAX_PAGES) {
    console.log(`Fetching ongoing page ${page}...`);
    try {
      const result = await scraper.ongoing(page);
      if (!result.success || !result.data?.lists || result.data.lists.length === 0) {
        hasMore = false;
        break;
      }

      let itemsOnPage = 0;
      for (const item of result.data.lists) {
        if (!item.slug || processedSlugs.has(item.slug)) continue;
        processedSlugs.add(item.slug);

        allItems.push({
          title: item.title || 'Unknown',
          slug: item.slug,
          image: item.thumbnail || '',
          episode: item.episode || 'N/A',
          status: 'Ongoing',
        });
        itemsOnPage++;
      }

      console.log(`  Page ${page}: ${itemsOnPage} items (total: ${allItems.length})`);

      // Check if there's a next page
      const nextUrl = result.data.pagination?.next;
      hasMore = !!nextUrl;
      page++;

      if (hasMore) await delay(1500);
    } catch (error: any) {
      console.log(`  Error on page ${page}:`, error?.message || error);
      hasMore = false;
    }
  }

  console.log(`\nTotal ongoing donghua: ${allItems.length}`);
  return allItems;
}

// ==================== SCRAPE ALL COMPLETED ====================
async function scrapeAllCompleted(scraper: AnichinScraper): Promise<any[]> {
  console.log('\n=== Scraping All Completed Donghua ===');
  const allItems: any[] = [];
  const processedSlugs = new Set<string>();
  let page = 1;
  let hasMore = true;
  const MAX_PAGES = 50;

  while (hasMore && page <= MAX_PAGES) {
    console.log(`Fetching completed page ${page}...`);
    try {
      const result = await scraper.completed(page);
      if (!result.success || !result.data?.lists || result.data.lists.length === 0) {
        hasMore = false;
        break;
      }

      let itemsOnPage = 0;
      for (const item of result.data.lists) {
        if (!item.slug || processedSlugs.has(item.slug)) continue;
        processedSlugs.add(item.slug);

        allItems.push({
          title: item.title || 'Unknown',
          slug: item.slug,
          image: item.thumbnail || '',
          episode: item.episode || 'N/A',
          status: 'Completed',
        });
        itemsOnPage++;
      }

      console.log(`  Page ${page}: ${itemsOnPage} items (total: ${allItems.length})`);

      const nextUrl = result.data.pagination?.next;
      hasMore = !!nextUrl;
      page++;

      if (hasMore) await delay(1500);
    } catch (error: any) {
      console.log(`  Error on page ${page}:`, error?.message || error);
      hasMore = false;
    }
  }

  console.log(`\nTotal completed donghua: ${allItems.length}`);
  return allItems;
}

// ==================== SCRAPE TRENDING ====================
async function scrapeTrending(scraper: AnichinScraper, allDonghua: any[]): Promise<any[]> {
  console.log('\n=== Scraping Trending ===');
  const items: any[] = [];
  const processedSlugs = new Set<string>();

  try {
    // Use home() to get popular_today
    const result = await scraper.home();
    if (result.success && result.data?.home?.popular_today) {
      for (const item of result.data.home.popular_today) {
        if (items.length >= 15) break;
        if (!item.slug || processedSlugs.has(item.slug)) continue;
        processedSlugs.add(item.slug);

        items.push({
          title: item.title || 'Unknown',
          slug: item.slug,
          image: item.thumbnail || '',
          episode: item.episode || 'Trending',
          status: 'Popular',
        });
      }
      console.log(`  Found ${items.length} trending items from home page`);
    }

    // Also try sidebar
    const sidebarResult = await scraper.sidebar();
    if (sidebarResult.success) {
      const sidebar = sidebarResult.data;
      
      // Popular series weekly
      if (sidebar.popular_series?.weekly) {
        for (const item of sidebar.popular_series.weekly) {
          if (items.length >= 15) break;
          if (!item.slug || processedSlugs.has(item.slug)) continue;
          processedSlugs.add(item.slug);
          items.push({
            title: item.title || 'Unknown',
            slug: item.slug,
            image: item.thumbnail || '',
            episode: item.rating || 'Trending',
            status: 'Popular',
          });
        }
      }

      // Popular series monthly
      if (sidebar.popular_series?.monthly) {
        for (const item of sidebar.popular_series.monthly) {
          if (items.length >= 15) break;
          if (!item.slug || processedSlugs.has(item.slug)) continue;
          processedSlugs.add(item.slug);
          items.push({
            title: item.title || 'Unknown',
            slug: item.slug,
            image: item.thumbnail || '',
            episode: item.rating || 'Trending',
            status: 'Popular',
          });
        }
      }
    }
  } catch (error: any) {
    console.log('Trending fetch error:', error?.message || error);
  }

  // Fallback: use first items from all donghua
  if (items.length === 0) {
    console.log('  No trending found, using first items from main list');
    for (const item of allDonghua.slice(0, 15)) {
      items.push({ ...item, status: 'Popular', episode: 'Trending' });
    }
  }

  console.log(`Trending items: ${items.length}`);
  return items;
}

// ==================== SCRAPE SCHEDULE ====================
async function scrapeSchedule(scraper: AnichinScraper): Promise<any> {
  console.log('\n=== Scraping Schedule ===');
  const emptySchedule: any = {
    monday: [], tuesday: [], wednesday: [], thursday: [],
    friday: [], saturday: [], sunday: []
  };

  try {
    const result = await scraper.schedule();
    if (result.success && result.data?.schedule) {
      const schedule = result.data.schedule;
      const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      
      for (const day of dayKeys) {
        const dayData = schedule[day];
        if (dayData?.list) {
          emptySchedule[day] = dayData.list.map((item: any) => ({
            title: item.title || 'Unknown',
            slug: item.slug || '',
            image: item.thumbnail || '',
            currentEpisode: item.current_episode || '',
            releaseDay: day,
            releaseTime: item.release_time?.formatted || '',
            countdown: item.countdown?.formatted || '',
            url: item.url || '',
          }));
        }
        console.log(`  ${day}: ${emptySchedule[day].length} items`);
      }
    }
  } catch (error: any) {
    console.error('Schedule fetch error:', error?.message || error);
  }

  return emptySchedule;
}

// ==================== MAIN ====================
async function main() {
  console.log('=== Build-Time Scraper (using @zhadev/anichin) ===');
  console.log(`Data directory: ${DATA_DIR}`);

  const scraper = new AnichinScraper({
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 2000,
    requestDelay: 1500,
  });

  // Scrape all data
  const ongoing = await scrapeAllOngoing(scraper);
  const completed = await scrapeAllCompleted(scraper);

  // Merge all donghua: ongoing first, then completed (avoid duplicates)
  const allSlugs = new Set<string>();
  const allDonghua: any[] = [];

  for (const item of [...ongoing, ...completed]) {
    if (!allSlugs.has(item.slug)) {
      allSlugs.add(item.slug);
      allDonghua.push(item);
    }
  }

  console.log(`\nTotal unique donghua: ${allDonghua.length}`);

  // If no donghua found, use some hardcoded popular ones as fallback
  if (allDonghua.length === 0) {
    console.log('WARNING: No donghua scraped! Check if anichin.cafe is accessible.');
    console.log('Using fallback data...');
  }

  const trending = await scrapeTrending(scraper, allDonghua);
  const schedule = await scrapeSchedule(scraper);

  // Recommendations: shuffled subset
  const recommendations = [...allDonghua]
    .sort(() => Math.random() - 0.5)
    .slice(0, 20);

  const timestamp = new Date().toISOString();

  // Save all.json
  fs.writeFileSync(
    path.join(DATA_DIR, 'all.json'),
    JSON.stringify({ items: allDonghua, total: allDonghua.length, updatedAt: timestamp }, null, 2)
  );
  console.log(`\nSaved all.json: ${allDonghua.length} items`);

  // Save trending.json
  fs.writeFileSync(
    path.join(DATA_DIR, 'trending.json'),
    JSON.stringify({ items: trending, updatedAt: timestamp }, null, 2)
  );
  console.log(`Saved trending.json: ${trending.length} items`);

  // Save recommendations.json
  fs.writeFileSync(
    path.join(DATA_DIR, 'recommendations.json'),
    JSON.stringify({ items: recommendations, updatedAt: timestamp }, null, 2)
  );
  console.log(`Saved recommendations.json: ${recommendations.length} items`);

  // Save schedule.json
  fs.writeFileSync(
    path.join(DATA_DIR, 'schedule.json'),
    JSON.stringify({ ...schedule, updatedAt: timestamp }, null, 2)
  );
  console.log(`Saved schedule.json`);

  // Save meta.json
  fs.writeFileSync(
    path.join(DATA_DIR, 'meta.json'),
    JSON.stringify({
      lastUpdated: timestamp,
      totalDonghua: allDonghua.length,
      totalTrending: trending.length,
      totalRecommendations: recommendations.length,
    }, null, 2)
  );

  console.log('\n=== Scraping Complete! ===');
  console.log(`Total donghua: ${allDonghua.length}`);
  console.log(`Total trending: ${trending.length}`);
  console.log(`Total recommendations: ${recommendations.length}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});