import type { NextConfig } from 'next';

/**
 * Browser calls same-origin `/api/*`. Next proxies to the Nest server so
 * other devices on the LAN never need localhost or a hard-coded IP in
 * NEXT_PUBLIC_API_URL.
 */
const backendUrl = process.env.BACKEND_URL ?? 'http://127.0.0.1:3000';

const nextConfig: NextConfig = {
  // LAN hostnames for `next dev` (phones / other PCs). Without this, Next
  // returns 403 on `/_next/static` and HMR websockets fail.
  // `*` matches one hostname label (one IP octet).
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
