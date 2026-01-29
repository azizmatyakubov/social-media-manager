import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type CrisisSeverity = "low" | "medium" | "high" | "critical";
export type CrisisStatus = "detected" | "investigating" | "responding" | "resolved" | "escalated";
export type AlertType = "sentiment_spike" | "mention_surge" | "negative_review" | "viral_complaint" | "competitor_attack" | "pr_incident" | "custom";

export interface CrisisAlert {
  id: string;
  userId: string;
  type: AlertType;
  severity: CrisisSeverity;
  status: CrisisStatus;
  title: string;
  description: string;
  platform: string;
  sourceUrl?: string;
  sourceContent?: string;
  sourceAuthor?: string;
  affectedAccounts?: string[];
  mentionCount: number;
  sentimentScore: number; // -1 to 1
  keywords: string[];
  affectedAudience: number;
  detectedAt: Date;
  respondedAt?: Date;
  resolvedAt?: Date;
  assignedTo?: string;
  notes: string[];
  responses: CrisisResponse[];
  timeline: TimelineEvent[];
}

export interface CrisisResponse {
  id: string;
  crisisId: string;
  type?: string;
  content: string;
  sentBy?: string;
  platform: string;
  status: "draft" | "approved" | "published";
  success?: boolean;
  engagementMetrics?: Record<string, number>;
  publishedAt?: Date;
  createdBy: string;
  createdAt: Date;
}

export interface TimelineEvent {
  id: string;
  timestamp: Date;
  type: "detection" | "update" | "response" | "escalation" | "resolution";
  description: string;
  data?: Record<string, any>;
}

export interface ResponseTemplate {
  id: string;
  userId: string;
  name: string;
  category: string;
  content: string;
  tone?: string;
  platforms?: string[];
  variables: string[];
  isDefault?: boolean;
  usageCount: number;
  createdAt: Date;
}

export interface AlertRule {
  id: string;
  userId: string;
  name: string;
  type?: string;
  enabled: boolean;
  isEnabled?: boolean;
  platforms?: string[];
  conditions: {
    type: "sentiment" | "volume" | "keyword" | "competitor";
    operator: "gt" | "lt" | "eq" | "contains";
    value: number | string;
  }[];
  actions: {
    type: "email" | "sms" | "slack" | "pause_posts";
    config: Record<string, any>;
  }[];
  severity: CrisisSeverity;
  autoRespond?: boolean;
  responseTemplateId?: string;
  createdAt: Date;
}

export interface CrisisMetrics {
  totalAlerts: number;
  activeAlerts: number;
  resolvedAlerts: number;
  avgResolutionTime: number; // in minutes
  alertsBySeverity: Record<CrisisSeverity, number>;
  alertsByType: Record<AlertType, number>;
  recentTrend: "improving" | "stable" | "worsening";
}

// In-memory storage
const crisisAlerts = new Map<string, CrisisAlert>();
const userAlerts = new Map<string, Set<string>>();
const responseTemplates = new Map<string, ResponseTemplate>();
const userTemplates = new Map<string, Set<string>>();
const alertRules = new Map<string, AlertRule>();
const userRules = new Map<string, Set<string>>();

// Severity thresholds
const SEVERITY_THRESHOLDS = {
  sentiment: { critical: -0.8, high: -0.6, medium: -0.4, low: -0.2 },
  mentionSurge: { critical: 500, high: 200, medium: 100, low: 50 },
  negativeReviewRatio: { critical: 0.5, high: 0.3, medium: 0.2, low: 0.1 },
};

export function detectCrisisSeverity(
  sentimentScore: number,
  mentionCount: number,
  negativeRatio: number
): CrisisSeverity {
  // Check sentiment
  if (sentimentScore <= SEVERITY_THRESHOLDS.sentiment.critical) return "critical";
  if (sentimentScore <= SEVERITY_THRESHOLDS.sentiment.high) return "high";

  // Check mention surge
  if (mentionCount >= SEVERITY_THRESHOLDS.mentionSurge.critical) return "critical";
  if (mentionCount >= SEVERITY_THRESHOLDS.mentionSurge.high) return "high";

  // Check negative ratio
  if (negativeRatio >= SEVERITY_THRESHOLDS.negativeReviewRatio.critical) return "critical";
  if (negativeRatio >= SEVERITY_THRESHOLDS.negativeReviewRatio.high) return "high";

  // Default severity based on combined factors
  const combinedScore = (Math.abs(sentimentScore) + negativeRatio) / 2;
  if (combinedScore >= 0.4) return "medium";

  return "low";
}

