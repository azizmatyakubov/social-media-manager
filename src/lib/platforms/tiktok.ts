import { prisma } from "../prisma";

const TIKTOK_API_URL = "https://open.tiktokapis.com/v2";
const TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize";
const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token";

export interface TikTokTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  openId: string;
  scope: string;
}

export interface TikTokProfile {
  openId: string;
  unionId?: string;
  avatarUrl?: string;
  avatarUrl100?: string;
  avatarLargeUrl?: string;
  displayName: string;
  bioDescription?: string;
  profileDeepLink?: string;
  isVerified?: boolean;
  followerCount?: number;
  followingCount?: number;
  likesCount?: number;
  videoCount?: number;
}

export interface TikTokVideoStats {
  id: string;
  createTime: number;
  coverImageUrl?: string;
  shareUrl?: string;
  videoDescription?: string;
  duration: number;
  title?: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  viewCount: number;
}

export function getTikTokAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    response_type: "code",
    scope: "user.info.basic,user.info.profile,user.info.stats,video.publish,video.upload,video.list",
    redirect_uri: redirectUri,
    state,
  });

  return `${TIKTOK_AUTH_URL}?${params.toString()}`;
}

export async function exchangeTikTokCode(
  code: string,
  redirectUri: string
): Promise<TikTokTokens> {
  const response = await fetch(TIKTOK_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange TikTok code: ${error}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`TikTok OAuth error: ${data.error_description || data.error}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    refreshExpiresIn: data.refresh_expires_in,
    openId: data.open_id,
    scope: data.scope,
  };
}

export async function refreshTikTokToken(refreshToken: string): Promise<TikTokTokens> {
  const response = await fetch(TIKTOK_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh TikTok token: ${error}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`TikTok token refresh error: ${data.error_description || data.error}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    refreshExpiresIn: data.refresh_expires_in,
    openId: data.open_id,
    scope: data.scope,
  };
}

export async function getTikTokProfile(accessToken: string): Promise<TikTokProfile> {
  const fields = [
    "open_id",
    "union_id",
    "avatar_url",
    "avatar_url_100",
    "avatar_large_url",
    "display_name",
    "bio_description",
    "profile_deep_link",
    "is_verified",
    "follower_count",
    "following_count",
    "likes_count",
    "video_count",
  ].join(",");

  const response = await fetch(`${TIKTOK_API_URL}/user/info/?fields=${fields}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch TikTok profile: ${error}`);
  }

  const result = await response.json();

  if (result.error.code !== "ok") {
    throw new Error(`TikTok API error: ${result.error.message}`);
  }

  const user = result.data.user;
  return {
    openId: user.open_id,
    unionId: user.union_id,
    avatarUrl: user.avatar_url,
    avatarUrl100: user.avatar_url_100,
    avatarLargeUrl: user.avatar_large_url,
    displayName: user.display_name,
    bioDescription: user.bio_description,
    profileDeepLink: user.profile_deep_link,
    isVerified: user.is_verified,
    followerCount: user.follower_count,
    followingCount: user.following_count,
    likesCount: user.likes_count,
    videoCount: user.video_count,
  };
}

