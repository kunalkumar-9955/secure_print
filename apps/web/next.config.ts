import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://127.0.0.1:4000/api/v1/:path*',
      },
      {
        source: '/health/:path*',
        destination: 'http://127.0.0.1:4000/health/:path*',
      },
    ];
  },
};

export default nextConfig;
