import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'anichin.cafe',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i0.wp.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i1.wp.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i2.wp.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i3.wp.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        pathname: '/**',
      },
    ],
    unoptimized: true,
  },
  // Allow development from any origin (fixes HMR WebSocket issues)
  allowedDevOrigins: ['169.254.83.107', 'localhost', '127.0.0.1'],
  // Content Security Policy for video embedding
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src data: blob: 'self' 'unsafe-inline' 'unsafe-eval' https: wss:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.ok.ru https://ok.ru https://*.odnoklassniki.ru https://odnoklassniki.ru https://*.mail.ru https://mail.ru https://*.youtube.com https://youtube.com https://*.ytimg.com https://ytimg.com; frame-src 'self' https: http: data: blob:; connect-src 'self' https:; img-src 'self' https: data: blob: http:; style-src 'self' 'unsafe-inline' https:;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;