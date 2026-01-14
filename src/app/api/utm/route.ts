import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  buildUTMUrl,
  parseUTMParams,
  createUTMLink,
  getUTMLinks,
  deleteUTMLink,
  createUTMPreset,
  getUTMPresets,
  updateUTMPreset,
  deleteUTMPreset,
  incrementPresetUsage,
  getUTMAnalytics,
  validateUTMParams,
  defaultSources,
  defaultMediums,
} from "@/lib/utm-builder";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "links": {
        const campaign = searchParams.get("campaign") || undefined;
        const source = searchParams.get("source") || undefined;
        const limit = searchParams.get("limit");
        const offset = searchParams.get("offset");

        const links = await getUTMLinks(session.user.id, {
          campaign,
          source,
          limit: limit ? parseInt(limit) : undefined,
          offset: offset ? parseInt(offset) : undefined,
        });
        return NextResponse.json({ links });
      }

      case "presets": {
        const presets = await getUTMPresets(session.user.id);
        return NextResponse.json({ presets });
      }

      case "analytics": {
        const analytics = await getUTMAnalytics(session.user.id);
        return NextResponse.json({ analytics });
      }

      case "suggestions": {
        return NextResponse.json({
          sources: defaultSources,
          mediums: defaultMediums,
        });
      }

      case "parse": {
        const url = searchParams.get("url");
        if (!url) {
          return NextResponse.json({ error: "URL required" }, { status: 400 });
        }
        const params = parseUTMParams(url);
        return NextResponse.json({ params });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("UTM GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch UTM data" },
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
      case "build": {
        const { url, source, medium, campaign, term, content } = data;

        if (!url) {
          return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        const validation = validateUTMParams({ source, medium, campaign, term, content });
        if (!validation.valid) {
          return NextResponse.json({ error: validation.errors.join(", ") }, { status: 400 });
        }

        try {
          const fullUrl = buildUTMUrl(url, { source, medium, campaign, term, content });
          return NextResponse.json({ url: fullUrl });
        } catch {
          return NextResponse.json({ error: "Invalid URL provided" }, { status: 400 });
        }
      }

      case "create-link": {
        const { url, source, medium, campaign, term, content, createShortCode } = data;

        if (!url) {
          return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        const validation = validateUTMParams({ source, medium, campaign, term, content });
        if (!validation.valid) {
          return NextResponse.json({ error: validation.errors.join(", ") }, { status: 400 });
        }

        const link = await createUTMLink(
          session.user.id,
          url,
          { source, medium, campaign, term, content },
          { createShortCode }
        );
        return NextResponse.json({ link });
      }

      case "delete-link": {
        const { linkId } = data;
        if (!linkId) {
          return NextResponse.json({ error: "Link ID required" }, { status: 400 });
        }
        await deleteUTMLink(linkId, session.user.id);
        return NextResponse.json({ success: true });
      }

      case "create-preset": {
        const { name, source, medium, campaign, term, content } = data;

        if (!name) {
          return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const validation = validateUTMParams({ source, medium, campaign, term, content });
        if (!validation.valid) {
          return NextResponse.json({ error: validation.errors.join(", ") }, { status: 400 });
        }

        const preset = await createUTMPreset(session.user.id, {
          name,
          source,
          medium,
          campaign,
          term,
          content,
        });
        return NextResponse.json({ preset });
      }

      case "update-preset": {
        const { presetId, ...updateData } = data;
        if (!presetId) {
          return NextResponse.json({ error: "Preset ID required" }, { status: 400 });
        }

        if (updateData.source || updateData.medium || updateData.campaign) {
          const validation = validateUTMParams({
            source: updateData.source,
            medium: updateData.medium,
            campaign: updateData.campaign,
            term: updateData.term,
            content: updateData.content,
          });
          if (!validation.valid) {
            return NextResponse.json({ error: validation.errors.join(", ") }, { status: 400 });
          }
        }

        const preset = await updateUTMPreset(presetId, session.user.id, updateData);
        return NextResponse.json({ preset });
      }

      case "delete-preset": {
        const { presetId } = data;
        if (!presetId) {
          return NextResponse.json({ error: "Preset ID required" }, { status: 400 });
        }
        await deleteUTMPreset(presetId, session.user.id);
        return NextResponse.json({ success: true });
      }

      case "use-preset": {
        const { presetId } = data;
        if (!presetId) {
          return NextResponse.json({ error: "Preset ID required" }, { status: 400 });
        }
        await incrementPresetUsage(presetId);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("UTM POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
