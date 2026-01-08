import { prisma } from "./prisma";
import { ABTestStatus, Platform } from "@prisma/client";

export interface CreateABTestInput {
  userId: string;
  name: string;
  description?: string;
  platform: Platform;
  metric: string;
  duration: number; // hours
  variants: Array<{
    name: string;
    content: string;
    mediaUrls?: string[];
  }>;
}

export async function createABTest(input: CreateABTestInput) {
  const test = await prisma.aBTest.create({
    data: {
      userId: input.userId,
      name: input.name,
      description: input.description,
      platform: input.platform,
      metric: input.metric,
      duration: input.duration,
      variants: {
        create: input.variants.map((v, i) => ({
          name: v.name || String.fromCharCode(65 + i), // A, B, C...
          content: v.content,
          mediaUrls: v.mediaUrls || [],
        })),
      },
    },
    include: {
      variants: true,
    },
  });

  return test;
}

export async function startABTest(testId: string, xAccountId?: string) {
  const test = await prisma.aBTest.findUnique({
    where: { id: testId },
    include: { variants: true, user: true },
  });

  if (!test) {
    throw new Error("Test not found");
  }

  if (test.status !== ABTestStatus.DRAFT) {
    throw new Error("Test is not in draft status");
  }

  // Create posts for each variant
  const posts = await Promise.all(
    test.variants.map((variant) =>
      prisma.post.create({
        data: {
          userId: test.userId,
          platform: test.platform,
          content: variant.content,
          mediaUrls: variant.mediaUrls,
          xAccountId,
          abTestId: testId,
          abVariant: variant.name,
          status: "SCHEDULED",
          scheduledFor: new Date(), // Publish immediately
        },
      })
    )
  );

  // Update test status
  await prisma.aBTest.update({
    where: { id: testId },
    data: {
      status: ABTestStatus.RUNNING,
      startedAt: new Date(),
    },
  });

  return { test, posts };
}

export async function updateTestMetrics(testId: string) {
  const test = await prisma.aBTest.findUnique({
    where: { id: testId },
    include: {
      variants: true,
      posts: true,
    },
  });

  if (!test) {
    throw new Error("Test not found");
  }

  // Update variant metrics from posts
  for (const variant of test.variants) {
    const variantPosts = test.posts.filter((p) => p.abVariant === variant.name);

    const totalImpressions = variantPosts.reduce((sum, p) => sum + p.impressions, 0);
    const totalEngagements = variantPosts.reduce(
      (sum, p) => sum + p.likes + p.retweets + p.replies,
      0
    );
    const totalClicks = variantPosts.reduce((sum, p) => sum + p.clicks, 0);

    await prisma.aBTestVariant.update({
      where: { id: variant.id },
      data: {
        impressions: totalImpressions,
        engagements: totalEngagements,
        clicks: totalClicks,
      },
    });
  }
}

export async function completeABTest(testId: string) {
  const test = await prisma.aBTest.findUnique({
    where: { id: testId },
    include: { variants: true },
  });

  if (!test) {
    throw new Error("Test not found");
  }

  // Determine winner based on metric
  let winnerId: string | null = null;
  let maxScore = -1;

  for (const variant of test.variants) {
    let score: number;

    switch (test.metric) {
      case "engagement":
        score = variant.impressions > 0 ? variant.engagements / variant.impressions : 0;
        break;
      case "clicks":
        score = variant.impressions > 0 ? variant.clicks / variant.impressions : 0;
        break;
      case "impressions":
        score = variant.impressions;
        break;
      default:
        score = variant.engagements;
    }

    if (score > maxScore) {
      maxScore = score;
      winnerId = variant.id;
    }
  }

  await prisma.aBTest.update({
    where: { id: testId },
    data: {
      status: ABTestStatus.COMPLETED,
      endedAt: new Date(),
      winnerId,
    },
  });

  return {
    test,
    winnerId,
    winner: test.variants.find((v) => v.id === winnerId),
  };
}

export async function getABTestResults(testId: string) {
  const test = await prisma.aBTest.findUnique({
    where: { id: testId },
    include: {
      variants: true,
      posts: {
        select: {
          id: true,
          abVariant: true,
          likes: true,
          retweets: true,
          replies: true,
          impressions: true,
          clicks: true,
          postedAt: true,
        },
      },
    },
  });

  if (!test) {
    throw new Error("Test not found");
  }

  const results = test.variants.map((variant) => {
    const engagementRate =
      variant.impressions > 0 ? (variant.engagements / variant.impressions) * 100 : 0;
    const clickRate =
      variant.impressions > 0 ? (variant.clicks / variant.impressions) * 100 : 0;

    return {
      variant: variant.name,
      content: variant.content,
      impressions: variant.impressions,
      engagements: variant.engagements,
      clicks: variant.clicks,
      engagementRate: engagementRate.toFixed(2),
      clickRate: clickRate.toFixed(2),
      isWinner: test.winnerId === variant.id,
    };
  });

  return {
    test: {
      id: test.id,
      name: test.name,
      status: test.status,
      metric: test.metric,
      startedAt: test.startedAt,
      endedAt: test.endedAt,
    },
    results,
    statisticalSignificance: calculateSignificance(test.variants),
  };
}

function calculateSignificance(
  variants: Array<{ impressions: number; engagements: number }>
): string {
  if (variants.length < 2) return "N/A";

  const [a, b] = variants;
  if (a.impressions < 100 || b.impressions < 100) {
    return "Insufficient data (need 100+ impressions per variant)";
  }

  const rateA = a.engagements / a.impressions;
  const rateB = b.engagements / b.impressions;

  // Simple z-test for proportions
  const pooledRate = (a.engagements + b.engagements) / (a.impressions + b.impressions);
  const se = Math.sqrt(pooledRate * (1 - pooledRate) * (1 / a.impressions + 1 / b.impressions));

  if (se === 0) return "N/A";

  const z = Math.abs(rateA - rateB) / se;

  if (z > 2.576) return "99% confidence";
  if (z > 1.96) return "95% confidence";
  if (z > 1.645) return "90% confidence";
  return "Not statistically significant";
}

export async function getUserABTests(userId: string, status?: ABTestStatus) {
  return prisma.aBTest.findMany({
    where: {
      userId,
      ...(status && { status }),
    },
    include: {
      variants: true,
      _count: {
        select: { posts: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function cancelABTest(testId: string) {
  return prisma.aBTest.update({
    where: { id: testId },
    data: {
      status: ABTestStatus.CANCELED,
      endedAt: new Date(),
    },
  });
}

export async function generateABVariants(
  baseContent: string,
  platform: Platform,
  numVariants: number = 2
) {
  const { getOpenAI } = await import("./openai");
  const openai = getOpenAI();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a social media expert. Generate ${numVariants} variations of a ${platform} post for A/B testing. Each variation should test a different approach (e.g., different hooks, CTAs, or tones). Keep the core message but vary the presentation.`,
      },
      {
        role: "user",
        content: `Original post:\n${baseContent}\n\nGenerate ${numVariants} variations. Return as JSON array: [{"name": "A", "content": "..."}, {"name": "B", "content": "..."}]`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 1000,
  });

  const result = JSON.parse(response.choices[0]?.message?.content || "{}");
  return result.variants || [];
}
