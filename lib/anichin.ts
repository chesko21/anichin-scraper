// lib/anichin.ts
import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://anichin.cafe';
const TIMEOUT = 15000;

// ==================== HELPER FUNCTIONS ====================
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function slugFromEpisodeUrl(url: string, fallbackTitle: string): string {
  const path = url.replace(/\/$/, '').split('/').pop() || '';
  let slug = path
    .replace(/-subtitle-indonesia$/i, '')
    .replace(/-sub-indo$/i, '')
    .replace(/(-episode|-eps?)[-\s]?\d+.*$/i, '')
    .replace(/-+$/, '');
  if (slug.length > 3) return slug;
  return titleToSlug(fallbackTitle);
}

async function fetchWithRetry(url: string, retries = 3): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': BASE_URL,
          'Origin': BASE_URL,
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'same-origin',
          'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
        },
        timeout: TIMEOUT,
      });
      return response.data;
    } catch (error) {
      if (i === retries - 1) throw error;
      await delay(2000 * (i + 1)); 
    }
  }
  throw new Error('Failed to fetch');
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

// ==================== IMAGE HELPERS ====================
function normaliseImage(raw: string): string {
  if (!raw) return '';
  let img = raw.trim();
  if (img.startsWith('//')) img = 'https:' + img;
  if (img.startsWith('/') && !img.startsWith('//')) img = BASE_URL + img;
  try {
    const url = new URL(img);
    return url.toString();
  } catch {
    return img;
  }
}

function extractImage($el: cheerio.Cheerio<any>, $: cheerio.CheerioAPI): string {
  const img = $el.find('img').first();
  let src = '';
  
  // Try multiple attributes
  const attrs = ['src', 'data-src', 'data-lazy-src', 'data-original', 'data-lazy', 'srcset'];
  for (const attr of attrs) {
    const val = img.attr(attr);
    if (val) {
      if (attr === 'srcset') {
        src = val.split(',')[0]?.trim()?.split(' ')[0] || '';
      } else {
        src = val;
      }
      if (src) break;
    }
  }
  
  return normaliseImage(src);
}

// ==================== VALIDATION HELPERS ====================
function isValidTitle(title: string): boolean {
  if (!title || title.length < 2 || title.length > 150) return false;
  const bad = [
    'read more', 'comment', 'reply', 'next', 'prev', 'home',
    'menu', 'search', 'tag', 'genre', 'login', 'register',
    'admin', 'category', 'page', 'post', 'author', 'archive',
    'download', 'watch online', 'streaming', 'nonton',
    'skip to content', 'main menu', 'footer', 'header',
    'copyright', 'privacy policy', 'terms of service',
    'subtitle indonesia', 'sub indo', 'batch', 'complete',
    'latest update', 'recent post', 'popular post'
  ];
  const lower = title.toLowerCase().trim();
  return !bad.some(b => lower === b || lower.startsWith(b + ' ') || lower.endsWith(' ' + b));
}

