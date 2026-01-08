import { prisma } from "./prisma";

export interface PageViewData {
  domain: string;
  path: string;
  referrer?: string;
  userAgent?: string;
  source?: TrafficSource;
  socialPlatform?: SocialPlatform;
  sessionId?: string;
  sessionDuration?: number;
  bounced?: boolean;
}

export type TrafficSource = "direct" | "social" | "search" | "referral";
export type SocialPlatform = "twitter" | "linkedin" | "instagram" | "facebook" | "other";

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

// Detect traffic source from referrer
function detectTrafficSource(referrer?: string): { source: TrafficSource; socialPlatform?: SocialPlatform } {
  if (!referrer || referrer === "") {
    return { source: "direct" };
  }

  const url = referrer.toLowerCase();

  // Social platforms
  if (url.includes("twitter.com") || url.includes("t.co") || url.includes("x.com")) {
    return { source: "social", socialPlatform: "twitter" };
  }
  if (url.includes("linkedin.com") || url.includes("lnkd.in")) {
    return { source: "social", socialPlatform: "linkedin" };
  }
  if (url.includes("instagram.com")) {
    return { source: "social", socialPlatform: "instagram" };
  }
  if (url.includes("facebook.com") || url.includes("fb.com") || url.includes("fb.me")) {
    return { source: "social", socialPlatform: "facebook" };
  }

  // Search engines
  if (
    url.includes("google.") ||
    url.includes("bing.com") ||
    url.includes("yahoo.com") ||
    url.includes("duckduckgo.com") ||
    url.includes("baidu.com")
  ) {
    return { source: "search" };
  }

  // Everything else is referral
  return { source: "referral" };
}

// Track a page view
export async function trackPageView(userId: string, data: PageViewData) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Detect traffic source if not provided
  const { source, socialPlatform } = data.source
    ? { source: data.source, socialPlatform: data.socialPlatform }
    : detectTrafficSource(data.referrer);

  // Try to find existing record for today
  const existing = await prisma.websiteAnalytics.findUnique({
    where: {
      userId_domain_date: {
        userId,
        domain: data.domain,
        date: today,
      },
    },
  });

  // Parse existing top pages or initialize
  const topPages = existing?.topPages as Array<{ path: string; views: number }> || [];
  const existingPage = topPages.find((p) => p.path === data.path);

  if (existingPage) {
    existingPage.views++;
  } else {
    topPages.push({ path: data.path, views: 1 });
  }

  // Sort and limit top pages
  topPages.sort((a, b) => b.views - a.views);
  const limitedTopPages = topPages.slice(0, 50);

  // Determine if this is a unique visitor (simplified - in production use session tracking)
  const isUnique = !existing || !data.sessionId;

  // Calculate increments based on traffic source
  const trafficIncrements: Record<string, number> = {
    directTraffic: source === "direct" ? 1 : 0,
    socialTraffic: source === "social" ? 1 : 0,
    searchTraffic: source === "search" ? 1 : 0,
    referralTraffic: source === "referral" ? 1 : 0,
    twitterTraffic: socialPlatform === "twitter" ? 1 : 0,
    linkedinTraffic: socialPlatform === "linkedin" ? 1 : 0,
    instagramTraffic: socialPlatform === "instagram" ? 1 : 0,
  };

  if (existing) {
    // Update existing record
    return prisma.websiteAnalytics.update({
      where: {
        userId_domain_date: {
          userId,
          domain: data.domain,
          date: today,
        },
      },
      data: {
        pageViews: { increment: 1 },
        uniqueVisitors: isUnique ? { increment: 1 } : undefined,
        directTraffic: { increment: trafficIncrements.directTraffic },
        socialTraffic: { increment: trafficIncrements.socialTraffic },
        searchTraffic: { increment: trafficIncrements.searchTraffic },
        referralTraffic: { increment: trafficIncrements.referralTraffic },
        twitterTraffic: { increment: trafficIncrements.twitterTraffic },
        linkedinTraffic: { increment: trafficIncrements.linkedinTraffic },
        instagramTraffic: { increment: trafficIncrements.instagramTraffic },
        topPages: limitedTopPages,
        // Update bounce rate and session time if provided
        ...(data.bounced !== undefined || data.sessionDuration !== undefined
          ? {
              bounceRate: data.bounced !== undefined
                ? (existing.bounceRate * existing.pageViews + (data.bounced ? 100 : 0)) / (existing.pageViews + 1)
                : undefined,
              avgSessionTime: data.sessionDuration !== undefined
                ? Math.round((existing.avgSessionTime * existing.pageViews + data.sessionDuration) / (existing.pageViews + 1))
                : undefined,
            }
          : {}),
      },
    });
  } else {
    // Create new record for today
    return prisma.websiteAnalytics.create({
      data: {
        userId,
        domain: data.domain,
        date: today,
        pageViews: 1,
        uniqueVisitors: 1,
        bounceRate: data.bounced ? 100 : 0,
        avgSessionTime: data.sessionDuration || 0,
        directTraffic: trafficIncrements.directTraffic,
        socialTraffic: trafficIncrements.socialTraffic,
        searchTraffic: trafficIncrements.searchTraffic,
        referralTraffic: trafficIncrements.referralTraffic,
        twitterTraffic: trafficIncrements.twitterTraffic,
        linkedinTraffic: trafficIncrements.linkedinTraffic,
        instagramTraffic: trafficIncrements.instagramTraffic,
        topPages: limitedTopPages,
      },
    });
  }
}

