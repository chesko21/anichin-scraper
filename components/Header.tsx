"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const navLinks = [
    { href: '/', label: 'Beranda' },
    { href: '/populer', label: 'Populer' },
    { href: '/schedule', label: 'Jadwal' },
  ];

  return (
    <>
      <nav
        className={`sticky top-0 z-50 transition-all duration-500 ${
          isScrolled ? 'shadow-2xl shadow-black/10' : ''
        }`}
        style={{
          background: isScrolled 
            ? 'rgba(8, 8, 13, 0.95)' 
            : 'rgba(8, 8, 13, 0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: `1px solid rgba(255, 255, 255, ${isScrolled ? '0.06' : '0.03'})`,
        }}
      >
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 md:h-16">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2.5 flex-shrink-0"
            >
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-white flex items-center justify-center">
                <span className="text-black font-bold text-sm md:text-base">D</span>
              </div>
              <span className="text-base md:text-lg font-semibold text-white tracking-tight">
                DonghuaNest
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                      isActive 
                        ? 'bg-white/10 text-white' 
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-300"
              aria-label="Toggle menu"
            >
              <div className="relative w-5 h-4">
                <span 
                  className={`absolute left-0 w-full h-0.5 bg-current rounded-full transform transition-all duration-300 ${
                    isMobileMenuOpen ? 'top-1.5 rotate-45' : 'top-0'
                  }`}
                ></span>
                <span 
                  className={`absolute left-0 top-1.5 w-full h-0.5 bg-current rounded-full transition-all duration-300 ${
                    isMobileMenuOpen ? 'opacity-0 scale-x-0' : 'opacity-100'
                  }`}
                ></span>
                <span 
                  className={`absolute left-0 w-full h-0.5 bg-current rounded-full transform transition-all duration-300 ${
                    isMobileMenuOpen ? 'top-1.5 -rotate-45' : 'top-3'
                  }`}
                ></span>
              </div>
            </button>
          </div>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"></div>
          
          <div 
            className="absolute top-14 left-0 right-0 animate-in slide-in-from-top-4 duration-300"
            style={{
              background: 'rgba(8, 8, 13, 0.98)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full px-4 py-4">
              <div className="space-y-1">
                {navLinks.map((link, index) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 animate-in fade-in slide-in-from-right-4 ${
                        isActive 
                          ? 'bg-white/10 text-white' 
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {link.label}
                      {isActive && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/50"></span>
                      )}
                    </Link>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-center gap-3 text-[11px] text-gray-600 animate-in fade-in duration-500" style={{ animationDelay: '200ms' }}>
                <span>HD Quality</span>
                <span className="w-1 h-1 rounded-full bg-white/10"></span>
                <span>Sub Indo</span>
                <span className="w-1 h-1 rounded-full bg-white/10"></span>
                <span>Gratis</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}