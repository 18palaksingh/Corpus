/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @steady/core ships as ESM from a workspace package.
  transpilePackages: ['@steady/core'],
};

export default nextConfig;
