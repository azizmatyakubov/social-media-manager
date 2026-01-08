import { prisma } from "./prisma";
import { Platform, ReportType } from "@prisma/client";
import { queueEmail } from "./email";

export interface ReportSettings {
  name: string;
  reportType: ReportType;
  platforms: Platform[];
  logoUrl?: string;
  companyName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  showWatermark?: boolean;
  startDate?: Date;
  endDate?: Date;
  autoGenerate?: boolean;
  scheduleDay?: string;
  scheduleTime?: string;
  emailRecipients?: string[];
}

export interface ReportUpdate {
  name?: string;
  reportType?: ReportType;
  platforms?: Platform[];
  logoUrl?: string;
  companyName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  showWatermark?: boolean;
  startDate?: Date;
  endDate?: Date;
  autoGenerate?: boolean;
  scheduleDay?: string;
  scheduleTime?: string;
  emailRecipients?: string[];
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

// Create a new report configuration
export async function createReport(userId: string, settings: ReportSettings) {
  return prisma.brandReport.create({
    data: {
      userId,
      name: settings.name,
      reportType: settings.reportType,
      platforms: settings.platforms,
      logoUrl: settings.logoUrl,
      companyName: settings.companyName,
      primaryColor: settings.primaryColor || "#1DA1F2",
      secondaryColor: settings.secondaryColor || "#14171A",
      showWatermark: settings.showWatermark ?? false,
      startDate: settings.startDate,
      endDate: settings.endDate,
      autoGenerate: settings.autoGenerate ?? false,
      scheduleDay: settings.scheduleDay,
      scheduleTime: settings.scheduleTime,
      emailRecipients: settings.emailRecipients || [],
    },
  });
}

// Get all reports for a user
export async function getReports(userId: string) {
  return prisma.brandReport.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

// Get a single report
export async function getReport(reportId: string) {
  return prisma.brandReport.findUnique({
    where: { id: reportId },
  });
}

// Update a report
export async function updateReport(reportId: string, updates: ReportUpdate) {
  return prisma.brandReport.update({
    where: { id: reportId },
    data: updates,
  });
}

// Delete a report
export async function deleteReport(reportId: string) {
  return prisma.brandReport.delete({
    where: { id: reportId },
  });
}

// Get report data for a specific date range
export async function getReportData(reportId: string, dateRange?: DateRange) {
  const report = await prisma.brandReport.findUnique({
    where: { id: reportId },
    include: { user: true },
  });

  if (!report) {
    throw new Error("Report not found");
  }

  // Determine date range
  const now = new Date();
  let startDate: Date;
  let endDate: Date = dateRange?.endDate || now;

  if (dateRange?.startDate) {
    startDate = dateRange.startDate;
  } else {
    // Calculate based on report type
    startDate = new Date(now);
    switch (report.reportType) {
      case "DAILY":
        startDate.setDate(startDate.getDate() - 1);
        break;
      case "WEEKLY":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "MONTHLY":
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "QUARTERLY":
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }
  }

  // Gather data for each platform
  const platformData: Record<string, unknown> = {};

  for (const platform of report.platforms) {
    // Get daily metrics
    const metrics = await prisma.dailyMetrics.findMany({
      where: {
        userId: report.userId,
        platform,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: "asc" },
    });

    // Get posts
    const posts = await prisma.post.findMany({
      where: {
        userId: report.userId,
        platform,
        status: "POSTED",
        postedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { postedAt: "desc" },
    });

    // Calculate summary statistics
    const totalLikes = posts.reduce((sum, p) => sum + p.likes, 0);
    const totalRetweets = posts.reduce((sum, p) => sum + p.retweets, 0);
    const totalReplies = posts.reduce((sum, p) => sum + p.replies, 0);
    const totalImpressions = posts.reduce((sum, p) => sum + p.impressions, 0);
    const totalClicks = posts.reduce((sum, p) => sum + p.clicks, 0);
    const totalEngagement = totalLikes + totalRetweets + totalReplies;
    const engagementRate = totalImpressions > 0
      ? ((totalEngagement / totalImpressions) * 100).toFixed(2)
      : "0";

    // Get follower growth
    const latestMetric = metrics[metrics.length - 1];
    const earliestMetric = metrics[0];
    const followerGrowth = latestMetric && earliestMetric
      ? latestMetric.followers - earliestMetric.followers
      : 0;

    // Top performing posts
    const topPosts = [...posts]
      .sort((a, b) => {
        const scoreA = a.likes + a.retweets * 2 + a.replies * 3;
        const scoreB = b.likes + b.retweets * 2 + b.replies * 3;
        return scoreB - scoreA;
      })
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        content: p.content.substring(0, 150) + (p.content.length > 150 ? "..." : ""),
        likes: p.likes,
        retweets: p.retweets,
        replies: p.replies,
        impressions: p.impressions,
        postedAt: p.postedAt,
      }));

    // Daily breakdown for charts
    const dailyBreakdown = metrics.map((m) => ({
      date: m.date.toISOString().split("T")[0],
      followers: m.followers,
      likes: m.totalLikes,
      retweets: m.totalRetweets,
      replies: m.totalReplies,
      impressions: m.totalImpressions,
      engagementRate: m.engagementRate,
    }));

    platformData[platform] = {
      summary: {
        postsPublished: posts.length,
        totalLikes,
        totalRetweets,
        totalReplies,
        totalImpressions,
        totalClicks,
        totalEngagement,
        engagementRate,
        currentFollowers: latestMetric?.followers || 0,
        followerGrowth,
      },
      topPosts,
      dailyBreakdown,
    };
  }

