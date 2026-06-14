// app/schedule/page.tsx
'use client';

import { useState, useEffect } from 'react';
import AnimeCard from '@/components/AnimeCard';
import type { ScheduleItem, ScheduleResponse } from '@/lib/anichin';

interface ScheduleAnime extends ScheduleItem {
  status?: string;
}

const DAYS = [
  { key: 'all', label: 'Semua', icon: '📋' },
  { key: 'monday', label: 'Sen', icon: '📅' },
  { key: 'tuesday', label: 'Sel', icon: '📅' },
  { key: 'wednesday', label: 'Rab', icon: '📅' },
  { key: 'thursday', label: 'Kam', icon: '📅' },
  { key: 'friday', label: 'Jum', icon: '📅' },
  { key: 'saturday', label: 'Sab', icon: '📅' },
  { key: 'sunday', label: 'Min', icon: '📅' },
];

const DAY_NAMES: Record<string, string> = {
  monday: 'Senin',
  tuesday: 'Selasa',
  wednesday: 'Rabu',
  thursday: 'Kamis',
  friday: 'Jumat',
  saturday: 'Sabtu',
  sunday: 'Minggu',
};

function getToday(): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
}

function SkeletonLoader() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-10 bg-white/5 rounded-xl w-64 mb-4" />
      <div className="flex gap-2 mb-8 overflow-x-auto">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-10 bg-white/5 rounded-xl w-16 flex-shrink-0" />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="rounded-xl bg-white/[0.01] border border-white/5 p-3">
            <div className="aspect-[2/3] bg-white/5 rounded-lg mb-3" />
            <div className="h-3.5 bg-white/5 rounded-lg w-3/4 mb-2" />
            <div className="h-3 bg-white/5 rounded-lg w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ activeDay, dayName }: { activeDay: string; dayName: string }) {
  return (
    <div className="text-center py-20">
      <div className="text-5xl mb-5 opacity-60">{activeDay === 'all' ? '📭' : '📺'}</div>
      <h3 className="text-xl font-semibold text-white mb-2">
        {activeDay === 'all' ? 'Belum Ada Jadwal' : `Tidak Ada Jadwal Hari ${dayName}`}
      </h3>
      <p className="text-gray-500 text-sm mb-8 max-w-md mx-auto leading-relaxed">
        {activeDay === 'all'
          ? 'Jadwal rilis akan segera diperbarui. Silakan cek kembali nanti.'
          : 'Belum ada donghua yang dijadwalkan rilis di hari ini. Cek hari lainnya.'}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 bg-white/5 hover:bg-white/10 text-white border border-white/10"
      >
        Refresh Jadwal
      </button>
    </div>
  );
}

function AnimeInfo({ anime }: { anime: ScheduleAnime }) {
  if (!anime.currentEpisode) return null;

  return (
    <div className="mt-2 flex items-center gap-2 px-0.5">
      <span className="text-[11px] text-gray-500">{anime.currentEpisode}</span>
      {anime.releaseTime && (
        <>
          <span className="text-gray-700">·</span>
          <span className="text-[11px] text-gray-600">{anime.releaseTime}</span>
        </>
      )}
      {anime.countdown && (
        <span className="text-[11px] text-emerald-400 ml-auto">{anime.countdown}</span>
      )}
    </div>
  );
}

