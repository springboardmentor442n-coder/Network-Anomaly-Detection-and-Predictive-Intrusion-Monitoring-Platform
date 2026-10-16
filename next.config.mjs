/** @type {import('next').NextConfig} */
const backend = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

const nextConfig = {
  reactStrictMode: true,
  // Proxy Python ML backend through the Next dev server so the browser never
  // needs cross-origin requests during local development.
  async rewrites() {
    return [
      {
        source: '/pyapi/:path*',
        destination: `${backend}/:path*`,
      },
    ];
  },
};

export default nextConfig;
