// components/SearchBar.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X, Loader2, Clock } from 'lucide-react';
import Link from 'next/link';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export default function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ title: string; slug: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      } catch {}
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateDropdownPosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: `${rect.bottom + 8}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
      });
    }
  };

  const fetchSuggestions = async (value: string) => {
    if (value.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`/api/anime/search?q=${encodeURIComponent(value)}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setSuggestions(data.data.slice(0, 5));
        }
      }
    } catch {}
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  const handleFocus = () => {
    updateDropdownPosition();
    setShowSuggestions(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      const updated = [query.trim(), ...recentSearches.filter(s => s !== query.trim())].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      
      onSearch(query.trim());
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    onSearch(suggestion);
    setShowSuggestions(false);
    
    const updated = [suggestion, ...recentSearches.filter(s => s !== suggestion)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (showSuggestions) {
      updateDropdownPosition();
      window.addEventListener('resize', updateDropdownPosition);
      window.addEventListener('scroll', updateDropdownPosition);
    }
    return () => {
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition);
    };
  }, [showSuggestions]);

  const trendingSearches = ['Soul Land', 'Battle Through The Heavens', 'Perfect World', 'Martial Peak', 'Against the Gods'];

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={handleFocus}
            placeholder="Cari donghua..."
            className="w-full pl-10 pr-12 py-3 rounded-xl text-sm transition-all duration-300 focus:outline-none bg-white/[0.03] border border-white/5 text-white placeholder:text-gray-600 focus:border-white/10 focus:bg-white/[0.04]"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isLoading && (
              <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
            )}
            {query && !isLoading && (
              <button
                type="button"
                onClick={clearSearch}
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            )}
          </div>
        </div>
      </form>

      {showSuggestions && (
        <>
          <div 
            className="fixed inset-0 bg-transparent"
            style={{ zIndex: 9998 }}
            onClick={() => setShowSuggestions(false)}
          />
          <div 
            className="rounded-xl overflow-hidden bg-[#0f0f14] border border-white/5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200"
            style={{ 
              ...dropdownStyle,
              zIndex: 9999,
              maxHeight: '60vh',
              overflowY: 'auto',
            }}
          >
            {query.length >= 2 && suggestions.length > 0 && (
              <div className="p-2">
                <p className="px-3 py-2 text-[11px] font-medium text-gray-500">
                  Hasil Pencarian
                </p>
                {suggestions.map((item, idx) => (
                  <Link
                    key={idx}
                    href={`/anime/${item.slug}`}
                    onClick={() => setShowSuggestions(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.02] transition-colors group"
                  >
                    <Search className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 transition-colors" />
                    <span className="text-sm text-gray-400 group-hover:text-white truncate">
                      {item.title}
                    </span>
                  </Link>
                ))}
                <button
                  onClick={() => handleSuggestionClick(query)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.02] transition-colors group mt-1 border-t border-white/5"
                >
                  <Search className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-sm text-gray-300 font-medium">
                    Cari &quot;{query}&quot;
                  </span>
                </button>
              </div>
            )}

            {recentSearches.length > 0 && query.length < 2 && (
              <div className="p-2">
                <div className="flex items-center justify-between px-3 py-2">
                  <p className="text-[11px] font-medium text-gray-500 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    Terakhir Dicari
                  </p>
                  <button
                    onClick={() => {
                      setRecentSearches([]);
                      localStorage.removeItem('recentSearches');
                    }}
                    className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
                  >
                    Hapus
                  </button>
                </div>
                {recentSearches.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(item)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.02] transition-colors group text-left"
                  >
                    <Clock className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 transition-colors" />
                    <span className="text-sm text-gray-400 group-hover:text-white truncate">
                      {item}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {query.length < 2 && recentSearches.length === 0 && (
              <div className="p-2">
                <p className="px-3 py-2 text-[11px] font-medium text-gray-500">
                  Pencarian Populer
                </p>
                {trendingSearches.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(item)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.02] transition-colors group text-left"
                  >
                    <span className="w-5 h-5 rounded-md bg-white/5 text-gray-500 text-[10px] font-medium flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-sm text-gray-400 group-hover:text-white truncate">
                      {item}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}