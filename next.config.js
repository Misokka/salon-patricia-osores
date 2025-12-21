/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Supabase PROD
      {
        protocol: 'https',
        hostname: 'yywgluwtlhabsxbbgvqo.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },

      // Supabase LOCAL (CLI)
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '54321',
        pathname: '/storage/v1/object/public/**',
      },

      // (optionnel mais pratique)
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '54321',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // Autoriser les IPs privées en développement (Supabase local)
    dangerouslyAllowSVG: true,
    unoptimized: process.env.NODE_ENV === 'development',
  },
}

module.exports = nextConfig
