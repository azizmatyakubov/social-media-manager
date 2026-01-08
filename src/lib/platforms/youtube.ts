import { prisma } from "../prisma";

const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3";
const YOUTUBE_UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export interface YouTubeTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  scope: string;
}

export interface YouTubeChannel {
  id: string;
  title: string;
  description?: string;
  customUrl?: string;
  publishedAt?: string;
  thumbnailUrl?: string;
  subscriberCount?: number;
  videoCount?: number;
  viewCount?: number;
  country?: string;
}

export interface YouTubeVideoStats {
  id: string;
  title: string;
  description?: string;
  publishedAt: string;
  thumbnailUrl?: string;
  channelId: string;
  channelTitle: string;
  duration?: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  favoriteCount: number;
}

export interface YouTubeUploadResult {
  id: string;
  title: string;
  description?: string;
  publishedAt: string;
  channelId: string;
  status: string;
}

export function getYouTubeAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.YOUTUBE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube.force-ssl",
      "https://www.googleapis.com/auth/userinfo.profile",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeYouTubeCode(
  code: string,
  redirectUri: string
): Promise<YouTubeTokens> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange YouTube code: ${error}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`YouTube OAuth error: ${data.error_description || data.error}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
    scope: data.scope,
  };
}

export async function refreshYouTubeToken(refreshToken: string): Promise<YouTubeTokens> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh YouTube token: ${error}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`YouTube token refresh error: ${data.error_description || data.error}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: refreshToken, // Google doesn't return a new refresh token
    expiresIn: data.expires_in,
    tokenType: data.token_type,
    scope: data.scope,
  };
}

export async function getYouTubeChannel(accessToken: string): Promise<YouTubeChannel> {
  const params = new URLSearchParams({
    part: "snippet,statistics,contentDetails",
    mine: "true",
  });

  const response = await fetch(`${YOUTUBE_API_URL}/channels?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch YouTube channel: ${error}`);
  }

  const data = await response.json();

  if (!data.items || data.items.length === 0) {
    throw new Error("No YouTube channel found for this account");
  }

  const channel = data.items[0];
  return {
    id: channel.id,
    title: channel.snippet.title,
    description: channel.snippet.description,
    customUrl: channel.snippet.customUrl,
    publishedAt: channel.snippet.publishedAt,
    thumbnailUrl: channel.snippet.thumbnails?.high?.url || channel.snippet.thumbnails?.default?.url,
    subscriberCount: parseInt(channel.statistics?.subscriberCount || "0", 10),
    videoCount: parseInt(channel.statistics?.videoCount || "0", 10),
    viewCount: parseInt(channel.statistics?.viewCount || "0", 10),
    country: channel.snippet.country,
  };
}

export async function publishYouTubeShort(
  accessToken: string,
  videoUrl: string,
  title: string,
  description?: string
): Promise<YouTubeUploadResult> {
  // First, fetch the video from the URL
  const videoResponse = await fetch(videoUrl);
  if (!videoResponse.ok) {
    throw new Error("Failed to fetch video from URL");
  }

  const videoBlob = await videoResponse.blob();
  const videoBuffer = await videoBlob.arrayBuffer();

  // YouTube Shorts requirements:
  // - Vertical video (9:16 aspect ratio)
  // - Maximum 60 seconds
  // - #Shorts in title or description helps discovery

  const metadata = {
    snippet: {
      title: title.includes("#Shorts") ? title : `${title} #Shorts`,
      description: description || "",
      categoryId: "22", // People & Blogs
    },
    status: {
      privacyStatus: "public",
      selfDeclaredMadeForKids: false,
    },
  };

  // Initiate resumable upload
  const initResponse = await fetch(
    `${YOUTUBE_UPLOAD_URL}/videos?uploadType=resumable&part=snippet,status`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": videoBlob.type || "video/mp4",
        "X-Upload-Content-Length": String(videoBuffer.byteLength),
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!initResponse.ok) {
    const error = await initResponse.text();
    throw new Error(`Failed to initiate YouTube upload: ${error}`);
  }

  const uploadUrl = initResponse.headers.get("location");
  if (!uploadUrl) {
    throw new Error("No upload URL returned from YouTube");
  }

  // Upload the video
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": videoBlob.type || "video/mp4",
      "Content-Length": String(videoBuffer.byteLength),
    },
    body: videoBuffer,
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    throw new Error(`Failed to upload video to YouTube: ${error}`);
  }

  const result = await uploadResponse.json();

  return {
    id: result.id,
    title: result.snippet.title,
    description: result.snippet.description,
    publishedAt: result.snippet.publishedAt,
    channelId: result.snippet.channelId,
    status: result.status.uploadStatus,
  };
}