export async function publishTikTokVideo(
  accessToken: string,
  videoUrl: string,
  caption: string,
  hashtags?: string[]
): Promise<{ publishId: string }> {
  // Step 1: Initialize the video upload
  const initResponse = await fetch(`${TIKTOK_API_URL}/post/publish/video/init/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      post_info: {
        title: caption,
        privacy_level: "PUBLIC_TO_EVERYONE",
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        video_cover_timestamp_ms: 1000,
      },
      source_info: {
        source: "PULL_FROM_URL",
        video_url: videoUrl,
      },
    }),
  });

  if (!initResponse.ok) {
    const error = await initResponse.text();
    throw new Error(`Failed to initialize TikTok video upload: ${error}`);
  }

  const initResult = await initResponse.json();

  if (initResult.error.code !== "ok") {
    throw new Error(`TikTok video init error: ${initResult.error.message}`);
  }

  return {
    publishId: initResult.data.publish_id,
  };
}

export async function getTikTokAnalytics(
  accessToken: string,
  videoId: string
): Promise<TikTokVideoStats> {
  const fields = [
    "id",
    "create_time",
    "cover_image_url",
    "share_url",
    "video_description",
    "duration",
    "title",
    "like_count",
    "comment_count",
    "share_count",
    "view_count",
  ].join(",");

  const response = await fetch(`${TIKTOK_API_URL}/video/query/?fields=${fields}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filters: {
        video_ids: [videoId],
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch TikTok video analytics: ${error}`);
  }

  const result = await response.json();

  if (result.error.code !== "ok") {
    throw new Error(`TikTok API error: ${result.error.message}`);
  }

  const video = result.data.videos[0];
  if (!video) {
    throw new Error("Video not found");
  }

  return {
    id: video.id,
    createTime: video.create_time,
    coverImageUrl: video.cover_image_url,
    shareUrl: video.share_url,
    videoDescription: video.video_description,
    duration: video.duration,
    title: video.title,
    likeCount: video.like_count,
    commentCount: video.comment_count,
    shareCount: video.share_count,
    viewCount: video.view_count,
  };
}

export async function getTikTokVideos(
  accessToken: string,
  cursor?: number,
  maxCount: number = 20
): Promise<{ videos: TikTokVideoStats[]; cursor: number; hasMore: boolean }> {
  const fields = [
    "id",
    "create_time",
    "cover_image_url",
    "share_url",
    "video_description",
    "duration",
    "title",
    "like_count",
    "comment_count",
    "share_count",
    "view_count",
  ].join(",");

  const response = await fetch(`${TIKTOK_API_URL}/video/list/?fields=${fields}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      max_count: maxCount,
      cursor: cursor || 0,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch TikTok videos: ${error}`);
  }

  const result = await response.json();

  if (result.error.code !== "ok") {
    throw new Error(`TikTok API error: ${result.error.message}`);
  }

  return {
    videos: result.data.videos.map((video: Record<string, unknown>) => ({
      id: video.id,
      createTime: video.create_time,
      coverImageUrl: video.cover_image_url,
      shareUrl: video.share_url,
      videoDescription: video.video_description,
      duration: video.duration,
      title: video.title,
      likeCount: video.like_count,
      commentCount: video.comment_count,
      shareCount: video.share_count,
      viewCount: video.view_count,
    })),
    cursor: result.data.cursor,
    hasMore: result.data.has_more,
  };
}

export async function saveTikTokAccount(
  userId: string,
  tokens: TikTokTokens,
  profile: TikTokProfile
) {
  const existingAccount = await prisma.tikTokAccount.findUnique({
    where: { tiktokId: profile.openId },
  });

  if (existingAccount) {
    return prisma.tikTokAccount.update({
      where: { id: existingAccount.id },
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        displayName: profile.displayName,
      },
    });
  }

  // Check if user has any TikTok accounts
  const userAccounts = await prisma.tikTokAccount.count({
    where: { userId },
  });

  return prisma.tikTokAccount.create({
    data: {
      userId,
      tiktokId: profile.openId,
      username: profile.displayName.toLowerCase().replace(/\s+/g, "_"),
      displayName: profile.displayName,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
      isDefault: userAccounts === 0,
    },
  });
}

export async function checkAndRefreshTikTokToken(accountId: string): Promise<string> {
  const account = await prisma.tikTokAccount.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new Error("TikTok account not found");
  }

  // Check if token expires within 5 minutes
  const expiresAt = account.tokenExpiresAt;
  if (expiresAt && expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    if (!account.refreshToken) {
      throw new Error("No refresh token available");
    }

    const newTokens = await refreshTikTokToken(account.refreshToken);

    await prisma.tikTokAccount.update({
      where: { id: accountId },
      data: {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        tokenExpiresAt: new Date(Date.now() + newTokens.expiresIn * 1000),
      },
    });

    return newTokens.accessToken;
  }

  return account.accessToken;
}
