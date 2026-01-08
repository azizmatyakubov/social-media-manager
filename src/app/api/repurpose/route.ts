import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  repurposeContent,
  tweetToThread,
  threadToLinkedIn,
  blogToSocialPosts,
  contentToVideoScript,
  getUserRepurposedContent,
  updateRepurposedContent,
  publishRepurposedContent,
  suggestRepurposeOptions,
} from "@/lib/content-repurposing";
import { ContentType, RepurposeStatus, Platform } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as RepurposeStatus | null;
    const outputType = searchParams.get("outputType") as ContentType | null;
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const content = await getUserRepurposedContent(session.user.id, {
      status: status || undefined,
      outputType: outputType || undefined,
      limit,
      offset,
    });

    return NextResponse.json(content);
  } catch (error) {
    console.error("Repurposed content fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch repurposed content" },
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
    const { action } = body;

    if (action === "suggest") {
      const { content } = body;
      const suggestions = await suggestRepurposeOptions(content);
      return NextResponse.json({ suggestions });
    }

    if (action === "repurpose") {
      const { content, sourceType, outputType, sourcePostId } = body;

      if (!content || !sourceType || !outputType) {
        return NextResponse.json(
          { error: "Content, sourceType, and outputType are required" },
          { status: 400 }
        );
      }

      const result = await repurposeContent(
        session.user.id,
        content,
        sourceType as ContentType,
        outputType as ContentType,
        sourcePostId
      );

      return NextResponse.json(result);
    }

    if (action === "tweet-to-thread") {
      const { content } = body;
      const result = await tweetToThread(session.user.id, content);
      return NextResponse.json(result);
    }

    if (action === "thread-to-linkedin") {
      const { content } = body;
      const result = await threadToLinkedIn(session.user.id, content);
      return NextResponse.json(result);
    }

    if (action === "blog-to-social") {
      const { content, platforms } = body;
      const results = await blogToSocialPosts(
        session.user.id,
        content,
        platforms?.map((p: string) => p as Platform) || [Platform.X, Platform.LINKEDIN]
      );
      return NextResponse.json(results);
    }

    if (action === "to-video-script") {
      const { content, sourceType } = body;
      const result = await contentToVideoScript(
        session.user.id,
        content,
        sourceType as ContentType
      );
      return NextResponse.json(result);
    }

    if (action === "publish") {
      const { id } = body;
      const post = await publishRepurposedContent(id, session.user.id);
      return NextResponse.json(post);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Repurpose action error:", error);
    return NextResponse.json(
      { error: "Failed to process repurpose action" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, outputContent, status } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const result = await updateRepurposedContent(id, {
      outputContent,
      status: status as RepurposeStatus,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Repurpose update error:", error);
    return NextResponse.json(
      { error: "Failed to update repurposed content" },
      { status: 500 }
    );
  }
}
