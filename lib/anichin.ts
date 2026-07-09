// lib/anichin.ts
// Uses @zhadev/anichin library for reliable scraping
// For Vercel: reads from pre-scraped static JSON files

import AnichinScraper from '@zhadev/anichin';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://anichin.cafe';

// Singleton scraper instance
let _scraper: AnichinScraper | null = null;
function getScraper(): AnichinScraper {
  if (!_scraper) {
    _scraper = new AnichinScraper({
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 2000,
      requestDelay: 1000,
    });
  }
  return _scraper;
}

// ==================== TYPE DEFINITIONS ====================
export interface SearchResult {
  title: string;
  slug: string;
  image: string;
  latestEpisode: string;
  rating?: string;
  status?: string;
}

export interface SeriesDetail {
  title: string;
  image: string;
  synopsis: string;
  status: string;
  genre: string[];
  rating?: string;
  totalEpisodes?: number;
  episodes: Array<{
    id: number;
    title: string;
    slug: string;
    episodeNumber: string;
    url: string;
  }>;
}

export interface VideoSource {
  server: string;
  url: string;
  quality?: string;
}

export interface DonghuaItem {
  title: string;
  slug: string;
  image: string;
  rating?: string;
  status?: string;
  episode?: string;
  genre?: string[];
}

export interface ScheduleItem {
  title: string;
  slug: string;
  image: string;
  currentEpisode: string;
  releaseDay: string;
  releaseTime: string;
  countdown: string;
  url: string;
}

export interface ScheduleResponse {
  monday: ScheduleItem[];
  tuesday: ScheduleItem[];
  wednesday: ScheduleItem[];
  thursday: ScheduleItem[];
  friday: ScheduleItem[];
  saturday: ScheduleItem[];
  sunday: ScheduleItem[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  currentPage: number;
  totalPages?: number;
}

// ==================== CACHE SYSTEM ====================
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class Cache {
  private cache: Map<string, CacheItem<any>> = new Map();
  private defaultTTL: number = 5 * 60 * 1000;

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    if (this.cache.size > 200) {
      const now = Date.now();
      for (const [k, v] of this.cache) {
        if (now > v.expiresAt) this.cache.delete(k);
      }
    }
    this.cache.set(key, { data, timestamp: Date.now(), expiresAt: Date.now() + ttl });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.data as T;
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

const apiCache = new Cache();

// ==================== READ SERIES DETAILS CACHE ====================
let _seriesCache: Record<string, SeriesDetail> | null = null;

function loadSeriesCache(): Record<string, SeriesDetail> {
  if (_seriesCache) return _seriesCache;
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'series-details.json');
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      _seriesCache = JSON.parse(raw);
      console.log(`[Cache] Loaded series cache: ${Object.keys(_seriesCache!).length} items`);
      return _seriesCache!;
    }
  } catch (e) {
    console.warn('[Cache] Failed to load series cache:', e);
  }
  _seriesCache = {};
  return _seriesCache;
}

// ==================== SEARCH ANIME ====================
export async function searchAnime(query: string): Promise<SearchResult[]> {
  const cacheKey = `search_${query.toLowerCase().trim()}`;
  const cached = apiCache.get<SearchResult[]>(cacheKey);
  if (cached) return cached;

  try {
    // First search from static data
    const filePath = path.join(process.cwd(), 'public', 'data', 'all.json');
    let results: SearchResult[] = [];

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

    // If not enough results, try live search
    if (results.length < 3) {
      try {
        const scraper = getScraper();
        const result = await scraper.search(query);
        if (result.success && result.data?.search?.items) {
          const existingSlugs = new Set(results.map((r: any) => r.slug));
          for (const item of result.data.search.items) {
            if (!existingSlugs.has(item.slug)) {
              results.push({
                title: item.title || 'Unknown',
                slug: item.slug || '',
                image: item.thumbnail || '',
                latestEpisode: item.episode || 'N/A',
              });
              existingSlugs.add(item.slug);
            }
          }
        }
      } catch (e) {
        // Live search failed, use static results only
      }
    }

    console.log(`[searchAnime] Found ${results.length} results for "${query}"`);
    apiCache.set(cacheKey, results, 3 * 60 * 1000);
    return results;
  } catch (error) {
    console.error('[searchAnime] Error:', error);
    return [];
  }
}

