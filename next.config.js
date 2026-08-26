/** @type {import('next').NextConfig} */
const nextConfig = {
  // `next dev` only. The staging box is reached as lucknow-dev.learningpaths.io
  // rather than localhost, and the dev server warns on cross-origin requests
  // to /_next/* from a host it was not told about — a future major will reject
  // them outright. Has no effect on `next build`/`next start`.
  allowedDevOrigins: ['lucknow-dev.learningpaths.io'],
  async redirects() {
    return [
      {
        source: '/metro-line-yellow-count-down',
        destination: '/metro-line-count-down',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
