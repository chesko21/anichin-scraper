// app/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import SearchBar from '@/components/SearchBar';
import AnimeCard from '@/components/AnimeCard';
import Footer from '@/components/Footer';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Flame, Star, Tv, Sparkles, TrendingUp, Clock, Shield, Gift, Smartphone, Zap } from 'lucide-react';
import type { AnimeSearchResult } from '@/types/anime';

function SectionHeader({
  icon,
  title,
  subtitle,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  href?: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-6 sm:mb-8 gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1.5">
          <div className="flex-shrink-0 p-2 rounded-xl bg-white/5 border border-white/5">
            {icon}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold truncate text-white tracking-tight">
            {title}
          </h2>
          <div className="h-px flex-1 ml-2 hidden sm:block bg-gradient-to-r from-white/10 to-transparent"></div>
        </div>
        {subtitle && (
          <p className="text-gray-400 text-sm ml-0.5 line-clamp-1">{subtitle}</p>
        )}
      </div>
      {href && (
        <a
          href={href}
          className="text-sm text-gray-400 hover:text-white transition-all duration-300 flex items-center gap-1.5 group flex-shrink-0 px-3 py-1.5 rounded-lg hover:bg-white/5"
        >
          <span>Lihat Semua</span>
          <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
        </a>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="bg-white/5 rounded-2xl aspect-[2/3] mb-3"></div>
      <div className="bg-white/5 h-3.5 rounded-lg w-3/4 mb-2"></div>
      <div className="bg-white/5 h-3 rounded-lg w-1/2"></div>
    </div>
  );
}

function SkeletonWide() {
  return (
    <div className="flex gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 animate-pulse">
      <div className="bg-white/5 w-14 aspect-[2/3] rounded-lg flex-shrink-0"></div>
      <div className="flex-1 space-y-2 py-1 min-w-0">
        <div className="bg-white/5 h-3 rounded-lg w-3/4"></div>
        <div className="bg-white/5 h-3 rounded-lg w-1/2"></div>
      </div>
    </div>
  );
}

function EmptyState({ icon, message, submessage, actionLabel, onAction }: {
  icon: string;
  message: string;
  submessage: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="text-center py-16 sm:py-20 rounded-2xl bg-white/[0.01] border border-white/5 backdrop-blur-sm">
      <div className="text-5xl sm:text-6xl mb-5 opacity-80">{icon}</div>
      <p className="text-gray-300 mb-2 text-lg font-medium">{message}</p>
      <p className="text-gray-500 text-sm mb-8">{submessage}</p>
      <button onClick={onAction} className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-all duration-300 border border-white/10">
        {actionLabel}
      </button>
    </div>
  );
}

function GenreTag({ label, onClick, active }: { label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 hover:scale-105 active:scale-95 border ${
        active 
          ? 'bg-white/10 border-white/20 text-white' 
          : 'bg-white/[0.02] border-white/5 text-gray-400 hover:text-white hover:border-white/10'
      }`}
    >
      {label}
    </button>
  );
}

// Helper function to fetch with error handling
async function fetchWithFallback(url: string): Promise<any> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`[fetchWithFallback] ${url} failed with status ${response.status}`);
      return { success: false, data: { items: [] } };
    }
    return await response.json();
  } catch (error) {
    console.error(`[fetchWithFallback] Error fetching ${url}:`, error);
    return { success: false, data: { items: [] } };
  }
}

export default function Home() {
  const [searchResults, setSearchResults] = useState<AnimeSearchResult[]>([]);
  const [allDonghua, setAllDonghua] = useState<AnimeSearchResult[]>([]);
  const [trendingDonghua, setTrendingDonghua] = useState<AnimeSearchResult[]>([]);
  const [recommendations, setRecommendations] = useState<AnimeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [page, setPage] = useState(2);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'trending' | 'recommendations'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [currentPageNum, setCurrentPageNum] = useState(1);
  
  const ITEMS_PER_PAGE = 30;
  const collectionRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const filterValid = (items: AnimeSearchResult[]) =>
    items.filter(
      (a) =>
        a.title && a.title.length >= 2 &&
        a.image && a.image !== '/placeholder.jpg' && a.image !== '' &&
        (a.image.startsWith('http') || a.image.startsWith('https') || a.image.startsWith('//'))
    );

  // Sequential fetch to avoid overwhelming serverless functions
  const fetchPageSequentially = async (pageNum: number): Promise<AnimeSearchResult[]> => {
    const data = await fetchWithFallback(`/api/anime/all?page=${pageNum}&limit=60`);
    if (data.success && data.data?.items) {
      return filterValid(data.data.items);
    }
    return [];
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setInitialLoading(true);
      try {
        // Fetch only 2 pages initially to reduce load
        const pagesToFetch = [1, 2];
        const allItems: AnimeSearchResult[] = [];
        
        // Sequential fetch to avoid timeout
        for (const p of pagesToFetch) {
          const items = await fetchPageSequentially(p);
          allItems.push(...items);
        }
        
        const seen = new Set<string>();
        const unique = allItems.filter(item => {
          if (seen.has(item.slug)) return false;
          seen.add(item.slug);
          return true;
        });

        console.log(`[Home] Loaded ${unique.length} unique donghua from ${pagesToFetch.length} requests`);
        setAllDonghua(unique);
        setHasMore(unique.length >= 120);
        setPage(3);

        // Fetch trending
        try {
          const trendingData = await fetchWithFallback('/api/anime/trending');
          if (trendingData.success && trendingData.data?.length > 0) {
            setTrendingDonghua(filterValid(trendingData.data));
          }
        } catch (err) { console.error('Trending error:', err); }

        // Fetch recommendations
        try {
          const recData = await fetchWithFallback('/api/anime/recommendations?limit=20');
          if (recData.success && recData.data) {
            setRecommendations(filterValid(recData.data));
          }
        } catch (err) { console.error('Recommendations error:', err); }
      } catch (error) {
        console.error('Failed to load initial data:', error);
      } finally {
        setInitialLoading(false);
      }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    setCurrentPageNum(1);
  }, [activeFilter]);

  useEffect(() => {
    if (isSearching || initialLoading) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !isSearching) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loadingMore, isSearching, initialLoading, page]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || isSearching) return;
    setLoadingMore(true);
    try {
      // Fetch 2 pages at a time instead of 4
      const pagesToFetch = [page, page + 1];
      const allNewItems: AnimeSearchResult[] = [];
      let stillHasMore = false;
      
      for (const p of pagesToFetch) {
        const data = await fetchWithFallback(`/api/anime/all?page=${p}&limit=60`);
        if (data.success && data.data?.items) {
          allNewItems.push(...filterValid(data.data.items));
          if (data.data.hasMore) stillHasMore = true;
        }
      }
      
      setAllDonghua((prev) => {
        const existingSlugs = new Set(prev.map((item) => item.slug));
        const uniqueNewItems = allNewItems.filter((item) => !existingSlugs.has(item.slug));
        return [...prev, ...uniqueNewItems];
      });
      setHasMore(stillHasMore && allNewItems.length >= 60);
      setPage((prev) => prev + 2);
    } catch (error) {
      console.error('Failed to load more:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [page, hasMore, loadingMore, isSearching]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setShowAllGenres(false);
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setLoading(true);
    setIsSearching(true);
    try {
      const response = await fetch(`/api/anime/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      const valid = data.success && data.data?.length > 0 ? filterValid(data.data) : [];
      setSearchResults(valid);
    } catch {
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const resetSearch = () => {
    setIsSearching(false);
    setSearchResults([]);
    setSearchQuery('');
    setActiveGenre(null);
  };

  const handleGenreClick = (genre: string) => {
    if (activeGenre === genre) {
      setActiveGenre(null);
      resetSearch();
    } else {
      setActiveGenre(genre);
      handleSearch(genre);
    }
  };

  const genreTags = [
    'Action', 'Adventure', 'Comedy', 'Cultivation', 'Demons',
    'Drama', 'Fantasy', 'Harem', 'Historical', 'Horror',
    'Isekai', 'Magic', 'Martial Arts', 'Mecha', 'Mystery',
    'Psychological', 'Reincarnation', 'Romance', 'School', 'Sci-Fi',
    'Shounen', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller',
  ];

  const visibleGenres = showAllGenres ? genreTags : genreTags.slice(0, 8);
  const hasMoreGenres = genreTags.length > 8;

  const displayedDonghua =
    activeFilter === 'trending' ? trendingDonghua :
    activeFilter === 'recommendations' ? recommendations :
    allDonghua;

  const totalPages = Math.max(1, Math.ceil(displayedDonghua.length / ITEMS_PER_PAGE));
  const paginatedDonghua = displayedDonghua.slice(
    (currentPageNum - 1) * ITEMS_PER_PAGE,
    currentPageNum * ITEMS_PER_PAGE
  );

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPageNum(newPage);
    if (collectionRef.current) {
      const yOffset = -80;
      const y = collectionRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const getPageNumbers = (): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [];
    const leftBound = Math.max(2, currentPageNum - 2);
    const rightBound = Math.min(totalPages - 1, currentPageNum + 2);
    pages.push(1);
    if (leftBound > 2) pages.push('...');
    for (let i = leftBound; i <= rightBound; i++) pages.push(i);
    if (rightBound < totalPages - 1) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  const filterTabs = [
    { key: 'all' as const, label: 'Semua', icon: Tv, count: allDonghua.length },
    { key: 'trending' as const, label: 'Trending', icon: Flame, count: trendingDonghua.length },
    { key: 'recommendations' as const, label: 'Top', icon: Star, count: recommendations.length },
  ];

  const showTrendingSection = trendingDonghua.length > 0 || recommendations.length > 0;

  return (
    <div className="min-h-screen bg-[#08080d] text-white selection:bg-white/10">
      <section className="relative pt-12 sm:pt-20 md:pt-28 pb-8 sm:pb-12 md:pb-16 overflow-visible">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] sm:w-[800px] h-[400px] opacity-15 blur-[120px]"
            style={{ background: 'radial-gradient(ellipse, #6366f1 0%, #8b5cf6 50%, transparent 80%)' }} />
        </div>

        <div className="w-full px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex justify-center mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/5 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="text-gray-400 text-sm font-medium">Koleksi Donghua Subtitle Indonesia</span>
            </div>
          </div>

          <div className="text-center mb-8 sm:mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
            <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black mb-4 sm:mb-6 leading-none tracking-tighter">
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                DonghuaNest
              </span>
            </h1>
            <p className="text-gray-500 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
              Streaming donghua subtitle Indonesia gratis. <span className="text-gray-300 font-medium">Koleksi terlengkap</span>, update setiap hari.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            {visibleGenres.map((tag) => (
              <GenreTag key={tag} label={tag} onClick={() => handleGenreClick(tag)} active={activeGenre === tag} />
            ))}
            {hasMoreGenres && (
              <button onClick={() => setShowAllGenres(!showAllGenres)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 hover:scale-105 active:scale-95 bg-white/5 border border-white/10 text-gray-300 hover:text-white">
                {showAllGenres ? 'Tutup' : `+${genreTags.length - 8}`}
              </button>
            )}
          </div>

          <div className="max-w-2xl mx-auto relative animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500" style={{ zIndex: 100 }}>
            <SearchBar onSearch={handleSearch} isLoading={loading} className="w-full" />
          </div>
        </div>
      </section>

      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="border-t border-white/5"></div>
      </div>

      {isSearching && (
        <section className="w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 animate-in fade-in duration-500" style={{ position: 'relative', zIndex: 10 }}>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-3 flex-wrap">
                <span className="text-gray-400">Hasil Pencarian</span>
                {searchQuery && <span className="text-white font-normal truncate max-w-[200px] sm:max-w-xs">"{searchQuery}"</span>}
                <span className="text-sm font-normal px-3 py-1 rounded-full bg-white/5 text-gray-400 border border-white/5">{searchResults.length} hasil</span>
              </h2>
            </div>
            <button onClick={resetSearch} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 self-start">
              <ChevronLeft className="w-4 h-4" />Kembali
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {[...Array(15)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : searchResults.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {searchResults.map((anime, index) => (
                <div key={anime.slug || index} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${Math.min(index * 30, 400)}ms` }}>
                  <AnimeCard anime={anime} priority={index < 10} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="🔍" message="Tidak ada hasil ditemukan" submessage="Coba kata kunci yang berbeda" actionLabel="Kembali ke Beranda" onAction={resetSearch} />
          )}
        </section>
      )}

      {!isSearching && (
        <>
          {showTrendingSection && (
            <section className="w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12" style={{ position: 'relative', zIndex: 1 }}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
                {trendingDonghua.length > 0 && (
                  <div className="lg:col-span-2">
                    <SectionHeader icon={<Flame className="w-5 h-5 text-gray-400" />} title="Trending Sekarang" subtitle="Donghua paling banyak ditonton minggu ini" href="/populer" />
                    {initialLoading ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">{[...Array(9)].map((_, i) => <SkeletonCard key={i} />)}</div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                        {trendingDonghua.slice(0, 9).map((anime, index) => (
                          <div key={anime.slug || index} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${index * 40}ms` }}>
                            <AnimeCard anime={anime} rank={index + 1} priority={index < 9} />
                          </div>
                        ))}
                        {trendingDonghua.length > 9 && (
                          <div className="col-span-2 sm:col-span-3 flex justify-center">
                            <a
                              href="/populer"
                              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-all duration-300 px-4 py-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10"
                            >
                              Lihat Semua Trending →
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {recommendations.length > 0 && (
                  <div className="lg:col-span-1">
                    <SectionHeader icon={<Star className="w-5 h-5 text-gray-400" />} title="Rekomendasi" subtitle="Rating tertinggi" />
                    <div className="space-y-2">
                      {initialLoading
                        ? [...Array(8)].map((_, i) => <SkeletonWide key={i} />)
                        : recommendations.slice(0, 8).map((anime, index) => (
                            <div key={anime.slug || index} className="animate-in fade-in slide-in-from-right-4 duration-500" style={{ animationDelay: `${index * 40}ms` }}>
                              <AnimeCard anime={anime} variant="wide" rank={index + 1} />
                            </div>
                          ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="border-t border-white/5"></div>
          </div>

          <section ref={collectionRef} id="koleksi-donghua" className="w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-10 gap-6">
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                    <Tv className="w-5 h-5 text-gray-400" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold truncate text-white tracking-tight">Koleksi Donghua</h2>
                </div>
                <p className="text-gray-500 text-sm flex items-center gap-2">
                  <span>{displayedDonghua.length} donghua tersedia</span>
                  {totalPages > 1 && (<><span className="text-gray-700">•</span><span>Hal {currentPageNum} / {totalPages}</span></>)}
                </p>
              </div>

              <div className="flex gap-1 p-1 rounded-xl bg-white/[0.02] border border-white/5 self-start sm:self-auto">
                {filterTabs.map((f) => {
                  const Icon = f.icon;
                  return (
                    <button key={f.key} onClick={() => { setActiveFilter(f.key); setCurrentPageNum(1); }}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300 whitespace-nowrap flex items-center gap-2 ${
                        activeFilter === f.key ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
                      }`}>
                      <Icon className="w-3.5 h-3.5" /><span className="hidden sm:inline">{f.label}</span>
                      {f.count > 0 && <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeFilter === f.key ? 'bg-white/10' : 'bg-white/5'}`}>{f.count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {initialLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                {[...Array(20)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : displayedDonghua.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                  {paginatedDonghua.map((anime, index) => (
                    <div key={`${anime.slug}-${index}`} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${Math.min(index * 10, 300)}ms` }}>
                      <AnimeCard anime={anime} priority={activeFilter === 'all' && index < 10} />
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex flex-col items-center gap-6 mt-12 sm:mt-16">
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      Menampilkan {((currentPageNum - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPageNum * ITEMS_PER_PAGE, displayedDonghua.length)} dari {displayedDonghua.length} donghua
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button onClick={() => handlePageChange(1)} disabled={currentPageNum === 1} className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 text-gray-400 hover:text-white border border-transparent hover:border-white/10" aria-label="Halaman pertama"><ChevronsLeft className="w-4 h-4" /></button>
                      <button onClick={() => handlePageChange(currentPageNum - 1)} disabled={currentPageNum === 1} className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 text-gray-400 hover:text-white border border-transparent hover:border-white/10" aria-label="Halaman sebelumnya"><ChevronLeft className="w-4 h-4" /></button>
                      
                      <div className="flex items-center gap-1">
                        {getPageNumbers().map((pageNum, idx) =>
                          pageNum === '...' ? (
                            <span key={`dots-${idx}`} className="w-10 h-10 flex items-center justify-center text-gray-600 text-sm select-none">···</span>
                          ) : (
                            <button key={pageNum} onClick={() => handlePageChange(pageNum as number)}
                              className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all duration-300 ${
                                currentPageNum === pageNum ? 'bg-white text-black' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10'
                              }`}>{pageNum}</button>
                          )
                        )}
                      </div>

                      <button onClick={() => handlePageChange(currentPageNum + 1)} disabled={currentPageNum === totalPages} className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 text-gray-400 hover:text-white border border-transparent hover:border-white/10" aria-label="Halaman berikutnya"><ChevronRight className="w-4 h-4" /></button>
                      <button onClick={() => handlePageChange(totalPages)} disabled={currentPageNum === totalPages} className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 text-gray-400 hover:text-white border border-transparent hover:border-white/10" aria-label="Halaman terakhir"><ChevronsRight className="w-4 h-4" /></button>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>Lompat ke:</span>
                      <select value={currentPageNum} onChange={(e) => handlePageChange(Number(e.target.value))}
                        className="px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-gray-300 cursor-pointer hover:bg-white/10 transition-colors focus:outline-none focus:border-gray-500/50 appearance-none pr-8">
                        {Array.from({ length: totalPages }, (_, i) => (
                          <option key={i + 1} value={i + 1} className="bg-gray-900 text-white">Halaman {i + 1}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {activeFilter === 'all' && hasMore && (
                  <div ref={loadMoreRef} className="flex justify-center py-12 sm:py-16">
                    {loadingMore ? (
                      <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/[0.02] border border-white/5 animate-in fade-in duration-500">
                        <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin border-white/50" />
                        <span className="text-gray-400 text-sm">Memuat lebih banyak...</span>
                      </div>
                    ) : (
                      <button onClick={loadMore} className="px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/5 hover:border-white/10">
                        <span className="flex items-center gap-2">
                          <Zap className="w-4 h-4" /> Muat Lebih Banyak
                        </span>
                      </button>
                    )}
                  </div>
                )}

                {!hasMore && activeFilter === 'all' && allDonghua.length > 0 && (
                  <div className="flex justify-center py-10 animate-in fade-in duration-500">
                    <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/[0.02] border border-white/5">
                      
                      <span className="text-gray-400 text-sm">Semua {allDonghua.length} donghua telah dimuat!</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <EmptyState icon="📭" message="Belum ada data yang tersedia" submessage="Silakan coba beberapa saat lagi" actionLabel="Muat Ulang" onAction={() => window.location.reload()} />
            )}
          </section>

          <section className="w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-14 pb-12 sm:pb-16">
            <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden p-5 sm:p-8 bg-white/[0.01] border border-white/5 backdrop-blur-sm">
              <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl pointer-events-none bg-indigo-500/5" />
              <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl pointer-events-none bg-purple-500/5" />

              <div className="relative z-10">
                <div className="text-center mb-6 sm:mb-10">
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 tracking-tight">
                    <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                      Kenapa DonghuaNest?
                    </span>
                  </h3>
                  <p className="text-gray-500 text-xs sm:text-sm max-w-lg mx-auto">Platform streaming donghua terbaik dengan pengalaman menonton tanpa batas</p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-8">
                  {[
                    { icon: Tv, title: 'Koleksi Lengkap', desc: 'Ribuan episode dari berbagai genre' },
                    { icon: Sparkles, title: 'Subtitle Indonesia', desc: 'Subtitle bahasa Indonesia berkualitas' },
                    { icon: Smartphone, title: 'Responsive', desc: 'Nyaman di HP, tablet, atau desktop' },
                    { icon: Clock, title: 'Update Harian', desc: 'Episode baru setiap hari, selalu fresh' },
                  ].map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <div key={feature.title} className="p-3 sm:p-4 rounded-xl sm:rounded-2xl text-center group transition-all duration-300 hover:bg-white/[0.02] border border-transparent hover:border-white/5">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mx-auto mb-2 transition-all duration-300 group-hover:scale-110 bg-white/5 border border-white/5">
                          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-white transition-colors duration-300" />
                        </div>
                        <h4 className="text-xs sm:text-sm font-semibold text-white mb-0.5">{feature.title}</h4>
                        <p className="text-[10px] sm:text-xs text-gray-500 leading-relaxed">{feature.desc}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
                  {[
                    { icon: Shield, text: 'Server 24/7' },
                    { icon: Star, text: 'Tanpa iklan' },
                    { icon: Gift, text: 'Gratis selamanya' },
                  ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.text} className="flex items-center gap-1.5 text-[10px] sm:text-xs text-gray-400 px-2.5 sm:px-3 py-1.5 rounded-full bg-white/[0.02] border border-white/5">
                        <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500" /><span>{stat.text}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
                  <a href="/populer" className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm transition-all duration-300 bg-white text-black hover:bg-gray-200 inline-flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Mulai Nonton
                  </a>
                  <button onClick={() => handleSearch('soul land')} className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm transition-all duration-300 bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 inline-flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Cari Populer
                  </button>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
      
      <Footer />
    </div>
  );
}