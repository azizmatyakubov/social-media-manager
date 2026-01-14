const X_API_BASE = "https://api.twitter.com/2";
const X_UPLOAD_API = "https://upload.twitter.com/1.1";
const X_AUTH_URL = "https://twitter.com/i/oauth2/authorize";
const X_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";

export function getXAuthUrl(state: string, codeChallenge: string) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.X_CLIENT_ID!,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/x/callback`,
    scope: "tweet.read tweet.write users.read offline.access",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "plain",
  });

  return `${X_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string, codeVerifier: string) {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/x/callback`,
    code_verifier: codeVerifier,
  });

  const credentials = Buffer.from(
    `${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch(X_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code: ${error}`);
  }

  return response.json();
}

export async function refreshAccessToken(refreshToken: string) {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const credentials = Buffer.from(
    `${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch(X_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh token");
  }

  return response.json();
}

export async function getXUser(accessToken: string) {
  const response = await fetch(`${X_API_BASE}/users/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get user");
  }

  const data = await response.json();
  return data.data;
}

export async function postTweet(
  accessToken: string,
  text: string,
  options?: {
    mediaIds?: string[];
    replyToTweetId?: string;
    quoteTweetId?: string;
  }
) {
  const body: {
    text: string;
    media?: { media_ids: string[] };
    reply?: { in_reply_to_tweet_id: string };
    quote_tweet_id?: string;
  } = { text };

  if (options?.mediaIds && options.mediaIds.length > 0) {
    body.media = { media_ids: options.mediaIds };
  }

  if (options?.replyToTweetId) {
    body.reply = { in_reply_to_tweet_id: options.replyToTweetId };
  }

  if (options?.quoteTweetId) {
    body.quote_tweet_id = options.quoteTweetId;
  }

  const response = await fetch(`${X_API_BASE}/tweets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to post tweet: ${error}`);
  }

  const data = await response.json();
  return data.data;
}

// Upload media to X (Twitter)
// Note: Media upload requires OAuth 1.0a or OAuth 2.0 with user context
export async function uploadMedia(
  accessToken: string,
  mediaData: Buffer,
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "video/mp4"
): Promise<string> {
  // For images under 5MB, use simple upload
  const isLargeFile = mediaData.length > 5 * 1024 * 1024;

  if (isLargeFile) {
    return await chunkedMediaUpload(accessToken, mediaData, mediaType);
  }

  // Simple upload for small images
  const formData = new FormData();
  formData.append("media", new Blob([mediaData], { type: mediaType }));

  const response = await fetch(`${X_UPLOAD_API}/media/upload.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload media: ${error}`);
  }

  const data = await response.json();
  return data.media_id_string;
}

// Chunked upload for large files (videos, large GIFs)
async function chunkedMediaUpload(
  accessToken: string,
  mediaData: Buffer,
  mediaType: string
): Promise<string> {
  const totalBytes = mediaData.length;
  const mediaCategory = mediaType.startsWith("video") ? "tweet_video" : "tweet_image";

  // Step 1: INIT
  const initParams = new URLSearchParams({
    command: "INIT",
    total_bytes: totalBytes.toString(),
    media_type: mediaType,
    media_category: mediaCategory,
  });

  const initResponse = await fetch(
    `${X_UPLOAD_API}/media/upload.json?${initParams}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!initResponse.ok) {
    throw new Error("Failed to initialize media upload");
  }

  const initData = await initResponse.json();
  const mediaId = initData.media_id_string;

  // Step 2: APPEND (upload chunks)
  const chunkSize = 5 * 1024 * 1024; // 5MB chunks
  let segmentIndex = 0;

  for (let i = 0; i < totalBytes; i += chunkSize) {
    const chunk = mediaData.slice(i, Math.min(i + chunkSize, totalBytes));
    const formData = new FormData();
    formData.append("command", "APPEND");
    formData.append("media_id", mediaId);
    formData.append("segment_index", segmentIndex.toString());
    formData.append("media", new Blob([chunk]));

    const appendResponse = await fetch(`${X_UPLOAD_API}/media/upload.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!appendResponse.ok) {
      throw new Error(`Failed to upload chunk ${segmentIndex}`);
    }

    segmentIndex++;
  }

  // Step 3: FINALIZE
  const finalizeParams = new URLSearchParams({
    command: "FINALIZE",
    media_id: mediaId,
  });

  const finalizeResponse = await fetch(
    `${X_UPLOAD_API}/media/upload.json?${finalizeParams}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!finalizeResponse.ok) {
    throw new Error("Failed to finalize media upload");
  }

  const finalizeData = await finalizeResponse.json();

  // For videos, we need to check processing status
  if (finalizeData.processing_info) {
    await waitForMediaProcessing(accessToken, mediaId);
  }

  return mediaId;
}

// Wait for media processing to complete (for videos)
async function waitForMediaProcessing(
  accessToken: string,
  mediaId: string
): Promise<void> {
  const maxAttempts = 30;
  const checkInterval = 2000; // 2 seconds

  for (let i = 0; i < maxAttempts; i++) {
    const params = new URLSearchParams({
      command: "STATUS",
      media_id: mediaId,
    });

    const response = await fetch(
      `${X_UPLOAD_API}/media/upload.json?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to check media status");
    }

    const data = await response.json();
    const state = data.processing_info?.state;

    if (state === "succeeded") {
      return;
    }

    if (state === "failed") {
      throw new Error(
        `Media processing failed: ${data.processing_info?.error?.message || "Unknown error"}`
      );
    }

    // Still processing, wait and retry
    await new Promise((resolve) => setTimeout(resolve, checkInterval));
  }

  throw new Error("Media processing timed out");
}

// Post a thread (multiple connected tweets)
export async function postThread(
  accessToken: string,
  tweets: string[],
  mediaIdsByTweet?: (string[] | undefined)[]
): Promise<{ id: string; text: string }[]> {
  const postedTweets: { id: string; text: string }[] = [];
  let previousTweetId: string | undefined;

  for (let i = 0; i < tweets.length; i++) {
    const tweet = tweets[i];
    const mediaIds = mediaIdsByTweet?.[i];

    const posted = await postTweet(accessToken, tweet, {
      mediaIds,
      replyToTweetId: previousTweetId,
    });

    postedTweets.push({
      id: posted.id,
      text: tweet,
    });

    previousTweetId = posted.id;

    // Small delay between tweets to avoid rate limiting
    if (i < tweets.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return postedTweets;
}

// Delete a tweet
export async function deleteTweet(
  accessToken: string,
  tweetId: string
): Promise<boolean> {
  const response = await fetch(`${X_API_BASE}/tweets/${tweetId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete tweet: ${error}`);
  }

  const data = await response.json();
  return data.data?.deleted === true;
}

// Retweet a tweet
export async function retweet(
  accessToken: string,
  userId: string,
  tweetId: string
): Promise<boolean> {
  const response = await fetch(`${X_API_BASE}/users/${userId}/retweets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tweet_id: tweetId }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to retweet: ${error}`);
  }

  const data = await response.json();
  return data.data?.retweeted === true;
}

// Get user's mentions
export async function getMentions(
  accessToken: string,
  userId: string,
  options?: { maxResults?: number; sinceId?: string }
): Promise<{
  mentions: {
    id: string;
    text: string;
    authorId: string;
    createdAt: string;
  }[];
  nextToken?: string;
}> {
  const params = new URLSearchParams({
    "tweet.fields": "author_id,created_at,conversation_id,in_reply_to_user_id",
    max_results: (options?.maxResults || 10).toString(),
  });

  if (options?.sinceId) {
    params.set("since_id", options.sinceId);
  }

  const response = await fetch(
    `${X_API_BASE}/users/${userId}/mentions?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get mentions: ${error}`);
  }

  const data = await response.json();
  return {
    mentions: (data.data || []).map(
      (tweet: { id: string; text: string; author_id: string; created_at: string }) => ({
        id: tweet.id,
        text: tweet.text,
        authorId: tweet.author_id,
        createdAt: tweet.created_at,
      })
    ),
    nextToken: data.meta?.next_token,
  };
}

// Reply to a tweet
export async function replyToTweet(
  accessToken: string,
  tweetId: string,
  text: string,
  mediaIds?: string[]
): Promise<{ id: string; text: string }> {
  return postTweet(accessToken, text, {
    replyToTweetId: tweetId,
    mediaIds,
  });
}

// Get tweet metrics (requires elevated access)
export async function getTweetMetrics(
  accessToken: string,
  tweetId: string
): Promise<{
  impressions: number;
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
}> {
  const params = new URLSearchParams({
    "tweet.fields": "public_metrics,non_public_metrics,organic_metrics",
  });

  const response = await fetch(
    `${X_API_BASE}/tweets/${tweetId}?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get tweet metrics: ${error}`);
  }

  const data = await response.json();
  const metrics = data.data?.public_metrics || {};
  const nonPublic = data.data?.non_public_metrics || {};

  return {
    impressions: nonPublic.impression_count || 0,
    likes: metrics.like_count || 0,
    retweets: metrics.retweet_count || 0,
    replies: metrics.reply_count || 0,
    quotes: metrics.quote_count || 0,
  };
}
