import { prisma } from "./prisma";
import { Platform, Post } from "@prisma/client";

// ============================================
// TYPES
// ============================================

export interface RssFeedSettings {
  name?: string;
  platforms?: Platform[];
  autoPost?: boolean;
  postTemplate?: string;
  includeImage?: boolean;
  maxPostsPerDay?: number;
  checkInterval?: number;
  categoryId?: string;
  isActive?: boolean;
}

export interface RssItem {
  guid: string;
  title: string;
  link: string;
  description: string;
  content?: string;
  pubDate: Date;
  author?: string;
  image?: string;
  categories?: string[];
}

export interface ParsedFeed {
  title: string;
  description: string;
  link: string;
  language?: string;
  lastBuildDate?: Date;
  items: RssItem[];
}

// ============================================
// RSS FEED MANAGEMENT
// ============================================

export async function addRssFeed(
  userId: string,
  feedUrl: string,
  settings: RssFeedSettings = {}
) {
  // Validate URL format
  try {
    new URL(feedUrl);
  } catch {
    throw new Error("Invalid feed URL");
  }

  // Check if feed URL already exists for this user
  const existing = await prisma.rssFeed.findFirst({
    where: {
      userId,
      feedUrl,
    },
  });

  if (existing) {
    throw new Error("This feed URL is already added");
  }

  // Try to parse the feed to validate it works
  const parsedFeed = await parseFeed(feedUrl);

  return prisma.rssFeed.create({
    data: {
      userId,
      feedUrl,
      name: settings.name || parsedFeed.title || "Untitled Feed",
      platforms: settings.platforms || [Platform.X],
      autoPost: settings.autoPost ?? true,
      postTemplate: settings.postTemplate || "{title}\n\n{link}",
      includeImage: settings.includeImage ?? true,
      maxPostsPerDay: settings.maxPostsPerDay || 5,
      checkInterval: settings.checkInterval || 60,
      categoryId: settings.categoryId,
      isActive: settings.isActive ?? true,
    },
  });
}

