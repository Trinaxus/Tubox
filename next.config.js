const nextConfig = {
  images: {
    unoptimized: true,
    domains: ['www.tubox.de', 'tubox.de'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.tubox.de',
      },
    ],
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  // Proxy-Konfiguration für den externen Webspace
  async rewrites() {
    return [
      {
        source: '/api/external-blog/:path*',
        destination: 'https://tubox.de/WebDisk/uploads/blog/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
