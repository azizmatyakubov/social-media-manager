import { prisma } from "./prisma";
import { NotificationType, EmailStatus } from "@prisma/client";

// Email configuration - supports multiple providers
const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@socialmanager.app";
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Social Media Manager";
const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:4001";

// Email templates
const templates: Record<NotificationType, (data: Record<string, unknown>) => { subject: string; body: string }> = {
  POST_PUBLISHED: (data) => ({
    subject: `✅ Your post was published successfully`,
    body: `
      <h2>Post Published!</h2>
      <p>Your post has been successfully published to X.</p>
      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0;">"${data.content}"</p>
      </div>
      <p><a href="${data.postUrl}" style="color: #1DA1F2;">View on X →</a></p>
    `,
  }),

  POST_FAILED: (data) => ({
    subject: `❌ Post failed to publish`,
    body: `
      <h2>Post Failed</h2>
      <p>Unfortunately, your post could not be published.</p>
      <div style="background: #fff5f5; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #ef4444;">
        <p style="margin: 0;"><strong>Error:</strong> ${data.error}</p>
      </div>
      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0;">"${data.content}"</p>
      </div>
      <p><a href="${APP_URL}/dashboard" style="color: #1DA1F2;">Try again →</a></p>
    `,
  }),

  WEEKLY_DIGEST: (data) => ({
    subject: `📊 Your Weekly Social Media Report`,
    body: `
      <h2>Weekly Performance Report</h2>
      <p>Here's how your content performed this week:</p>

      <div style="display: flex; gap: 16px; margin: 24px 0;">
        <div style="flex: 1; background: #f5f5f5; padding: 16px; border-radius: 8px; text-align: center;">
          <p style="margin: 0; font-size: 24px; font-weight: bold;">${data.postsPublished || 0}</p>
          <p style="margin: 4px 0 0; color: #666;">Posts Published</p>
        </div>
        <div style="flex: 1; background: #f5f5f5; padding: 16px; border-radius: 8px; text-align: center;">
          <p style="margin: 0; font-size: 24px; font-weight: bold;">${data.totalImpressions || 0}</p>
          <p style="margin: 4px 0 0; color: #666;">Impressions</p>
        </div>
        <div style="flex: 1; background: #f5f5f5; padding: 16px; border-radius: 8px; text-align: center;">
          <p style="margin: 0; font-size: 24px; font-weight: bold;">${data.totalEngagement || 0}</p>
          <p style="margin: 4px 0 0; color: #666;">Engagements</p>
        </div>
      </div>

      ${data.topPost ? `
        <h3>🏆 Top Performing Post</h3>
        <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #22c55e;">
          <p style="margin: 0;">"${data.topPost}"</p>
          <p style="margin: 8px 0 0; color: #666; font-size: 14px;">
            ${data.topPostLikes} likes • ${data.topPostRetweets} retweets • ${data.topPostReplies} replies
          </p>
        </div>
      ` : ''}

      <p><a href="${APP_URL}/dashboard" style="color: #1DA1F2;">View full analytics →</a></p>
    `,
  }),

  ENGAGEMENT_ALERT: (data) => ({
    subject: `🔥 High engagement on your post!`,
    body: `
      <h2>Your Post is Getting Attention!</h2>
      <p>One of your posts is performing exceptionally well:</p>
      <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #f59e0b;">
        <p style="margin: 0;">"${data.content}"</p>
        <p style="margin: 8px 0 0; color: #666; font-size: 14px;">
          ${data.likes} likes • ${data.retweets} retweets • ${data.replies} replies
        </p>
      </div>
      <p><a href="${data.postUrl}" style="color: #1DA1F2;">View on X →</a></p>
    `,
  }),

  TRENDING_ALERT: (data) => ({
    subject: `🚀 Your post is going viral!`,
    body: `
      <h2>Congratulations! Your Post is Trending!</h2>
      <p>Your content has reached ${data.impressions} impressions and counting!</p>
      <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #f59e0b;">
        <p style="margin: 0;">"${data.content}"</p>
      </div>
      <p><a href="${data.postUrl}" style="color: #1DA1F2;">View on X →</a></p>
    `,
  }),

  RECYCLE_REMINDER: (data) => ({
    subject: `♻️ Time to recycle your evergreen content`,
    body: `
      <h2>Evergreen Content Ready for Recycling</h2>
      <p>You have ${data.postsReady} evergreen posts ready to be recycled:</p>
      ${(data.posts as Array<{ content: string; lastRecycled: string }>)?.slice(0, 3).map(post => `
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0;">"${post.content}"</p>
          <p style="margin: 8px 0 0; color: #666; font-size: 14px;">Last posted: ${post.lastRecycled}</p>
        </div>
      `).join('') || ''}
      <p><a href="${APP_URL}/dashboard" style="color: #1DA1F2;">Recycle now →</a></p>
    `,
  }),

  WELCOME: (data) => ({
    subject: `🎉 Welcome to ${APP_NAME}!`,
    body: `
      <h2>Welcome aboard, ${data.name || 'there'}!</h2>
      <p>Thanks for joining ${APP_NAME}. We're excited to help you grow your social media presence.</p>

      <h3>Get Started:</h3>
      <ol>
        <li><strong>Connect your X account</strong> - Link your X account to start publishing</li>
        <li><strong>Configure your settings</strong> - Set your tone, topics, and posting preferences</li>
        <li><strong>Create your first post</strong> - Use AI to generate engaging content</li>
      </ol>

      <p><a href="${APP_URL}/dashboard/settings" style="color: #1DA1F2;">Get started →</a></p>
    `,
  }),

  SUBSCRIPTION_CHANGE: (data) => ({
    subject: `📋 Subscription ${String(data.action || 'Updated')}`,
    body: `
      <h2>Subscription ${String(data.action || 'Updated')}</h2>
      <p>Your subscription has been ${String(data.action || 'updated').toLowerCase()}.</p>
      <p><strong>Plan:</strong> ${data.plan}</p>
      ${data.nextBillingDate ? `<p><strong>Next billing:</strong> ${data.nextBillingDate}</p>` : ''}
      <p><a href="${APP_URL}/dashboard/settings" style="color: #1DA1F2;">Manage subscription →</a></p>
    `,
  }),
};

