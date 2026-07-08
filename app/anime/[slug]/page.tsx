// app/anime/[slug]/page.tsx
'use client';

import { useParams, notFound, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import EpisodeList from '@/components/EpisodeList';
import type { AnimeDetail } from '@/types/anime';

export default function AnimeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawSlug = params.slug as string;
  
  const [anime, setAnime] = useState<AnimeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnimeDetail = async () => {
      if (!rawSlug) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Encode the slug properly
        const encodedSlug = encodeURIComponent(rawSlug);
        const url = `/api/anime/series/${encodedSlug}`;
        
        console.log(`[AnimeDetail] Fetching: ${url}`);
        console.log(`[AnimeDetail] Raw slug: ${rawSlug}`);
        console.log(`[AnimeDetail] Encoded slug: ${encodedSlug}`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        
        console.log(`[AnimeDetail] Response status: ${response.status}`);
        console.log(`[AnimeDetail] Response ok: ${response.ok}`);
        
        // Try to parse JSON
        let data: any;
        try {
          const text = await response.text();
          console.log(`[AnimeDetail] Raw response text: ${text.substring(0, 200)}`);
          data = JSON.parse(text);
        } catch (parseError) {
          console.error('[AnimeDetail] Failed to parse response:', parseError);
          setError('Invalid response from server');
          return;
        }
        
        console.log('[AnimeDetail] Parsed data:', data);
        
        if (response.status === 404) {
          console.log('[AnimeDetail] Not found, calling notFound()');
          notFound();
          return;
        }
        
        if (!response.ok) {
          console.error('[AnimeDetail] API error response:', data);
          setError(data?.error || `Server error (${response.status})`);
          return;
        }
        
        if (data?.success && data?.data) {
          console.log('[AnimeDetail] Successfully loaded anime details');
          setAnime(data.data);
        } else {
          console.error('[AnimeDetail] Unexpected response format:', data);
          setError(data?.error || 'No data received from server');
        }
      } catch (err: any) {
        console.error('[AnimeDetail] Network/fetch error:', err);
        setError(err.message || 'Failed to fetch anime details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnimeDetail();
  }, [rawSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08080d] pt-20">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="w-full md:w-1/3 lg:w-1/4">
                <div className="bg-white/5 rounded-2xl aspect-[2/3]"></div>
              </div>
              <div className="flex-1 space-y-4">
                <div className="h-8 bg-white/5 rounded-lg w-3/4"></div>
                <div className="h-4 bg-white/5 rounded-lg w-1/2"></div>
                <div className="flex gap-2">
                  <div className="h-6 bg-white/5 rounded-full w-20"></div>
                  <div className="h-6 bg-white/5 rounded-full w-16"></div>
                  <div className="h-6 bg-white/5 rounded-full w-24"></div>
                </div>
                <div className="h-24 bg-white/5 rounded-xl"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !anime) {
    return (
      <div className="min-h-screen bg-[#08080d] pt-20 flex items-center justify-center">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-12 text-center">
          <div className="max-w-md mx-auto rounded-2xl bg-white/[0.01] border border-white/5 p-8">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl opacity-60">⚠</span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
            <p className="text-gray-500 text-sm mb-6">{error || 'Anime tidak ditemukan'}</p>
            <div className="flex flex-col gap-2">
              <Link 
                href="/" 
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-all duration-300 border border-white/10"
              >
                Kembali ke Beranda
              </Link>
              <button
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  window.location.reload();
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.02] hover:bg-white/5 text-gray-400 hover:text-white text-sm font-medium transition-all duration-300 border border-white/5"
              >
                Coba Lagi
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080d] pt-20">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 mb-8">
          <div className="w-full max-w-[220px] lg:max-w-[200px] xl:max-w-[220px] mx-auto lg:mx-0">
            <div className="sticky top-24">
              <div className="relative rounded-xl overflow-hidden aspect-[2/3] bg-white/[0.02] border border-white/5 shadow-lg shadow-black/20">
                {anime.image && anime.image !== '/placeholder.jpg' ? (
                  <Image
                    src={anime.image}
                    alt={anime.title}
                    fill
                    className="object-cover"
                    sizes="220px"
                    unoptimized={true}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white/[0.02]">
                    <span className="text-gray-600 text-sm">No Image</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 text-white tracking-tight">
              {anime.title}
            </h1>
            
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-gray-300 border border-white/5">
                {anime.status === 'Completed' ? 'Completed' : 'Ongoing'}
              </span>
              {anime.genre?.map((g, idx) => (
                <span key={idx} className="px-3 py-1 rounded-full text-xs bg-white/[0.02] text-gray-400 border border-white/5">
                  {g}
                </span>
              ))}
            </div>
            
            <div className="mb-6">
              <h3 className="text-base font-semibold text-white mb-3">Sinopsis</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{anime.synopsis}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              {anime.episodes?.length > 0 && (
                <Link
                  href={`/anime/${rawSlug}/watch/${anime.episodes[0].episodeNumber}`}
                  className="px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 bg-white text-black hover:bg-gray-200 inline-flex items-center gap-2"
                >
                  Mulai Nonton
                </Link>
              )}
              {anime.episodes?.length > 1 && (
                <Link
                  href={`/anime/${rawSlug}/watch/${anime.episodes[anime.episodes.length - 1].episodeNumber}`}
                  className="px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 inline-flex items-center gap-2"
                >
                  Episode Terbaru
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 my-8"></div>

        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-6 flex items-center gap-2">
            Daftar Episode
            <span className="text-sm font-normal text-gray-500">
              ({anime.episodes?.length || 0})
            </span>
          </h2>
          
          {anime.episodes?.length > 0 ? (
            <EpisodeList episodes={anime.episodes} slug={rawSlug} />
          ) : (
            <div className="text-center py-16 rounded-2xl bg-white/[0.01] border border-white/5">
              <div className="text-4xl mb-4 opacity-40">📺</div>
              <p className="text-gray-400 text-sm">Belum ada episode tersedia</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}