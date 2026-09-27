/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The upstream OpenAI-compatible provider is contacted from the server route
  // handlers only, so CORS never applies. No extra config needed.
};

export default nextConfig;
