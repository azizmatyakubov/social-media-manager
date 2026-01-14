import { prisma } from "./prisma";

// Types
export type MetricType =
  | "posts_count"
  | "engagement_rate"
  | "total_likes"
  | "total_shares"
  | "total_comments"
  | "total_impressions"
  | "total_clicks"
  | "follower_growth"
  | "top_posts"
  | "best_times"
  | "content_breakdown"
  | "platform_comparison"
  | "sentiment_overview"
  | "hashtag_performance";

export type ChartType = "line" | "bar" | "pie" | "area" | "table" | "number";

export interface ReportWidget {
  id: string;
  name: string;
  metric: MetricType;
  chartType: ChartType;
  platforms: string[];
  dateRange: "7d" | "30d" | "90d" | "custom";
  customDateFrom?: string;
  customDateTo?: string;
  order: number;
}

export interface Report {
  id: string;
  userId: string;
  name: string;
  description?: string;
  widgets: ReportWidget[];
  schedule?: {
    frequency: "daily" | "weekly" | "monthly";
    time: string;
    recipients: string[];
  };
  isPublic: boolean;
  publicSlug?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WidgetData {
  widgetId: string;
  metric: MetricType;
  chartType: ChartType;
  data: unknown;
  meta?: {
    label?: string;
    comparison?: number;
    trend?: "up" | "down" | "stable";
  };
}

// In-memory storage for reports (in production, use a database table)
const reportsStore: Map<string, Report[]> = new Map();

// Get user reports
export async function getUserReports(userId: string): Promise<Report[]> {
  return reportsStore.get(userId) || [];
}

// Get single report
export async function getReport(
  reportId: string,
  userId: string
): Promise<Report | null> {
  const reports = reportsStore.get(userId) || [];
  return reports.find((r) => r.id === reportId) || null;
}

// Create report
export async function createReport(
  userId: string,
  data: {
    name: string;
    description?: string;
    widgets?: ReportWidget[];
    isPublic?: boolean;
  }
): Promise<Report> {
  const reports = reportsStore.get(userId) || [];

  const report: Report = {
    id: crypto.randomUUID(),
    userId,
    name: data.name,
    description: data.description,
    widgets: data.widgets || [],
    isPublic: data.isPublic || false,
    publicSlug: data.isPublic ? crypto.randomUUID().slice(0, 8) : undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  reports.push(report);
  reportsStore.set(userId, reports);

  return report;
}

// Update report
export async function updateReport(
  reportId: string,
  userId: string,
  data: Partial<{
    name: string;
    description: string;
    widgets: ReportWidget[];
    schedule: Report["schedule"];
    isPublic: boolean;
  }>
): Promise<Report | null> {
  const reports = reportsStore.get(userId) || [];
  const index = reports.findIndex((r) => r.id === reportId);

  if (index === -1) return null;

  reports[index] = {
    ...reports[index],
    ...data,
    updatedAt: new Date(),
    publicSlug:
      data.isPublic && !reports[index].publicSlug
        ? crypto.randomUUID().slice(0, 8)
        : reports[index].publicSlug,
  };

  reportsStore.set(userId, reports);
  return reports[index];
}

// Delete report
export async function deleteReport(reportId: string, userId: string): Promise<boolean> {
  const reports = reportsStore.get(userId) || [];
  const filtered = reports.filter((r) => r.id !== reportId);

  if (filtered.length === reports.length) return false;

  reportsStore.set(userId, filtered);
  return true;
}

// Add widget to report
export async function addWidget(
  reportId: string,
  userId: string,
  widget: Omit<ReportWidget, "id" | "order">
): Promise<Report | null> {
  const reports = reportsStore.get(userId) || [];
  const report = reports.find((r) => r.id === reportId);

  if (!report) return null;

  const newWidget: ReportWidget = {
    ...widget,
    id: crypto.randomUUID(),
    order: report.widgets.length,
  };

  report.widgets.push(newWidget);
  report.updatedAt = new Date();

  reportsStore.set(userId, reports);
  return report;
}

// Remove widget from report
export async function removeWidget(
  reportId: string,
  userId: string,
  widgetId: string
): Promise<Report | null> {
  const reports = reportsStore.get(userId) || [];
  const report = reports.find((r) => r.id === reportId);

  if (!report) return null;

  report.widgets = report.widgets.filter((w) => w.id !== widgetId);
  report.updatedAt = new Date();

  reportsStore.set(userId, reports);
  return report;
}

// Reorder widgets
export async function reorderWidgets(
  reportId: string,
  userId: string,
  widgetOrder: string[]
): Promise<Report | null> {
  const reports = reportsStore.get(userId) || [];
  const report = reports.find((r) => r.id === reportId);

  if (!report) return null;

  report.widgets = widgetOrder
    .map((id, order) => {
      const widget = report.widgets.find((w) => w.id === id);
      if (widget) {
        return { ...widget, order };
      }
      return null;
    })
    .filter((w): w is ReportWidget => w !== null);

  report.updatedAt = new Date();
  reportsStore.set(userId, reports);
  return report;
}

// Get widget data
export async function getWidgetData(
  userId: string,
  widget: ReportWidget
): Promise<WidgetData> {
  const dateRange = getDateRange(widget.dateRange, widget.customDateFrom, widget.customDateTo);

  const baseData: WidgetData = {
    widgetId: widget.id,
    metric: widget.metric,
    chartType: widget.chartType,
    data: null,
  };

  switch (widget.metric) {
    case "posts_count": {
      const where: Record<string, unknown> = {
        userId,
        createdAt: { gte: dateRange.from, lte: dateRange.to },
      };
      if (widget.platforms.length > 0) {
        where.platform = { in: widget.platforms };
      }

      const count = await prisma.post.count({ where });
      const prevCount = await prisma.post.count({
        where: {
          ...where,
          createdAt: {
            gte: new Date(dateRange.from.getTime() - (dateRange.to.getTime() - dateRange.from.getTime())),
            lte: dateRange.from,
          },
        },
      });

      const comparison = prevCount > 0 ? ((count - prevCount) / prevCount) * 100 : 0;

      return {
        ...baseData,
        data: count,
        meta: {
          label: "Total Posts",
          comparison: Math.round(comparison),
          trend: comparison > 0 ? "up" : comparison < 0 ? "down" : "stable",
        },
      };
    }

    case "engagement_rate": {
      const posts = await prisma.post.findMany({
        where: {
          userId,
          createdAt: { gte: dateRange.from, lte: dateRange.to },
          ...(widget.platforms.length > 0 ? { platform: { in: widget.platforms } } : {}),
        },
        select: { likes: true, retweets: true, replies: true, impressions: true },
      });

      const totalEngagement = posts.reduce(
        (sum, p) => sum + p.likes + p.retweets + p.replies,
        0
      );
      const totalImpressions = posts.reduce((sum, p) => sum + p.impressions, 0);
      const rate = totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0;

      return {
        ...baseData,
        data: Math.round(rate * 100) / 100,
        meta: {
          label: "Engagement Rate",
          trend: rate > 2 ? "up" : rate < 1 ? "down" : "stable",
        },
      };
    }

    case "total_likes":
    case "total_shares":
    case "total_comments":
    case "total_impressions":
    case "total_clicks": {
      const fieldMap: Record<string, string> = {
        total_likes: "likes",
        total_shares: "retweets",
        total_comments: "replies",
        total_impressions: "impressions",
        total_clicks: "clicks",
      };

      const field = fieldMap[widget.metric];
      const result = await prisma.post.aggregate({
        where: {
          userId,
          createdAt: { gte: dateRange.from, lte: dateRange.to },
          ...(widget.platforms.length > 0 ? { platform: { in: widget.platforms } } : {}),
        },
        _sum: { [field]: true },
      });

      const total = (result._sum as Record<string, number>)[field] || 0;

      return {
        ...baseData,
        data: total,
        meta: {
          label: widget.metric.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        },
      };
    }

    case "top_posts": {
      const posts = await prisma.post.findMany({
        where: {
          userId,
          createdAt: { gte: dateRange.from, lte: dateRange.to },
          status: "POSTED",
          ...(widget.platforms.length > 0 ? { platform: { in: widget.platforms } } : {}),
        },
        orderBy: [{ likes: "desc" }, { retweets: "desc" }],
        take: 10,
        select: {
          id: true,
          content: true,
          platform: true,
          likes: true,
          retweets: true,
          replies: true,
          impressions: true,
          postedAt: true,
        },
      });

      return {
        ...baseData,
        data: posts.map((p) => ({
          id: p.id,
          content: p.content.substring(0, 100) + (p.content.length > 100 ? "..." : ""),
          platform: p.platform,
          engagement: p.likes + p.retweets + p.replies,
          impressions: p.impressions,
          date: p.postedAt,
        })),
      };
    }

    case "content_breakdown": {
      const posts = await prisma.post.groupBy({
        by: ["platform"],
        where: {
          userId,
          createdAt: { gte: dateRange.from, lte: dateRange.to },
          ...(widget.platforms.length > 0 ? { platform: { in: widget.platforms } } : {}),
        },
        _count: true,
      });

      return {
        ...baseData,
        data: posts.map((p) => ({
          platform: p.platform,
          count: p._count,
        })),
      };
    }

    case "platform_comparison": {
      const platforms = widget.platforms.length > 0 ? widget.platforms : ["X", "LINKEDIN", "INSTAGRAM"];

      const data = await Promise.all(
        platforms.map(async (platform) => {
          const result = await prisma.post.aggregate({
            where: {
              userId,
              platform,
              createdAt: { gte: dateRange.from, lte: dateRange.to },
            },
            _sum: { likes: true, retweets: true, replies: true, impressions: true },
            _count: true,
          });

          return {
            platform,
            posts: result._count,
            likes: result._sum.likes || 0,
            shares: result._sum.retweets || 0,
            comments: result._sum.replies || 0,
            impressions: result._sum.impressions || 0,
          };
        })
      );

      return {
        ...baseData,
        data,
      };
    }

    case "best_times": {
      const posts = await prisma.post.findMany({
        where: {
          userId,
          status: "POSTED",
          postedAt: { not: null },
          createdAt: { gte: dateRange.from, lte: dateRange.to },
          ...(widget.platforms.length > 0 ? { platform: { in: widget.platforms } } : {}),
        },
        select: { postedAt: true, likes: true, retweets: true, replies: true },
      });

      const hourlyEngagement: Record<number, { total: number; count: number }> = {};

      posts.forEach((post) => {
        if (post.postedAt) {
          const hour = post.postedAt.getHours();
          if (!hourlyEngagement[hour]) {
            hourlyEngagement[hour] = { total: 0, count: 0 };
          }
          hourlyEngagement[hour].total += post.likes + post.retweets + post.replies;
          hourlyEngagement[hour].count++;
        }
      });

      const data = Object.entries(hourlyEngagement)
        .map(([hour, { total, count }]) => ({
          hour: parseInt(hour),
          avgEngagement: count > 0 ? Math.round(total / count) : 0,
          posts: count,
        }))
        .sort((a, b) => b.avgEngagement - a.avgEngagement);

      return {
        ...baseData,
        data,
      };
    }

    default:
      return baseData;
  }
}

// Get all widget data for a report
export async function getReportData(
  userId: string,
  report: Report
): Promise<WidgetData[]> {
  return Promise.all(report.widgets.map((widget) => getWidgetData(userId, widget)));
}

// Helper: Get date range
function getDateRange(
  range: string,
  customFrom?: string,
  customTo?: string
): { from: Date; to: Date } {
  const to = new Date();
  let from = new Date();

  switch (range) {
    case "7d":
      from.setDate(from.getDate() - 7);
      break;
    case "30d":
      from.setDate(from.getDate() - 30);
      break;
    case "90d":
      from.setDate(from.getDate() - 90);
      break;
    case "custom":
      if (customFrom) from = new Date(customFrom);
      if (customTo) return { from, to: new Date(customTo) };
      break;
  }

  return { from, to };
}

// Available metrics
export const AVAILABLE_METRICS: {
  id: MetricType;
  name: string;
  description: string;
  chartTypes: ChartType[];
}[] = [
  {
    id: "posts_count",
    name: "Total Posts",
    description: "Number of posts published",
    chartTypes: ["number", "line", "bar"],
  },
  {
    id: "engagement_rate",
    name: "Engagement Rate",
    description: "Average engagement as percentage of impressions",
    chartTypes: ["number", "line", "area"],
  },
  {
    id: "total_likes",
    name: "Total Likes",
    description: "Sum of all likes received",
    chartTypes: ["number", "line", "bar"],
  },
  {
    id: "total_shares",
    name: "Total Shares",
    description: "Sum of all shares/retweets",
    chartTypes: ["number", "line", "bar"],
  },
  {
    id: "total_comments",
    name: "Total Comments",
    description: "Sum of all comments/replies",
    chartTypes: ["number", "line", "bar"],
  },
  {
    id: "total_impressions",
    name: "Total Impressions",
    description: "Total content views",
    chartTypes: ["number", "line", "area"],
  },
  {
    id: "total_clicks",
    name: "Total Clicks",
    description: "Total link clicks",
    chartTypes: ["number", "line", "bar"],
  },
  {
    id: "top_posts",
    name: "Top Performing Posts",
    description: "Best posts by engagement",
    chartTypes: ["table"],
  },
  {
    id: "best_times",
    name: "Best Posting Times",
    description: "Hours with highest engagement",
    chartTypes: ["bar", "table"],
  },
  {
    id: "content_breakdown",
    name: "Content Breakdown",
    description: "Posts by platform",
    chartTypes: ["pie", "bar"],
  },
  {
    id: "platform_comparison",
    name: "Platform Comparison",
    description: "Compare metrics across platforms",
    chartTypes: ["bar", "table"],
  },
];

// Duplicate report
export async function duplicateReport(
  reportId: string,
  userId: string,
  newName?: string
): Promise<Report | null> {
  const original = await getReport(reportId, userId);
  if (!original) return null;

  return createReport(userId, {
    name: newName || `${original.name} (Copy)`,
    description: original.description,
    widgets: original.widgets.map((w) => ({ ...w, id: crypto.randomUUID() })),
    isPublic: false,
  });
}

// Get report templates
export function getReportTemplates(): Omit<Report, "id" | "userId" | "createdAt" | "updatedAt">[] {
  return [
    {
      name: "Weekly Performance",
      description: "A weekly overview of your social media performance",
      widgets: [
        { id: "1", name: "Posts This Week", metric: "posts_count", chartType: "number", platforms: [], dateRange: "7d", order: 0 },
        { id: "2", name: "Engagement Rate", metric: "engagement_rate", chartType: "number", platforms: [], dateRange: "7d", order: 1 },
        { id: "3", name: "Total Impressions", metric: "total_impressions", chartType: "line", platforms: [], dateRange: "7d", order: 2 },
        { id: "4", name: "Top Posts", metric: "top_posts", chartType: "table", platforms: [], dateRange: "7d", order: 3 },
      ],
      isPublic: false,
    },
    {
      name: "Platform Comparison",
      description: "Compare performance across different platforms",
      widgets: [
        { id: "1", name: "Platform Breakdown", metric: "content_breakdown", chartType: "pie", platforms: [], dateRange: "30d", order: 0 },
        { id: "2", name: "Platform Metrics", metric: "platform_comparison", chartType: "bar", platforms: [], dateRange: "30d", order: 1 },
      ],
      isPublic: false,
    },
    {
      name: "Engagement Report",
      description: "Deep dive into engagement metrics",
      widgets: [
        { id: "1", name: "Total Likes", metric: "total_likes", chartType: "number", platforms: [], dateRange: "30d", order: 0 },
        { id: "2", name: "Total Shares", metric: "total_shares", chartType: "number", platforms: [], dateRange: "30d", order: 1 },
        { id: "3", name: "Total Comments", metric: "total_comments", chartType: "number", platforms: [], dateRange: "30d", order: 2 },
        { id: "4", name: "Best Times", metric: "best_times", chartType: "bar", platforms: [], dateRange: "30d", order: 3 },
      ],
      isPublic: false,
    },
  ];
}
