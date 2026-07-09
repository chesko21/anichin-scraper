// lib/anichin.ts
// Uses @zhadev/anichin library for reliable scraping

import AnichinScraper from '@zhadev/anichin';

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
  private defaultTTL: number = 5 * 60 * 1000; // 5 menit

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

// ==================== SEARCH ANIME ====================
export async function searchAnime(query: string): Promise<SearchResult[]> {
  const cacheKey = `search_${query.toLowerCase().trim()}`;
  const cached = apiCache.get<SearchResult[]>(cacheKey);
  if (cached) return cached;

  try {
    const scraper = getScraper();
    const result = await scraper.search(query);
    
    if (!result.success || !result.data?.search?.items) {
      return [];
    }

    const items = result.data.search.items;
    const results: SearchResult[] = items.map((item: any) => ({
      title: item.title || 'Unknown',
      slug: item.slug || '',
      image: item.thumbnail || '',
      latestEpisode: item.episode || 'N/A',
    }));

    console.log(`[searchAnime] Found ${results.length} results for "${query}"`);
    const final = results.slice(0, 24);
    apiCache.set(cacheKey, final, 3 * 60 * 1000);
    return final;
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

  try {
    const scraper = getScraper();
    const result = await scraper.series(slug);
    
    if (!result.success || !result.data?.detail) {
      console.log(`[getSeriesDetail] Not found: ${slug}`);
      return null;
    }

    const detail = result.data.detail;
    
    // Map genres
    const genres: string[] = [];
    if (detail.genres && Array.isArray(detail.genres)) {
      detail.genres.forEach((g: any) => {
        if (typeof g === 'string') genres.push(g);
        else if (g.name) genres.push(g.name);
      });
    }

    // Map episodes
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

    // Reversed so newest first
    episodes.reverse();

    const seriesDetail: SeriesDetail = {
      title: detail.title || slug.replace(/-/g, ' '),
      image: detail.thumbnail || detail.poster || '',
      synopsis: detail.synopsis || detail.description || 'Synopsis tidak tersedia',
      status: detail.status || 'Ongoing',
      genre: genres,
      rating: detail.rating || undefined,
      totalEpisodes: episodes.length,
      episodes,
    };

    console.log(`[getSeriesDetail] Success: ${seriesDetail.title} - ${episodes.length} eps`);
    apiCache.set(cacheKey, seriesDetail, 5 * 60 * 1000);
    return seriesDetail;
  } catch (error) {
    console.error('[getSeriesDetail] Error:', error);
    return null;
  }
}

// ==================== WATCH VIDEO ====================
export async function getWatchVideo(episodeUrl: string): Promise<VideoSource[]> {
  const cacheKey = `watch_${episodeUrl}`;
  const cached = apiCache.get<VideoSource[]>(cacheKey);
  if (cached) return cached;

  try {
    // Extract slug and episode number from URL
    const urlObj = new URL(episodeUrl);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    
    // Try to find slug and episode from the path
    // Pattern: /slug-episode-123-subtitle-indonesia/
    const episodeMatch = episodeUrl.match(/(.+?)-episode-(\d+)/i);
    let slug = '';
    let episodeNum = 1;
    
    if (episodeMatch) {
      slug = episodeMatch[1];
      episodeNum = parseInt(episodeMatch[2]);
    } else {
      // Fallback: use the path as slug
      slug = pathParts[0] || '';
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
// Note: This reads from the static JSON file generated by scrape-data.ts
import fs from 'fs';
import path from 'path';

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