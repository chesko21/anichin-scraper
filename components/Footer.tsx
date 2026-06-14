// components/Footer.tsx
import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { href: '/', label: 'Beranda' },
    { href: '/populer', label: 'Populer' },
    { href: '/schedule', label: 'Jadwal' },
  ];

  const infoLinks = [
    { href: '/about', label: 'Tentang' },
    { href: '/dmca', label: 'DMCA' },
    { href: '/privacy', label: 'Privasi' },
    { href: '/contact', label: 'Kontak' },
  ];

  return (
    <footer className="mt-16 sm:mt-20 border-t border-white/5">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="py-8 sm:py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="sm:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                <span className="text-black font-bold text-sm">D</span>
              </div>
              <span className="text-lg font-semibold text-white tracking-tight">
                DonghuaNest
              </span>
            </Link>
            <p className="text-gray-500 text-sm leading-relaxed max-w-xs mb-4">
              Platform streaming donghua subtitle Indonesia. Koleksi terlengkap, update setiap hari, gratis.
            </p>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span className="text-gray-500 text-xs">
                Update harian tersedia
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-300 mb-4 text-sm">
              Navigasi
            </h4>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-500 hover:text-gray-300 transition-colors duration-200 text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-gray-300 mb-4 text-sm">
              Informasi
            </h4>
            <ul className="space-y-2.5">
              {infoLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-500 hover:text-gray-300 transition-colors duration-200 text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="py-5 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/5">
          <p className="text-gray-600 text-xs">
            &copy; {currentYear} DonghuaNest. For educational purposes only.
          </p>
          <p className="text-gray-700 text-xs">
            Made for donghua lovers
          </p>
        </div>
      </div>
    </footer>
  );
}