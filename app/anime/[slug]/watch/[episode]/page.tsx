// app/anime/[slug]/watch/[episode]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  List, 
  PanelRightClose, 
  PanelRightOpen,
} from 'lucide-react';
import VideoPlayer from '@/components/VideoPlayer';
import EpisodeList from '@/components/EpisodeList';
import type { AnimeDetail, Episode, VideoSource } from '@/types/anime';

export default function WatchPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const episode = params.episode as string;

  const [detail, setDetail] = useState<AnimeDetail | null>(null);
  const [videoSources, setVideoSources] = useState<VideoSource[]>([]);
  const [currentEpData, setCurrentEpData] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [error, setError] = useState('');

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [navbarHeight, setNavbarHeight] = useState(0);

  useEffect(() => {
    const checkScreen = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setIsDesktopCollapsed(false);
        setIsMobileOpen(false);
      }
      
      const navbar = document.querySelector('nav');
      if (navbar && navbar instanceof HTMLElement) {
        setNavbarHeight(navbar.offsetHeight);
      }
    };
    
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 320 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    if (!slug) return;

    const fetchDetail = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/anime/series/${encodeURIComponent(slug)}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Anime tidak ditemukan');
            return;
          }
          throw new Error(`Gagal memuat data anime (HTTP ${res.status})`);
        }
        const data = await res.json();
        if (data.success && data.data) {
          setDetail(data.data);
        } else {
          setError(data.error || 'Gagal memuat data detail anime');
        }
      } catch (err) {
        console.error('Detail Error:', err);
        setError('Terjadi kesalahan saat memuat detail anime');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [slug]);

  useEffect(() => {
    if (!detail || !episode) return;

    const fetchVideo = async () => {
      setLoadingVideo(true);
      setError('');
      setVideoSources([]);
      
      const matchedEp = detail.episodes.find(
        ep => parseInt(ep.episodeNumber) === parseInt(episode) || 
              ep.episodeNumber.toLowerCase() === episode.toLowerCase()
      );

      if (!matchedEp) {
        setError(`Episode ${episode} tidak ditemukan`);
        setLoadingVideo(false);
        return;
      }

      setCurrentEpData(matchedEp);

      try {
        const episodeUrl = matchedEp.url || '';
        if (!episodeUrl) {
          setError('Tautan video tidak tersedia untuk episode ini');
          return;
        }

        const res = await fetch(`/api/anime/watch?url=${encodeURIComponent(episodeUrl)}`);
        if (!res.ok) {
          throw new Error(`Gagal mengambil video (HTTP ${res.status})`);
        }
        
        const data = await res.json();
        if (data.success && data.data && data.data.videoServers) {
          setVideoSources(data.data.videoServers);
        } else {
          setError(data.error || 'Video tidak ditemukan untuk episode ini');
        }
      } catch (err) {
        console.error('Video Error:', err);
        setError('Terjadi kesalahan saat memuat pemutar video');
      } finally {
        setLoadingVideo(false);
      }
    };

    fetchVideo();
  }, [detail, episode]);

  const currentIndex = detail
    ? detail.episodes.findIndex(
        ep => parseInt(ep.episodeNumber) === parseInt(episode) || 
              ep.episodeNumber.toLowerCase() === episode.toLowerCase()
      )
    : -1;

  const prevEpisode = currentIndex > 0 ? detail?.episodes[currentIndex - 1] : null;
  const nextEpisode = detail && currentIndex !== -1 && currentIndex < detail.episodes.length - 1
    ? detail.episodes[currentIndex + 1]
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08080d]">
        <div className="p-4 lg:p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-6 bg-white/5 rounded w-48"></div>
            <div className="flex flex-col xl:flex-row gap-6">
              <div className="flex-1 max-w-5xl mx-auto w-full">
                <div className="aspect-video bg-white/5 rounded-2xl max-h-[65vh]"></div>
              </div>
              <div className="hidden xl:block w-[380px]">
                <div className="h-[600px] bg-white/[0.02] rounded-2xl"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="min-h-screen bg-[#08080d] flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-gray-500" />
          </div>
          <p className="text-gray-300 text-lg mb-6">{error}</p>
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-all duration-300 border border-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080d]">
      <div className="flex flex-col xl:flex-row">
        <div 
          className="flex-1 min-w-0 transition-all duration-300"
          style={{
            marginRight: !isMobile && !isDesktopCollapsed ? `${sidebarWidth}px` : '0',
          }}
        >
          <div className="p-4 lg:p-6 xl:pr-2">
            <div className="flex items-center justify-between mb-4 gap-4">
              <Link
                href={`/anime/${slug}`}
                className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm group flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                <span className="hidden sm:inline">Kembali ke Detail</span>
                <span className="sm:hidden">Kembali</span>
              </Link>

              <div className="flex items-center gap-2">
                {!isMobile && (
                  <button
                    onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
                    className="hidden xl:flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-all duration-300 bg-white/[0.02] border border-white/5 hover:border-white/10"
                  >
                    {isDesktopCollapsed ? (
                      <>
                        <PanelRightOpen className="w-4 h-4" />
                        <span className="hidden lg:inline">Show Episodes</span>
                      </>
                    ) : (
                      <>
                        <PanelRightClose className="w-4 h-4" />
                        <span className="hidden lg:inline">Hide Episodes</span>
                      </>
                    )}
                  </button>
                )}

                {isMobile && (
                  <button
                    onClick={() => setIsMobileOpen(true)}
                    className="xl:hidden flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 bg-white/[0.02] border border-white/5 text-gray-400 hover:text-white hover:border-white/10"
                  >
                    <List className="w-4 h-4" />
                    <span>Episodes</span>
                    {detail && (
                      <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-white/5 text-gray-500">
                        {detail.episodes.length}
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="max-w-5xl mx-auto space-y-6 pb-8">
              {loadingVideo ? (
                <div className="aspect-video bg-black rounded-2xl flex items-center justify-center border border-white/5 max-h-[65vh]">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative w-10 h-10">
                      <div className="absolute inset-0 rounded-full border-2 border-white/10"></div>
                      <div className="absolute inset-0 rounded-full border-2 border-t-white/30 animate-spin"></div>
                    </div>
                    <span className="text-gray-500 text-sm">Menyiapkan pemutar video...</span>
                  </div>
                </div>
              ) : error ? (
                <div className="aspect-video bg-black rounded-2xl flex items-center justify-center border border-white/5 max-h-[65vh]">
                  <div className="text-center p-8">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                      <X className="w-8 h-8 text-gray-500" />
                    </div>
                    <p className="text-gray-300 text-lg mb-6">{error}</p>
                    <div className="flex items-center gap-3 justify-center flex-wrap">
                      <button
                        onClick={() => router.refresh()}
                        className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-all duration-300 border border-white/10 inline-flex items-center gap-2"
                      >
                        Coba Lagi
                      </button>
                      {detail && prevEpisode && (
                        <Link
                          href={`/anime/${slug}/watch/${prevEpisode.episodeNumber}`}
                          className="px-5 py-2.5 rounded-xl bg-white/[0.02] hover:bg-white/5 text-gray-400 hover:text-white text-sm font-medium transition-all duration-300 border border-white/5 hover:border-white/10 inline-flex items-center gap-2"
                        >
                          Episode Sebelumnya
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-h-[70vh]">
                  <VideoPlayer
                    sources={videoSources}
                    title={detail?.title || ''}
                    episode={parseInt(episode) || 0}
                  />
                </div>
              )}

              {detail && !error && (
                <div className="flex items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl bg-white/[0.01] border border-white/5 animate-in fade-in duration-500">
                  {prevEpisode ? (
                    <Link
                      href={`/anime/${slug}/watch/${prevEpisode.episodeNumber}`}
                      className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 bg-white/[0.02] border border-white/5 text-gray-400 hover:text-white hover:border-white/10 group flex-shrink-0"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:-translate-x-1" />
                      <span className="hidden sm:inline">EP {prevEpisode.episodeNumber}</span>
                      <span className="sm:hidden">Prev</span>
                    </Link>
                  ) : (
                    <div className="w-16 sm:w-24"></div>
                  )}

                  <div className="text-center min-w-0 px-2">
                    <span className="text-xs sm:text-sm font-semibold text-white block truncate">
                      Episode {episode}
                    </span>
                    {currentEpData?.title && (
                      <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 hidden sm:block truncate max-w-[200px]">
                        {currentEpData.title}
                      </p>
                    )}
                  </div>

                  {nextEpisode ? (
                    <Link
                      href={`/anime/${slug}/watch/${nextEpisode.episodeNumber}`}
                      className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 bg-white/[0.02] border border-white/5 text-gray-400 hover:text-white hover:border-white/10 group flex-shrink-0"
                    >
                      <span className="hidden sm:inline">EP {nextEpisode.episodeNumber}</span>
                      <span className="sm:hidden">Next</span>
                      <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  ) : (
                    <div className="w-16 sm:w-24"></div>
                  )}
                </div>
              )}

              {detail && (
                <div className="rounded-2xl p-4 sm:p-6 bg-white/[0.01] border border-white/5 animate-in fade-in duration-500" style={{ animationDelay: '100ms' }}>
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-bold mb-3 text-white break-words">
                    {detail.title}
                  </h1>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4">
                    <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${
                      detail.status === 'Completed' 
                        ? 'bg-white/5 text-gray-300 border border-white/5' 
                        : 'bg-white/5 text-gray-300 border border-white/5'
                    }`}>
                      {detail.status === 'Completed' ? 'Completed' : 'Ongoing'}
                    </span>
                    {detail.genre?.map((g, i) => (
                      <span 
                        key={i} 
                        className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-white/[0.02] text-gray-400 border border-white/5"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                  <div className="text-gray-500 text-xs sm:text-sm leading-relaxed">
                    <p className="line-clamp-4 sm:line-clamp-6 lg:line-clamp-none break-words">
                      {detail.synopsis}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {!isMobile && !isDesktopCollapsed && (
          <div
            className="hidden xl:block fixed z-20"
            style={{ 
              width: `${sidebarWidth}px`,
              top: `${navbarHeight}px`,
              bottom: '0',
              right: '0',
            }}
          >
            <div
              onMouseDown={handleResizeStart}
              className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize group z-10"
            >
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-16 -translate-x-1/2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-1 h-10 rounded-full bg-white/20 group-hover:bg-white/30 transition-colors"></div>
              </div>
            </div>

            <div className="h-full flex flex-col bg-[#0a0a0f] border-l border-white/5">
              <div className="flex-shrink-0 p-3 sm:p-4 border-b border-white/5 bg-[#0a0a0f]">
                <div className="flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <List className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                    Episodes
                    <span className="text-xs sm:text-sm font-normal text-gray-500">
                      ({detail?.episodes.length})
                    </span>
                  </h2>
                  <button
                    onClick={() => setIsDesktopCollapsed(true)}
                    className="p-1.5 sm:p-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar overscroll-contain">
                <div className="p-2 sm:p-3">
                  {detail && (
                    <EpisodeList
                      episodes={detail.episodes}
                      slug={slug}
                      currentEpisode={parseInt(episode) || 0}
                    />
                  )}
                </div>
                <div className="h-20" />
              </div>
            </div>
          </div>
        )}

        {isMobile && (
          <>
            {isMobileOpen && (
              <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] animate-in fade-in duration-300"
                onClick={() => setIsMobileOpen(false)}
              />
            )}

            <div
              className={`fixed right-0 z-[60] w-[85vw] max-w-md bg-[#0a0a0f] border-l border-white/5 shadow-2xl transition-transform duration-300 flex flex-col ${
                isMobileOpen ? 'translate-x-0' : 'translate-x-full'
              }`}
              style={{
                top: '0',
                bottom: '0',
              }}
            >
              <div className="flex-shrink-0 p-4 border-b border-white/5 bg-[#0a0a0f]">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <List className="w-5 h-5 text-gray-400" />
                    Episodes
                    <span className="text-sm font-normal text-gray-500">
                      ({detail?.episodes.length})
                    </span>
                  </h2>
                  <button
                    onClick={() => setIsMobileOpen(false)}
                    className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className="p-3">
                  {detail && (
                    <EpisodeList
                      episodes={detail.episodes}
                      slug={slug}
                      currentEpisode={parseInt(episode) || 0}
                    />
                  )}
                </div>
                <div className="h-24 safe-bottom" />
              </div>
            </div>
          </>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.12);
        }

        .line-clamp-4 {
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .line-clamp-6 {
          display: -webkit-box;
          -webkit-line-clamp: 6;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        @media (min-width: 1024px) {
          .lg\\:line-clamp-none {
            display: block;
            -webkit-line-clamp: unset;
            overflow: visible;
          }
        }

        .overscroll-contain {
          overscroll-behavior: contain;
        }
      `}</style>
    </div>
  );
}