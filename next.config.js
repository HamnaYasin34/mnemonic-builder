// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict mode for better dev experience
  reactStrictMode: true,

  // Optimize images if needed later
  images: {
    domains: [],
  },

  // Environment variables exposed to server only (NEVER add OPENAI_API_KEY here)
  // Use .env.local for secrets — they are server-only by default in Next.js
}

module.exports = nextConfig