export async function getYouTubeAnalytics(
  accessToken: string,
  videoId: string
): Promise<YouTubeVideoStats> {
  const params = new URLSearchParams({
    part: "snippet,statistics,contentDetails",
    id: videoId,
  });

  const response = await fetch(`${YOUTUBE_API_URL}/videos?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch YouTube video analytics: ${error}`);
  }

  const data = await response.json();

  if (!data.items || data.items.length === 0) {
    throw new Error("Video not found");
  }

  const video = data.items[0];
  return {
    id: video.id,
    title: video.snippet.title,
    description: video.snippet.description,
    publishedAt: video.snippet.publishedAt,
    thumbnailUrl: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.default?.url,
    channelId: video.snippet.channelId,
    channelTitle: video.snippet.channelTitle,
    duration: video.contentDetails?.duration,
    viewCount: parseInt(video.statistics?.viewCount || "0", 10),
    likeCount: parseInt(video.statistics?.likeCount || "0", 10),
    commentCount: parseInt(video.statistics?.commentCount || "0", 10),
    favoriteCount: parseInt(video.statistics?.favoriteCount || "0", 10),
  };
}

export async function getYouTubeVideos(
  accessToken: string,
  channelId: string,
  maxResults: number = 20,
  pageToken?: string
): Promise<{ videos: YouTubeVideoStats[]; nextPageToken?: string }> {
  // First get the uploads playlist ID
  const channelParams = new URLSearchParams({
    part: "contentDetails",
    id: channelId,
  });

  const channelResponse = await fetch(
    `${YOUTUBE_API_URL}/channels?${channelParams.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!channelResponse.ok) {
    throw new Error("Failed to fetch channel info");
  }

  const channelData = await channelResponse.json();
  const uploadsPlaylistId =
    channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

  if (!uploadsPlaylistId) {
    throw new Error("Could not find uploads playlist");
  }

  // Get videos from uploads playlist
  const playlistParams = new URLSearchParams({
    part: "snippet",
    playlistId: uploadsPlaylistId,
    maxResults: String(maxResults),
  });

  if (pageToken) {
    playlistParams.set("pageToken", pageToken);
  }

  const playlistResponse = await fetch(
    `${YOUTUBE_API_URL}/playlistItems?${playlistParams.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!playlistResponse.ok) {
    throw new Error("Failed to fetch playlist items");
  }

  const playlistData = await playlistResponse.json();
  const videoIds = playlistData.items
    .map((item: { snippet?: { resourceId?: { videoId?: string } } }) =>
      item.snippet?.resourceId?.videoId
    )
    .filter(Boolean)
    .join(",");

  if (!videoIds) {
    return { videos: [], nextPageToken: undefined };
  }

  // Get video statistics
  const videosParams = new URLSearchParams({
    part: "snippet,statistics,contentDetails",
    id: videoIds,
  });

  const videosResponse = await fetch(
    `${YOUTUBE_API_URL}/videos?${videosParams.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!videosResponse.ok) {
    throw new Error("Failed to fetch video details");
  }

  const videosData = await videosResponse.json();

  return {
    videos: videosData.items.map((video: Record<string, unknown>) => {
      const snippet = video.snippet as Record<string, unknown>;
      const statistics = video.statistics as Record<string, string>;
      const contentDetails = video.contentDetails as Record<string, unknown>;
      const thumbnails = snippet.thumbnails as Record<string, { url?: string }>;

      return {
        id: video.id,
        title: snippet.title,
        description: snippet.description,
        publishedAt: snippet.publishedAt,
        thumbnailUrl: thumbnails?.high?.url || thumbnails?.default?.url,
        channelId: snippet.channelId,
        channelTitle: snippet.channelTitle,
        duration: contentDetails?.duration,
        viewCount: parseInt(statistics?.viewCount || "0", 10),
        likeCount: parseInt(statistics?.likeCount || "0", 10),
        commentCount: parseInt(statistics?.commentCount || "0", 10),
        favoriteCount: parseInt(statistics?.favoriteCount || "0", 10),
      };
    }),
    nextPageToken: playlistData.nextPageToken,
  };
}

export async function saveYouTubeAccount(
  userId: string,
  tokens: YouTubeTokens,
  channel: YouTubeChannel
) {
  const existingAccount = await prisma.youTubeAccount.findUnique({
    where: { youtubeId: channel.id },
  });

  if (existingAccount) {
    return prisma.youTubeAccount.update({
      where: { id: existingAccount.id },
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || existingAccount.refreshToken,
        tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        channelName: channel.title,
        channelUrl: channel.customUrl
          ? `https://www.youtube.com/${channel.customUrl}`
          : `https://www.youtube.com/channel/${channel.id}`,
      },
    });
  }

  // Check if user has any YouTube accounts
  const userAccounts = await prisma.youTubeAccount.count({
    where: { userId },
  });

  return prisma.youTubeAccount.create({
    data: {
      userId,
      youtubeId: channel.id,
      channelName: channel.title,
      channelUrl: channel.customUrl
        ? `https://www.youtube.com/${channel.customUrl}`
        : `https://www.youtube.com/channel/${channel.id}`,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
      isDefault: userAccounts === 0,
    },
  });
}

