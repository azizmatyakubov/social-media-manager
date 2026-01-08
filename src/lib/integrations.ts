import { prisma } from "./prisma";
import { IntegrationType, Prisma } from "@prisma/client";
import crypto from "crypto";

// Webhook event types
export const WEBHOOK_EVENTS = [
  "post.created",
  "post.published",
  "post.failed",
  "post.scheduled",
  "mention.received",
  "analytics.daily",
  "approval.requested",
  "approval.completed",
  "member.joined",
  "member.left",
] as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[number];

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

// Integration configs
const INTEGRATION_CONFIGS: Record<IntegrationType, {
  name: string;
  authType: "oauth" | "apiKey" | "webhook";
  requiredFields: string[];
}> = {
  NOTION: {
    name: "Notion",
    authType: "oauth",
    requiredFields: ["databaseId"],
  },
  SLACK: {
    name: "Slack",
    authType: "oauth",
    requiredFields: ["channelId"],
  },
  ZAPIER: {
    name: "Zapier",
    authType: "webhook",
    requiredFields: ["webhookUrl"],
  },
  GOOGLE_SHEETS: {
    name: "Google Sheets",
    authType: "oauth",
    requiredFields: ["spreadsheetId", "sheetName"],
  },
  AIRTABLE: {
    name: "Airtable",
    authType: "apiKey",
    requiredFields: ["baseId", "tableId"],
  },
  DISCORD: {
    name: "Discord",
    authType: "webhook",
    requiredFields: ["webhookUrl"],
  },
  CUSTOM_WEBHOOK: {
    name: "Custom Webhook",
    authType: "webhook",
    requiredFields: ["url"],
  },
};

export async function createIntegration(
  userId: string,
  type: IntegrationType,
  config: Record<string, unknown>,
  credentials?: {
    accessToken?: string;
    refreshToken?: string;
    apiKey?: string;
  }
) {
  const integrationConfig = INTEGRATION_CONFIGS[type];

  // Validate required fields
  for (const field of integrationConfig.requiredFields) {
    if (!config[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  return prisma.integration.upsert({
    where: {
      userId_type: { userId, type },
    },
    update: {
      config: config as Prisma.InputJsonValue,
      accessToken: credentials?.accessToken,
      refreshToken: credentials?.refreshToken,
      apiKey: credentials?.apiKey,
      isActive: true,
    },
    create: {
      userId,
      type,
      name: integrationConfig.name,
      config: config as Prisma.InputJsonValue,
      accessToken: credentials?.accessToken,
      refreshToken: credentials?.refreshToken,
      apiKey: credentials?.apiKey,
    },
  });
}

export async function deleteIntegration(userId: string, type: IntegrationType) {
  return prisma.integration.delete({
    where: {
      userId_type: { userId, type },
    },
  });
}

export async function getUserIntegrations(userId: string) {
  const integrations = await prisma.integration.findMany({
    where: { userId },
    select: {
      id: true,
      type: true,
      name: true,
      isActive: true,
      lastSyncAt: true,
      config: true,
    },
  });

  return integrations;
}

// Webhook management
export async function createWebhook(
  data: {
    workspaceId?: string;
    name: string;
    url: string;
    events: WebhookEvent[];
  }
) {
  const secret = crypto.randomBytes(32).toString("hex");

  return prisma.webhook.create({
    data: {
      workspaceId: data.workspaceId,
      name: data.name,
      url: data.url,
      secret,
      events: data.events,
    },
  });
}

export async function updateWebhook(
  webhookId: string,
  data: {
    name?: string;
    url?: string;
    events?: WebhookEvent[];
    isActive?: boolean;
  }
) {
  return prisma.webhook.update({
    where: { id: webhookId },
    data,
  });
}

export async function deleteWebhook(webhookId: string) {
  return prisma.webhook.delete({
    where: { id: webhookId },
  });
}

export async function triggerWebhook(
  event: WebhookEvent,
  data: Record<string, unknown>,
  workspaceId?: string
) {
  const webhooks = await prisma.webhook.findMany({
    where: {
      isActive: true,
      events: { has: event },
      ...(workspaceId ? { workspaceId } : {}),
    },
  });

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const results = await Promise.allSettled(
    webhooks.map((webhook) => sendWebhook(webhook, payload))
  );

  return results.map((result, index) => ({
    webhookId: webhooks[index].id,
    status: result.status,
    error: result.status === "rejected" ? (result.reason as Error).message : null,
  }));
}

async function sendWebhook(
  webhook: { id: string; url: string; secret: string },
  payload: WebhookPayload
) {
  const payloadString = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", webhook.secret)
    .update(payloadString)
    .digest("hex");

  const response = await fetch(webhook.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Signature": signature,
      "X-Webhook-Event": payload.event,
    },
    body: payloadString,
  });

  // Log the event
  await prisma.webhookEvent.create({
    data: {
      webhookId: webhook.id,
      event: payload.event,
      payload: payload as unknown as Prisma.InputJsonValue,
      status: response.status,
      response: await response.text().catch(() => null),
    },
  });

  // Update last triggered
  await prisma.webhook.update({
    where: { id: webhook.id },
    data: { lastTriggeredAt: new Date() },
  });

  if (!response.ok) {
    throw new Error(`Webhook failed with status ${response.status}`);
  }

  return { success: true };
}

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

// Platform-specific integrations
export async function sendToSlack(
  accessToken: string,
  channelId: string,
  message: string
) {
  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      channel: channelId,
      text: message,
    }),
  });

  return response.json();
}

export async function sendToDiscord(webhookUrl: string, message: string, embeds?: Array<{
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
}>) {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: message,
      embeds,
    }),
  });

  return response.ok;
}

export async function addToNotion(
  accessToken: string,
  databaseId: string,
  properties: Record<string, unknown>
) {
  const response = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
    }),
  });

  return response.json();
}

export async function appendToGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  values: string[][]
) {
  const range = `${sheetName}!A:Z`;
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ values }),
    }
  );

  return response.json();
}

export async function getWebhookLogs(webhookId: string, limit: number = 50) {
  return prisma.webhookEvent.findMany({
    where: { webhookId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getWorkspaceWebhooks(workspaceId: string) {
  return prisma.webhook.findMany({
    where: { workspaceId },
    include: {
      _count: {
        select: { logs: true },
      },
    },
  });
}