// Get website analytics for a domain
export async function getWebsiteAnalytics(userId: string, domain: string, dateRange?: DateRange) {
  const now = new Date();
  const startDate = dateRange?.startDate || new Date(now.setDate(now.getDate() - 30));
  const endDate = dateRange?.endDate || new Date();

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  const analytics = await prisma.websiteAnalytics.findMany({
    where: {
      userId,
      domain,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: "asc" },
  });

  if (analytics.length === 0) {
    return {
      summary: {
        totalPageViews: 0,
        totalUniqueVisitors: 0,
        avgBounceRate: 0,
        avgSessionTime: 0,
      },
      dailyData: [],
      trafficSources: { direct: 0, social: 0, search: 0, referral: 0 },
      socialBreakdown: { twitter: 0, linkedin: 0, instagram: 0 },
      topPages: [],
    };
  }

  // Calculate totals
  const totalPageViews = analytics.reduce((sum, a) => sum + a.pageViews, 0);
  const totalUniqueVisitors = analytics.reduce((sum, a) => sum + a.uniqueVisitors, 0);
  const avgBounceRate = analytics.reduce((sum, a) => sum + a.bounceRate, 0) / analytics.length;
  const avgSessionTime = analytics.reduce((sum, a) => sum + a.avgSessionTime, 0) / analytics.length;

  // Traffic sources
  const trafficSources = {
    direct: analytics.reduce((sum, a) => sum + a.directTraffic, 0),
    social: analytics.reduce((sum, a) => sum + a.socialTraffic, 0),
    search: analytics.reduce((sum, a) => sum + a.searchTraffic, 0),
    referral: analytics.reduce((sum, a) => sum + a.referralTraffic, 0),
  };

  // Social breakdown
  const socialBreakdown = {
    twitter: analytics.reduce((sum, a) => sum + a.twitterTraffic, 0),
    linkedin: analytics.reduce((sum, a) => sum + a.linkedinTraffic, 0),
    instagram: analytics.reduce((sum, a) => sum + a.instagramTraffic, 0),
  };

  // Aggregate top pages across all days
  const pageMap = new Map<string, number>();
  analytics.forEach((a) => {
    const pages = a.topPages as Array<{ path: string; views: number }> || [];
    pages.forEach((p) => {
      pageMap.set(p.path, (pageMap.get(p.path) || 0) + p.views);
    });
  });

  const topPages = Array.from(pageMap.entries())
    .map(([path, views]) => ({ path, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 20);

  // Daily data for charts
  const dailyData = analytics.map((a) => ({
    date: a.date.toISOString().split("T")[0],
    pageViews: a.pageViews,
    uniqueVisitors: a.uniqueVisitors,
    bounceRate: a.bounceRate,
    avgSessionTime: a.avgSessionTime,
  }));

  return {
    summary: {
      totalPageViews,
      totalUniqueVisitors,
      avgBounceRate: parseFloat(avgBounceRate.toFixed(1)),
      avgSessionTime: Math.round(avgSessionTime),
    },
    dailyData,
    trafficSources,
    socialBreakdown,
    topPages,
  };
}

// Get traffic sources breakdown
export async function getTrafficSources(userId: string, domain: string, dateRange?: DateRange) {
  const analytics = await getWebsiteAnalytics(userId, domain, dateRange);
  const { trafficSources } = analytics;

  const total = trafficSources.direct + trafficSources.social + trafficSources.search + trafficSources.referral;

  if (total === 0) {
    return {
      sources: [
        { name: "Direct", count: 0, percentage: 0 },
        { name: "Social", count: 0, percentage: 0 },
        { name: "Search", count: 0, percentage: 0 },
        { name: "Referral", count: 0, percentage: 0 },
      ],
      total: 0,
    };
  }

  return {
    sources: [
      {
        name: "Direct",
        count: trafficSources.direct,
        percentage: parseFloat(((trafficSources.direct / total) * 100).toFixed(1)),
      },
      {
        name: "Social",
        count: trafficSources.social,
        percentage: parseFloat(((trafficSources.social / total) * 100).toFixed(1)),
      },
      {
        name: "Search",
        count: trafficSources.search,
        percentage: parseFloat(((trafficSources.search / total) * 100).toFixed(1)),
      },
      {
        name: "Referral",
        count: trafficSources.referral,
        percentage: parseFloat(((trafficSources.referral / total) * 100).toFixed(1)),
      },
    ],
    total,
  };
}

// Get social traffic breakdown
export async function getSocialTrafficBreakdown(userId: string, domain: string, dateRange?: DateRange) {
  const analytics = await getWebsiteAnalytics(userId, domain, dateRange);
  const { socialBreakdown, trafficSources } = analytics;

  const totalSocial = trafficSources.social;
  const identifiedSocial = socialBreakdown.twitter + socialBreakdown.linkedin + socialBreakdown.instagram;
  const otherSocial = Math.max(0, totalSocial - identifiedSocial);

  if (totalSocial === 0) {
    return {
      platforms: [
        { name: "X (Twitter)", count: 0, percentage: 0, color: "#1DA1F2" },
        { name: "LinkedIn", count: 0, percentage: 0, color: "#0A66C2" },
        { name: "Instagram", count: 0, percentage: 0, color: "#E4405F" },
        { name: "Other", count: 0, percentage: 0, color: "#6B7280" },
      ],
      total: 0,
    };
  }

  return {
    platforms: [
      {
        name: "X (Twitter)",
        count: socialBreakdown.twitter,
        percentage: parseFloat(((socialBreakdown.twitter / totalSocial) * 100).toFixed(1)),
        color: "#1DA1F2",
      },
      {
        name: "LinkedIn",
        count: socialBreakdown.linkedin,
        percentage: parseFloat(((socialBreakdown.linkedin / totalSocial) * 100).toFixed(1)),
        color: "#0A66C2",
      },
      {
        name: "Instagram",
        count: socialBreakdown.instagram,
        percentage: parseFloat(((socialBreakdown.instagram / totalSocial) * 100).toFixed(1)),
        color: "#E4405F",
      },
      {
        name: "Other",
        count: otherSocial,
        percentage: parseFloat(((otherSocial / totalSocial) * 100).toFixed(1)),
        color: "#6B7280",
      },
    ],
    total: totalSocial,
  };
}

// Get list of tracked domains for a user
export async function getTrackedDomains(userId: string) {
  const domains = await prisma.websiteAnalytics.findMany({
    where: { userId },
    select: { domain: true },
    distinct: ["domain"],
  });

  return domains.map((d) => d.domain);
}

// Generate tracking pixel/script code
export function generateTrackingCode(userId: string, domain: string): string {
  const apiUrl = process.env.NEXTAUTH_URL || "http://localhost:4001";

  return `<!-- Social Media Manager Analytics -->
<script>
(function() {
  var userId = "${userId}";
  var domain = "${domain}";
  var apiUrl = "${apiUrl}/api/website-analytics";
  var sessionId = sessionStorage.getItem("smm_session") || (function() {
    var id = Math.random().toString(36).substring(2) + Date.now().toString(36);
    sessionStorage.setItem("smm_session", id);
    return id;
  })();
  var startTime = Date.now();
  var bounced = true;

  // Track page view
  function trackPageView() {
    var data = {
      userId: userId,
      domain: domain,
      path: window.location.pathname,
      referrer: document.referrer,
      sessionId: sessionId
    };

    navigator.sendBeacon ?
      navigator.sendBeacon(apiUrl, JSON.stringify(data)) :
      fetch(apiUrl, { method: "POST", body: JSON.stringify(data), keepalive: true });
  }

  // Track on load
  if (document.readyState === "complete") {
    trackPageView();
  } else {
    window.addEventListener("load", trackPageView);
  }

  // Mark as not bounced on interaction
  document.addEventListener("click", function() { bounced = false; }, { once: true });
  document.addEventListener("scroll", function() { bounced = false; }, { once: true });

  // Track session duration and bounce on unload
  window.addEventListener("beforeunload", function() {
    var duration = Math.round((Date.now() - startTime) / 1000);
    var data = {
      userId: userId,
      domain: domain,
      path: window.location.pathname,
      sessionId: sessionId,
      sessionDuration: duration,
      bounced: bounced,
      update: true
    };

    navigator.sendBeacon ?
      navigator.sendBeacon(apiUrl, JSON.stringify(data)) :
      fetch(apiUrl, { method: "POST", body: JSON.stringify(data), keepalive: true });
  });
})();
</script>
<!-- End Social Media Manager Analytics -->`;
}
