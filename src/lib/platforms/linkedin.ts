import { prisma } from "../prisma";

const LINKEDIN_API_URL = "https://api.linkedin.com/v2";
const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2";

export interface LinkedInTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface LinkedInProfile {
  id: string;
  localizedFirstName: string;
  localizedLastName: string;
  profilePicture?: {
    displayImage: string;
  };
}

export function getLinkedInAuthUrl(redirectUri: string, state: string) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri: redirectUri,
    state,
    scope: "openid profile email w_member_social",
  });

  return `${LINKEDIN_AUTH_URL}/authorization?${params.toString()}`;
}

export async function exchangeLinkedInCode(
  code: string,
  redirectUri: string
): Promise<LinkedInTokens> {
  const response = await fetch(`${LINKEDIN_AUTH_URL}/accessToken`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange LinkedIn code");
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function getLinkedInProfile(accessToken: string): Promise<LinkedInProfile> {
  const response = await fetch(`${LINKEDIN_API_URL}/userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch LinkedIn profile");
  }

  const data = await response.json();
  return {
    id: data.sub,
    localizedFirstName: data.given_name,
    localizedLastName: data.family_name,
    profilePicture: data.picture ? { displayImage: data.picture } : undefined,
  };
}

export async function publishLinkedInPost(
  accessToken: string,
  authorUrn: string,
  content: string,
  mediaUrls?: string[]
) {
  const postBody: Record<string, unknown> = {
    author: `urn:li:person:${authorUrn}`,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: {
          text: content,
        },
        shareMediaCategory: mediaUrls && mediaUrls.length > 0 ? "IMAGE" : "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  if (mediaUrls && mediaUrls.length > 0) {
    const shareContent = postBody.specificContent as Record<string, unknown>;
    const ugcContent = shareContent["com.linkedin.ugc.ShareContent"] as Record<string, unknown>;
    ugcContent.media = mediaUrls.map((url) => ({
      status: "READY",
      originalUrl: url,
    }));
  }

  const response = await fetch(`${LINKEDIN_API_URL}/ugcPosts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(postBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to publish LinkedIn post: ${error}`);
  }

  const postId = response.headers.get("x-restli-id");
  return { id: postId };
}

export async function saveLinkedInAccount(
  userId: string,
  tokens: LinkedInTokens,
  profile: LinkedInProfile
) {
  const existingAccount = await prisma.linkedInAccount.findUnique({
    where: { linkedInId: profile.id },
  });

  if (existingAccount) {
    return prisma.linkedInAccount.update({
      where: { id: existingAccount.id },
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
      },
    });
  }

  // Check if user has any LinkedIn accounts
  const userAccounts = await prisma.linkedInAccount.count({
    where: { userId },
  });

  return prisma.linkedInAccount.create({
    data: {
      userId,
      linkedInId: profile.id,
      name: `${profile.localizedFirstName} ${profile.localizedLastName}`,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
      isDefault: userAccounts === 0,
    },
  });
}

export async function getLinkedInPostAnalytics(accessToken: string, postUrn: string) {
  const response = await fetch(
    `${LINKEDIN_API_URL}/socialActions/${encodeURIComponent(postUrn)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch LinkedIn post analytics");
  }

  return response.json();
}