export async function getRssFeeds(userId: string) {
  return prisma.rssFeed.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getRssFeed(feedId: string) {
  return prisma.rssFeed.findUnique({
    where: { id: feedId },
  });
}

export async function updateRssFeed(feedId: string, settings: RssFeedSettings) {
  return prisma.rssFeed.update({
    where: { id: feedId },
    data: {
      ...(settings.name !== undefined && { name: settings.name }),
      ...(settings.platforms !== undefined && { platforms: settings.platforms }),
      ...(settings.autoPost !== undefined && { autoPost: settings.autoPost }),
      ...(settings.postTemplate !== undefined && { postTemplate: settings.postTemplate }),
      ...(settings.includeImage !== undefined && { includeImage: settings.includeImage }),
      ...(settings.maxPostsPerDay !== undefined && { maxPostsPerDay: settings.maxPostsPerDay }),
      ...(settings.checkInterval !== undefined && { checkInterval: settings.checkInterval }),
      ...(settings.categoryId !== undefined && { categoryId: settings.categoryId }),
      ...(settings.isActive !== undefined && { isActive: settings.isActive }),
    },
  });
}

export async function deleteRssFeed(feedId: string) {
  return prisma.rssFeed.delete({
    where: { id: feedId },
  });
}

// ============================================
// RSS PARSING
// ============================================

export async function parseFeed(feedUrl: string): Promise<ParsedFeed> {
  const response = await fetch(feedUrl, {
    headers: {
      "User-Agent": "SocialMediaManager/1.0 RSS Reader",
      Accept: "application/rss+xml, application/xml, text/xml, application/atom+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch feed: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  return parseXml(xml);
}

function parseXml(xml: string): ParsedFeed {
  // Determine if it's RSS or Atom
  const isAtom = xml.includes("<feed") && xml.includes("xmlns=\"http://www.w3.org/2005/Atom\"");

  if (isAtom) {
    return parseAtomFeed(xml);
  }
  return parseRssFeed(xml);
}

function parseRssFeed(xml: string): ParsedFeed {
  // Helper function to extract content between tags
  const getTagContent = (content: string, tag: string): string | null => {
    // Try with CDATA first
    const cdataRegex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, "i");
    const cdataMatch = content.match(cdataRegex);
    if (cdataMatch) {
      return cdataMatch[1].trim();
    }

    // Regular content
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
    const match = content.match(regex);
    return match ? decodeHtmlEntities(match[1].trim()) : null;
  };

  // Extract channel info
  const channelMatch = xml.match(/<channel[^>]*>([\s\S]*?)<\/channel>/i);
  const channelContent = channelMatch ? channelMatch[1] : xml;

  const title = getTagContent(channelContent, "title") || "Untitled Feed";
  const description = getTagContent(channelContent, "description") || "";
  const link = getTagContent(channelContent, "link") || "";
  const language = getTagContent(channelContent, "language") || undefined;
  const lastBuildDateStr = getTagContent(channelContent, "lastBuildDate");
  const lastBuildDate = lastBuildDateStr ? new Date(lastBuildDateStr) : undefined;

  // Extract items
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  const items: RssItem[] = [];
  let itemMatch;

  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const itemContent = itemMatch[1];

    const itemTitle = getTagContent(itemContent, "title") || "";
    const itemLink = getTagContent(itemContent, "link") || "";
    const itemDescription = getTagContent(itemContent, "description") || "";
    const itemContent2 = getTagContent(itemContent, "content:encoded") || getTagContent(itemContent, "content") || "";
    const itemGuid = getTagContent(itemContent, "guid") || itemLink || `${Date.now()}-${items.length}`;
    const itemPubDate = getTagContent(itemContent, "pubDate");
    const itemAuthor = getTagContent(itemContent, "author") || getTagContent(itemContent, "dc:creator") || "";

    // Try to extract image from various sources
    let itemImage: string | undefined;

    // Check for media:content or media:thumbnail
    const mediaMatch = itemContent.match(/<media:(content|thumbnail)[^>]*url=["']([^"']+)["']/i);
    if (mediaMatch) {
      itemImage = mediaMatch[2];
    }

    // Check for enclosure
    if (!itemImage) {
      const enclosureMatch = itemContent.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*type=["']image/i);
      if (enclosureMatch) {
        itemImage = enclosureMatch[1];
      }
    }

    // Check for image in content
    if (!itemImage) {
      const imgMatch = (itemContent2 || itemDescription).match(/<img[^>]*src=["']([^"']+)["']/i);
      if (imgMatch) {
        itemImage = imgMatch[1];
      }
    }

    // Extract categories
    const categoryRegex = /<category[^>]*>([^<]+)<\/category>/gi;
    const categories: string[] = [];
    let categoryMatch;
    while ((categoryMatch = categoryRegex.exec(itemContent)) !== null) {
      categories.push(decodeHtmlEntities(categoryMatch[1].trim()));
    }

    items.push({
      guid: itemGuid,
      title: stripHtml(itemTitle),
      link: itemLink,
      description: stripHtml(itemDescription),
      content: itemContent2,
      pubDate: itemPubDate ? new Date(itemPubDate) : new Date(),
      author: itemAuthor,
      image: itemImage,
      categories,
    });
  }

  return {
    title,
    description,
    link,
    language,
    lastBuildDate,
    items,
  };
}

function parseAtomFeed(xml: string): ParsedFeed {
  const getTagContent = (content: string, tag: string): string | null => {
    // Try with CDATA first
    const cdataRegex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, "i");
    const cdataMatch = content.match(cdataRegex);
    if (cdataMatch) {
      return cdataMatch[1].trim();
    }

    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
    const match = content.match(regex);
    return match ? decodeHtmlEntities(match[1].trim()) : null;
  };

  const getAttrValue = (content: string, tag: string, attr: string): string | null => {
    const regex = new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)["']`, "i");
    const match = content.match(regex);
    return match ? match[1] : null;
  };

  // Feed info
  const feedMatch = xml.match(/<feed[^>]*>([\s\S]*?)<\/feed>/i);
  const feedContent = feedMatch ? feedMatch[1] : xml;

  const title = getTagContent(feedContent, "title") || "Untitled Feed";
  const subtitle = getTagContent(feedContent, "subtitle") || "";
  const link = getAttrValue(feedContent, "link", "href") || "";
  const updatedStr = getTagContent(feedContent, "updated");
  const lastBuildDate = updatedStr ? new Date(updatedStr) : undefined;

  // Extract entries
  const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
  const items: RssItem[] = [];
  let entryMatch;

  while ((entryMatch = entryRegex.exec(xml)) !== null) {
    const entryContent = entryMatch[1];

    const entryTitle = getTagContent(entryContent, "title") || "";
    const entryLink = getAttrValue(entryContent, 'link[^>]*rel="alternate"', "href") ||
                      getAttrValue(entryContent, "link", "href") || "";
    const entrySummary = getTagContent(entryContent, "summary") || "";
    const entryContentText = getTagContent(entryContent, "content") || "";
    const entryId = getTagContent(entryContent, "id") || entryLink || `${Date.now()}-${items.length}`;
    const entryUpdated = getTagContent(entryContent, "updated") || getTagContent(entryContent, "published");
    const entryAuthor = getTagContent(entryContent, "author name") || getTagContent(entryContent, "name") || "";

    // Try to extract image
    let entryImage: string | undefined;
    const mediaMatch = entryContent.match(/<media:(content|thumbnail)[^>]*url=["']([^"']+)["']/i);
    if (mediaMatch) {
      entryImage = mediaMatch[2];
    }
    if (!entryImage) {
      const imgMatch = (entryContentText || entrySummary).match(/<img[^>]*src=["']([^"']+)["']/i);
      if (imgMatch) {
        entryImage = imgMatch[1];
      }
    }

    // Extract categories
    const categoryRegex = /<category[^>]*term=["']([^"']+)["']/gi;
    const categories: string[] = [];
    let categoryMatch;
    while ((categoryMatch = categoryRegex.exec(entryContent)) !== null) {
      categories.push(decodeHtmlEntities(categoryMatch[1]));
    }

    items.push({
      guid: entryId,
      title: stripHtml(entryTitle),
      link: entryLink,
      description: stripHtml(entrySummary),
      content: entryContentText,
      pubDate: entryUpdated ? new Date(entryUpdated) : new Date(),
      author: entryAuthor,
      image: entryImage,
      categories,
    });
  }

  return {
    title,
    description: subtitle,
    link,
    lastBuildDate,
    items,
  };
}

function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&apos;": "'",
    "&#39;": "'",
    "&nbsp;": " ",
    "&#x27;": "'",
    "&#x2F;": "/",
  };

  let decoded = text;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, "g"), char);
  }

  // Decode numeric entities
  decoded = decoded.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)));
  decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  return decoded;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================