// Wrap email body in base template
function wrapTemplate(body: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${APP_NAME}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f9fafb;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            ${body}
          </div>
          <div style="text-align: center; margin-top: 24px; color: #9ca3af; font-size: 14px;">
            <p>${APP_NAME}</p>
            <p><a href="${APP_URL}/dashboard/settings" style="color: #6b7280;">Notification settings</a></p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Queue an email notification
export async function queueEmail(
  userId: string,
  type: NotificationType,
  data: Record<string, unknown> = {}
): Promise<string | null> {
  try {
    // Check if user has notifications enabled for this type
    const settings = await prisma.notificationSettings.findUnique({
      where: { userId },
    });

    // If user has unsubscribed from all, skip
    if (settings?.unsubscribedAll) {
      return null;
    }

    // Check specific notification type settings
    const typeSettingsMap: Record<NotificationType, string | null> = {
      POST_PUBLISHED: "postPublished",
      POST_FAILED: "postFailed",
      WEEKLY_DIGEST: "weeklyDigest",
      ENGAGEMENT_ALERT: "engagementAlerts",
      TRENDING_ALERT: "trendingAlerts",
      RECYCLE_REMINDER: "recycleReminders",
      WELCOME: null, // Always send
      SUBSCRIPTION_CHANGE: null, // Always send
    };

    const settingKey = typeSettingsMap[type];
    if (settingKey && settings) {
      const settingValue = settings[settingKey as keyof typeof settings];
      if (settingValue === false) {
        return null;
      }
    }

    // Generate email content from template
    const template = templates[type];
    const { subject, body } = template(data);

    // Queue the email
    const notification = await prisma.emailNotification.create({
      data: {
        userId,
        type,
        subject,
        body: wrapTemplate(body),
        status: "PENDING",
        metadata: data as object,
      },
    });

    // In production, trigger email sending here (e.g., via queue or immediate send)
    // For now, we'll use a simple approach that can be called via cron or webhook
    await sendEmail(notification.id);

    return notification.id;
  } catch (error) {
    console.error("Queue email error:", error);
    return null;
  }
}

// Send a queued email
export async function sendEmail(notificationId: string): Promise<boolean> {
  try {
    const notification = await prisma.emailNotification.findUnique({
      where: { id: notificationId },
      include: { user: { select: { email: true, name: true } } },
    });

    if (!notification || notification.status === "SENT") {
      return false;
    }

    // Check for email provider configuration
    const resendApiKey = process.env.RESEND_API_KEY;
    const sendgridApiKey = process.env.SENDGRID_API_KEY;

    if (resendApiKey) {
      // Use Resend
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: EMAIL_FROM,
          to: notification.user.email,
          subject: notification.subject,
          html: notification.body,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Resend error: ${error}`);
      }
    } else if (sendgridApiKey) {
      // Use SendGrid
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${sendgridApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: notification.user.email }] }],
          from: { email: EMAIL_FROM },
          subject: notification.subject,
          content: [{ type: "text/html", value: notification.body }],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`SendGrid error: ${error}`);
      }
    } else {
      // No email provider configured - log to console for development
      console.log("📧 Email (dev mode):");
      console.log(`To: ${notification.user.email}`);
      console.log(`Subject: ${notification.subject}`);
      console.log("---");
    }

    // Mark as sent
    await prisma.emailNotification.update({
      where: { id: notificationId },
      data: { status: "SENT", sentAt: new Date() },
    });

    return true;
  } catch (error) {
    console.error("Send email error:", error);

    // Mark as failed
    await prisma.emailNotification.update({
      where: { id: notificationId },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    return false;
  }
}

// Process pending emails (call from cron job)
export async function processPendingEmails(limit = 50): Promise<number> {
  const pending = await prisma.emailNotification.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let sent = 0;
  for (const notification of pending) {
    const success = await sendEmail(notification.id);
    if (success) sent++;
  }

  return sent;
}

// Send weekly digest for all users
export async function sendWeeklyDigests(): Promise<number> {
  const settings = await prisma.notificationSettings.findMany({
    where: {
      weeklyDigest: true,
      unsubscribedAll: false,
    },
    include: { user: true },
  });

  let sent = 0;

  for (const setting of settings) {
    // Get user's weekly stats
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    const posts = await prisma.post.findMany({
      where: {
        userId: setting.userId,
        status: "POSTED",
        postedAt: { gte: weekStart },
      },
    });

    const totalImpressions = posts.reduce((sum, p) => sum + p.impressions, 0);
    const totalEngagement = posts.reduce(
      (sum, p) => sum + p.likes + p.retweets + p.replies,
      0
    );

    const topPost = posts.length > 0
      ? posts.reduce((best, p) => {
          const score = p.likes + p.retweets * 2 + p.replies * 3;
          const bestScore = best.likes + best.retweets * 2 + best.replies * 3;
          return score > bestScore ? p : best;
        })
      : null;

    await queueEmail(setting.userId, "WEEKLY_DIGEST", {
      postsPublished: posts.length,
      totalImpressions,
      totalEngagement,
      topPost: topPost?.content,
      topPostLikes: topPost?.likes,
      topPostRetweets: topPost?.retweets,
      topPostReplies: topPost?.replies,
    });

    sent++;
  }

  return sent;
}
