// In-memory rate limiter for API endpoints
// For production, consider using Redis for distributed rate limiting

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Store rate limit data in memory
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

export interface RateLimitConfig {
  // Maximum number of requests allowed
  maxRequests: number;
  // Time window in seconds
  windowSeconds: number;
  // Optional key prefix for namespacing
  keyPrefix?: string;
}

export interface RateLimitResult {
  // Whether the request is allowed
  allowed: boolean;
  // Number of remaining requests
  remaining: number;
  // Number of total allowed requests
  limit: number;
  // Seconds until the limit resets
  resetIn: number;
  // Current request count
  current: number;
}

// Default configs for different endpoint types
export const RATE_LIMIT_CONFIGS = {
  // Auth endpoints - strict to prevent brute force
  auth: {
    maxRequests: 10,
    windowSeconds: 60,
    keyPrefix: "auth",
  },
  // AI generation endpoints
  ai: {
    maxRequests: 30,
    windowSeconds: 60,
    keyPrefix: "ai",
  },
  // General API endpoints
  api: {
    maxRequests: 100,
    windowSeconds: 60,
    keyPrefix: "api",
  },
  // Publishing endpoints
  publish: {
    maxRequests: 20,
    windowSeconds: 60,
    keyPrefix: "publish",
  },
  // Webhook endpoints
  webhook: {
    maxRequests: 200,
    windowSeconds: 60,
    keyPrefix: "webhook",
  },
};

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (usually user ID or IP)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = `${config.keyPrefix || "default"}:${identifier}`;
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  let entry = rateLimitStore.get(key);

  // Create new entry if doesn't exist or has expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + windowMs,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  const allowed = entry.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);
  const resetIn = Math.ceil((entry.resetTime - now) / 1000);

  return {
    allowed,
    remaining,
    limit: config.maxRequests,
    resetIn,
    current: entry.count,
  };
}

/**
 * Create rate limit headers for the response
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.resetIn.toString(),
  };
}

/**
 * Get identifier from request (IP address or user ID)
 */
export function getIdentifier(
  request: Request,
  userId?: string | null
): string {
  // Prefer user ID for authenticated requests
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP address
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwardedFor?.split(",")[0] || realIp || "anonymous";

  return `ip:${ip}`;
}

/**
 * Rate limiter middleware function for Next.js API routes
 */
export async function withRateLimit(
  request: Request,
  config: RateLimitConfig,
  userId?: string | null
): Promise<{ allowed: boolean; headers: Record<string, string>; result: RateLimitResult }> {
  const identifier = getIdentifier(request, userId);
  const result = checkRateLimit(identifier, config);
  const headers = createRateLimitHeaders(result);

  return {
    allowed: result.allowed,
    headers,
    result,
  };
}

/**
 * Get current rate limit status without incrementing
 */
export function getRateLimitStatus(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult | null {
  const key = `${config.keyPrefix || "default"}:${identifier}`;
  const now = Date.now();

  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    return null;
  }

  const remaining = Math.max(0, config.maxRequests - entry.count);
  const resetIn = Math.ceil((entry.resetTime - now) / 1000);

  return {
    allowed: entry.count < config.maxRequests,
    remaining,
    limit: config.maxRequests,
    resetIn,
    current: entry.count,
  };
}

/**
 * Reset rate limit for a specific identifier
 */
export function resetRateLimit(identifier: string, keyPrefix?: string): void {
  const key = `${keyPrefix || "default"}:${identifier}`;
  rateLimitStore.delete(key);
}
