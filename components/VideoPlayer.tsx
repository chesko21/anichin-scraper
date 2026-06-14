// components/VideoPlayer.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Server, 
  AlertCircle, 
  Play, 
  RotateCcw, 
  ChevronDown,
} from 'lucide-react';
import type { VideoSource } from '@/types/anime';

interface VideoPlayerProps {
  sources: VideoSource[];
  title: string;
  episode: number;
}

function getServerBadge(serverName: string): { text: string } | null {
  const lower = serverName.toLowerCase();
  if (lower.includes('hd') || lower.includes('high')) return { text: 'HD' };
  if (lower.includes('4k')) return { text: '4K' };
  return null;
}

export default function VideoPlayer({ sources, title, episode }: VideoPlayerProps) {
  const [selectedServer, setSelectedServer] = useState<VideoSource | null>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showServerList, setShowServerList] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const serverBadge = selectedServer ? getServerBadge(selectedServer.server) : null;

  useEffect(() => {
    if (sources.length > 0 && !selectedServer) {
      const preferredServer = sources.find(s => 
        s.server.toLowerCase().includes('utama') || 
        s.server.toLowerCase().includes('hd') ||
        s.server.toLowerCase().includes('main')
      );
      setSelectedServer(preferredServer || sources[0]);
    }
  }, [sources, selectedServer]);

  useEffect(() => {
    setIframeKey(prev => prev + 1);
    setError(false);
    setIsLoading(true);
    setRetryCount(0);

    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }

    loadTimeoutRef.current = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [selectedServer]);

  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    setError(false);
    setIsLoading(true);
    setIframeKey(prev => prev + 1);

    if (retryCount >= 2 && sources.length > 1) {
      const currentIndex = sources.findIndex(s => s.server === selectedServer?.server);
      const nextIndex = (currentIndex + 1) % sources.length;
      setSelectedServer(sources[nextIndex]);
    }
  }, [retryCount, sources, selectedServer]);

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
    setError(false);
  }, []);

  const handleIframeError = useCallback(() => {
    setError(true);
    setIsLoading(false);
  }, []);

  if (!selectedServer || sources.length === 0) {
    return (
      <div className="w-full rounded-xl p-8 text-center bg-white/[0.01] border border-white/5 animate-in fade-in duration-500">
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-5 h-5 text-gray-500" />
        </div>
        <p className="text-gray-400 text-sm font-medium">Tidak ada sumber video tersedia</p>
        <p className="text-gray-600 text-xs mt-1.5">Coba episode lain atau cek kembali nanti</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full overflow-hidden animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-sm flex-shrink-0 opacity-60">🎬</span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-medium truncate text-white">
              {title}
            </h2>
            <p className="text-[11px] text-gray-500">Episode {episode}</p>
          </div>
        </div>
      </div>

      <div className="w-full">
        <button
          onClick={() => sources.length > 1 && setShowServerList(!showServerList)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg transition-all duration-300 bg-white/[0.02] border border-white/5 hover:border-white/10 group"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Server className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
            <div className="min-w-0 flex-1 text-left">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white truncate">
                  {selectedServer.server}
                </span>
                {serverBadge && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/5 text-gray-400 border border-white/5 flex-shrink-0">
                    {serverBadge.text}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {sources.length > 1 && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-[10px] text-gray-600 group-hover:text-gray-400 transition-colors">
                {sources.length}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-500 group-hover:text-gray-300 transition-transform duration-300 ${showServerList ? 'rotate-180' : ''}`} />
            </div>
          )}
        </button>

        {showServerList && sources.length > 1 && (
          <div className="mt-1.5 rounded-lg overflow-hidden bg-[#0f0f14] border border-white/5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 w-full">
            <div className="p-2">
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                {sources.map((source, idx) => {
                  const badge = getServerBadge(source.server);
                  const isSelected = selectedServer?.server === source.server;

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedServer(source);
                        setShowServerList(false);
                      }}
                      className={`flex flex-col items-center justify-center gap-1 p-2 rounded-md text-center transition-all duration-200 ${
                        isSelected
                          ? 'bg-white/10 border border-white/10'
                          : 'bg-white/[0.02] border border-white/5 hover:bg-white/5 hover:border-white/10'
                      }`}
                    >
                      <span className={`text-xs font-medium truncate w-full ${
                        isSelected ? 'text-white' : 'text-gray-400'
                      }`}>
                        {source.server}
                      </span>
                      
                      {badge && (
                        <span className="text-[9px] px-1 py-0.5 rounded font-medium bg-white/5 text-gray-500 border border-white/5">
                          {badge.text}
                        </span>
                      )}
                      
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-emerald-400' : 'bg-white/10'
                      }`}></span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="w-full">
        <div 
          className="relative bg-black rounded-lg overflow-hidden w-full"
          style={{
            aspectRatio: '16/9',
            maxHeight: '60vh',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.05)',
          }}
        >
          {isLoading && !error && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/95 animate-in fade-in duration-300">
              <div className="text-center">
                <div className="relative w-8 h-8 mx-auto mb-3">
                  <div className="absolute inset-0 rounded-full border-2 border-t-transparent animate-spin border-white/20"></div>
                  <Play className="w-3 h-3 text-white/50 absolute inset-0 m-auto" />
                </div>
                <p className="text-gray-500 text-xs">Memuat video...</p>
              </div>
            </div>
          )}

          {!error ? (
            <iframe
              ref={iframeRef}
              key={iframeKey}
              src={selectedServer.url}
              className="absolute inset-0 w-full h-full border-0"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              title={`${title} - Episode ${episode}`}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-black/95 animate-in fade-in duration-300">
              <div className="text-center max-w-xs px-4">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="w-5 h-5 text-gray-500" />
                </div>
                <p className="text-gray-300 font-medium text-sm mb-1.5">Gagal memuat video</p>
                <p className="text-gray-600 text-xs mb-4">
                  {retryCount >= 2 ? 'Server mungkin bermasalah.' : 'Terjadi kesalahan memuat video.'}
                </p>
                <div className="flex items-center gap-2 justify-center flex-wrap">
                  <button onClick={handleRetry} className="px-4 py-2 rounded-lg text-xs font-medium transition-all duration-300 bg-white/5 hover:bg-white/10 text-white border border-white/10 inline-flex items-center gap-2">
                    <RotateCcw className="w-3 h-3" />
                    Coba Lagi
                  </button>
                  {sources.length > 1 && (
                    <button onClick={() => setShowServerList(true)} className="px-4 py-2 rounded-lg text-xs font-medium transition-all duration-300 bg-white/[0.02] hover:bg-white/5 text-gray-400 hover:text-white border border-white/5 hover:border-white/10 inline-flex items-center gap-2">
                      <Server className="w-3 h-3" />
                      Ganti Server
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg p-3 flex items-start gap-2 w-full bg-white/[0.01] border border-white/5">
        <span className="text-xs flex-shrink-0 mt-0.5 opacity-60">💡</span>
        <p className="text-[11px] text-gray-500 leading-relaxed">
          <span className="font-medium text-gray-400">Tips:</span> Ganti server jika buffering. Gunakan server HD untuk kualitas terbaik.
        </p>
      </div>
    </div>
  );
}