// FEED CHECKING & AUTO-POSTING
// ============================================

export async function checkForNewItems(feedId: string): Promise<RssItem[]> {
  const feed = await prisma.rssFeed.findUnique({
    where: { id: feedId },
  });

  if (!feed) {
    throw new Error("Feed not found");
  }

  const parsedFeed = await parseFeed(feed.feedUrl);
  const newItems: RssItem[] = [];

  // Filter for new items (after lastChecked or with different guid)
  for (const item of parsedFeed.items) {
    // If we have a lastItemGuid, check if this item is newer
    if (feed.lastItemGuid) {
      if (item.guid === feed.lastItemGuid) {
        break; // We've reached the last processed item
      }
    } else if (feed.lastChecked) {
      // If no guid tracking, use date comparison
      if (item.pubDate <= feed.lastChecked) {
        continue;
      }
    }

    newItems.push(item);
  }

  return newItems;
}

export function createPostFromRssItem(
  item: RssItem,
  template: string,
  options: { includeImage?: boolean; maxLength?: number } = {}
): { content: string; imageUrl?: string } {
  const { includeImage = true, maxLength = 280 } = options;

  // Replace template variables
  let content = template
    .replace(/{title}/g, item.title)
    .replace(/{link}/g, item.link)
    .replace(/{description}/g, truncateText(item.description, 100))
    .replace(/{author}/g, item.author || "")
    .replace(/{categories}/g, item.categories?.join(", ") || "");

  // Truncate if too long (leaving room for link)
  if (content.length > maxLength) {
    // Try to keep the link intact
    const linkLength = item.link.length;
    const availableSpace = maxLength - linkLength - 5; // 5 for "... \n"

    if (availableSpace > 50) {
      const contentWithoutLink = content.replace(item.link, "").trim();
      content = truncateText(contentWithoutLink, availableSpace) + "\n" + item.link;
    } else {
      content = truncateText(content, maxLength);
    }
  }

  return {
    content,
    imageUrl: includeImage && item.image ? item.image : undefined,
  };
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3).trim() + "...";
}

