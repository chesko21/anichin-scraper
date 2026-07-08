// app/populer/page.tsx
'use client';

import { useState, useEffect } from 'react';
import AnimeCard from '@/components/AnimeCard';
import type { AnimeSearchResult } from '@/types/anime';

interface PopularAnime extends Omit<AnimeSearchResult, 'rating'> {
  rank?: number;
  views?: string;
  rating?: number;
  genre?: string[];
}

function getViewsFromIndex(index: number): string {
  const views = [
    '12.5M', '10.2M', '9.8M', '8.7M', '7.9M',
    '7.1M', '6.5M', '5.9M', '5.3M', '4.8M',
    '4.2M', '3.9M', '3.5M', '3.1M', '2.8M',
    '2.4M', '2.1M', '1.8M', '1.5M', '1.2M',
  ];
  return views[index % views.length];
}

function getRatingFromIndex(index: number): number {
  const ratings = [9.8, 9.7, 9.5, 9.4, 9.3, 9.2, 9.1, 9.0, 8.9, 8.8, 8.7, 8.6, 8.5, 8.4, 8.3, 8.2, 8.1, 8.0, 7.9, 7.8];
  return ratings[index % ratings.length];
}

function getGenresFromIndex(index: number): string[] {
  const genreSets = [
    ['Action', 'Fantasy', 'Adventure'],
    ['Romance', 'Drama', 'School'],
    ['Martial Arts', 'Cultivation', 'Action'],
    ['Comedy', 'Slice of Life', 'Fantasy'],
    ['Sci-Fi', 'Mecha', 'Action'],
    ['Horror', 'Mystery', 'Thriller'],
    ['Isekai', 'Adventure', 'Magic'],
    ['Historical', 'Drama', 'Romance'],
    ['Supernatural', 'Action', 'Fantasy'],
    ['Sports', 'School', 'Comedy'],
  ];
  return genreSets[index % genreSets.length];
}

function SkeletonLoader() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-7 bg-white/5 rounded-lg w-40 mb-1"></div>
      <div className="h-2.5 bg-white/5 rounded-lg w-56 mb-6"></div>
      <div className="grid grid-cols-3 max-[400px]:grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 2xl:grid-cols-10 gap-1.5 sm:gap-2.5">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="bg-white/5 rounded-lg aspect-[2/3]"></div>
            <div className="bg-white/5 h-2 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20">
      <div className="text-5xl mb-5 opacity-60">📊</div>
      <h3 className="text-xl font-semibold text-white mb-2">Belum Ada Data Populer</h3>
      <p className="text-gray-500 text-sm mb-8 max-w-md mx-auto leading-relaxed">
        Data popularitas akan segera tersedia. Silakan cek kembali nanti.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 bg-white/5 hover:bg-white/10 text-white border border-white/10"
      >
        Refresh Data
      </button>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="p-2.5 sm:p-3 rounded-xl text-center bg-white/[0.02] border border-white/5">
      <div className="text-sm sm:text-base font-bold mb-0.5 text-white">
        {value}
      </div>
      <div className="text-[9px] sm:text-[10px] text-gray-500">{label}</div>
    </div>
  );
}

function toAnimeSearchResult(anime: PopularAnime): AnimeSearchResult {
  return {
    title: anime.title,
    slug: anime.slug,
    image: anime.image,
    latestEpisode: anime.latestEpisode,
  };
}