export default function SchedulePage() {
  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState('all');
  const today = getToday();

  useEffect(() => {
    const fetchSchedule = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/anime/schedule');
        const json = await res.json();
        if (json.success && json.data) {
          setSchedule(json.data);
        }
      } catch (err) {
        console.error('Failed to fetch schedule:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, []);

  const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const allItems: ScheduleAnime[] = schedule
    ? dayKeys.flatMap((day) => (schedule as any)[day]?.map((item: ScheduleItem) => ({ ...item, status: 'ongoing' })) || [])
    : [];

  const filteredItems =
    activeDay === 'all' ? allItems : allItems.filter((item) => item.releaseDay === activeDay);

  const groupedByDay =
    activeDay === 'all'
      ? dayKeys.reduce(
          (acc, day) => {
            const items = (schedule as any)?.[day] || [];
            if (items.length > 0) acc[day] = items.map((i: ScheduleItem) => ({ ...i, status: 'ongoing' }));
            return acc;
          },
          {} as Record<string, ScheduleAnime[]>
        )
      : null;

  const todayCount = allItems.filter((i) => i.releaseDay === today).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08080d] pt-20 pb-16">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <SkeletonLoader />
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
                  <span className="text-xl">📅</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Jadwal Rilis
                </h1>
              </div>
              <p className="text-gray-500 text-sm ml-0.5">
                Pantau jadwal tayang donghua favoritmu setiap minggu
              </p>
            </div>
            {todayCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/5 text-sm text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                {todayCount} tayang hari ini
              </div>
            )}
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-2 hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            {DAYS.map((day) => {
              const isActive = activeDay === day.key;
              const isToday = day.key === today;
              const count =
                day.key === 'all'
                  ? allItems.length
                  : allItems.filter((a) => a.releaseDay === day.key).length;

              return (
                <button
                  key={day.key}
                  onClick={() => setActiveDay(day.key)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 relative ${
                    isActive
                      ? 'bg-white text-black'
                      : 'bg-white/[0.02] border border-white/5 text-gray-400 hover:text-white hover:border-white/10'
                  }`}
                >
                  <span className="text-sm">{day.icon}</span>
                  <span className="hidden sm:inline">{day.label}</span>
                  {count > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive ? 'bg-black/10 text-black' : 'bg-white/5 text-gray-500'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                  {isToday && day.key !== 'all' && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <EmptyState activeDay={activeDay} dayName={DAY_NAMES[activeDay] || ''} />
        ) : groupedByDay && activeDay === 'all' ? (
          <div className="space-y-10 sm:space-y-12">
            {Object.entries(groupedByDay).map(([day, items]) => (
              <div key={day}>
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-sm ${
                      day === today
                        ? 'bg-white/10 border border-white/10'
                        : 'bg-white/[0.02] border border-white/5'
                    }`}
                  >
                    {DAYS.find((d) => d.key === day)?.icon || '📅'}
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
                      {DAY_NAMES[day]}
                      {day === today && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Hari Ini
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-gray-500">{items.length} donghua</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                  {items.map((anime, index) => (
                    <div
                      key={anime.slug}
                      className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                      style={{ animationDelay: `${Math.min(index * 30, 400)}ms` }}
                    >
                      <AnimeCard
                        anime={{
                          title: anime.title,
                          slug: anime.slug,
                          image: anime.image,
                          latestEpisode: anime.currentEpisode || '',
                        }}
                        size="small"
                        priority={index < 10}
                      />
                      <AnimeInfo anime={anime} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {filteredItems.map((anime, index) => (
              <div
                key={anime.slug}
                className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${Math.min(index * 30, 400)}ms` }}
              >
                <AnimeCard
                  anime={{
                    title: anime.title,
                    slug: anime.slug,
                    image: anime.image,
                    latestEpisode: anime.currentEpisode || '',
                  }}
                  size="small"
                  priority={index < 10}
                />
                {anime.currentEpisode && (
                  <div className="mt-2 space-y-1 px-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-500">{anime.currentEpisode}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-600">{anime.releaseTime || 'TBD'}</span>
                      {anime.countdown && (
                        <span className="text-[11px] text-emerald-400">{anime.countdown}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 sm:mt-16 p-5 sm:p-6 rounded-2xl bg-white/[0.01] border border-white/5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="p-2 rounded-xl bg-white/5 border border-white/5">
              <span className="text-lg">ℹ️</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-white mb-1.5">Informasi Jadwal</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Jadwal rilis dapat berubah sewaktu-waktu. Waktu yang tercantum adalah perkiraan.
                Refresh halaman untuk mendapatkan update terbaru.
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-all duration-300 bg-white/5 hover:bg-white/10 text-white border border-white/10 flex-shrink-0"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}