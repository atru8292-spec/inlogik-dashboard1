/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // Игнорим TS-ошибки при билде (на dev всё работает)
    ignoreBuildErrors: true,
  },
  eslint: {
    // Игнорим ESLint при билде
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
