// components/AnimeCard.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useCallback } from 'react';
import type { AnimeSearchResult } from '@/types/anime';

interface AnimeCardProps {
  anime: AnimeSearchResult;
  rank?: number;
  variant?: 'default' | 'wide';
  priority?: boolean;
  size?: 'small' | 'medium' | 'large';
}

function normaliseImageUrl(raw: string | undefined | null): string {
  if (!raw || raw === '/placeholder.jpg') return '';
  let url = raw.trim();
  if (url.startsWith('//')) url = 'https:' + url;
  if (url.startsWith('/') && !url.startsWith('//')) return '';
  if (!url.startsWith('http')) return '';
  return url;
}

function getRankStyle(r: number): string {
  if (r === 1) return 'bg-white text-black font-bold';
  if (r === 2) return 'bg-white/10 text-white font-semibold';
  if (r === 3) return 'bg-white/5 text-gray-300 font-medium';
  return '';
}

function PlaceholderImage({ title }: { title: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-white/[0.02] p-2">
      <span className="text-base sm:text-lg md:text-xl mb-1 opacity-40">🎬</span>
      <span className="text-gray-600 text-[8px] sm:text-[9px] md:text-[10px] text-center line-clamp-2 px-1 leading-tight">
        {title}
      </span>
    </div>
  );
}

function RankBadge({ rank, size }: { rank: number; size?: string }) {
  const sizeClasses = size === 'small' 
    ? 'top-0.5 left-0.5 sm:top-1 sm:left-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded text-[6px] sm:text-[7px]' 
    : 'top-1.5 left-1.5 sm:top-2 sm:left-2 w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded sm:rounded-md text-[9px] sm:text-[10px] md:text-[11px]';

  return (
    <div
      className={`absolute ${sizeClasses} flex items-center justify-center z-10 backdrop-blur-md ${
        rank <= 3 ? getRankStyle(rank) : 'bg-black/60 text-gray-400 border border-white/5'
      }`}
    >
      {rank}
    </div>
  );
}

function EpisodeBadge({ episode, isOngoing, size }: { episode: string; isOngoing: boolean; size?: string }) {
  const isSmall = size === 'small';
  if (isOngoing) {
    return (
      <div className={`absolute top-1 right-1 sm:top-2 sm:right-2 ${isSmall ? 'px-1 py-0.5' : 'px-1.5 py-0.5'} rounded text-[7px] sm:text-[10px] md:text-[11px] font-medium z-10 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 backdrop-blur-md`}>
        <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-emerald-400 rounded-full"></span>
        {isSmall ? 'ON' : 'Ongoing'}
      </div>
    );
  }

  if (episode && episode !== 'N/A') {
    return (
      <div className={`absolute top-1 right-1 sm:top-2 sm:right-2 ${isSmall ? 'px-1 py-0.5' : 'px-1.5 py-0.5'} rounded text-[7px] sm:text-[10px] md:text-[11px] font-medium z-10 bg-black/60 border border-white/5 text-gray-300 backdrop-blur-md`}>
        {isSmall ? `EP${episode}` : `EP ${episode}`}
      </div>
    );
  }

  return null;
}

