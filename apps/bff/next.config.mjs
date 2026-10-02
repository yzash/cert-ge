/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@mozart/schema', '@mozart/fixtures', '@mozart/ai', '@mozart/actions'],
  output: 'standalone',
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,
};
export default nextConfig;
