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

function getMedalEmoji(rank: number): string {
  return `${rank}`;
}

function TopThreeCard({ anime, rank }: { anime: PopularAnime; rank: number }) {
  return (
    <a
      href={`/anime/${anime.slug}`}
      className="relative group cursor-pointer block"
    >
      <div className="relative overflow-hidden rounded-2xl aspect-[2/3] mb-3 bg-white/[0.02] border border-white/5">
        <img
          src={anime.image}
          alt={anime.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading={rank === 1 ? 'eager' : 'lazy'}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

        <div className="absolute top-3 left-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-bold backdrop-blur-md bg-white/10 border border-white/10 text-white">
            {getMedalEmoji(rank)}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
          <h3 className="text-sm sm:text-base font-medium text-white truncate mb-1">
            {anime.title}
          </h3>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-gray-400">
              <span className="opacity-60">👁</span>
              <span>{anime.views}</span>
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20"></span>
            <span className="flex items-center gap-1 text-gray-400">
              <span className="opacity-60">★</span>
              <span>{anime.rating}</span>
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}

function SkeletonLoader() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-10 bg-white/5 rounded-xl w-64 mb-2"></div>
      <div className="h-4 bg-white/5 rounded-lg w-96 mb-8"></div>
      <div className="grid gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-xl bg-white/[0.01] border border-white/5 p-4 flex gap-4">
            <div className="w-10 h-10 bg-white/5 rounded-full"></div>
            <div className="w-16 aspect-[2/3] bg-white/5 rounded-lg"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-white/5 rounded-lg w-3/4"></div>
              <div className="h-3 bg-white/5 rounded-lg w-1/2"></div>
            </div>
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
    <div className="p-4 rounded-xl text-center bg-white/[0.02] border border-white/5">
      <div className="text-xl sm:text-2xl font-bold mb-1 text-white">
        {value}
      </div>
      <div className="text-[11px] text-gray-500">{label}</div>
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

  useEffect(() => {
    const fetchPopular = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/anime/trending');
        const data = await response.json();
        if (data.success && data.data) {
          const enrichedData: PopularAnime[] = data.data.map((item: AnimeSearchResult, index: number) => ({
            ...item,
            rank: index + 1,
            views: getViewsFromIndex(index),
            rating: getRatingFromIndex(index),
            genre: getGenresFromIndex(index),
          }));
          setAnimeList(enrichedData);
        }
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

  const topThree = sortedAnime.slice(0, 3);
  const restAnime = sortedAnime.slice(3);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08080d] pt-20 pb-16">
        <div className="w-full px-4 sm:px-6 lg:px-8">
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
    <div className="min-h-screen bg-[#08080d] pt-20 pb-16">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="mb-8 sm:mb-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-xl">⭐</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Donghua Populer
                </h1>
              </div>
              <p className="text-gray-500 text-sm ml-0.5">
                Donghua paling populer dan favorit penonton minggu ini
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all duration-300 ${
                  viewMode === 'grid'
                    ? 'bg-white/10 text-white'
                    : 'text-gray-500 hover:text-white'
                }`}
                aria-label="Grid view"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all duration-300 ${
                  viewMode === 'list'
                    ? 'bg-white/10 text-white'
                    : 'text-gray-500 hover:text-white'
                }`}
                aria-label="List view"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z" />
                </svg>
              </button>
              <div className="w-px h-5 bg-white/10 mx-1"></div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'rank' | 'views' | 'rating')}
                className="px-3 py-2 rounded-lg text-xs bg-white/[0.02] border border-white/5 text-gray-400 focus:outline-none focus:border-white/10 transition-all cursor-pointer appearance-none pr-8"
              >
                <option value="rank" className="bg-gray-900 text-white">Ranking</option>
                <option value="views" className="bg-gray-900 text-white">Views</option>
                <option value="rating" className="bg-gray-900 text-white">Rating</option>
              </select>
            </div>
          </div>

          {topThree.length >= 3 && (
            <div className="grid grid-cols-3 gap-4 sm:gap-5 mb-10">
              {topThree.map((anime, index) => (
                <div
                  key={anime.slug || index}
                  className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <TopThreeCard anime={anime} rank={index + 1} />
                </div>
              ))}
            </div>
          )}
        </div>

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {restAnime.map((anime, index) => (
              <div
                key={anime.slug || index}
                className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${Math.min(index * 30, 400)}ms` }}
              >
                <AnimeCard
                  anime={toAnimeSearchResult(anime)}
                  rank={anime.rank}
                  priority={index < 10}
                />
                <div className="mt-2 flex items-center justify-between px-0.5">
                  <span className="text-[11px] text-gray-500 flex items-center gap-1">
                    <span className="opacity-60">👁</span>
                    <span>{anime.views}</span>
                  </span>
                  <span className="text-[11px] text-gray-500 flex items-center gap-1">
                    <span className="opacity-60">★</span>
                    <span>{anime.rating}</span>
                  </span>
                </div>
                {anime.genre && (
                  <div className="flex flex-wrap gap-1 mt-1.5 px-0.5">
                    {anime.genre.slice(0, 2).map((genre) => (
                      <span
                        key={genre}
                        className="text-[10px] px-1.5 py-0.5 rounded-full text-gray-500 bg-white/[0.02] border border-white/5"
                      >
                        {genre}
                      </span>
                    ))}
                    {anime.genre.length > 2 && (
                      <span className="text-[10px] text-gray-600">+{anime.genre.length - 2}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {restAnime.map((anime, index) => (
              <a
                key={anime.slug || index}
                href={`/anime/${anime.slug}`}
                className="flex gap-4 p-4 rounded-xl bg-white/[0.01] border border-white/5 items-center group cursor-pointer transition-all duration-300 hover:bg-white/[0.03] hover:border-white/10 animate-in fade-in slide-in-from-right-4 duration-500"
                style={{ animationDelay: `${Math.min(index * 30, 400)}ms` }}
              >
                <div className="flex-shrink-0 w-8 sm:w-10 text-center">
                  <span className="text-sm font-bold text-gray-500">
                    {anime.rank}
                  </span>
                </div>

                <div className="w-12 sm:w-14 aspect-[2/3] rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                  <img
                    src={anime.image}
                    alt={anime.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-white truncate mb-1.5 group-hover:text-gray-300 transition-colors duration-200">
                    {anime.title}
                  </h3>
                  {anime.genre && (
                    <div className="flex flex-wrap gap-1">
                      {anime.genre.slice(0, 3).map((genre) => (
                        <span
                          key={genre}
                          className="text-[10px] px-1.5 py-0.5 rounded-full text-gray-500 bg-white/[0.02] border border-white/5"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0 flex items-center gap-4 sm:gap-6">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-[11px] text-gray-500">
                      <span className="opacity-60">👁</span>
                      <span>{anime.views}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-gray-500">
                      <span className="opacity-60">★</span>
                      <span>{anime.rating}</span>
                    </div>
                  </div>
                  <span className="text-gray-600 group-hover:text-gray-400 group-hover:translate-x-1 transition-all duration-300">
                    →
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}

        {topThree.length >= 3 && (
          <div className="mt-12 sm:mt-16 p-6 rounded-2xl bg-white/[0.01] border border-white/5">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                <span className="text-lg">📊</span>
              </div>
              <h3 className="text-sm font-medium text-white">Statistik Popularitas</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <StatCard value={`${animeList.length}+`} label="Total Donghua" />
              <StatCard
                value={`${animeList.reduce((sum, a) => sum + parseFloat((a.views || '0').replace('M', '')), 0).toFixed(1)}M`}
                label="Total Views"
              />
              <StatCard
                value={animeList.length > 0 ? (animeList.reduce((sum, a) => sum + (a.rating || 0), 0) / animeList.length).toFixed(1) : '0'}
                label="Rata-rata Rating"
              />
              <StatCard value="🔥" label="Trending" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}