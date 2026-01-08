/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // These help with hydration errors
  reactStrictMode: true,
  experimental: {
    scrollRestoration: true,
  },
};

export default nextConfig;
