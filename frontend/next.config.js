/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    tsconfigPath: "./tsconfig.json",
  },
  experimental: {
    esmExternals: true,
  },
};

module.exports = nextConfig;
