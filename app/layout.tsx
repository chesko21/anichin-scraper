import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Header from '@/components/Header';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'DonghuaNest - Streaming Donghua Sub Indo',
  description: 'Streaming donghua subtitle Indonesia gratis. Koleksi terlengkap, update setiap hari.',
  keywords: 'donghua, anime china, streaming donghua, donghua sub indo',
  authors: [{ name: 'DonghuaNest' }],
  openGraph: {
    title: 'DonghuaNest - Streaming Donghua Sub Indo',
    description: 'Streaming donghua subtitle Indonesia gratis. Koleksi terlengkap.',
    type: 'website',
    siteName: 'DonghuaNest',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="scroll-smooth">
      <body className={`${inter.variable} font-sans antialiased`}>
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[#08080d]" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full blur-[150px] opacity-[0.03] bg-white" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[400px] rounded-full blur-[120px] opacity-[0.02] bg-white" />
        </div>

        <Header />
        <main className="relative z-0 min-h-screen">{children}</main>
      </body>
    </html>
  );
}