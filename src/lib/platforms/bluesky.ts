import { prisma } from "../prisma";

const BLUESKY_API_URL = "https://bsky.social/xrpc";

export interface BlueskySession {
  did: string;
  handle: string;
  accessJwt: string;
  refreshJwt: string;
  email?: string;
  emailConfirmed?: boolean;
}

export interface BlueskyProfile {
  did: string;
  handle: string;
  displayName?: string;
  description?: string;
  avatar?: string;
  banner?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
}

export interface BlueskyPost {
  uri: string;
  cid: string;
  text: string;
  createdAt: string;
  author: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
  };
  replyCount?: number;
  repostCount?: number;
  likeCount?: number;
}

export interface BlueskyImage {
  blob: {
    $type: string;
    ref: {
      $link: string;
    };
    mimeType: string;
    size: number;
  };
  alt?: string;
  aspectRatio?: {
    width: number;
    height: number;
  };
}

/**
 * Login to Bluesky using identifier (handle or email) and app password
 * Returns session tokens for subsequent API calls
 */
export async function loginBluesky(
  identifier: string,
  password: string
): Promise<BlueskySession> {
  const response = await fetch(`${BLUESKY_API_URL}/com.atproto.server.createSession`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      identifier,
      password,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || "Failed to login to Bluesky");
  }

  const data = await response.json();
  return {
    did: data.did,
    handle: data.handle,
    accessJwt: data.accessJwt,
    refreshJwt: data.refreshJwt,
    email: data.email,
    emailConfirmed: data.emailConfirmed,
  };
}

/**
 * Refresh Bluesky session using refresh JWT
 */
export async function refreshBlueskySession(
  refreshJwt: string
): Promise<BlueskySession> {
  const response = await fetch(`${BLUESKY_API_URL}/com.atproto.server.refreshSession`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${refreshJwt}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || "Failed to refresh Bluesky session");
  }

  const data = await response.json();
  return {
    did: data.did,
    handle: data.handle,
    accessJwt: data.accessJwt,
    refreshJwt: data.refreshJwt,
  };
}

/**
 * Create a post (skeet) on Bluesky
 * Supports plain text and images
 */
export async function createBlueskyPost(
  session: BlueskySession,
  text: string,
  images?: BlueskyImage[]
): Promise<{ uri: string; cid: string }> {
  const now = new Date().toISOString();

  const record: Record<string, unknown> = {
    $type: "app.bsky.feed.post",
    text,
    createdAt: now,
  };

  // Parse facets (mentions and links) from text
  const facets = await parseFacets(text, session.accessJwt);
  if (facets.length > 0) {
    record.facets = facets;
  }

  // Add images embed if provided
  if (images && images.length > 0) {
    record.embed = {
      $type: "app.bsky.embed.images",
      images: images.map((img) => ({
        image: img.blob,
        alt: img.alt || "",
        aspectRatio: img.aspectRatio,
      })),
    };
  }

  const response = await fetch(`${BLUESKY_API_URL}/com.atproto.repo.createRecord`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessJwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      repo: session.did,
      collection: "app.bsky.feed.post",
      record,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || "Failed to create Bluesky post");
  }

  const data = await response.json();
  return {
    uri: data.uri,
    cid: data.cid,
  };
}

/**
 * Parse text to find mentions and links, returning facets for rich text
 */
