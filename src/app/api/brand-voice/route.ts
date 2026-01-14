import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  analyzeBrandVoice,
  checkVoiceConsistency,
  generateOnBrandContent,
  suggestVoiceImprovements,
  createVoiceProfile,
  getUserVoiceProfiles,
  getVoiceProfile,
  updateVoiceProfile,
  deleteVoiceProfile,
  addSampleContent,
  TONE_OPTIONS,
  PERSONALITY_OPTIONS,
  type BrandVoiceProfile,
} from "@/lib/brand-voice";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "profiles": {
        const profiles = getUserVoiceProfiles(session.user.id);
        return NextResponse.json({ profiles });
      }

      case "profile": {
        const profileId = searchParams.get("profileId");
        if (!profileId) {
          return NextResponse.json({ error: "Profile ID required" }, { status: 400 });
        }

        const profile = getVoiceProfile(profileId, session.user.id);
        if (!profile) {
          return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        return NextResponse.json({ profile });
      }

      case "tone-options": {
        return NextResponse.json({ options: TONE_OPTIONS });
      }

      case "personality-options": {
        return NextResponse.json({ options: PERSONALITY_OPTIONS });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Brand Voice GET error:", error);
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
      case "analyze": {
        const { content } = data;

        if (!content || !Array.isArray(content) || content.length === 0) {
          return NextResponse.json(
            { error: "Content array required (at least one sample)" },
            { status: 400 }
          );
        }

        const analysis = await analyzeBrandVoice(content);
        return NextResponse.json({ analysis });
      }

      case "check-consistency": {
        const { content, profileId } = data;

        if (!content || !profileId) {
          return NextResponse.json(
            { error: "Content and profile ID required" },
            { status: 400 }
          );
        }

        const profile = getVoiceProfile(profileId, session.user.id);
        if (!profile) {
          return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        const result = await checkVoiceConsistency(content, profile);
        return NextResponse.json({ result });
      }

      case "generate-content": {
        const { topic, profileId, platform } = data;

        if (!topic || !profileId || !platform) {
          return NextResponse.json(
            { error: "Topic, profile ID, and platform required" },
            { status: 400 }
          );
        }

        const profile = getVoiceProfile(profileId, session.user.id);
        if (!profile) {
          return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        const content = await generateOnBrandContent(topic, profile, platform);
        return NextResponse.json({ content });
      }

      case "suggest-improvements": {
        const { profileId } = data;

        if (!profileId) {
          return NextResponse.json({ error: "Profile ID required" }, { status: 400 });
        }

        const profile = getVoiceProfile(profileId, session.user.id);
        if (!profile) {
          return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        const suggestions = await suggestVoiceImprovements(profile);
        return NextResponse.json({ suggestions });
      }

      case "create-profile": {
        const {
          name,
          description,
          tone,
          personality,
          vocabulary,
          writingStyle,
          sampleContent,
          guidelines,
        } = data;

        if (!name || !tone || !personality) {
          return NextResponse.json(
            { error: "Name, tone, and personality required" },
            { status: 400 }
          );
        }

        const profile = createVoiceProfile(session.user.id, {
          name,
          description,
          tone: tone || [],
          personality: personality || [],
          vocabulary: vocabulary || { preferred: [], avoid: [] },
          writingStyle: writingStyle || {
            sentenceLength: "medium",
            formality: "professional",
            useEmojis: false,
            useHashtags: true,
            callToAction: [],
          },
          sampleContent: sampleContent || [],
          guidelines: guidelines || [],
        });

        return NextResponse.json({ profile });
      }

      case "update-profile": {
        const { profileId, ...updates } = data;

        if (!profileId) {
          return NextResponse.json({ error: "Profile ID required" }, { status: 400 });
        }

        const profile = updateVoiceProfile(profileId, session.user.id, updates);
        if (!profile) {
          return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        return NextResponse.json({ profile });
      }

      case "delete-profile": {
        const { profileId } = data;

        if (!profileId) {
          return NextResponse.json({ error: "Profile ID required" }, { status: 400 });
        }

        const deleted = deleteVoiceProfile(profileId, session.user.id);
        if (!deleted) {
          return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
      }

      case "add-sample": {
        const { profileId, content } = data;

        if (!profileId || !content) {
          return NextResponse.json(
            { error: "Profile ID and content required" },
            { status: 400 }
          );
        }

        const profile = addSampleContent(profileId, session.user.id, content);
        if (!profile) {
          return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        return NextResponse.json({ profile });
      }

      case "auto-generate-profile": {
        const { content, name } = data;

        if (!content || !Array.isArray(content) || content.length === 0 || !name) {
          return NextResponse.json(
            { error: "Content array and name required" },
            { status: 400 }
          );
        }

        // Analyze the content first
        const analysis = await analyzeBrandVoice(content);

        // Create a profile based on the analysis
        const profile = createVoiceProfile(session.user.id, {
          name,
          description: "Auto-generated brand voice profile",
          tone: analysis.detectedTone,
          personality: analysis.detectedPersonality,
          vocabulary: {
            preferred: analysis.uniqueWords.slice(0, 10),
            avoid: [],
          },
          writingStyle: {
            sentenceLength: analysis.averageSentenceLength < 10 ? "short" : analysis.averageSentenceLength > 20 ? "long" : "medium",
            formality: analysis.formality as "casual" | "professional" | "formal" | "friendly",
            useEmojis: analysis.emojiUsage,
            useHashtags: analysis.hashtagUsage,
            callToAction: [],
          },
          sampleContent: content,
          guidelines: [],
        });

        return NextResponse.json({ profile, analysis });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Brand Voice POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