export async function analyzeContent(content: string): Promise<{
  sentiment: number;
  isCrisis: boolean;
  crisisType: AlertType | null;
  keywords: string[];
  urgency: CrisisSeverity;
  suggestedActions: string[];
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a crisis detection AI. Analyze the content for potential crisis situations.

          Crisis types:
          - sentiment_spike: Sudden negative sentiment
          - mention_surge: Unusual volume of mentions
          - negative_review: Damaging reviews
          - viral_complaint: Complaint going viral
          - competitor_attack: Attack from competitors
          - pr_incident: Public relations issue

          Return JSON: {
            "sentiment": <-1 to 1>,
            "isCrisis": <boolean>,
            "crisisType": <type or null>,
            "keywords": ["keyword1", ...],
            "urgency": "low|medium|high|critical",
            "suggestedActions": ["action1", ...]
          }`,
        },
        { role: "user", content },
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    return {
      sentiment: 0,
      isCrisis: false,
      crisisType: null,
      keywords: [],
      urgency: "low",
      suggestedActions: [],
    };
  }
}

export async function generateCrisisResponse(
  crisis: Partial<CrisisAlert>,
  tone: "apologetic" | "empathetic" | "factual" | "reassuring" = "empathetic"
): Promise<{
  response: string;
  keyPoints: string[];
  warnings: string[];
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a crisis communication expert. Generate an appropriate response for the crisis situation.

          Tone: ${tone}

          Guidelines:
          - Acknowledge the issue
          - Show empathy
          - Provide clear next steps
          - Don't make promises you can't keep
          - Be concise and professional

          Return JSON: {
            "response": "...",
            "keyPoints": ["point1", ...],
            "warnings": ["things to avoid", ...]
          }`,
        },
        {
          role: "user",
          content: `Crisis: ${crisis.title}\nDescription: ${crisis.description}\nPlatform: ${crisis.platform}\nSeverity: ${crisis.severity}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    return {
      response: "We're aware of this issue and are working to resolve it. Thank you for your patience.",
      keyPoints: ["Acknowledge the issue", "Working on resolution"],
      warnings: ["Avoid making specific promises"],
    };
  }
}

export async function assessCrisisImpact(crisis: CrisisAlert): Promise<{
  estimatedReach: number;
  potentialDamage: "minimal" | "moderate" | "significant" | "severe";
  viralRisk: number; // 0-100
  reputationImpact: number; // 0-100
  recommendations: string[];
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Assess the potential impact of a crisis situation.

          Return JSON: {
            "estimatedReach": <number>,
            "potentialDamage": "minimal|moderate|significant|severe",
            "viralRisk": <0-100>,
            "reputationImpact": <0-100>,
            "recommendations": ["rec1", ...]
          }`,
        },
        {
          role: "user",
          content: JSON.stringify({
            type: crisis.type,
            severity: crisis.severity,
            platform: crisis.platform,
            mentionCount: crisis.mentionCount,
            sentimentScore: crisis.sentimentScore,
            keywords: crisis.keywords,
          }),
        },
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    return {
      estimatedReach: crisis.mentionCount * 100,
      potentialDamage: crisis.severity === "critical" ? "severe" : "moderate",
      viralRisk: crisis.severity === "critical" ? 80 : 40,
      reputationImpact: 50,
      recommendations: ["Monitor the situation", "Prepare a response"],
    };
  }
}

// CRUD operations for Crisis Alerts
export function createCrisisAlert(
  userId: string,
  data: Omit<CrisisAlert, "id" | "userId" | "detectedAt" | "notes" | "responses" | "timeline">
): CrisisAlert {
  const alert: CrisisAlert = {
    id: crypto.randomUUID(),
    userId,
    ...data,
    detectedAt: new Date(),
    notes: [],
    responses: [],
    timeline: [
      {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        type: "detection",
        description: `Crisis detected: ${data.title}`,
      },
    ],
  };

  crisisAlerts.set(alert.id, alert);

  if (!userAlerts.has(userId)) {
    userAlerts.set(userId, new Set());
  }
  userAlerts.get(userId)!.add(alert.id);

  return alert;
}

export function getUserCrisisAlerts(userId: string): CrisisAlert[] {
  const alertIds = userAlerts.get(userId);
  if (!alertIds) return [];

  return Array.from(alertIds)
    .map((id) => crisisAlerts.get(id))
    .filter((a): a is CrisisAlert => a !== undefined)
    .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
}