// ==================== SERIES DETAIL ====================
export async function getSeriesDetail(slug: string): Promise<SeriesDetail | null> {
  const cacheKey = `series_${slug}`;
  const cached = apiCache.get<SeriesDetail>(cacheKey);
  if (cached) return cached;

  // First: try reading from pre-scraped cache file
  try {
    const seriesCache = loadSeriesCache();
    const cachedDetail = seriesCache[slug];
    if (cachedDetail) {
      console.log(`[getSeriesDetail] Cache hit for: ${slug}`);
      apiCache.set(cacheKey, cachedDetail, 30 * 60 * 1000);
      return cachedDetail;
    }
  } catch (e) {
    // ignore
  }

  // Fallback: try building detail from all.json (basic info only)
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'all.json');
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const json = JSON.parse(raw);
      const item = (json.items || []).find((i: any) => i.slug === slug);
      if (item) {
        const basicDetail: SeriesDetail = {
          title: item.title || slug.replace(/-/g, ' '),
          image: item.image || '',
          synopsis: 'Synopsis tidak tersedia',
          status: item.status || 'Ongoing',
          genre: item.genre || [],
          rating: item.rating || undefined,
          totalEpisodes: 0,
          episodes: [],
        };
        console.log(`[getSeriesDetail] Using basic info from all.json for: ${slug}`);
        apiCache.set(cacheKey, basicDetail, 60 * 60 * 1000);
        return basicDetail;
      }
    }
  } catch (e) {
    // ignore
  }

  // Last resort: try live scraping from anichin.cafe
  try {
    const scraper = getScraper();
    const result = await scraper.series(slug);

    if (!result.success || !result.data?.detail) {
      console.log(`[getSeriesDetail] Not found: ${slug}`);
      return null;
    }

    const detail = result.data.detail;
    const image = detail.cover?.thumbnail || detail.cover?.banner || '';
    const synopsis = detail.synopsis || 'Synopsis tidak tersedia';
    const status = detail.information?.status || 'Ongoing';

    const genres: string[] = [];
    if (detail.genres && Array.isArray(detail.genres)) {
      detail.genres.forEach((g: any) => {
        if (typeof g === 'string') genres.push(g);
        else if (g.name) genres.push(g.name);
      });
    }

    let ratingStr: string | undefined;
    if (detail.rating && typeof detail.rating === 'object') {
      if (detail.rating.text) ratingStr = detail.rating.text;
      else if (detail.rating.percentage > 0) ratingStr = `${detail.rating.percentage}%`;
    }

    const episodes: SeriesDetail['episodes'] = [];
    if (detail.episodes && Array.isArray(detail.episodes)) {
      detail.episodes.forEach((ep: any, index: number) => {
        const epNum = ep.episode_number || ep.episode || String(index + 1);
        const epTitle = ep.title || `Episode ${epNum}`;
        const epSlug = ep.slug || '';
        const epUrl = ep.url || '';
        episodes.push({
          id: index + 1,
          title: epTitle,
          slug: epSlug,
          episodeNumber: typeof epNum === 'string' ? epNum : String(epNum),
          url: epUrl.startsWith('http') ? epUrl : `${BASE_URL}${epUrl}`,
        });
      });
    }
    episodes.reverse();

    const seriesDetail: SeriesDetail = {
      title: detail.title || slug.replace(/-/g, ' '),
      image,
      synopsis,
      status,
      genre: genres,
      rating: ratingStr,
      totalEpisodes: episodes.length,
      episodes,
    };

    console.log(`[getSeriesDetail] Live scrape success: ${seriesDetail.title} - ${episodes.length} eps`);
    apiCache.set(cacheKey, seriesDetail, 5 * 60 * 1000);
    return seriesDetail;
  } catch (error) {
    console.error('[getSeriesDetail] Live scrape error:', error);
    // Return basic info as final fallback
    return {
      title: slug.replace(/-/g, ' '),
      image: '',
      synopsis: 'Synopsis tidak tersedia',
      status: 'Ongoing',
      genre: [],
      totalEpisodes: 0,
      episodes: [],
    };
  }
}

// ==================== WATCH VIDEO ====================
export async function getWatchVideo(episodeUrl: string): Promise<VideoSource[]> {
  const cacheKey = `watch_${episodeUrl}`;
  const cached = apiCache.get<VideoSource[]>(cacheKey);
  if (cached) return cached;

  try {
    const episodeMatch = episodeUrl.match(/(.+?)-episode-(\d+)/i);
    let slug = '';
    let episodeNum = 1;

    if (episodeMatch) {
      slug = episodeMatch[1];
      episodeNum = parseInt(episodeMatch[2]);
    } else {
      const urlObj = new URL(episodeUrl);
      slug = urlObj.pathname.split('/').filter(Boolean)[0] || '';
    }

    if (!slug) return [];

    const scraper = getScraper();
    const result = await scraper.watch(slug, episodeNum);

    if (!result.success || !result.data?.watch?.servers) {
      return [];
    }

    const servers: VideoSource[] = result.data.watch.servers.map((s: any) => ({
      server: s.server_name || `Server ${s.server_id || 1}`,
      url: s.server_url || '',
      quality: s.quality || undefined,
    }));

    console.log(`[getWatchVideo] Found ${servers.length} servers for ${slug} ep ${episodeNum}`);
    apiCache.set(cacheKey, servers, 5 * 60 * 1000);
    return servers;
  } catch (error) {
    console.error('[getWatchVideo] Error:', error);
    return [];
  }
}

