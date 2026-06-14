// components/EpisodeList.tsx
'use client';

import Link from 'next/link';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Search, ChevronDown, ChevronLeft, ChevronRight, SkipForward, SkipBack, List, Grid3X3, X, Tv, Filter } from 'lucide-react';
import type { Episode } from '@/types/anime';

interface EpisodeListProps {
  episodes: Episode[];
  slug: string;
  currentEpisode?: number;
  isLoading?: boolean;
}

const EPISODES_PER_PAGE = 100;

function EpisodeSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between gap-2">
        <div className="bg-white/5 h-5 w-24 rounded-lg"></div>
        <div className="flex gap-1">
          <div className="bg-white/5 w-8 h-8 rounded-lg"></div>
          <div className="bg-white/5 w-8 h-8 rounded-lg"></div>
        </div>
      </div>
      <div className="bg-white/5 h-9 w-full rounded-lg"></div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(2.8rem, 1fr))' }}>
        {[...Array(40)].map((_, i) => (
          <div key={i} className="bg-white/5 h-9 rounded-lg" style={{ animationDelay: `${i * 0.01}s` }}></div>
        ))}
      </div>
    </div>
  );
}

function EpisodeRangeSelector({
  totalEpisodes,
  currentPage,
  onPageChange,
}: {
  totalEpisodes: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.ceil(totalEpisodes / EPISODES_PER_PAGE);
  const startEp = (currentPage - 1) * EPISODES_PER_PAGE + 1;
  const endEp = Math.min(currentPage * EPISODES_PER_PAGE, totalEpisodes);

  const ranges = Array.from({ length: totalPages }, (_, i) => ({
    page: i + 1,
    start: i * EPISODES_PER_PAGE + 1,
    end: Math.min((i + 1) * EPISODES_PER_PAGE, totalEpisodes),
  }));

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (totalPages <= 1) return null;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 bg-white/[0.02] border border-white/5 text-gray-400 hover:text-white hover:border-white/10"
      >
        <Filter className="w-3 h-3 opacity-60" />
        <span className="hidden xl:inline">EP {startEp} - {endEp}</span>
        <span className="xl:hidden">{startEp}-{endEp}</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-56 max-h-64 overflow-y-auto rounded-xl z-[100] animate-in fade-in slide-in-from-top-2 duration-200 hide-scrollbar bg-[#0f0f14] border border-white/5 shadow-2xl">
          {ranges.map((range) => (
            <button
              key={range.page}
              onClick={() => {
                onPageChange(range.page);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-left text-xs transition-all duration-200 flex items-center justify-between ${
                currentPage === range.page
                  ? 'bg-white/5 text-white'
                  : 'text-gray-500 hover:bg-white/[0.02] hover:text-gray-300'
              }`}
            >
              <span className="font-mono">EP {range.start} - {range.end}</span>
              {currentPage === range.page && (
                <span className="w-1.5 h-1.5 rounded-full bg-white/50"></span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const getPageNumbers = (): (number | '...')[] => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | '...')[] = [];
    const leftBound = Math.max(2, currentPage - 1);
    const rightBound = Math.min(totalPages - 1, currentPage + 1);

    pages.push(1);
    if (leftBound > 2) pages.push('...');

    for (let i = leftBound; i <= rightBound; i++) {
      pages.push(i);
    }

    if (rightBound < totalPages - 1) pages.push('...');
    pages.push(totalPages);

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 text-gray-400 hover:text-white border border-transparent hover:border-white/10"
        aria-label="First page"
      >
        <SkipBack className="w-3 h-3" />
      </button>

      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 text-gray-400 hover:text-white border border-transparent hover:border-white/10"
        aria-label="Previous page"
      >
        <ChevronLeft className="w-3 h-3" />
      </button>

      <div className="hidden sm:flex items-center gap-1 mx-1">
        {pageNumbers.map((page, index) =>
          page === '...' ? (
            <span key={`dots-${index}`} className="w-7 text-center text-gray-600 text-xs select-none">
              ···
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`w-7 h-7 rounded-lg text-xs font-medium transition-all duration-300 ${
                currentPage === page
                  ? 'bg-white text-black'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10'
              }`}
            >
              {page}
            </button>
          )
        )}
      </div>

      <span className="sm:hidden text-xs text-gray-500 px-2">
        {currentPage}/{totalPages}
      </span>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 text-gray-400 hover:text-white border border-transparent hover:border-white/10"
        aria-label="Next page"
      >
        <ChevronRight className="w-3 h-3" />
      </button>

      <button
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 text-gray-400 hover:text-white border border-transparent hover:border-white/10"
        aria-label="Last page"
      >
        <SkipForward className="w-3 h-3" />
      </button>
    </div>
  );
}

export default function EpisodeList({ episodes, slug, currentEpisode, isLoading = false }: EpisodeListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const sortedEpisodes = useMemo(() => {
    if (!episodes?.length) return [];
    return [...episodes].sort((a, b) => {
      const numA = parseFloat(String(a.episodeNumber || '0'));
      const numB = parseFloat(String(b.episodeNumber || '0'));
      if (isNaN(numA) && isNaN(numB)) return 0;
      if (isNaN(numA)) return 1;
      if (isNaN(numB)) return -1;
      return numB - numA;
    });
  }, [episodes]);

  const filteredEpisodes = useMemo(() => {
    if (!searchQuery.trim()) return sortedEpisodes;
    const query = searchQuery.toLowerCase().trim();
    return sortedEpisodes.filter((ep) => {
      const epNumber = String(ep.episodeNumber || '');
      if (epNumber.includes(query)) return true;
      if (ep.title?.toLowerCase().includes(query)) return true;
      return false;
    });
  }, [sortedEpisodes, searchQuery]);

  const totalEpisodes = episodes?.length || 0;
  const totalPages = Math.max(1, Math.ceil(filteredEpisodes.length / EPISODES_PER_PAGE));
  const showPagination = !searchQuery.trim() && filteredEpisodes.length > EPISODES_PER_PAGE;

  const currentEpisodes = useMemo(() => {
    if (searchQuery.trim() || !showPagination) return filteredEpisodes;
    const start = (currentPage - 1) * EPISODES_PER_PAGE;
    return filteredEpisodes.slice(start, start + EPISODES_PER_PAGE);
  }, [filteredEpisodes, currentPage, searchQuery, showPagination]);

  const currentEpisodePage = useMemo(() => {
    if (!currentEpisode) return 1;
    const index = sortedEpisodes.findIndex((ep) => {
      const epNum = parseFloat(String(ep.episodeNumber || '0'));
      return !isNaN(epNum) && epNum === currentEpisode;
    });
    return index >= 0 ? Math.floor(index / EPISODES_PER_PAGE) + 1 : 1;
  }, [sortedEpisodes, currentEpisode]);

  useEffect(() => {
    if (currentEpisode && !searchQuery) {
      setCurrentPage(currentEpisodePage);
    }
  }, [currentEpisode, currentEpisodePage, searchQuery]);

  useEffect(() => {
    if (gridContainerRef.current && viewMode === 'grid') {
      const activeEl = gridContainerRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentPage, viewMode]);

  const getEpisodeDisplayNumber = (episode: Episode): string => {
    const raw = String(episode.episodeNumber || '');
    const num = parseFloat(raw);
    if (!isNaN(num)) {
      return num % 1 === 0 ? String(Math.floor(num)) : num.toFixed(1);
    }
    return raw;
  };

  const isActiveEpisode = (ep: Episode): boolean => {
    if (!currentEpisode) return false;
    const epNum = parseFloat(String(ep.episodeNumber || '0'));
    return !isNaN(epNum) && epNum === currentEpisode;
  };

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const goToCurrentEpisode = useCallback(() => {
    if (currentEpisode) {
      setSearchQuery('');
      setCurrentPage(currentEpisodePage);
    }
  }, [currentEpisode, currentEpisodePage]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setCurrentPage(currentEpisode ? currentEpisodePage : 1);
  }, [currentEpisode, currentEpisodePage]);

  if (isLoading) return <EpisodeSkeleton />;

  if (!episodes?.length) {
    return (
      <div className="text-center py-10 rounded-xl bg-white/[0.01] border border-white/5 animate-in fade-in duration-500">
        <div className="text-3xl mb-3 opacity-40">📺</div>
        <p className="text-gray-400 text-sm font-medium">Belum ada episode</p>
        <p className="text-gray-600 text-xs mt-1">Episode akan segera tersedia</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-3 w-full animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white flex items-center gap-1.5 flex-shrink-0">
          <Tv className="w-3.5 h-3.5 text-gray-400" />
          Episodes
          <span className="text-[10px] font-medium text-gray-500 bg-white/5 px-1.5 py-0.5 rounded-full">
            {totalEpisodes}
          </span>
        </h3>

        <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-white/[0.02] border border-white/5 flex-shrink-0">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-all duration-200 ${
              viewMode === 'grid'
                ? 'bg-white/10 text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
            aria-label="Grid view"
          >
            <Grid3X3 className="w-3 h-3" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-all duration-200 ${
              viewMode === 'list'
                ? 'bg-white/10 text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
            aria-label="List view"
          >
            <List className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-600" />
        <input
          type="text"
          inputMode="numeric"
          placeholder="Cari episode..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full pl-8 pr-8 py-2 rounded-lg text-[11px] transition-all duration-300 focus:outline-none bg-white/[0.02] border border-white/5 text-white placeholder:text-gray-600 focus:border-white/10"
        />
        {searchQuery && (
          <button onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-white/5">
            <X className="w-3 h-3 text-gray-500" />
          </button>
        )}
      </div>

      {currentEpisode && (
        <button
          onClick={goToCurrentEpisode}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium transition-all duration-300 bg-white/[0.02] border border-white/5 text-gray-400 hover:text-white hover:border-white/10"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          Sedang: EP {currentEpisode}
        </button>
      )}

      <div className="flex items-center justify-between">
        {showPagination && (
          <EpisodeRangeSelector
            totalEpisodes={filteredEpisodes.length}
            currentPage={currentPage}
            onPageChange={handlePageChange}
          />
        )}
        <span className="text-[10px] text-gray-600 ml-auto">
          {currentEpisodes.length} eps
        </span>
      </div>

      {filteredEpisodes.length > 0 ? (
        <>
          {viewMode === 'grid' ? (
            <div
              ref={gridContainerRef}
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(auto-fill, minmax(2.4rem, 1fr))` }}
            >
              {currentEpisodes.map((episode, index) => {
                const displayNumber = getEpisodeDisplayNumber(episode);
                const isActive = isActiveEpisode(episode);
                const truncatedNumber = displayNumber.length > 4 ? displayNumber.substring(0, 4) + '…' : displayNumber;

                return (
                  <Link
                    key={episode.id || `${displayNumber}-${index}`}
                    href={`/anime/${slug}/watch/${displayNumber}`}
                    data-active={isActive}
                    title={`Episode ${displayNumber}${episode.title ? `: ${episode.title}` : ''}`}
                    className={`relative flex items-center justify-center py-2 px-0.5 rounded-md text-[10px] font-medium transition-all duration-300 hover:scale-105 active:scale-95 ${
                      isActive
                        ? 'bg-white text-black z-10 scale-105'
                        : 'text-gray-400 border border-white/5 hover:text-white hover:border-white/10 hover:bg-white/[0.02]'
                    }`}
                  >
                    <span className="truncate">{truncatedNumber}</span>
                    {isActive && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400" />
                    )}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="space-y-0.5 w-full">
              {currentEpisodes.map((episode, index) => {
                const displayNumber = getEpisodeDisplayNumber(episode);
                const isActive = isActiveEpisode(episode);

                return (
                  <Link
                    key={episode.id || `${displayNumber}-${index}`}
                    href={`/anime/${slug}/watch/${displayNumber}`}
                    title={`Episode ${displayNumber}${episode.title ? `: ${episode.title}` : ''}`}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-300 group min-w-0 ${
                      isActive
                        ? 'bg-white/10 text-white border border-white/10'
                        : 'text-gray-400 hover:text-white hover:bg-white/[0.02] border border-transparent hover:border-white/5'
                    }`}
                  >
                    <span className="flex-shrink-0 text-[11px] font-medium min-w-[2rem] text-right">
                      {displayNumber}
                    </span>
                    <span className="text-[11px] truncate flex-1 min-w-0 leading-tight text-gray-500 group-hover:text-gray-300">
                      {episode.title || `Episode ${displayNumber}`}
                    </span>
                    {isActive && (
                      <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-10 rounded-xl bg-white/[0.01] border border-white/5">
          <div className="text-3xl mb-3 opacity-40">🔍</div>
          <p className="text-gray-400 text-sm mb-3">Tidak ditemukan</p>
          <button onClick={clearSearch} className="text-xs text-gray-500 hover:text-white transition-colors">
            Reset pencarian
          </button>
        </div>
      )}

      {showPagination && totalPages > 1 && (
        <div className="flex justify-center pt-1 pb-1">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}