import { prisma } from "../prisma";

const PINTEREST_API_URL = "https://api.pinterest.com/v5";
const PINTEREST_AUTH_URL = "https://www.pinterest.com/oauth";

export interface PinterestTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface PinterestProfile {
  id: string;
  username: string;
  businessName?: string;
  profileImage?: string;
  websiteUrl?: string;
  followerCount?: number;
  followingCount?: number;
  pinCount?: number;
  boardCount?: number;
}

export interface PinterestBoard {
  id: string;
  name: string;
  description?: string;
  privacy: string;
  pinCount?: number;
}

export interface PinAnalytics {
  pinId: string;
  impressions: number;
  saves: number;
  clicks: number;
  comments: number;
  engagementRate: number;
}

/**
 * Generate Pinterest OAuth authorization URL
 */
export function getPinterestAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.PINTEREST_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "boards:read,boards:write,pins:read,pins:write,user_accounts:read",
    state,
  });

  return `${PINTEREST_AUTH_URL}/?${params.toString()}`;
}

/**
 * Exchange authorization code for access tokens
 */
export async function exchangePinterestCode(
  code: string,
  redirectUri: string
): Promise<PinterestTokens> {
  const credentials = Buffer.from(
    `${process.env.PINTEREST_CLIENT_ID}:${process.env.PINTEREST_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch(`${PINTEREST_API_URL}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange Pinterest code: ${error}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Refresh Pinterest access token
 */
export async function refreshPinterestToken(
  refreshToken: string
): Promise<PinterestTokens> {
  const credentials = Buffer.from(
    `${process.env.PINTEREST_CLIENT_ID}:${process.env.PINTEREST_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch(`${PINTEREST_API_URL}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh Pinterest token: ${error}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Create a new pin on Pinterest
 */
export async function createPin(
  accessToken: string,
  boardId: string,
  imageUrl: string,
  title: string,
  description: string,
  link?: string
): Promise<{ id: string }> {
  const pinData: Record<string, unknown> = {
    board_id: boardId,
    media_source: {
      source_type: "image_url",
      url: imageUrl,
    },
    title,
    description,
  };

  if (link) {
    pinData.link = link;
  }

  const response = await fetch(`${PINTEREST_API_URL}/pins`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(pinData),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Pinterest pin: ${error}`);
  }

  const data = await response.json();
  return { id: data.id };
}

/**
 * Get user's Pinterest boards
 */
export async function getBoards(accessToken: string): Promise<PinterestBoard[]> {
  const response = await fetch(
    `${PINTEREST_API_URL}/boards?page_size=100`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch Pinterest boards: ${error}`);
  }

  const data = await response.json();
  return data.items.map((board: Record<string, unknown>) => ({
    id: board.id,
    name: board.name,
    description: board.description,
    privacy: board.privacy,
    pinCount: board.pin_count,
  }));
}

/**
 * Get analytics for a specific pin
 */
export async function getPinAnalytics(
  accessToken: string,
  pinId: string
): Promise<PinAnalytics> {
  const response = await fetch(
    `${PINTEREST_API_URL}/pins/${pinId}/analytics?` +
      new URLSearchParams({
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        end_date: new Date().toISOString().split("T")[0],
        metric_types: "IMPRESSION,SAVE,PIN_CLICK,OUTBOUND_CLICK",
      }),
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch Pinterest pin analytics: ${error}`);
  }

  const data = await response.json();

  const metrics = data.all?.daily_metrics || [];
  const totals = metrics.reduce(
    (acc: Record<string, number>, day: Record<string, number>) => ({
      impressions: (acc.impressions || 0) + (day.IMPRESSION || 0),
      saves: (acc.saves || 0) + (day.SAVE || 0),
      clicks: (acc.clicks || 0) + (day.PIN_CLICK || 0) + (day.OUTBOUND_CLICK || 0),
    }),
    { impressions: 0, saves: 0, clicks: 0 }
  );

  const engagementRate =
    totals.impressions > 0
      ? ((totals.saves + totals.clicks) / totals.impressions) * 100
      : 0;

  return {
    pinId,
    impressions: totals.impressions,
    saves: totals.saves,
    clicks: totals.clicks,
    comments: 0,
    engagementRate,
  };
}

/**
 * Get Pinterest user profile
 */
export async function getPinterestProfile(
  accessToken: string
): Promise<PinterestProfile> {
  const response = await fetch(`${PINTEREST_API_URL}/user_account`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch Pinterest profile: ${error}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    username: data.username,
    businessName: data.business_name,
    profileImage: data.profile_image,
    websiteUrl: data.website_url,
    followerCount: data.follower_count,
    followingCount: data.following_count,
    pinCount: data.pin_count,
    boardCount: data.board_count,
  };
}

/**
 * Save Pinterest account to database
 */
export async function savePinterestAccount(
  userId: string,
  tokens: PinterestTokens,
  profile: PinterestProfile
) {
  const existingAccount = await prisma.pinterestAccount.findUnique({
    where: { pinterestId: profile.id },
  });

  if (existingAccount) {
    return prisma.pinterestAccount.update({
      where: { id: existingAccount.id },
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
      },
    });
  }

  const userAccounts = await prisma.pinterestAccount.count({
    where: { userId },
  });

  return prisma.pinterestAccount.create({
    data: {
      userId,
      pinterestId: profile.id,
      username: profile.username,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
      isDefault: userAccounts === 0,
    },
  });
}

/**
 * Create a video pin on Pinterest
 */
export async function createVideoPin(
  accessToken: string,
  boardId: string,
  videoUrl: string,
  coverImageUrl: string,
  title: string,
  description: string,
  link?: string
): Promise<{ id: string }> {
  const pinData: Record<string, unknown> = {
    board_id: boardId,
    media_source: {
      source_type: "video_id",
      cover_image_url: coverImageUrl,
      media_id: videoUrl,
    },
    title,
    description,
  };

  if (link) {
    pinData.link = link;
  }

  const response = await fetch(`${PINTEREST_API_URL}/pins`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(pinData),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Pinterest video pin: ${error}`);
  }

  const data = await response.json();
  return { id: data.id };
}

/**
 * Get a specific pin by ID
 */
export async function getPin(
  accessToken: string,
  pinId: string
): Promise<Record<string, unknown>> {
  const response = await fetch(`${PINTEREST_API_URL}/pins/${pinId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch Pinterest pin: ${error}`);
  }

  return response.json();
}

/**
 * Delete a pin
 */
export async function deletePin(
  accessToken: string,
  pinId: string
): Promise<void> {
  const response = await fetch(`${PINTEREST_API_URL}/pins/${pinId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete Pinterest pin: ${error}`);
  }
}
