/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: '/tecnam_p2002jf_performances',
  trailingSlash: true,
}

module.exports = nextConfig

