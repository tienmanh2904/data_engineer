/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "uploadthing.com",
        port: '',
        pathname: '/**'
      },
      {
        protocol: "https",
        hostname: "utfs.io",
        port: '',
        pathname: '/**'
      },
    ],
    unoptimized: true,
  },
  // Add this section to fix the "Can't resolve 'kerberos'" error
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      kerberos: false,
      '@mongodb-js/zstd': false,
      'snappy': false,
      'aws-crt': false,
    };
    return config;
  },
};

module.exports = nextConfig;