// ============================================
// MAIN PROCESSING FUNCTION
// ============================================

export async function processRssFeeds(): Promise<{
  processed: number;
  postsCreated: number;
  errors: string[];
}> {
  const startTime = Date.now();
  console.log("[RSS] Starting RSS feed processing...");

  const results = {
    processed: 0,
    postsCreated: 0,
    errors: [] as string[],
  };

  try {
    // Get all active feeds that are due for checking
    const now = new Date();
    const feeds = await prisma.rssFeed.findMany({
      where: {
        isActive: true,
        autoPost: true,
        OR: [
          { lastChecked: null },
          {
            lastChecked: {
              lte: new Date(now.getTime() - 60 * 1000), // At least 1 minute ago
            },
          },
        ],
      },
      include: {
        user: {
          include: {
            xAccounts: {
              where: { isDefault: true },
              take: 1,
            },
            linkedInAccounts: {
              where: { isDefault: true },
              take: 1,
            },
            instagramAccounts: {
              where: { isDefault: true },
              take: 1,
            },
          },
        },
      },
    });

    console.log(`[RSS] Found ${feeds.length} feeds to process`);

    for (const feed of feeds) {
      // Check if it's time to check this feed based on interval
      if (feed.lastChecked) {
        const minutesSinceLastCheck = (now.getTime() - feed.lastChecked.getTime()) / (1000 * 60);
        if (minutesSinceLastCheck < feed.checkInterval) {
          continue;
        }
      }

      try {
        console.log(`[RSS] Processing feed: ${feed.name} (${feed.feedUrl})`);

        // Get posts created today for this feed
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const postsToday = await prisma.post.count({
          where: {
            userId: feed.userId,
            createdAt: { gte: todayStart },
            content: {
              contains: feed.feedUrl.split("/")[2], // Domain check
            },
          },
        });

        if (postsToday >= feed.maxPostsPerDay) {
          console.log(`[RSS] Feed ${feed.name} reached daily limit (${postsToday}/${feed.maxPostsPerDay})`);
          await prisma.rssFeed.update({
            where: { id: feed.id },
            data: { lastChecked: now },
          });
          continue;
        }

        // Check for new items
        const newItems = await checkForNewItems(feed.id);
        console.log(`[RSS] Found ${newItems.length} new items in ${feed.name}`);

        // Limit to remaining daily quota
        const remainingQuota = feed.maxPostsPerDay - postsToday;
        const itemsToProcess = newItems.slice(0, remainingQuota);

        // Create posts for new items
        for (const item of itemsToProcess) {
          try {
            const { content, imageUrl } = createPostFromRssItem(
              item,
              feed.postTemplate || "{title}\n\n{link}",
              { includeImage: feed.includeImage }
            );

            // Create post for each selected platform
            for (const platform of feed.platforms) {
              // Get the appropriate account ID
              let accountId: { [key: string]: string } = {};

              if (platform === Platform.X && feed.user.xAccounts[0]) {
                accountId = { xAccountId: feed.user.xAccounts[0].id };
              } else if (platform === Platform.LINKEDIN && feed.user.linkedInAccounts[0]) {
                accountId = { linkedInAccountId: feed.user.linkedInAccounts[0].id };
              } else if (platform === Platform.INSTAGRAM && feed.user.instagramAccounts[0]) {
                accountId = { instagramAccountId: feed.user.instagramAccounts[0].id };
              } else {
                console.log(`[RSS] No account for platform ${platform}, skipping`);
                continue;
              }

              await prisma.post.create({
                data: {
                  userId: feed.userId,
                  platform,
                  content,
                  status: "SCHEDULED",
                  scheduledFor: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
                  mediaUrls: imageUrl ? [imageUrl] : [],
                  categoryId: feed.categoryId,
                  ...accountId,
                },
              });

              results.postsCreated++;
              console.log(`[RSS] Created post for ${platform}: ${content.substring(0, 50)}...`);
            }
          } catch (itemError) {
            const errorMsg = `Failed to process item ${item.guid}: ${itemError instanceof Error ? itemError.message : "Unknown error"}`;
            console.error(`[RSS] ${errorMsg}`);
            results.errors.push(errorMsg);
          }
        }

        // Update feed with last checked time and last item guid
        await prisma.rssFeed.update({
          where: { id: feed.id },
          data: {
            lastChecked: now,
            lastItemGuid: newItems[0]?.guid || feed.lastItemGuid,
            totalPosted: { increment: itemsToProcess.length * feed.platforms.length },
          },
        });

        results.processed++;
      } catch (feedError) {
        const errorMsg = `Failed to process feed ${feed.name}: ${feedError instanceof Error ? feedError.message : "Unknown error"}`;
        console.error(`[RSS] ${errorMsg}`);
        results.errors.push(errorMsg);

        // Still update lastChecked to prevent repeated failures
        await prisma.rssFeed.update({
          where: { id: feed.id },
          data: { lastChecked: now },
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[RSS] Processing completed in ${duration}ms. Processed: ${results.processed}, Posts created: ${results.postsCreated}`);

    return results;
  } catch (error) {
    console.error("[RSS] Fatal error in RSS processing:", error);
    results.errors.push(`Fatal error: ${error instanceof Error ? error.message : "Unknown error"}`);
    return results;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export async function previewFeed(feedUrl: string, limit: number = 5): Promise<{
  feed: ParsedFeed;
  samplePosts: Array<{ content: string; imageUrl?: string }>;
}> {
  const feed = await parseFeed(feedUrl);

  const samplePosts = feed.items.slice(0, limit).map((item) =>
    createPostFromRssItem(item, "{title}\n\n{link}", { includeImage: true })
  );

  return {
    feed: {
      ...feed,
      items: feed.items.slice(0, limit),
    },
    samplePosts,
  };
}

export async function validateFeedUrl(feedUrl: string): Promise<{
  valid: boolean;
  error?: string;
  feedInfo?: {
    title: string;
    description: string;
    itemCount: number;
  };
}> {
  try {
    const url = new URL(feedUrl);
    if (!["http:", "https:"].includes(url.protocol)) {
      return { valid: false, error: "URL must use HTTP or HTTPS protocol" };
    }

    const feed = await parseFeed(feedUrl);

    if (feed.items.length === 0) {
      return { valid: false, error: "Feed contains no items" };
    }

    return {
      valid: true,
      feedInfo: {
        title: feed.title,
        description: feed.description,
        itemCount: feed.items.length,
      },
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Failed to validate feed",
    };
  }
}

export async function getFeedStats(feedId: string): Promise<{
  totalPosted: number;
  postsToday: number;
  postsThisWeek: number;
  lastPostDate?: Date;
}> {
  const feed = await prisma.rssFeed.findUnique({
    where: { id: feedId },
  });

  if (!feed) {
    throw new Error("Feed not found");
  }

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  // Count posts from this feed
  const postsToday = await prisma.post.count({
    where: {
      userId: feed.userId,
      createdAt: { gte: todayStart },
      content: { contains: new URL(feed.feedUrl).hostname },
    },
  });

  const postsThisWeek = await prisma.post.count({
    where: {
      userId: feed.userId,
      createdAt: { gte: weekStart },
      content: { contains: new URL(feed.feedUrl).hostname },
    },
  });

  const lastPost = await prisma.post.findFirst({
    where: {
      userId: feed.userId,
      content: { contains: new URL(feed.feedUrl).hostname },
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  return {
    totalPosted: feed.totalPosted,
    postsToday,
    postsThisWeek,
    lastPostDate: lastPost?.createdAt,
  };
}
