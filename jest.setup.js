// Mock environment variables
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
process.env.OPENAI_API_KEY = "test-openai-key";
process.env.X_API_KEY = "test-x-api-key";
process.env.X_API_SECRET = "test-x-api-secret";
process.env.X_ACCESS_TOKEN = "test-x-access-token";
process.env.X_ACCESS_TOKEN_SECRET = "test-x-access-secret";
process.env.LINKEDIN_CLIENT_ID = "test-linkedin-client";
process.env.LINKEDIN_CLIENT_SECRET = "test-linkedin-secret";
process.env.INSTAGRAM_CLIENT_ID = "test-ig-client";
process.env.INSTAGRAM_CLIENT_SECRET = "test-ig-secret";
process.env.TIKTOK_CLIENT_KEY = "test-tiktok-key";
process.env.TIKTOK_CLIENT_SECRET = "test-tiktok-secret";
process.env.YOUTUBE_CLIENT_ID = "test-youtube-id";
process.env.YOUTUBE_CLIENT_SECRET = "test-youtube-secret";
process.env.PINTEREST_CLIENT_ID = "test-pinterest-id";
process.env.PINTEREST_CLIENT_SECRET = "test-pinterest-secret";

// Mock fetch globally
global.fetch = jest.fn();
