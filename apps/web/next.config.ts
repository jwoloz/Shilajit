import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@shilajit/types', '@shilajit/db'],
}

export default nextConfig
