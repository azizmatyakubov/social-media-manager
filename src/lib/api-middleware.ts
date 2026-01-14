import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withRateLimit, RateLimitConfig, RATE_LIMIT_CONFIGS } from "@/lib/rate-limit";

export interface ApiMiddlewareOptions {
  // Require authentication
  requireAuth?: boolean;
  // Rate limit configuration
  rateLimit?: RateLimitConfig;
}

export interface ApiContext {
  userId: string | null;
  userEmail: string | null;
}

/**
 * API middleware wrapper that handles common concerns:
 * - Authentication
 * - Rate limiting
 * - Error handling
 */
export async function apiMiddleware(
  request: Request,
  options: ApiMiddlewareOptions = {}
): Promise<{
  success: boolean;
  response?: NextResponse;
  context: ApiContext;
  headers: Record<string, string>;
}> {
  const headers: Record<string, string> = {};
  let context: ApiContext = { userId: null, userEmail: null };

  try {
    // Check authentication if required
    if (options.requireAuth) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return {
          success: false,
          response: NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
          ),
          context,
          headers,
        };
      }
      context = {
        userId: session.user.id,
        userEmail: session.user.email || null,
      };
    } else {
      // Try to get session anyway for rate limiting
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        context = {
          userId: session.user.id,
          userEmail: session.user.email || null,
        };
      }
    }

    // Apply rate limiting if configured
    if (options.rateLimit) {
      const { allowed, headers: rlHeaders, result } = await withRateLimit(
        request,
        options.rateLimit,
        context.userId
      );

      Object.assign(headers, rlHeaders);

      if (!allowed) {
        return {
          success: false,
          response: NextResponse.json(
            {
              error: "Too many requests",
              message: `Rate limit exceeded. Try again in ${result.resetIn} seconds.`,
              retryAfter: result.resetIn,
            },
            { status: 429, headers }
          ),
          context,
          headers,
        };
      }
    }

    return {
      success: true,
      context,
      headers,
    };
  } catch (error) {
    console.error("API middleware error:", error);
    return {
      success: false,
      response: NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      ),
      context,
      headers,
    };
  }
}

/**
 * Helper to create standard API response with rate limit headers
 */
export function createApiResponse(
  data: unknown,
  status: number = 200,
  additionalHeaders: Record<string, string> = {}
): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: additionalHeaders,
  });
}

/**
 * Pre-configured middleware for auth endpoints
 */
export async function authApiMiddleware(request: Request) {
  return apiMiddleware(request, {
    requireAuth: false,
    rateLimit: RATE_LIMIT_CONFIGS.auth,
  });
}

/**
 * Pre-configured middleware for AI endpoints
 */
export async function aiApiMiddleware(request: Request) {
  return apiMiddleware(request, {
    requireAuth: true,
    rateLimit: RATE_LIMIT_CONFIGS.ai,
  });
}

/**
 * Pre-configured middleware for general authenticated endpoints
 */
export async function authenticatedApiMiddleware(request: Request) {
  return apiMiddleware(request, {
    requireAuth: true,
    rateLimit: RATE_LIMIT_CONFIGS.api,
  });
}

/**
 * Pre-configured middleware for publish endpoints
 */
export async function publishApiMiddleware(request: Request) {
  return apiMiddleware(request, {
    requireAuth: true,
    rateLimit: RATE_LIMIT_CONFIGS.publish,
  });
}
