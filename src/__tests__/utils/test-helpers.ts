// Test helper utilities
import { jest } from "@jest/globals";

/**
 * Creates a mock user ID for testing
 */
export function createMockUserId(): string {
  return `test_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Creates a mock date in the past
 */
export function createPastDate(daysAgo: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
}

/**
 * Creates a mock date in the future
 */
export function createFutureDate(daysAhead: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date;
}

/**
 * Waits for a specified number of milliseconds
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a mock API response
 */
export function createMockResponse<T>(data: T, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response;
}

/**
 * Mocks the fetch function for testing
 */
export function mockFetch(responses: Record<string, any>): void {
  (global.fetch as jest.Mock).mockImplementation((url: string) => {
    const matchingKey = Object.keys(responses).find((key) => url.includes(key));
    if (matchingKey) {
      return Promise.resolve(createMockResponse(responses[matchingKey]));
    }
    return Promise.resolve(createMockResponse({ error: "Not found" }, 404));
  });
}

/**
 * Clears all mock data (useful for resetting in-memory stores)
 */
export function clearAllMocks(): void {
  jest.clearAllMocks();
}

/**
 * Creates a mock session for authentication tests
 */
export function createMockSession(userId: string) {
  return {
    user: {
      id: userId,
      email: `${userId}@test.com`,
      name: "Test User",
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Validates that an object has required properties
 */
export function hasRequiredProps<T extends object>(
  obj: T,
  props: (keyof T)[]
): boolean {
  return props.every((prop) => prop in obj && obj[prop] !== undefined);
}

/**
 * Creates random engagement metrics for testing
 */
export function createMockEngagementMetrics() {
  return {
    likes: Math.floor(Math.random() * 1000),
    comments: Math.floor(Math.random() * 100),
    shares: Math.floor(Math.random() * 50),
    views: Math.floor(Math.random() * 10000),
    reach: Math.floor(Math.random() * 5000),
    impressions: Math.floor(Math.random() * 15000),
    engagementRate: Math.random() * 10,
  };
}

/**
 * Asserts array length and optionally validates items
 */
export function assertArrayLength<T>(
  array: T[],
  expectedLength: number,
  validator?: (item: T) => boolean
): void {
  expect(array).toHaveLength(expectedLength);
  if (validator) {
    array.forEach((item) => expect(validator(item)).toBe(true));
  }
}
