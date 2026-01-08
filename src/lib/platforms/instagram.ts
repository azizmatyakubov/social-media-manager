import { prisma } from "../prisma";

const INSTAGRAM_GRAPH_URL = "https://graph.instagram.com";
const FACEBOOK_GRAPH_URL = "https://graph.facebook.com/v18.0";

export interface InstagramTokens {
  accessToken: string;
  userId: string;
  expiresIn: number;
}

export interface InstagramProfile {
  id: string;
  username: string;
  accountType: string;
  mediaCount?: number;
  followersCount?: number;
}

export function getInstagramAuthUrl(redirectUri: string, state: string) {
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    redirect_uri: redirectUri,
    scope: "instagram_basic,instagram_content_publish,instagram_manage_insights",
    response_type: "code",
    state,
  });

  return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeInstagramCode(
  code: string,
  redirectUri: string
): Promise<InstagramTokens> {
  // Short-lived token
  const shortTokenResponse = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.INSTAGRAM_APP_ID!,
      client_secret: process.env.INSTAGRAM_APP_SECRET!,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    }),
  });

  if (!shortTokenResponse.ok) {
    throw new Error("Failed to exchange Instagram code");
  }

  const shortToken = await shortTokenResponse.json();

  // Exchange for long-lived token
  const longTokenResponse = await fetch(
    `${INSTAGRAM_GRAPH_URL}/access_token?` +
      new URLSearchParams({
        grant_type: "ig_exchange_token",
        client_secret: process.env.INSTAGRAM_APP_SECRET!,
        access_token: shortToken.access_token,
      })
  );

  if (!longTokenResponse.ok) {
    throw new Error("Failed to get long-lived Instagram token");
  }

  const longToken = await longTokenResponse.json();

  return {
    accessToken: longToken.access_token,
    userId: shortToken.user_id.toString(),
    expiresIn: longToken.expires_in,
  };
}

export async function getInstagramProfile(accessToken: string): Promise<InstagramProfile> {
  const response = await fetch(
    `${INSTAGRAM_GRAPH_URL}/me?fields=id,username,account_type,media_count&access_token=${accessToken}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch Instagram profile");
  }

  const data = await response.json();
  return {
    id: data.id,
    username: data.username,
    accountType: data.account_type,
    mediaCount: data.media_count,
  };
}

export async function publishInstagramPost(
  accessToken: string,
  userId: string,
  imageUrl: string,
  caption: string
) {
  // Step 1: Create container
  const containerResponse = await fetch(
    `${FACEBOOK_GRAPH_URL}/${userId}/media`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: accessToken,
      }),
    }
  );

  if (!containerResponse.ok) {
    const error = await containerResponse.text();
    throw new Error(`Failed to create Instagram container: ${error}`);
  }

  const container = await containerResponse.json();

  // Step 2: Publish the container
  const publishResponse = await fetch(
    `${FACEBOOK_GRAPH_URL}/${userId}/media_publish`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        creation_id: container.id,
        access_token: accessToken,
      }),
    }
  );

  if (!publishResponse.ok) {
    const error = await publishResponse.text();
    throw new Error(`Failed to publish Instagram post: ${error}`);
  }

  return publishResponse.json();
}

export async function publishInstagramCarousel(
  accessToken: string,
  userId: string,
  imageUrls: string[],
  caption: string
) {
  // Create containers for each image
  const childContainers = await Promise.all(
    imageUrls.map(async (imageUrl) => {
      const response = await fetch(`${FACEBOOK_GRAPH_URL}/${userId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: imageUrl,
          is_carousel_item: true,
          access_token: accessToken,
        }),
      });
      return response.json();
    })
  );

  // Create carousel container
  const carouselResponse = await fetch(`${FACEBOOK_GRAPH_URL}/${userId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "CAROUSEL",
      caption,
      children: childContainers.map((c) => c.id),
      access_token: accessToken,
    }),
  });

  const carousel = await carouselResponse.json();

  // Publish
  const publishResponse = await fetch(`${FACEBOOK_GRAPH_URL}/${userId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: carousel.id,
      access_token: accessToken,
    }),
  });

  return publishResponse.json();
}

export async function publishInstagramReel(
  accessToken: string,
  userId: string,
  videoUrl: string,
  caption: string,
  coverUrl?: string
) {
  const containerResponse = await fetch(`${FACEBOOK_GRAPH_URL}/${userId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "REELS",
      video_url: videoUrl,
      caption,
      cover_url: coverUrl,
      access_token: accessToken,
    }),
  });

  const container = await containerResponse.json();

  // Wait for video processing
  let status = "IN_PROGRESS";
  while (status === "IN_PROGRESS") {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const statusResponse = await fetch(
      `${FACEBOOK_GRAPH_URL}/${container.id}?fields=status_code&access_token=${accessToken}`
    );
    const statusData = await statusResponse.json();
    status = statusData.status_code;
  }

  if (status !== "FINISHED") {
    throw new Error("Video processing failed");
  }

  // Publish
  const publishResponse = await fetch(`${FACEBOOK_GRAPH_URL}/${userId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: container.id,
      access_token: accessToken,
    }),
  });

  return publishResponse.json();
}

export async function saveInstagramAccount(
  userId: string,
  tokens: InstagramTokens,
  profile: InstagramProfile
) {
  const existingAccount = await prisma.instagramAccount.findUnique({
    where: { instagramId: profile.id },
  });

  if (existingAccount) {
    return prisma.instagramAccount.update({
      where: { id: existingAccount.id },
      data: {
        accessToken: tokens.accessToken,
        tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
      },
    });
  }

  const userAccounts = await prisma.instagramAccount.count({
    where: { userId },
  });

  return prisma.instagramAccount.create({
    data: {
      userId,
      instagramId: profile.id,
      username: profile.username,
      accessToken: tokens.accessToken,
      tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
      accountType: profile.accountType,
      isDefault: userAccounts === 0,
    },
  });
}

export async function getInstagramInsights(accessToken: string, mediaId: string) {
  const response = await fetch(
    `${INSTAGRAM_GRAPH_URL}/${mediaId}/insights?metric=impressions,reach,engagement&access_token=${accessToken}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch Instagram insights");
  }

  return response.json();
}

export async function refreshInstagramToken(accessToken: string): Promise<InstagramTokens> {
  const response = await fetch(
    `${INSTAGRAM_GRAPH_URL}/refresh_access_token?` +
      new URLSearchParams({
        grant_type: "ig_refresh_token",
        access_token: accessToken,
      })
  );

  if (!response.ok) {
    throw new Error("Failed to refresh Instagram token");
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    userId: "",
    expiresIn: data.expires_in,
  };
}