async function parseFacets(
  text: string,
  accessJwt: string
): Promise<Array<Record<string, unknown>>> {
  const facets: Array<Record<string, unknown>> = [];
  const encoder = new TextEncoder();

  // Find mentions (@handle.bsky.social)
  const mentionRegex = /@([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?/g;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    const handle = match[0].slice(1); // Remove @ prefix
    try {
      const did = await resolveHandle(handle, accessJwt);
      if (did) {
        const byteStart = encoder.encode(text.slice(0, match.index)).length;
        const byteEnd = byteStart + encoder.encode(match[0]).length;
        facets.push({
          index: { byteStart, byteEnd },
          features: [{ $type: "app.bsky.richtext.facet#mention", did }],
        });
      }
    } catch {
      // Skip if handle resolution fails
    }
  }

  // Find links (http:// or https://)
  const urlRegex = /https?:\/\/[^\s<>"\)]+/g;
  while ((match = urlRegex.exec(text)) !== null) {
    const byteStart = encoder.encode(text.slice(0, match.index)).length;
    const byteEnd = byteStart + encoder.encode(match[0]).length;
    facets.push({
      index: { byteStart, byteEnd },
      features: [{ $type: "app.bsky.richtext.facet#link", uri: match[0] }],
    });
  }

  // Find hashtags (#tag)
  const hashtagRegex = /#[a-zA-Z][a-zA-Z0-9_]*/g;
  while ((match = hashtagRegex.exec(text)) !== null) {
    const byteStart = encoder.encode(text.slice(0, match.index)).length;
    const byteEnd = byteStart + encoder.encode(match[0]).length;
    facets.push({
      index: { byteStart, byteEnd },
      features: [{ $type: "app.bsky.richtext.facet#tag", tag: match[0].slice(1) }],
    });
  }

  return facets;
}

/**
 * Resolve a handle to a DID
 */
async function resolveHandle(
  handle: string,
  accessJwt: string
): Promise<string | null> {
  const response = await fetch(
    `${BLUESKY_API_URL}/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`,
    {
      headers: {
        Authorization: `Bearer ${accessJwt}`,
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.did;
}

/**
 * Get Bluesky user profile
 */
export async function getBlueskyProfile(
  session: BlueskySession
): Promise<BlueskyProfile> {
  const response = await fetch(
    `${BLUESKY_API_URL}/app.bsky.actor.getProfile?actor=${encodeURIComponent(session.did)}`,
    {
      headers: {
        Authorization: `Bearer ${session.accessJwt}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || "Failed to fetch Bluesky profile");
  }

  const data = await response.json();
  return {
    did: data.did,
    handle: data.handle,
    displayName: data.displayName,
    description: data.description,
    avatar: data.avatar,
    banner: data.banner,
    followersCount: data.followersCount,
    followsCount: data.followsCount,
    postsCount: data.postsCount,
  };
}

/**
 * Get user's Bluesky feed (their own posts)
 */
export async function getBlueskyFeed(
  session: BlueskySession,
  limit: number = 50
): Promise<BlueskyPost[]> {
  const response = await fetch(
    `${BLUESKY_API_URL}/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(session.did)}&limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${session.accessJwt}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || "Failed to fetch Bluesky feed");
  }

  const data = await response.json();
  return data.feed.map((item: Record<string, unknown>) => {
    const post = item.post as Record<string, unknown>;
    const author = post.author as Record<string, unknown>;
    const record = post.record as Record<string, unknown>;

    return {
      uri: post.uri,
      cid: post.cid,
      text: record.text,
      createdAt: record.createdAt,
      author: {
        did: author.did,
        handle: author.handle,
        displayName: author.displayName,
        avatar: author.avatar,
      },
      replyCount: post.replyCount,
      repostCount: post.repostCount,
      likeCount: post.likeCount,
    };
  });
}

/**
 * Upload an image to Bluesky for use in posts
 * Returns a blob reference that can be used in createBlueskyPost
 */
export async function uploadBlueskyImage(
  session: BlueskySession,
  imageBlob: Blob
): Promise<BlueskyImage> {
  const response = await fetch(`${BLUESKY_API_URL}/com.atproto.repo.uploadBlob`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessJwt}`,
      "Content-Type": imageBlob.type,
    },
    body: imageBlob,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || "Failed to upload image to Bluesky");
  }

  const data = await response.json();
  return {
    blob: data.blob,
  };
}

/**
 * Save Bluesky account to database
 */
export async function saveBlueskyAccount(
  userId: string,
  session: BlueskySession,
  profile: BlueskyProfile
) {
  const existingAccount = await prisma.blueskyAccount.findUnique({
    where: { did: session.did },
  });

  if (existingAccount) {
    return prisma.blueskyAccount.update({
      where: { id: existingAccount.id },
      data: {
        handle: session.handle,
        displayName: profile.displayName,
        accessJwt: session.accessJwt,
        refreshJwt: session.refreshJwt,
      },
    });
  }

  const userAccounts = await prisma.blueskyAccount.count({
    where: { userId },
  });

  return prisma.blueskyAccount.create({
    data: {
      userId,
      did: session.did,
      handle: session.handle,
      displayName: profile.displayName,
      accessJwt: session.accessJwt,
      refreshJwt: session.refreshJwt,
      isDefault: userAccounts === 0,
    },
  });
}

/**
 * Delete a post from Bluesky
 */
export async function deleteBlueskyPost(
  session: BlueskySession,
  uri: string
): Promise<void> {
  // Extract rkey from URI: at://did:plc:xxx/app.bsky.feed.post/rkey
  const parts = uri.split("/");
  const rkey = parts[parts.length - 1];

  const response = await fetch(`${BLUESKY_API_URL}/com.atproto.repo.deleteRecord`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessJwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      repo: session.did,
      collection: "app.bsky.feed.post",
      rkey,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || "Failed to delete Bluesky post");
  }
}

/**
 * Like a post on Bluesky
 */
export async function likeBlueskyPost(
  session: BlueskySession,
  uri: string,
  cid: string
): Promise<{ uri: string; cid: string }> {
  const response = await fetch(`${BLUESKY_API_URL}/com.atproto.repo.createRecord`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessJwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      repo: session.did,
      collection: "app.bsky.feed.like",
      record: {
        $type: "app.bsky.feed.like",
        subject: { uri, cid },
        createdAt: new Date().toISOString(),
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || "Failed to like Bluesky post");
  }

  const data = await response.json();
  return { uri: data.uri, cid: data.cid };
}

/**
 * Repost a post on Bluesky
 */
export async function repostBlueskyPost(
  session: BlueskySession,
  uri: string,
  cid: string
): Promise<{ uri: string; cid: string }> {
  const response = await fetch(`${BLUESKY_API_URL}/com.atproto.repo.createRecord`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessJwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      repo: session.did,
      collection: "app.bsky.feed.repost",
      record: {
        $type: "app.bsky.feed.repost",
        subject: { uri, cid },
        createdAt: new Date().toISOString(),
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || "Failed to repost on Bluesky");
  }

  const data = await response.json();
  return { uri: data.uri, cid: data.cid };
}

/**
 * Get timeline (home feed) from Bluesky
 */
export async function getBlueskyTimeline(
  session: BlueskySession,
  limit: number = 50
): Promise<BlueskyPost[]> {
  const response = await fetch(
    `${BLUESKY_API_URL}/app.bsky.feed.getTimeline?limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${session.accessJwt}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || "Failed to fetch Bluesky timeline");
  }

  const data = await response.json();
  return data.feed.map((item: Record<string, unknown>) => {
    const post = item.post as Record<string, unknown>;
    const author = post.author as Record<string, unknown>;
    const record = post.record as Record<string, unknown>;

    return {
      uri: post.uri,
      cid: post.cid,
      text: record.text,
      createdAt: record.createdAt,
      author: {
        did: author.did,
        handle: author.handle,
        displayName: author.displayName,
        avatar: author.avatar,
      },
      replyCount: post.replyCount,
      repostCount: post.repostCount,
      likeCount: post.likeCount,
    };
  });
}
