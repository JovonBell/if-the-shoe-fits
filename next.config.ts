import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['172.19.50.147'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Permissions-Policy', value: 'camera=*' },
        ],
      },
    ]
  },
}

export default nextConfig
