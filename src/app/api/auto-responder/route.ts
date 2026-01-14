import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createAutoResponse,
  getUserAutoResponses,
  getAutoResponse,
  updateAutoResponse,
  deleteAutoResponse,
  toggleAutoResponse,
  getUserResponseLogs,
  createTemplate,
  getUserTemplates,
  deleteTemplate,
  generateAIResponse,
  processIncomingMessage,
  getAutoResponseAnalytics,
  TRIGGER_TYPES,
  RESPONSE_TYPES,
  MESSAGE_TYPES,
} from "@/lib/auto-responder";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "responses": {
        const responses = getUserAutoResponses(session.user.id);
        return NextResponse.json({ responses });
      }

      case "response": {
        const responseId = searchParams.get("responseId");
        if (!responseId) {
          return NextResponse.json({ error: "Response ID required" }, { status: 400 });
        }

        const response = getAutoResponse(responseId, session.user.id);
        if (!response) {
          return NextResponse.json({ error: "Response not found" }, { status: 404 });
        }

        return NextResponse.json({ response });
      }

      case "logs": {
        const responseId = searchParams.get("responseId");
        const status = searchParams.get("status");
        const type = searchParams.get("type");
        const limit = searchParams.get("limit");

        const logs = getUserResponseLogs(session.user.id, {
          responseId: responseId || undefined,
          status: status || undefined,
          type: type || undefined,
          limit: limit ? parseInt(limit) : undefined,
        });

        return NextResponse.json({ logs });
      }

      case "templates": {
        const templates = getUserTemplates(session.user.id);
        return NextResponse.json({ templates });
      }

      case "analytics": {
        const analytics = getAutoResponseAnalytics(session.user.id);
        return NextResponse.json({ analytics });
      }

      case "trigger-types": {
        return NextResponse.json({ triggerTypes: TRIGGER_TYPES });
      }

      case "response-types": {
        return NextResponse.json({ responseTypes: RESPONSE_TYPES });
      }

      case "message-types": {
        return NextResponse.json({ messageTypes: MESSAGE_TYPES });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Auto-responder GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case "create": {
        const { name, type, platform, trigger, response, settings, status } = data;

        if (!name || !type || !platform || !trigger || !response) {
          return NextResponse.json(
            { error: "Name, type, platform, trigger, and response are required" },
            { status: 400 }
          );
        }

        const autoResponse = createAutoResponse(session.user.id, {
          name,
          type,
          platform,
          trigger,
          response,
          settings: settings || {
            delay: { min: 30, max: 120 },
            rateLimit: { maxPerHour: 50, maxPerDay: 500 },
          },
          status: status || "draft",
        });

        return NextResponse.json({ response: autoResponse });
      }

      case "update": {
        const { responseId, ...updates } = data;

        if (!responseId) {
          return NextResponse.json({ error: "Response ID required" }, { status: 400 });
        }

        const response = updateAutoResponse(responseId, session.user.id, updates);
        if (!response) {
          return NextResponse.json({ error: "Response not found" }, { status: 404 });
        }

        return NextResponse.json({ response });
      }

      case "delete": {
        const { responseId } = data;

        if (!responseId) {
          return NextResponse.json({ error: "Response ID required" }, { status: 400 });
        }

        const deleted = deleteAutoResponse(responseId, session.user.id);
        if (!deleted) {
          return NextResponse.json({ error: "Response not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
      }

      case "toggle": {
        const { responseId } = data;

        if (!responseId) {
          return NextResponse.json({ error: "Response ID required" }, { status: 400 });
        }

        const response = toggleAutoResponse(responseId, session.user.id);
        if (!response) {
          return NextResponse.json({ error: "Response not found" }, { status: 404 });
        }

        return NextResponse.json({ response });
      }

      case "create-template": {
        const { name, category, content, variables } = data;

        if (!name || !category || !content) {
          return NextResponse.json(
            { error: "Name, category, and content required" },
            { status: 400 }
          );
        }

        const template = createTemplate(session.user.id, {
          name,
          category,
          content,
          variables: variables || [],
        });

        return NextResponse.json({ template });
      }

      case "delete-template": {
        const { templateId } = data;

        if (!templateId) {
          return NextResponse.json({ error: "Template ID required" }, { status: 400 });
        }

        const deleted = deleteTemplate(templateId, session.user.id);
        if (!deleted) {
          return NextResponse.json({ error: "Template not found or cannot be deleted" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
      }

      case "generate-ai-response": {
        const { message, platform, senderUsername, type, tone, brandVoice } = data;

        if (!message || !platform || !senderUsername || !type) {
          return NextResponse.json(
            { error: "Message, platform, sender username, and type required" },
            { status: 400 }
          );
        }

        const aiResponse = await generateAIResponse(message, {
          platform,
          senderUsername,
          type,
          tone: tone || "friendly",
          brandVoice,
        });

        return NextResponse.json({ aiResponse });
      }

      case "test-response": {
        const { message, platform, senderUsername, type } = data;

        if (!message) {
          return NextResponse.json({ error: "Test message required" }, { status: 400 });
        }

        const result = await processIncomingMessage(session.user.id, {
          content: message,
          platform: platform || "twitter",
          senderUsername: senderUsername || "test_user",
          type: type || "comment",
        });

        return NextResponse.json({ result });
      }

      case "simulate": {
        const { responseId, testMessages } = data;

        if (!responseId || !testMessages || testMessages.length === 0) {
          return NextResponse.json(
            { error: "Response ID and test messages required" },
            { status: 400 }
          );
        }

        const response = getAutoResponse(responseId, session.user.id);
        if (!response) {
          return NextResponse.json({ error: "Response not found" }, { status: 404 });
        }

        const results: { message: string; matched: boolean; reply?: string }[] = [];

        for (const msg of testMessages) {
          const result = await processIncomingMessage(session.user.id, {
            content: msg,
            platform: response.platform[0] || "twitter",
            senderUsername: "test_user",
            type: response.type,
          });

          results.push({
            message: msg,
            matched: result.matched,
            reply: result.respondedWith,
          });
        }

        return NextResponse.json({ results });
      }

      case "duplicate": {
        const { responseId, newName } = data;

        if (!responseId) {
          return NextResponse.json({ error: "Response ID required" }, { status: 400 });
        }

        const original = getAutoResponse(responseId, session.user.id);
        if (!original) {
          return NextResponse.json({ error: "Response not found" }, { status: 404 });
        }

        const duplicate = createAutoResponse(session.user.id, {
          name: newName || `${original.name} (Copy)`,
          type: original.type,
          platform: original.platform,
          trigger: original.trigger,
          response: original.response,
          settings: original.settings,
          status: "draft",
        });

        return NextResponse.json({ response: duplicate });
      }

      case "bulk-toggle": {
        const { responseIds, status } = data;

        if (!responseIds || responseIds.length === 0) {
          return NextResponse.json({ error: "Response IDs required" }, { status: 400 });
        }

        const updated: string[] = [];
        for (const id of responseIds) {
          const response = updateAutoResponse(id, session.user.id, { status });
          if (response) updated.push(id);
        }

        return NextResponse.json({ updated });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Auto-responder POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
