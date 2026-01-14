import { prisma } from "./prisma";
import { Platform, PostStatus } from "@prisma/client";

// Types
export interface BulkPostInput {
  content: string;
  platform: string;
  scheduledFor?: string;
  mediaUrls?: string[];
}

export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
}

export interface ColumnMapping {
  content: string;
  platform?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  mediaUrl?: string;
}

export interface BulkUploadResult {
  total: number;
  created: number;
  failed: number;
  errors: { row: number; error: string }[];
}

// Parse CSV content
export function parseCSV(csvContent: string): ParsedCSV {
  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length === 0) {
    throw new Error("Empty CSV file");
  }

  // Parse headers
  const headers = parseCSVLine(lines[0]);

  // Parse rows
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    rows.push(row);
  }

  return {
    headers,
    rows,
    totalRows: rows.length,
  };
}

// Parse a single CSV line (handles quoted values)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && !inQuotes) {
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      if (nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = false;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

// Validate and transform posts from CSV
export function transformCSVToPosts(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  defaultPlatform?: Platform
): {
  posts: BulkPostInput[];
  errors: { row: number; error: string }[];
} {
  const posts: BulkPostInput[] = [];
  const errors: { row: number; error: string }[] = [];

  rows.forEach((row, index) => {
    const rowNum = index + 2; // +2 for 1-indexed and header row

    try {
      // Get content
      const content = row[mapping.content];
      if (!content || content.trim() === "") {
        errors.push({ row: rowNum, error: "Missing content" });
        return;
      }

      // Get platform
      let platform = defaultPlatform;
      if (mapping.platform && row[mapping.platform]) {
        const platformValue = row[mapping.platform].toUpperCase().trim();
        if (isValidPlatform(platformValue)) {
          platform = platformValue as Platform;
        } else {
          errors.push({ row: rowNum, error: `Invalid platform: ${platformValue}` });
          return;
        }
      }

      if (!platform) {
        errors.push({ row: rowNum, error: "No platform specified" });
        return;
      }

      // Get scheduled date/time
      let scheduledFor: string | undefined;
      if (mapping.scheduledDate && row[mapping.scheduledDate]) {
        const dateStr = row[mapping.scheduledDate];
        const timeStr = mapping.scheduledTime && row[mapping.scheduledTime]
          ? row[mapping.scheduledTime]
          : "12:00";

        const parsedDate = parseDate(dateStr, timeStr);
        if (parsedDate) {
          scheduledFor = parsedDate.toISOString();
        } else {
          errors.push({ row: rowNum, error: `Invalid date format: ${dateStr}` });
          return;
        }
      }

      // Get media URL
      const mediaUrls: string[] = [];
      if (mapping.mediaUrl && row[mapping.mediaUrl]) {
        const urls = row[mapping.mediaUrl].split(";").map((u) => u.trim()).filter(Boolean);
        mediaUrls.push(...urls);
      }

      posts.push({
        content: content.trim(),
        platform: platform,
        scheduledFor,
        mediaUrls,
      });
    } catch (err) {
      errors.push({ row: rowNum, error: `Processing error: ${err}` });
    }
  });

  return { posts, errors };
}

// Check if platform is valid
function isValidPlatform(platform: string): boolean {
  const validPlatforms: string[] = [
    "X",
    "TWITTER",
    "LINKEDIN",
    "INSTAGRAM",
    "TIKTOK",
    "YOUTUBE",
    "PINTEREST",
    "BLUESKY",
    "THREADS",
  ];
  return validPlatforms.includes(platform.toUpperCase());
}

// Normalize platform name
function normalizePlatform(platform: string): Platform {
  const normalized = platform.toUpperCase();
  if (normalized === "TWITTER") return "X";
  return normalized as Platform;
}

// Parse date string
function parseDate(dateStr: string, timeStr: string): Date | null {
  try {
    // Try various date formats
    const formats = [
      // ISO format
      /^(\d{4})-(\d{2})-(\d{2})$/,
      // US format
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      // European format
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    ];

    let year: number, month: number, day: number;

    // ISO format: YYYY-MM-DD
    const isoMatch = dateStr.match(formats[0]);
    if (isoMatch) {
      year = parseInt(isoMatch[1]);
      month = parseInt(isoMatch[2]) - 1;
      day = parseInt(isoMatch[3]);
    } else {
      // US format: MM/DD/YYYY
      const usMatch = dateStr.match(formats[1]);
      if (usMatch) {
        month = parseInt(usMatch[1]) - 1;
        day = parseInt(usMatch[2]);
        year = parseInt(usMatch[3]);
      } else {
        // European format: DD-MM-YYYY
        const euMatch = dateStr.match(formats[2]);
        if (euMatch) {
          day = parseInt(euMatch[1]);
          month = parseInt(euMatch[2]) - 1;
          year = parseInt(euMatch[3]);
        } else {
          return null;
        }
      }
    }

    // Parse time
    const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    let hours = 12;
    let minutes = 0;
    if (timeMatch) {
      hours = parseInt(timeMatch[1]);
      minutes = parseInt(timeMatch[2]);
    }

    const date = new Date(year, month, day, hours, minutes);

    // Validate the date is valid
    if (isNaN(date.getTime())) {
      return null;
    }

    return date;
  } catch {
    return null;
  }
}

// Create posts in bulk
export async function createBulkPosts(
  userId: string,
  posts: BulkPostInput[],
  options?: {
    accountIds?: Record<Platform, string>;
    defaultStatus?: PostStatus;
  }
): Promise<BulkUploadResult> {
  const result: BulkUploadResult = {
    total: posts.length,
    created: 0,
    failed: 0,
    errors: [],
  };

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const rowNum = i + 2;

    try {
      const platform = normalizePlatform(post.platform);
      const accountField = getAccountField(platform);
      const accountId = options?.accountIds?.[platform];

      // Determine status
      let status: PostStatus = options?.defaultStatus || "DRAFT";
      if (post.scheduledFor) {
        const scheduledDate = new Date(post.scheduledFor);
        if (scheduledDate > new Date()) {
          status = "SCHEDULED";
        }
      }

      await prisma.post.create({
        data: {
          userId,
          content: post.content,
          platform,
          status,
          scheduledFor: post.scheduledFor ? new Date(post.scheduledFor) : null,
          mediaUrls: post.mediaUrls || [],
          ...(accountId && accountField ? { [accountField]: accountId } : {}),
        },
      });

      result.created++;
    } catch (err) {
      result.failed++;
      result.errors.push({
        row: rowNum,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return result;
}

// Get account field name for platform
function getAccountField(platform: Platform): string | null {
  const fields: Partial<Record<Platform, string>> = {
    X: "xAccountId",
    LINKEDIN: "linkedInAccountId",
    INSTAGRAM: "instagramAccountId",
    TIKTOK: "tiktokAccountId",
    YOUTUBE: "youtubeAccountId",
    PINTEREST: "pinterestAccountId",
    BLUESKY: "blueskyAccountId",
  };
  return fields[platform] || null;
}

// Generate sample CSV
export function generateSampleCSV(): string {
  const headers = ["content", "platform", "scheduled_date", "scheduled_time", "media_url"];
  const rows = [
    [
      "This is my first scheduled post! Excited to share this content.",
      "X",
      "2024-01-15",
      "09:00",
      "",
    ],
    [
      "Check out our new product launch! Learn more at our website.",
      "LINKEDIN",
      "2024-01-16",
      "14:30",
      "https://example.com/image.jpg",
    ],
    [
      "Behind the scenes of our latest project. Swipe to see more!",
      "INSTAGRAM",
      "2024-01-17",
      "18:00",
      "https://example.com/image1.jpg;https://example.com/image2.jpg",
    ],
  ];

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => (cell.includes(",") ? `"${cell}"` : cell)).join(",")
    ),
  ].join("\n");

  return csvContent;
}

// Get upload statistics
export async function getBulkUploadStats(userId: string) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalPosts,
    scheduledPosts,
    recentPosts,
  ] = await Promise.all([
    prisma.post.count({
      where: { userId },
    }),
    prisma.post.count({
      where: { userId, status: "SCHEDULED" },
    }),
    prisma.post.count({
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
  ]);

  return {
    totalPosts,
    scheduledPosts,
    recentPosts,
    averagePerDay: Math.round(recentPosts / 30 * 10) / 10,
  };
}

// Validate posts before upload
export function validatePosts(posts: BulkPostInput[]): {
  valid: boolean;
  errors: { index: number; error: string }[];
  warnings: { index: number; warning: string }[];
} {
  const errors: { index: number; error: string }[] = [];
  const warnings: { index: number; warning: string }[] = [];

  posts.forEach((post, index) => {
    // Check content length
    const platform = post.platform.toUpperCase();
    const maxLength = getMaxLength(platform);

    if (post.content.length > maxLength) {
      errors.push({
        index,
        error: `Content exceeds ${maxLength} characters for ${platform}`,
      });
    }

    // Check for empty content
    if (!post.content.trim()) {
      errors.push({ index, error: "Content cannot be empty" });
    }

    // Check scheduled date is in the future
    if (post.scheduledFor) {
      const scheduledDate = new Date(post.scheduledFor);
      if (scheduledDate <= new Date()) {
        warnings.push({ index, warning: "Scheduled time is in the past" });
      }
    }

    // Check media URLs are valid
    if (post.mediaUrls && post.mediaUrls.length > 0) {
      post.mediaUrls.forEach((url) => {
        if (!isValidUrl(url)) {
          warnings.push({ index, warning: `Invalid media URL: ${url}` });
        }
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function getMaxLength(platform: string): number {
  const limits: Record<string, number> = {
    X: 280,
    TWITTER: 280,
    LINKEDIN: 3000,
    INSTAGRAM: 2200,
    TIKTOK: 300,
    YOUTUBE: 5000,
    PINTEREST: 500,
    BLUESKY: 300,
    THREADS: 500,
  };
  return limits[platform] || 1000;
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
