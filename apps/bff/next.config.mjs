/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@mozart/schema', '@mozart/fixtures', '@mozart/ai', '@mozart/actions'],
  output: 'standalone',
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,
  // The Expo web build is copied into public/ at build time (see "build:app").
  // API routes and real files win; every other path is an app route (/home, /hq, ...) served by the SPA.
  async rewrites() {
    return { fallback: [{ source: '/:path((?!api/).*)', destination: '/index.html' }] };
  },
};
export default nextConfig;
