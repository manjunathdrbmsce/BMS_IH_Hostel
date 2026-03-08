import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@bms/types'],
  output: 'standalone',
};

export default nextConfig;