  return {
    report: {
      id: report.id,
      name: report.name,
      reportType: report.reportType,
      companyName: report.companyName,
      logoUrl: report.logoUrl,
      primaryColor: report.primaryColor,
      secondaryColor: report.secondaryColor,
      showWatermark: report.showWatermark,
    },
    dateRange: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    platforms: report.platforms,
    data: platformData,
    generatedAt: new Date().toISOString(),
  };
}

// Generate a report (creates PDF/HTML and stores URL)
export async function generateReport(reportId: string) {
  const reportData = await getReportData(reportId);

  // Generate HTML report
  const htmlReport = generateHtmlReport(reportData);

  // In production, you would upload to cloud storage and get URL
  // For now, store the HTML content directly
  const reportUrl = `data:text/html;base64,${Buffer.from(htmlReport).toString("base64")}`;

  // Update report with generated data
  await prisma.brandReport.update({
    where: { id: reportId },
    data: {
      reportUrl,
      reportData: reportData as object,
      generatedCount: { increment: 1 },
      lastGenerated: new Date(),
    },
  });

  return {
    reportUrl,
    reportData,
    htmlReport,
  };
}

// Generate HTML report content
function generateHtmlReport(data: Awaited<ReturnType<typeof getReportData>>): string {
  const { report, dateRange, platforms, data: platformData } = data;

  const platformSections = platforms.map((platform) => {
    const pData = platformData[platform] as {
      summary: {
        postsPublished: number;
        totalLikes: number;
        totalRetweets: number;
        totalReplies: number;
        totalImpressions: number;
        totalEngagement: number;
        engagementRate: string;
        currentFollowers: number;
        followerGrowth: number;
      };
      topPosts: Array<{
        content: string;
        likes: number;
        retweets: number;
        replies: number;
        impressions: number;
        postedAt: Date | null;
      }>;
    };

    return `
      <div class="platform-section">
        <h2>${platform}</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${pData.summary.postsPublished}</div>
            <div class="stat-label">Posts Published</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${pData.summary.totalImpressions.toLocaleString()}</div>
            <div class="stat-label">Impressions</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${pData.summary.totalEngagement.toLocaleString()}</div>
            <div class="stat-label">Total Engagement</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${pData.summary.engagementRate}%</div>
            <div class="stat-label">Engagement Rate</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${pData.summary.currentFollowers.toLocaleString()}</div>
            <div class="stat-label">Followers</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${pData.summary.followerGrowth >= 0 ? "+" : ""}${pData.summary.followerGrowth.toLocaleString()}</div>
            <div class="stat-label">Follower Growth</div>
          </div>
        </div>

        <h3>Top Performing Posts</h3>
        <div class="top-posts">
          ${pData.topPosts.map((post, i) => `
            <div class="post-card">
              <div class="post-rank">#${i + 1}</div>
              <div class="post-content">"${post.content}"</div>
              <div class="post-stats">
                <span>${post.likes} likes</span>
                <span>${post.retweets} retweets</span>
                <span>${post.replies} replies</span>
                <span>${post.impressions.toLocaleString()} impressions</span>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }).join("");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${report.name}</title>
        <style>
          :root {
            --primary: ${report.primaryColor};
            --secondary: ${report.secondaryColor};
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: var(--secondary); line-height: 1.6; }
          .header { background: var(--primary); color: white; padding: 40px; text-align: center; }
          .header img { max-height: 60px; margin-bottom: 16px; }
          .header h1 { font-size: 28px; font-weight: 600; }
          .header .date-range { opacity: 0.9; margin-top: 8px; }
          .content { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
          .platform-section { margin-bottom: 48px; }
          .platform-section h2 { font-size: 24px; margin-bottom: 24px; padding-bottom: 8px; border-bottom: 2px solid var(--primary); }
          .platform-section h3 { font-size: 18px; margin: 32px 0 16px; }
          .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
          .stat-card { background: #f8fafc; border-radius: 12px; padding: 24px; text-align: center; }
          .stat-value { font-size: 28px; font-weight: 700; color: var(--primary); }
          .stat-label { font-size: 14px; color: #64748b; margin-top: 4px; }
          .top-posts { display: flex; flex-direction: column; gap: 16px; }
          .post-card { background: #f8fafc; border-radius: 12px; padding: 20px; position: relative; }
          .post-rank { position: absolute; top: 16px; right: 16px; background: var(--primary); color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; }
          .post-content { font-size: 15px; margin-bottom: 12px; padding-right: 40px; }
          .post-stats { display: flex; gap: 16px; font-size: 13px; color: #64748b; }
          .footer { text-align: center; padding: 40px; color: #94a3b8; font-size: 14px; }
          .watermark { opacity: 0.6; }
          @media print { .stats-grid { grid-template-columns: repeat(3, 1fr); } }
        </style>
      </head>
      <body>
        <div class="header">
          ${report.logoUrl ? `<img src="${report.logoUrl}" alt="Logo">` : ""}
          <h1>${report.companyName || report.name}</h1>
          <div class="date-range">${new Date(dateRange.startDate).toLocaleDateString()} - ${new Date(dateRange.endDate).toLocaleDateString()}</div>
        </div>
        <div class="content">
          ${platformSections}
        </div>
        <div class="footer">
          ${report.showWatermark ? '<p class="watermark">Generated by Social Media Manager</p>' : ""}
          <p>Report generated on ${new Date().toLocaleDateString()}</p>
        </div>
      </body>
    </html>
  `;
}

// Schedule a report for auto-generation
export async function scheduleReport(
  reportId: string,
  schedule: { day: string; time: string; emailRecipients?: string[] }
) {
  return prisma.brandReport.update({
    where: { id: reportId },
    data: {
      autoGenerate: true,
      scheduleDay: schedule.day,
      scheduleTime: schedule.time,
      emailRecipients: schedule.emailRecipients || [],
    },
  });
}

// Unschedule a report
export async function unscheduleReport(reportId: string) {
  return prisma.brandReport.update({
    where: { id: reportId },
    data: {
      autoGenerate: false,
      scheduleDay: null,
      scheduleTime: null,
    },
  });
}

// Send report via email
export async function sendReportEmail(reportId: string, recipients?: string[]) {
  const report = await prisma.brandReport.findUnique({
    where: { id: reportId },
    include: { user: true },
  });

  if (!report) {
    throw new Error("Report not found");
  }

  // Generate fresh report
  const { htmlReport } = await generateReport(reportId);

  // Determine recipients
  const emailList = recipients || report.emailRecipients;
  if (emailList.length === 0) {
    throw new Error("No recipients specified");
  }

  // Send emails
  const results = await Promise.all(
    emailList.map(async (email) => {
      try {
        // Check for email provider
        const resendApiKey = process.env.RESEND_API_KEY;
        const sendgridApiKey = process.env.SENDGRID_API_KEY;

        if (resendApiKey) {
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: process.env.EMAIL_FROM || "noreply@socialmanager.app",
              to: email,
              subject: `${report.companyName || "Social Media"} Report - ${report.name}`,
              html: htmlReport,
            }),
          });

          return { email, success: response.ok };
        } else if (sendgridApiKey) {
          const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${sendgridApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              personalizations: [{ to: [{ email }] }],
              from: { email: process.env.EMAIL_FROM || "noreply@socialmanager.app" },
              subject: `${report.companyName || "Social Media"} Report - ${report.name}`,
              content: [{ type: "text/html", value: htmlReport }],
            }),
          });

          return { email, success: response.ok };
        } else {
          console.log(`[Dev] Would send report to: ${email}`);
          return { email, success: true };
        }
      } catch (error) {
        console.error(`Failed to send report to ${email}:`, error);
        return { email, success: false };
      }
    })
  );

  return {
    sent: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  };
}

// Process scheduled reports (call from cron job)
export async function processScheduledReports() {
  const now = new Date();
  const currentDay = now.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  const currentTime = now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });

  // Find reports scheduled for now
  const scheduledReports = await prisma.brandReport.findMany({
    where: {
      autoGenerate: true,
      scheduleDay: currentDay,
      scheduleTime: currentTime,
    },
  });

  const results = await Promise.all(
    scheduledReports.map(async (report) => {
      try {
        await generateReport(report.id);
        if (report.emailRecipients.length > 0) {
          await sendReportEmail(report.id);
        }
        return { reportId: report.id, success: true };
      } catch (error) {
        console.error(`Failed to process scheduled report ${report.id}:`, error);
        return { reportId: report.id, success: false };
      }
    })
  );

  return results;
}
