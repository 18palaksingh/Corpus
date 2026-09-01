/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @corpus/core ships as ESM from a workspace package.
  transpilePackages: ['@corpus/core'],
};

export default nextConfig;
