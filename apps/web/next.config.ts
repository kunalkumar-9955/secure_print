import type { NextConfig } from 'next';

const apiDestination = (
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:4000'
).replace(/\/+$/, '');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiDestination}/api/v1/:path*`,
      },
      {
        source: '/health/:path*',
        destination: `${apiDestination}/health/:path*`,
      },
    ];
  },
};

export default nextConfig;