function isValidImage(image: string): boolean {
  if (!image) return false;
  const lower = image.toLowerCase();
  const invalid = ['placeholder', 'no-image', 'blank', 'avatar', 'gravatar', 'default', '1x1', 'spacer', 'transparent'];
  if (invalid.some(w => lower.includes(w))) return false;
  return image.startsWith('http') || image.startsWith('https') || image.startsWith('//');
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return 'Rilis';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}h ${h}j`;
  if (h > 0) return `${h}j ${m}m`;
  return `${m}m`;
}

// ==================== EXTRACT TITLE FROM CARD ====================
function extractTitleFromCard($el: cheerio.Cheerio<any>, $: cheerio.CheerioAPI, linkEl?: cheerio.Cheerio<any>): string {
  let title = '';
  
  // Method 1: .tt text node before h2
  const $tt = $el.find('.tt').first();
  if ($tt.length) {
    let textBeforeH2 = '';
    $tt.contents().each((_, node) => {
      if (node.type === 'text') {
        textBeforeH2 += (node as any).data || '';
      } else if ((node as any).tagName === 'h2') {
        return false;
      }
    });
    title = textBeforeH2.trim();
    
    if (!title || title.length < 2) {
      const fullText = $tt.text().trim();
      const h2Text = $tt.find('h2').text().trim();
      title = fullText.replace(h2Text, '').trim();
    }
  }
  
  // Method 2: h2/h3 inside card
  if (!title || title.length < 2) {
    title = $el.find('h2, h3').first().text().trim();
  }
  
  // Method 3: .title class
  if (!title || title.length < 2) {
    title = $el.find('.title, .entry-title, .post-title, .anime-title').first().text().trim();
  }
  
  // Method 4: link title attribute
  const link = linkEl || $el.find('a').first();
  if ((!title || title.length < 2) && link.length) {
    title = (link.attr('title') || '')
      .replace(/\s*-?\s*[Ee]pisode\s*\d+.*$/i, '')
      .replace(/\s*[Ss]ubtitle\s*[Ii]ndonesia\s*$/i, '')
      .replace(/\s*[Ss]ub\s*[Ii]ndo\s*$/i, '')
      .trim();
  }
  
  // Method 5: img alt
  if (!title || title.length < 2) {
    title = ($el.find('img').first().attr('alt') || '')
      .replace(/\s*[Ee]pisode\s*\d+.*$/i, '')
      .trim();
  }
  
  // Clean
  title = title.replace(/^\d+\.\s*/, '').replace(/\s+/g, ' ').trim();
  
  return title;
}

// ==================== EXTRACT SLUG ====================
function extractSlug(href: string, title: string, $el?: cheerio.Cheerio<any>): string {
  let slug = '';
  
  // From /seri/ link
  if (href.includes('/seri/')) {
    slug = href.split('/').filter(Boolean).pop() || '';
  }
  
  // From card's seri link
  if (!slug && $el) {
    const seriHref = $el.find('a[href*="/seri/"]').attr('href');
    if (seriHref) {
      slug = seriHref.split('/').filter(Boolean).pop() || '';
    }
  }
  
  // From episode URL
  if (!slug) {
    slug = slugFromEpisodeUrl(href, title);
  }
  
  // Fallback: from title
  if (!slug || slug.length < 2) {
    slug = titleToSlug(title);
  }
  
  return slug;
}

// ==================== SEARCH ANIME ====================
export async function searchAnime(query: string): Promise<SearchResult[]> {
  const cacheKey = `search_${query.toLowerCase().trim()}`;
  const cached = apiCache.get<SearchResult[]>(cacheKey);
  if (cached) return cached;

  try {
    const html = await fetchWithRetry(`${BASE_URL}/?s=${encodeURIComponent(query)}`);
    const $ = cheerio.load(html);

    const results: SearchResult[] = [];
    const processedSlugs = new Set<string>();

    console.log(`[searchAnime] Searching: "${query}"`);

    $('article, .bsx, .post-item, .list-item, .listupd article').each((_, el) => {
      const $el = $(el);
      const linkEl = $el.find('a').first() || $el.closest('a');
      const href = linkEl.attr('href') || '';
      if (!href || href === '#' || href.includes('javascript:')) return;
      if (href.includes('/tag/') || href.includes('/category/') || href.includes('/page/')) return;

      const image = extractImage($el, $);
      if (!isValidImage(image)) return;

      const title = extractTitleFromCard($el, $, linkEl);
      if (!isValidTitle(title)) return;

      const slug = extractSlug(href, title, $el);
      if (!slug || processedSlugs.has(slug)) return;
      processedSlugs.add(slug);

      let episode = $el.find('.epx, .ep, .eps, .episode, .sb').first().text().trim();
      const isOngoing = /ongoing/i.test(episode);
      episode = isOngoing ? 'Ongoing' : episode.replace(/[^0-9]/g, '') || 'N/A';

      results.push({ title, slug, image, latestEpisode: episode });
    });

    console.log(`[searchAnime] Found ${results.length} results`);
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
    const url = `${BASE_URL}/seri/${slug}/`;
    const html = await fetchWithRetry(url);
    const $ = cheerio.load(html);

    console.log(`[getSeriesDetail] Fetching: ${url}`);

    const title = 
      $('h1.entry-title, .page-title, .anime-title, .post-title').first().text().trim() ||
      $('title').text().replace(/ - .*$/, '').trim() ||
      slug.replace(/-/g, ' ');

    let image = '';
    const imgSelectors = ['.thumb img', '.anime-poster img', '.poster img', '.animeimg img', 'img.wp-post-image', '.entry-image img', '.post-image img'];
    for (const sel of imgSelectors) {
      const src = $(sel).first().attr('src') || $(sel).first().attr('data-src') || '';
      if (src) { image = normaliseImage(src); break; }
    }

    let synopsis = '';
    const synopsisSelectors = ['.entry-content p', '.sinopsis', '.description', '.synopsis', '.anime-synopsis', '.post-content p', '.info-content p', '.summary p'];
    for (const sel of synopsisSelectors) {
      $(sel).each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 80 && text.length < 3000 && !text.includes('Watch online') && !text.includes('Download link') && !text.includes('streaming di')) {
          synopsis = text;
          return false;
        }
      });
      if (synopsis) break;
    }

    const genres: string[] = [];
    $('.genxed a, .sgen a, .genres-content a, .genre-info a, .mgen a').each((_, el) => {
      const genre = $(el).text().trim();
      if (genre && !genres.includes(genre)) genres.push(genre);
    });

    let status = 'Ongoing';
    $('.info-status, .status, .imptdt, .anime-status, .post-status').each((_, el) => {
      const text = $(el).text().toLowerCase();
      if (/complete|selesai|completed|tamat/i.test(text)) status = 'Completed';
    });

    let rating = $('.rating, .score, .imdb, .rtg').first().text().trim() || undefined;

    const episodes: SeriesDetail['episodes'] = [];
    const episodeSelectors = [
      '.episodelist ul li a', '.eplist li a', '.eps-list a',
      '.list-episode li a', '.lstepsi a', '.bxcl ul li a',
      '.episode-list a', '.all-episodes a',
    ];

    for (const selector of episodeSelectors) {
      const found = $(selector);
      if (found.length > 0) {
        console.log(`[getSeriesDetail] Found ${found.length} episodes via: ${selector}`);
        found.each((index, element) => {
          const episodeUrl = $(element).attr('href') || '';
          if (episodeUrl && !episodes.some(e => e.url === episodeUrl)) {
            let episodeTitle = $(element).find('.episode, .eps, .epno, .title, .epl-title').first().text().trim() || $(element).text().trim();
            let episodeNumber = episodeTitle.match(/[Ee]p(?:isode)?\s*(\d+)/i)?.[1] || episodeTitle.match(/\d+/)?.[0] || episodeUrl.match(/episode-(\d+)/i)?.[1] || episodeUrl.match(/-(\d+)(?:\/|-|$)/)?.[1] || String(index + 1);
            episodeTitle = episodeTitle.replace(/^\s*episode\s*\d+\s*[:-]?\s*/i, '').replace(/\s*subtitle indonesia\s*$/i, '').trim() || `Episode ${episodeNumber}`;
            episodes.push({ id: index + 1, title: episodeTitle, slug: episodeUrl.split('/').filter(Boolean).pop() || '', episodeNumber, url: episodeUrl.startsWith('http') ? episodeUrl : `${BASE_URL}${episodeUrl}` });
          }
        });
        break;
      }
    }
    episodes.reverse();

    const result: SeriesDetail = { title, image: isValidImage(image) ? image : '/placeholder.jpg', synopsis: synopsis || 'Synopsis tidak tersedia', status, genre: genres, rating, totalEpisodes: episodes.length, episodes };
    console.log(`[getSeriesDetail] Success: ${title} - ${episodes.length} eps`);
    apiCache.set(cacheKey, result, 5 * 60 * 1000);
    return result;
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
    const html = await fetchWithRetry(episodeUrl);
    const $ = cheerio.load(html);
    const servers: VideoSource[] = [];

    console.log(`[getWatchVideo] Fetching: ${episodeUrl}`);

    // Method 1: select.mirror with base64
    $('select.mirror option, select.server option, select.quality option').each((_, el) => {
      const b64 = $(el).attr('value');
      const serverName = $(el).text().trim() || `Server ${servers.length + 1}`;
      if (b64 && b64.length > 10) {
        try {
          const decoded = Buffer.from(b64, 'base64').toString('utf8');
          const $iframe = cheerio.load(decoded)('iframe');
          const src = $iframe.attr('src');
          if (src && !servers.some(s => s.url === src)) {
            servers.push({ server: serverName, url: src.startsWith('//') ? 'https:' + src : src });
          }
        } catch (e) {
          if (b64.startsWith('http') && !servers.some(s => s.url === b64)) {
            servers.push({ server: serverName, url: b64 });
          }
        }
      }
    });

    // Method 2: Direct iframes
    if (servers.length === 0) {
      $('iframe').each((_, el) => {
        let src = $(el).attr('src') || '';
        if (src && (src.startsWith('http') || src.startsWith('//'))) {
          if (src.startsWith('//')) src = 'https:' + src;
          if (!servers.some(s => s.url === src)) {
            servers.push({ server: `Server ${servers.length + 1}`, url: src });
          }
        }
      });
    }

    // Method 3: data-player attributes
    $('[data-player], [data-url], [data-video], [data-src]').each((_, el) => {
      const url = $(el).attr('data-player') || $(el).attr('data-url') || $(el).attr('data-video') || $(el).attr('data-src') || '';
      if (url && url.startsWith('http') && !servers.some(s => s.url === url)) {
        servers.push({ server: `Server ${servers.length + 1}`, url });
      }
    });

    // Method 4: Script extraction
    if (servers.length === 0) {
      $('script').each((_, el) => {
        const script = $(el).html() || '';
        const patterns = [
          /(?:https?:)?\/\/(?:www\.)?(?:mp4upload|streamsb|dood|gdrive|google|drive|streamtape|vidstream|vidcloud|filelions|mixdrop|voe|streamwish)\.(?:com|net|to|la|xyz|pro|sx|me)\/[^\s"'<>]+/gi,
          /(?:file|video|src|url)\s*[:=]\s*["']([^"']+\.(?:m3u8|mp4|mkv|webm)[^"']*)['"]/gi,
        ];
        for (const pattern of patterns) {
          let match;
          while ((match = pattern.exec(script)) !== null) {
            let url = match[1] || match[0];
            if (url.startsWith('//')) url = 'https:' + url;
            if (url.startsWith('http') && !url.includes('jquery') && !url.includes('bootstrap')) {
              if (!servers.some(s => s.url === url)) {
                servers.push({ server: `Server ${servers.length + 1}`, url });
              }
            }
          }
        }
      });
    }

    const uniqueServers = servers.filter((s, i, self) => i === self.findIndex(t => t.url === s.url) && s.url && s.url !== '#' && s.url.length > 10);
    console.log(`[getWatchVideo] Found ${uniqueServers.length} servers`);
    apiCache.set(cacheKey, uniqueServers, 5 * 60 * 1000);
    return uniqueServers;
  } catch (error) {
    console.error('[getWatchVideo] Error:', error);
    return [];
  }
}

// ==================== GET ALL DONGHUA (OPTIMIZED) ====================
export async function getAllDonghua(page: number = 1, limit: number = 60): Promise<PaginatedResponse<DonghuaItem>> {
  const cacheKey = `all_donghua_p${page}_l${limit}`;
  const cached = apiCache.get<PaginatedResponse<DonghuaItem>>(cacheKey);
  if (cached) {
    console.log(`[getAllDonghua] Cache hit page ${page}`);
    return cached;
  }

  try {
    const url = page === 1 ? BASE_URL : `${BASE_URL}/page/${page}/`;
    console.log(`[getAllDonghua] Fetching: ${url}`);
    const html = await fetchWithRetry(url);
    const $ = cheerio.load(html);

    const items: DonghuaItem[] = [];
    const processedSlugs = new Set<string>();

    // Debug: count elements
    console.log(`[getAllDonghua] article.bs: ${$('article.bs').length}, .bsx: ${$('.bsx').length}, .listupd article: ${$('.listupd article').length}`);

    // ── PRIMARY PARSING ───────────
    const mainSelectors = [
      'article.bs',
      '.listupd article',
      '.releases article',
      '.post-item',
      '.list-item',
      '.card',
      '.anime-card',
      '.series-card',
    ];

    for (const selector of mainSelectors) {
      $(selector).each((_, el) => {
        const $el = $(el);
        const linkEl = $el.find('a').first();
        const href = linkEl.attr('href') || '';
        if (!href || href === '#' || href.includes('javascript:')) return;
        if (/\/tag\/|\/category\/|\/author\/|\/page\/|wp-admin|wp-content/i.test(href)) return;

        const image = extractImage($el, $);
        if (!isValidImage(image)) return;

        const title = extractTitleFromCard($el, $, linkEl);
        if (!isValidTitle(title)) return;

        const slug = extractSlug(href, title, $el);
        if (!slug || processedSlugs.has(slug)) return;
        processedSlugs.add(slug);

        let episode = $el.find('.epx, .ep, .eps, .episode, .sb, .latest').first().text().trim();
        const isOngoing = /ongoing/i.test(episode);
        episode = isOngoing ? 'Ongoing' : episode.replace(/[^0-9.]/g, '') || 'N/A';

        let status = 'Ongoing';
        const statusText = $el.find('.status, .info-status').text().toLowerCase();
        if (/complete|selesai|completed|tamat/i.test(statusText)) status = 'Completed';

        items.push({ title, slug, image, status, episode });
      });
      
      if (items.length >= limit) break;
    }

    // ── FALLBACK: .bsx cards ───────────
    if (items.length < 10) {
      console.log('[getAllDonghua] Trying .bsx fallback...');
      $('.bsx').each((_, el) => {
        if (items.length >= limit) return false;
        const $el = $(el);
        const linkEl = $el.find('a').first();
        const href = linkEl.attr('href') || '';
        if (!href || href === '#' || href.includes('javascript:')) return;
        if (/\/tag\/|\/category\/|\/page\//i.test(href)) return;

        const image = extractImage($el, $);
        if (!isValidImage(image)) return;

        const title = extractTitleFromCard($el, $, linkEl);
        if (!isValidTitle(title)) return;

        const slug = extractSlug(href, title, $el);
        if (!slug || processedSlugs.has(slug)) return;
        processedSlugs.add(slug);

        let episode = $el.find('.epx, .ep, .eps').first().text().trim().replace(/[^0-9]/g, '');
        items.push({ title, slug, image, status: 'Ongoing', episode: episode || 'N/A' });
      });
    }

    // ── LAST RESORT: all links with images ───────────
    if (items.length < 5) {
      console.log('[getAllDonghua] Trying all links with images...');
      $('a:has(img)').each((_, el) => {
        if (items.length >= limit) return false;
        const $el = $(el);
        const href = $el.attr('href') || '';
        if (!href || href.includes('javascript:') || href.includes('/tag/') || href.includes('/category/') || href.includes('/page/')) return;
        
        const img = $el.find('img').first();
        const image = normaliseImage(img.attr('src') || img.attr('data-src') || '');
        if (!isValidImage(image)) return;

        let title = $el.attr('title') || img.attr('alt') || '';
        title = title.replace(/\s*[Ee]pisode\s*\d+.*$/i, '').trim();
        if (!isValidTitle(title)) return;

        const slug = extractSlug(href, title);
        if (!slug || processedSlugs.has(slug)) return;
        processedSlugs.add(slug);

        items.push({ title, slug, image, status: 'Ongoing', episode: 'N/A' });
      });
    }

    // Deduplicate
    const uniqueItems = items.filter((item, index, self) => index === self.findIndex(i => i.slug === item.slug));

    console.log(`[getAllDonghua] Page ${page}: ${uniqueItems.length} unique items`);
    if (uniqueItems.length > 0) {
      console.log(`[getAllDonghua] Sample: ${uniqueItems.slice(0, 5).map(i => i.title).join(' | ')}`);
    }

    // HasMore detection
    let hasMore = false;
    const nextSelectors = ['a.next', '.nextpostslink', '.pagination a.next', '.nav-links a.next', '.pagination .next', '.nav-next a', 'link[rel="next"]'];
    for (const sel of nextSelectors) {
      const nextLink = $(sel).attr('href');
      if (nextLink && nextLink !== '#' && !nextLink.includes('javascript:')) {
        hasMore = true;
        console.log(`[getAllDonghua] Next page found: ${nextLink}`);
        break;
      }
    }
    if (!hasMore && uniqueItems.length >= limit) hasMore = true;

    const result: PaginatedResponse<DonghuaItem> = {
      items: uniqueItems.slice(0, limit),
      total: uniqueItems.length,
      hasMore,
      currentPage: page,
      totalPages: hasMore ? page + 1 : page,
    };

    apiCache.set(cacheKey, result, 5 * 60 * 1000);
    return result;
  } catch (error) {
    console.error('[getAllDonghua] Error:', error);
    return { items: [], total: 0, hasMore: false, currentPage: page };
  }
}

// ==================== GET TRENDING DONGHUA ====================
export async function getTrendingDonghua(limit: number = 15): Promise<DonghuaItem[]> {
  const cacheKey = 'trending';
  const cached = apiCache.get<DonghuaItem[]>(cacheKey);
  if (cached) return cached.slice(0, limit);

  try {
    const html = await fetchWithRetry(BASE_URL);
    const $ = cheerio.load(html);
    const items: DonghuaItem[] = [];
    const processedSlugs = new Set<string>();

    const widgetSelectors = [
      '.widget-populer li', '.popular-posts li', '.trending-posts li',
      '.populer-item', '#sidebar .serieslist ul li', '.widget ul li',
      '.sidebar-popular li', '.top-series li', '.tab-content li',
    ];

    for (const sel of widgetSelectors) {
      $(sel).each((_, el) => {
        if (items.length >= limit) return false;
        const linkEl = $(el).find('a').first();
        const href = linkEl.attr('href') || '';
        if (!href) return;

        const image = extractImage($(el), $);
        if (!isValidImage(image)) return;

        let title = $(el).find('h3, h2, .title, .entry-title').first().text().trim() || linkEl.attr('title') || linkEl.text().trim();
        title = title.replace(/^\d+\.\s*/, '').replace(/\s*episode\s*\d+.*/i, '').replace(/\s*subtitle indonesia$/i, '').trim();
        if (!isValidTitle(title)) return;

        const slug = extractSlug(href, title);
        if (!slug || processedSlugs.has(slug)) return;
        processedSlugs.add(slug);

        items.push({ title, slug, image, status: 'Popular', episode: 'Trending' });
      });
      if (items.length >= 8) break;
    }

    if (items.length < limit) {
      const allData = await getAllDonghua(1, limit * 2);
      for (const item of allData.items) {
        if (items.length >= limit) break;
        if (!processedSlugs.has(item.slug)) {
          processedSlugs.add(item.slug);
          items.push(item);
        }
      }
    }

    const result = items.slice(0, limit);
    apiCache.set(cacheKey, result, 5 * 60 * 1000);
    return result;
  } catch (error) {
    console.error('[getTrendingDonghua] Error:', error);
    const fallback = await getAllDonghua(1, limit);
    return fallback.items;
  }
}

// ==================== GET RECOMMENDATIONS ====================
export async function getRecommendations(limit: number = 15): Promise<DonghuaItem[]> {
  const cacheKey = 'recommendations';
  const cached = apiCache.get<DonghuaItem[]>(cacheKey);
  if (cached) return cached.slice(0, limit);

  try {
    const [page1, page2, page3] = await Promise.all([
      getAllDonghua(1, 50),
      getAllDonghua(2, 50),
      getAllDonghua(3, 50),
    ]);

    const seen = new Set<string>();
    const merged: DonghuaItem[] = [];
    for (const item of [...page1.items, ...page2.items, ...page3.items]) {
      if (!seen.has(item.slug) && isValidImage(item.image)) {
        seen.add(item.slug);
        merged.push(item);
      }
    }

    // Fisher-Yates shuffle
    for (let i = merged.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [merged[i], merged[j]] = [merged[j], merged[i]];
    }

    const result = merged.slice(0, limit);
    apiCache.set(cacheKey, result, 10 * 60 * 1000);
    return result;
  } catch (error) {
    console.error('[getRecommendations] Error:', error);
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
    const html = await fetchWithRetry(`${BASE_URL}/schedule/`);
    const $ = cheerio.load(html);
    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

    for (const day of dayKeys) {
      const items: ScheduleItem[] = [];
      $(`.sch_${day} .bsx`).each((_, el) => {
        const $el = $(el);
        const linkEl = $el.find('a').first();
        const href = linkEl.attr('href') || '';
        if (!href) return;

        const title = $el.find('.tt').text().trim();
        if (!title) return;

        const image = extractImage($el, $);
        if (!isValidImage(image)) return;

        const slug = extractSlug(href, title);
        if (!slug) return;

        const cndwnEl = $el.find('.epx.cndwn');
        const countdownRaw = cndwnEl.attr('data-cndwn') || '';
        const releaseTimeRaw = cndwnEl.attr('data-rlsdt') || '';
        
        let countdown = '';
        if (countdownRaw) { const ts = parseInt(countdownRaw); if (ts > 0) countdown = formatCountdown(ts); }
        
        let releaseTime = '';
        if (releaseTimeRaw) {
          const ts = parseInt(releaseTimeRaw);
          if (ts > 0) {
            releaseTime = new Date(ts * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB';
          }
        }

        items.push({
          title, slug, image,
          currentEpisode: $el.find('.sb').text().trim(),
          releaseDay: day, releaseTime, countdown,
          url: href.startsWith('http') ? href : `${BASE_URL}${href}`,
        });
      });
      emptySchedule[day] = items;
    }

    apiCache.set(cacheKey, emptySchedule, 5 * 60 * 1000);
    return emptySchedule;
  } catch (error) {
    console.error('[getSchedule] Error:', error);
    return emptySchedule;
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