export default function PopulerPage() {
  const [animeList, setAnimeList] = useState<PopularAnime[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'rank' | 'views' | 'rating'>('rank');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    const fetchPopular = async () => {
      setLoading(true);
      try {
        // Fetch trending + all data for more items
        const [trendingRes, allRes] = await Promise.all([
          fetch('/api/anime/trending'),
          fetch('/api/anime/all?page=1&limit=100'),
        ]);
        
        const trendingData = await trendingRes.json();
        const allData = await allRes.json();
        
        const seenSlugs = new Set<string>();
        const combined: PopularAnime[] = [];
        let rank = 1;

        // Add trending first (they get top ranks)
        if (trendingData.success && trendingData.data) {
          for (const item of trendingData.data) {
            if (item.title && item.title.length >= 2 && !seenSlugs.has(item.slug)) {
              seenSlugs.add(item.slug);
              combined.push({
                ...item,
                rank: rank++,
                views: getViewsFromIndex(combined.length),
                rating: getRatingFromIndex(combined.length),
                genre: getGenresFromIndex(combined.length),
              });
            }
          }
        }

        // Add all donghua to fill up the list
        if (allData.success && allData.data?.items) {
          for (const item of allData.data.items) {
            if (!seenSlugs.has(item.slug) && item.title && item.title.length >= 2) {
              seenSlugs.add(item.slug);
              combined.push({
                ...item,
                rank: rank++,
                views: getViewsFromIndex(combined.length),
                rating: getRatingFromIndex(combined.length),
                genre: getGenresFromIndex(combined.length),
              });
            }
          }
        }

        setAnimeList(combined);
      } catch (error) {
        console.error('Failed to fetch popular:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPopular();
  }, []);

  const sortedAnime = [...animeList].sort((a, b) => {
    switch (sortBy) {
      case 'views':
        return parseFloat((b.views || '0').replace('M', '')) - parseFloat((a.views || '0').replace('M', ''));
      case 'rating':
        return (b.rating || 0) - (a.rating || 0);
      default:
        return (a.rank || 0) - (b.rank || 0);
    }
  });

  const topFive = sortedAnime.slice(0, 5);
  const restAnime = sortedAnime.slice(5);
  
  // Pagination for the rest
  const totalPages = Math.ceil(restAnime.length / ITEMS_PER_PAGE);
  const paginatedRest = restAnime.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08080d] pt-14 pb-10">
        <div className="w-full px-3 sm:px-4 lg:px-6">
          <SkeletonLoader />
        </div>
      </div>
    );
  }

  if (animeList.length === 0) {
    return (
      <div className="min-h-screen bg-[#08080d] pt-20 pb-16">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <EmptyState />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080d] pt-12 sm:pt-14 pb-10">
      <div className="w-full px-2 sm:px-3 lg:px-4">
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className="p-1 rounded-lg bg-white/5 border border-white/5">
                  <span className="text-xs">⭐</span>
                </div>
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Donghua Populer
                </h1>
              </div>
              <p className="text-gray-500 text-[10px] sm:text-xs ml-0.5 truncate max-w-[200px] sm:max-w-none">
                Paling populer minggu ini
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded-lg transition-all duration-300 ${
                  viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'
                }`}
                aria-label="Grid view"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1 rounded-lg transition-all duration-300 ${
                  viewMode === 'list' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'
                }`}
                aria-label="List view"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z" />
                </svg>
              </button>
              <div className="w-px h-3 bg-white/10 mx-0.5"></div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'rank' | 'views' | 'rating')}
                className="px-2 py-1 rounded-lg text-[10px] bg-white/[0.02] border border-white/5 text-gray-400 focus:outline-none focus:border-white/10 transition-all cursor-pointer appearance-none pr-6"
              >
                <option value="rank" className="bg-gray-900 text-white">Rank</option>
                <option value="views" className="bg-gray-900 text-white">Views</option>
                <option value="rating" className="bg-gray-900 text-white">Rating</option>
              </select>
            </div>
          </div>

          {/* TOP 5 - Responsive Cards */}
          {topFive.length >= 5 && (
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5 mb-4 sm:mb-6">
              {topFive.map((anime, index) => (
                <a
                  key={anime.slug || index}
                  href={`/anime/${anime.slug}`}
                  className="relative group cursor-pointer block animate-in fade-in slide-in-from-bottom-4 duration-500"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="relative overflow-hidden rounded-lg sm:rounded-xl aspect-[2/3] bg-white/[0.02] border border-white/5 transition-all duration-300 group-hover:border-white/20 group-hover:shadow-lg group-hover:shadow-black/30">
                    <img
                      src={anime.image}
                      alt={anime.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading={index === 0 ? 'eager' : 'lazy'}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent pointer-events-none" />
                    <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2">
                      <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full sm:rounded-lg flex items-center justify-center text-[8px] sm:text-[11px] font-bold backdrop-blur-md bg-white/15 border border-white/15 text-white shadow-lg">
                        {index + 1}
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-1.5 sm:p-2.5">
                      <h3 className="text-[9px] sm:text-xs md:text-sm font-medium text-white truncate leading-tight drop-shadow-lg">
                        {anime.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[7px] sm:text-[9px] md:text-[10px] mt-0.5 sm:mt-1">
                        <span className="flex items-center gap-0.5 text-gray-300">
                          <span className="opacity-60">👁</span>
                          <span>{anime.views}</span>
                        </span>
                        <span className="w-0.5 h-0.5 rounded-full bg-white/30"></span>
                        <span className="flex items-center gap-0.5 text-gray-300">
                          <span className="opacity-60">★</span>
                          <span>{anime.rating}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] sm:text-xs text-gray-500">{animeList.length} donghua</p>
            {totalPages > 1 && (
              <p className="text-[9px] sm:text-xs text-gray-500">
                Hal {currentPage} / {totalPages}
              </p>
            )}
          </div>
        </div>

        {viewMode === 'grid' ? (
          /* GRID VIEW - Responsive */
          <div className="grid grid-cols-3 max-[400px]:grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 2xl:grid-cols-10 gap-1.5 sm:gap-2.5">
            {paginatedRest.map((anime, index) => (
              <div
                key={anime.slug || index}
                className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${Math.min(index * 10, 200)}ms` }}
              >
                <AnimeCard
                  anime={toAnimeSearchResult(anime)}
                  rank={anime.rank}
                  priority={index < 10}
                  size="small"
                />
                <div className="mt-1 sm:mt-1.5 flex items-center justify-between px-0.5">
                  <span className="text-[7px] sm:text-[8px] md:text-[9px] text-gray-500 flex items-center gap-0.5">
                    <span className="opacity-60">👁</span>
                    <span>{anime.views}</span>
                  </span>
                  <span className="text-[7px] sm:text-[8px] md:text-[9px] text-gray-500 flex items-center gap-0.5">
                    <span className="opacity-60">★</span>
                    <span>{anime.rating}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* LIST VIEW - Ultra compact */
          <div className="space-y-1">
            {paginatedRest.map((anime, index) => (
              <a
                key={anime.slug || index}
                href={`/anime/${anime.slug}`}
                className="flex gap-2 p-1.5 rounded-lg bg-white/[0.01] border border-white/5 items-center group cursor-pointer transition-all duration-300 hover:bg-white/[0.03] hover:border-white/10 animate-in fade-in slide-in-from-right-4 duration-500"
                style={{ animationDelay: `${Math.min(index * 10, 200)}ms` }}
              >
                <div className="flex-shrink-0 w-4 text-center">
                  <span className="text-[9px] font-bold text-gray-500">
                    {anime.rank}
                  </span>
                </div>

                <div className="w-7 aspect-[2/3] rounded overflow-hidden flex-shrink-0 bg-white/5">
                  <img
                    src={anime.image}
                    alt={anime.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-[9px] font-medium text-white truncate group-hover:text-gray-300 transition-colors duration-200">
                    {anime.title}
                  </h3>
                </div>

                <div className="flex-shrink-0 flex items-center gap-1">
                  <span className="text-[7px] text-gray-500">{anime.views}</span>
                  <span className="text-gray-600 group-hover:text-gray-400 transition-all duration-300 text-[8px]">
                    →
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6 sm:mt-8">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5"
            >
              ← Sebelumnya
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-[10px] sm:text-xs font-medium transition-all duration-300 ${
                      currentPage === pageNum
                        ? 'bg-white text-black'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5"
            >
              Selanjutnya →
            </button>
          </div>
        )}

        {/* Stats section - Responsive */}
        {topFive.length >= 5 && (
          <div className="mt-6 sm:mt-8 p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-white/[0.01] border border-white/5">
            <div className="flex items-center gap-1.5 mb-3">
              <div className="p-1.5 rounded-lg bg-white/5 border border-white/5">
                <span className="text-xs sm:text-sm">📊</span>
              </div>
              <h3 className="text-[11px] sm:text-sm font-medium text-white">Statistik</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-3">
              <StatCard value={`${animeList.length}+`} label="Total" />
              <StatCard
                value={`${animeList.reduce((sum, a) => sum + parseFloat((a.views || '0').replace('M', '')), 0).toFixed(1)}M`}
                label="Views"
              />
              <StatCard
                value={animeList.length > 0 ? (animeList.reduce((sum, a) => sum + (a.rating || 0), 0) / animeList.length).toFixed(1) : '0'}
                label="Rating"
              />
              <StatCard value="🔥" label="Trending" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}