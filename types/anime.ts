// types/anime.ts

export interface AnimeSearchResult {
  title: string;
  slug: string;
  image: string;
  latestEpisode: string;
  // Tambahan untuk kompatibilitas
  rating?: string;
  status?: string;
  episode?: string;
}

export interface AnimeDetail {
  title: string;
  image: string;
  synopsis: string;
  status: string;
  genre: string[];
  episodes: Episode[];
}

export interface Episode {
  id: number;
  title: string;
  slug: string;
  episodeNumber: string;
  url?: string;
}

export interface VideoSource {
  server: string;
  url: string;
  quality?: string;
}

export interface WatchResponse {
  success: boolean;
  data: {
    title: string;
    episode: number;
    videoServers: VideoSource[];
    downloadLinks?: VideoSource[];
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  total?: number;
  hasMore?: boolean;
  currentPage?: number;
}

// Schedule types
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