export async function checkAndRefreshYouTubeToken(accountId: string): Promise<string> {
  const account = await prisma.youTubeAccount.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new Error("YouTube account not found");
  }

  // Check if token expires within 5 minutes
  const expiresAt = account.tokenExpiresAt;
  if (expiresAt && expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    if (!account.refreshToken) {
      throw new Error("No refresh token available");
    }

    const newTokens = await refreshYouTubeToken(account.refreshToken);

    await prisma.youTubeAccount.update({
      where: { id: accountId },
      data: {
        accessToken: newTokens.accessToken,
        tokenExpiresAt: new Date(Date.now() + newTokens.expiresIn * 1000),
      },
    });

    return newTokens.accessToken;
  }

  return account.accessToken;
}

export async function deleteYouTubeVideo(
  accessToken: string,
  videoId: string
): Promise<void> {
  const response = await fetch(`${YOUTUBE_API_URL}/videos?id=${videoId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 204) {
    const error = await response.text();
    throw new Error(`Failed to delete YouTube video: ${error}`);
  }
}

export async function updateYouTubeVideo(
  accessToken: string,
  videoId: string,
  title: string,
  description?: string
): Promise<YouTubeUploadResult> {
  const metadata = {
    id: videoId,
    snippet: {
      title,
      description: description || "",
      categoryId: "22",
    },
  };

  const response = await fetch(`${YOUTUBE_API_URL}/videos?part=snippet`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update YouTube video: ${error}`);
  }

  const result = await response.json();

  return {
    id: result.id,
    title: result.snippet.title,
    description: result.snippet.description,
    publishedAt: result.snippet.publishedAt,
    channelId: result.snippet.channelId,
    status: "updated",
  };
}