function PlayOverlay({ isHovered, size }: { isHovered: boolean; size?: string }) {
  const isSmall = size === 'small';
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
      style={{
        background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 60%, rgba(0,0,0,0) 100%)',
        opacity: isHovered ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
    >
      <div
        className={`${isSmall ? 'w-5 h-5 sm:w-8 sm:h-8' : 'w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10'} rounded-full flex items-center justify-center ${isSmall ? '' : 'mb-1.5'}`}
        style={{
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          transform: isHovered ? 'scale(1)' : 'scale(0.7)',
          transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <span className={`text-white ${isSmall ? 'text-[9px] sm:text-sm ml-0.5' : 'text-sm sm:text-base md:text-lg ml-0.5'}`}>▶</span>
      </div>
      {!isSmall && <span className="text-white text-[9px] sm:text-[10px] md:text-xs font-medium tracking-wide hidden sm:block">Tonton</span>}
    </div>
  );
}

export default function AnimeCard({ anime, rank, variant = 'default', priority = false, size = 'medium' }: AnimeCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  if (!anime || !anime.title || anime.title.length < 2) return null;

  const imageUrl = normaliseImageUrl(anime.image);
  const hasImage = !!imageUrl && !imageError;

  const isOngoing =
    anime.latestEpisode === 'Ongoing' ||
    anime.latestEpisode?.toLowerCase().includes('ongoing') ||
    anime.latestEpisode === 'Trending';

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);
  const handleTouchStart = useCallback(() => setIsHovered(true), []);
  const handleTouchEnd = useCallback(() => setTimeout(() => setIsHovered(false), 300), []);
  const handleImageError = useCallback(() => setImageError(true), []);

  const sizes = {
    small: {
      imageSize: '(max-width: 400px) 45vw, (max-width: 640px) 30vw, (max-width: 768px) 20vw, (max-width: 1024px) 14vw, 10vw',
      titleSize: 'text-[11px] sm:text-[12px] md:text-[13px]',
      titleMt: 'mt-1 sm:mt-1.5',
      badge: 'small',
    },
    medium: {
      imageSize: '(max-width: 480px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw',
      titleSize: 'text-[13px] sm:text-sm md:text-base',
      titleMt: 'mt-1.5 sm:mt-2 md:mt-2.5',
      badge: 'medium',
    },
    large: {
      imageSize: '(max-width: 480px) 100vw, (max-width: 768px) 50vw, 33vw',
      titleSize: 'text-base sm:text-lg',
      titleMt: 'mt-2 sm:mt-2.5 md:mt-3',
      badge: 'large',
    },
  };

  const currentSize = sizes[size];

  if (variant === 'wide') {
    return (
      <Link href={`/anime/${anime.slug}`} className="block">
        <div
          className="flex gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg sm:rounded-xl bg-white/[0.01] border border-white/5 cursor-pointer transition-all duration-300 hover:bg-white/[0.03] hover:border-white/10"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="relative w-10 sm:w-12 md:w-14 flex-shrink-0 rounded-lg overflow-hidden bg-white/5" style={{ aspectRatio: '2/3' }}>
            {hasImage ? (
              <Image
                src={imageUrl}
                alt={anime.title}
                fill
                className={`object-cover transition-transform duration-500 ${isHovered ? 'scale-110' : 'scale-100'}`}
                sizes="56px"
                onError={handleImageError}
                loading="lazy"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-white/[0.02]">
                <span className="text-sm opacity-30">🎬</span>
              </div>
            )}
            {rank && rank <= 3 && (
              <div className={`absolute top-1 left-1 w-3 h-3 sm:w-4 sm:h-4 rounded flex items-center justify-center text-[7px] sm:text-[9px] font-bold ${getRankStyle(rank)}`}>
                {rank}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h3
              className={`text-xs sm:text-sm font-medium line-clamp-2 leading-snug transition-colors duration-200 ${
                isHovered ? 'text-white' : 'text-gray-300'
              }`}
            >
              {anime.title}
            </h3>
            {anime.latestEpisode && anime.latestEpisode !== 'N/A' && (
              <span className="text-xs mt-1">
                {isOngoing ? (
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block"></span>
                    Ongoing
                  </span>
                ) : (
                  <span className="text-gray-500">EP {anime.latestEpisode}</span>
                )}
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/anime/${anime.slug}`} className="block group">
      <div
        className="cursor-pointer"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="relative overflow-hidden bg-white/[0.02]"
          style={{
            aspectRatio: '2/3',
            borderRadius: size === 'small' ? '0.375rem' : '0.75rem',
            boxShadow: isHovered
              ? '0 16px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)'
              : '0 2px 8px rgba(0, 0, 0, 0.2)',
            transform: isHovered ? 'scale(1.03) translateY(-3px)' : 'scale(1) translateY(0)',
            transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {hasImage ? (
            <Image
              src={imageUrl}
              alt={anime.title}
              fill
              className={`object-cover transition-transform duration-500 ${isHovered ? 'scale-110' : 'scale-100'}`}
              sizes={currentSize.imageSize}
              onError={handleImageError}
              loading={priority ? 'eager' : 'lazy'}
              priority={priority}
              unoptimized
            />
          ) : (
            <PlaceholderImage title={anime.title} />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

          <PlayOverlay isHovered={isHovered} size={size} />

          {rank !== undefined && <RankBadge rank={rank} size={currentSize.badge} />}

          <EpisodeBadge episode={anime.latestEpisode || ''} isOngoing={isOngoing} size={size} />
        </div>

        <div className={`${currentSize.titleMt} px-0.5`}>
          <h3
            className={`font-medium ${currentSize.titleSize} leading-snug line-clamp-2 transition-colors duration-200 ${
              isHovered ? 'text-white' : 'text-gray-300'
            }`}
          >
            {anime.title}
          </h3>
        </div>
      </div>
    </Link>
  );
}