export function getCrisisAlert(alertId: string, userId: string): CrisisAlert | null {
  const alert = crisisAlerts.get(alertId);
  if (!alert || alert.userId !== userId) return null;
  return alert;
}

export function updateCrisisAlert(
  alertId: string,
  userId: string,
  updates: Partial<Pick<CrisisAlert, "status" | "severity" | "assignedTo" | "respondedAt" | "resolvedAt">>
): CrisisAlert | null {
  const alert = crisisAlerts.get(alertId);
  if (!alert || alert.userId !== userId) return null;

  const updatedAlert: CrisisAlert = {
    ...alert,
    ...updates,
    timeline: [
      ...alert.timeline,
      {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        type: updates.status === "resolved" ? "resolution" : "update",
        description: `Status updated to ${updates.status}`,
      },
    ],
  };

  crisisAlerts.set(alertId, updatedAlert);
  return updatedAlert;
}

export function addCrisisNote(alertId: string, userId: string, note: string): CrisisAlert | null {
  const alert = crisisAlerts.get(alertId);
  if (!alert || alert.userId !== userId) return null;

  alert.notes.push(note);
  alert.timeline.push({
    id: crypto.randomUUID(),
    timestamp: new Date(),
    type: "update",
    description: "Note added",
    data: { note },
  });

  crisisAlerts.set(alertId, alert);
  return alert;
}

export function addCrisisResponse(
  alertId: string,
  userId: string,
  response: Omit<CrisisResponse, "id" | "crisisId" | "createdAt">
): CrisisAlert | null {
  const alert = crisisAlerts.get(alertId);
  if (!alert || alert.userId !== userId) return null;

  const newResponse: CrisisResponse = {
    id: crypto.randomUUID(),
    crisisId: alertId,
    ...response,
    createdAt: new Date(),
  };

  alert.responses.push(newResponse);
  alert.timeline.push({
    id: crypto.randomUUID(),
    timestamp: new Date(),
    type: "response",
    description: `Response ${response.status}: ${response.platform}`,
  });

  if (!alert.respondedAt) {
    alert.respondedAt = new Date();
    alert.status = "responding";
  }

  crisisAlerts.set(alertId, alert);
  return alert;
}

export function deleteCrisisAlert(alertId: string, userId: string): boolean {
  const alert = crisisAlerts.get(alertId);
  if (!alert || alert.userId !== userId) return false;

  crisisAlerts.delete(alertId);
  userAlerts.get(userId)?.delete(alertId);
  return true;
}

// Response Template CRUD
export function createResponseTemplate(
  userId: string,
  data: Omit<ResponseTemplate, "id" | "userId" | "usageCount" | "createdAt">
): ResponseTemplate {
  const template: ResponseTemplate = {
    id: crypto.randomUUID(),
    userId,
    ...data,
    usageCount: 0,
    createdAt: new Date(),
  };

  responseTemplates.set(template.id, template);

  if (!userTemplates.has(userId)) {
    userTemplates.set(userId, new Set());
  }
  userTemplates.get(userId)!.add(template.id);

  return template;
}

export function getUserResponseTemplates(userId: string): ResponseTemplate[] {
  const templateIds = userTemplates.get(userId);
  if (!templateIds) return [];

  return Array.from(templateIds)
    .map((id) => responseTemplates.get(id))
    .filter((t): t is ResponseTemplate => t !== undefined)
    .sort((a, b) => b.usageCount - a.usageCount);
}

export function deleteResponseTemplate(templateId: string, userId: string): boolean {
  const template = responseTemplates.get(templateId);
  if (!template || template.userId !== userId) return false;

  responseTemplates.delete(templateId);
  userTemplates.get(userId)?.delete(templateId);
  return true;
}

// Alert Rule CRUD
export function createAlertRule(
  userId: string,
  data: Omit<AlertRule, "id" | "userId" | "createdAt">
): AlertRule {
  const rule: AlertRule = {
    id: crypto.randomUUID(),
    userId,
    ...data,
    createdAt: new Date(),
  };

  alertRules.set(rule.id, rule);

  if (!userRules.has(userId)) {
    userRules.set(userId, new Set());
  }
  userRules.get(userId)!.add(rule.id);

  return rule;
}

