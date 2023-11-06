/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async rewrites() {
    return [
      {
        source: "/cpp/:path*",
        destination: "Your-Core-Server-URL/:path*", // Your-Core-Server-URL Change
      },
    ];
  },
};

module.exports = nextConfig;