// ==================== GET SCHEDULE ====================
export async function getSchedule(): Promise<ScheduleResponse> {
  const cacheKey = 'schedule';
  const cached = apiCache.get<ScheduleResponse>(cacheKey);
  if (cached) return cached;

  const emptySchedule: ScheduleResponse = {
    monday: [], tuesday: [], wednesday: [], thursday: [],
    friday: [], saturday: [], sunday: []
  };

  try {
    const scraper = getScraper();
    const result = await scraper.schedule();

    if (!result.success || !result.data?.schedule) {
      return emptySchedule;
    }

    const schedule = result.data.schedule;
    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

    for (const day of dayKeys) {
      const dayData = schedule[day];
      const items: ScheduleItem[] = [];

      if (dayData?.list && Array.isArray(dayData.list)) {
        dayData.list.forEach((item: any) => {
          items.push({
            title: item.title || '',
            slug: item.slug || '',
            image: item.thumbnail || '',
            currentEpisode: item.current_episode || '',
            releaseDay: day,
            releaseTime: item.release_time?.formatted || '',
            countdown: item.countdown?.formatted || '',
            url: item.url || '',
          });
        });
      }
      emptySchedule[day] = items;
    }

    apiCache.set(cacheKey, emptySchedule, 5 * 60 * 1000);
    return emptySchedule;
  } catch (error) {
    console.error('[getSchedule] Error:', error);
    return emptySchedule;
  }
}

// ==================== GET ALL DONGHUA (from static JSON) ====================
export async function getAllDonghua(page: number = 1, limit: number = 60): Promise<PaginatedResponse<DonghuaItem>> {
  const cacheKey = `all_donghua_p${page}_l${limit}`;
  const cached = apiCache.get<PaginatedResponse<DonghuaItem>>(cacheKey);
  if (cached) return cached;

  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'all.json');

    if (!fs.existsSync(filePath)) {
      return { items: [], total: 0, hasMore: false, currentPage: page };
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(raw);
    const allItems: DonghuaItem[] = json.items || [];

    const start = (page - 1) * limit;
    const end = start + limit;
    const items = allItems.slice(start, end);
    const hasMore = end < allItems.length;

    const result: PaginatedResponse<DonghuaItem> = {
      items,
      total: allItems.length,
      hasMore,
      currentPage: page,
      totalPages: Math.ceil(allItems.length / limit),
    };

    apiCache.set(cacheKey, result, 5 * 60 * 1000);
    return result;
  } catch (error) {
    console.error('[getAllDonghua] Error:', error);
    return { items: [], total: 0, hasMore: false, currentPage: page };
  }
}

// ==================== GET TRENDING DONGHUA (from static JSON) ====================
export async function getTrendingDonghua(limit: number = 15): Promise<DonghuaItem[]> {
  const cacheKey = 'trending';
  const cached = apiCache.get<DonghuaItem[]>(cacheKey);
  if (cached) return cached.slice(0, limit);

  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'trending.json');

    if (!fs.existsSync(filePath)) {
      return [];
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(raw);
    const items: DonghuaItem[] = json.items || [];

    const result = items.slice(0, limit);
    apiCache.set(cacheKey, result, 5 * 60 * 1000);
    return result;
  } catch (error) {
    console.error('[getTrendingDonghua] Error:', error);
    return [];
  }
}

// ==================== GET RECOMMENDATIONS (from static JSON) ====================
export async function getRecommendations(limit: number = 15): Promise<DonghuaItem[]> {
  const cacheKey = 'recommendations';
  const cached = apiCache.get<DonghuaItem[]>(cacheKey);
  if (cached) return cached.slice(0, limit);

  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'recommendations.json');

    if (!fs.existsSync(filePath)) {
      return [];
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(raw);
    const items: DonghuaItem[] = json.items || [];

    const result = items.slice(0, limit);
    apiCache.set(cacheKey, result, 10 * 60 * 1000);
    return result;
  } catch (error) {
    console.error('[getRecommendations] Error:', error);
    return [];
  }
}

// ==================== UTILS ====================
export function clearCache(): void {
  apiCache.clear();
  console.log('[Cache] Cleared');
}

export function getCacheSize(): number {
  return apiCache.size;
}