export function getUserAlertRules(userId: string): AlertRule[] {
  const ruleIds = userRules.get(userId);
  if (!ruleIds) return [];

  return Array.from(ruleIds)
    .map((id) => alertRules.get(id))
    .filter((r): r is AlertRule => r !== undefined);
}

export function updateAlertRule(
  ruleId: string,
  userId: string,
  updates: Partial<Pick<AlertRule, "name" | "enabled" | "conditions" | "actions" | "severity">>
): AlertRule | null {
  const rule = alertRules.get(ruleId);
  if (!rule || rule.userId !== userId) return null;

  const updatedRule: AlertRule = { ...rule, ...updates };
  alertRules.set(ruleId, updatedRule);
  return updatedRule;
}

export function deleteAlertRule(ruleId: string, userId: string): boolean {
  const rule = alertRules.get(ruleId);
  if (!rule || rule.userId !== userId) return false;

  alertRules.delete(ruleId);
  userRules.get(userId)?.delete(ruleId);
  return true;
}

// Analytics
export function getCrisisMetrics(userId: string): CrisisMetrics {
  const alerts = getUserCrisisAlerts(userId);

  const activeAlerts = alerts.filter((a) => a.status !== "resolved").length;
  const resolvedAlerts = alerts.filter((a) => a.status === "resolved");

  const avgResolutionTime =
    resolvedAlerts.length > 0
      ? resolvedAlerts.reduce((sum, a) => {
          const resolutionTime = a.resolvedAt
            ? (a.resolvedAt.getTime() - a.detectedAt.getTime()) / 60000
            : 0;
          return sum + resolutionTime;
        }, 0) / resolvedAlerts.length
      : 0;

  const alertsBySeverity: Record<CrisisSeverity, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  const alertsByType: Record<AlertType, number> = {
    sentiment_spike: 0,
    mention_surge: 0,
    negative_review: 0,
    viral_complaint: 0,
    competitor_attack: 0,
    pr_incident: 0,
    custom: 0,
  };

  for (const alert of alerts) {
    alertsBySeverity[alert.severity]++;
    alertsByType[alert.type]++;
  }

  // Calculate trend based on last 30 days vs previous 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const recentCount = alerts.filter((a) => a.detectedAt >= thirtyDaysAgo).length;
  const previousCount = alerts.filter(
    (a) => a.detectedAt >= sixtyDaysAgo && a.detectedAt < thirtyDaysAgo
  ).length;

  let recentTrend: "improving" | "stable" | "worsening" = "stable";
  if (recentCount < previousCount * 0.8) recentTrend = "improving";
  else if (recentCount > previousCount * 1.2) recentTrend = "worsening";

  return {
    totalAlerts: alerts.length,
    activeAlerts,
    resolvedAlerts: resolvedAlerts.length,
    avgResolutionTime: Math.round(avgResolutionTime),
    alertsBySeverity,
    alertsByType,
    recentTrend,
  };
}

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  sentiment_spike: "Sentiment Spike",
  mention_surge: "Mention Surge",
  negative_review: "Negative Review",
  viral_complaint: "Viral Complaint",
  competitor_attack: "Competitor Attack",
  pr_incident: "PR Incident",
  custom: "Custom Alert",
};

export const SEVERITY_COLORS: Record<CrisisSeverity, { bg: string; text: string; border: string }> = {
  low: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" },
  medium: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30" },
  high: { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30" },
  critical: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30" },
};

export const STATUS_LABELS: Record<CrisisStatus, string> = {
  detected: "Detected",
  investigating: "Investigating",
  responding: "Responding",
  resolved: "Resolved",
  escalated: "Escalated",
};

// Default response templates
export const DEFAULT_TEMPLATES = [
  {
    name: "Acknowledgment",
    category: "initial",
    content: "We've seen your concerns about {{issue}} and are looking into this right away. Your feedback matters to us.",
    variables: ["issue"],
  },
  {
    name: "Apology",
    category: "apology",
    content: "We sincerely apologize for {{issue}}. This is not the experience we want for our customers. We're taking immediate steps to resolve this.",
    variables: ["issue"],
  },
  {
    name: "Resolution",
    category: "resolution",
    content: "Good news! We've resolved the {{issue}} you reported. Thank you for bringing this to our attention. Please let us know if you need anything else.",
    variables: ["issue"],
  },
  {
    name: "Escalation Notice",
    category: "escalation",
    content: "We take your concerns seriously. This matter has been escalated to our {{team}} team who will reach out to you within {{timeframe}}.",
    variables: ["team", "timeframe"],
  },
];
