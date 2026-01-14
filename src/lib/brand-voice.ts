import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface BrandVoiceProfile {
  id: string;
  userId: string;
  name: string;
  description?: string;
  tone: string[];
  personality: string[];
  vocabulary: {
    preferred: string[];
    avoid: string[];
  };
  writingStyle: {
    sentenceLength: "short" | "medium" | "long" | "varied";
    formality: "casual" | "professional" | "formal" | "friendly";
    useEmojis: boolean;
    useHashtags: boolean;
    callToAction: string[];
  };
  sampleContent: string[];
  guidelines: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface VoiceConsistencyCheck {
  score: number;
  overallFeedback: string;
  toneAlignment: {
    score: number;
    feedback: string;
    suggestions: string[];
  };
  vocabularyAlignment: {
    score: number;
    flaggedWords: string[];
    suggestions: string[];
  };
  styleAlignment: {
    score: number;
    feedback: string;
    suggestions: string[];
  };
  improvedVersion?: string;
}

export interface ContentAnalysis {
  detectedTone: string[];
  detectedPersonality: string[];
  readabilityScore: number;
  sentimentScore: number;
  formality: string;
  uniqueWords: string[];
  commonPhrases: string[];
  emojiUsage: boolean;
  hashtagUsage: boolean;
  averageSentenceLength: number;
}

// In-memory storage for brand voice profiles
const voiceProfiles = new Map<string, BrandVoiceProfile>();
const userProfiles = new Map<string, Set<string>>();

export async function analyzeBrandVoice(
  content: string[]
): Promise<ContentAnalysis> {
  const combinedContent = content.join("\n\n");

  const prompt = `Analyze the following content samples to extract brand voice characteristics:

Content:
${combinedContent}

Provide a detailed analysis including:
1. Detected tone (list of adjectives like: professional, playful, authoritative, friendly, etc.)
2. Detected personality traits (list like: innovative, reliable, bold, caring, etc.)
3. Readability score (0-100, where 100 is easiest to read)
4. Sentiment score (-1 to 1, where -1 is negative, 0 is neutral, 1 is positive)
5. Formality level (casual, professional, formal, friendly)
6. Unique words or phrases that stand out
7. Common phrases or patterns used
8. Whether emojis are used
9. Whether hashtags are used
10. Average sentence length (short, medium, long)

Return as JSON with fields: detectedTone (array), detectedPersonality (array), readabilityScore, sentimentScore, formality, uniqueWords (array), commonPhrases (array), emojiUsage (boolean), hashtagUsage (boolean), averageSentenceLength.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a brand voice analyst. Analyze content to extract brand voice characteristics accurately. Return valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = response.choices[0].message.content;
    if (!result) {
      throw new Error("No response from AI");
    }

    return JSON.parse(result);
  } catch (error) {
    console.error("Failed to analyze brand voice:", error);
    return {
      detectedTone: [],
      detectedPersonality: [],
      readabilityScore: 50,
      sentimentScore: 0,
      formality: "professional",
      uniqueWords: [],
      commonPhrases: [],
      emojiUsage: false,
      hashtagUsage: false,
      averageSentenceLength: 15,
    };
  }
}

export async function checkVoiceConsistency(
  content: string,
  profile: BrandVoiceProfile
): Promise<VoiceConsistencyCheck> {
  const prompt = `Check if the following content matches the brand voice profile:

BRAND VOICE PROFILE:
- Tone: ${profile.tone.join(", ")}
- Personality: ${profile.personality.join(", ")}
- Preferred vocabulary: ${profile.vocabulary.preferred.join(", ")}
- Words to avoid: ${profile.vocabulary.avoid.join(", ")}
- Sentence length: ${profile.writingStyle.sentenceLength}
- Formality: ${profile.writingStyle.formality}
- Use emojis: ${profile.writingStyle.useEmojis}
- Use hashtags: ${profile.writingStyle.useHashtags}
- Guidelines: ${profile.guidelines.join("; ")}

CONTENT TO CHECK:
${content}

Analyze and provide:
1. Overall consistency score (0-100)
2. Overall feedback (2-3 sentences)
3. Tone alignment (score 0-100, feedback, and suggestions)
4. Vocabulary alignment (score 0-100, flagged words that should be avoided, and suggestions)
5. Style alignment (score 0-100, feedback, and suggestions)
6. An improved version of the content that better matches the brand voice

Return as JSON with fields: score, overallFeedback, toneAlignment (object with score, feedback, suggestions), vocabularyAlignment (object with score, flaggedWords, suggestions), styleAlignment (object with score, feedback, suggestions), improvedVersion.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a brand voice consistency checker. Analyze content against brand guidelines and provide actionable feedback. Return valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = response.choices[0].message.content;
    if (!result) {
      throw new Error("No response from AI");
    }

    return JSON.parse(result);
  } catch (error) {
    console.error("Failed to check voice consistency:", error);
    return {
      score: 0,
      overallFeedback: "Unable to analyze content",
      toneAlignment: { score: 0, feedback: "", suggestions: [] },
      vocabularyAlignment: { score: 0, flaggedWords: [], suggestions: [] },
      styleAlignment: { score: 0, feedback: "", suggestions: [] },
    };
  }
}

export async function generateOnBrandContent(
  topic: string,
  profile: BrandVoiceProfile,
  platform: string
): Promise<string> {
  const prompt = `Generate social media content for ${platform} about the following topic, matching the brand voice profile exactly:

TOPIC: ${topic}

BRAND VOICE PROFILE:
- Tone: ${profile.tone.join(", ")}
- Personality: ${profile.personality.join(", ")}
- Preferred vocabulary: ${profile.vocabulary.preferred.join(", ")}
- Words to avoid: ${profile.vocabulary.avoid.join(", ")}
- Sentence length: ${profile.writingStyle.sentenceLength}
- Formality: ${profile.writingStyle.formality}
- Use emojis: ${profile.writingStyle.useEmojis ? "Yes, use appropriate emojis" : "No emojis"}
- Use hashtags: ${profile.writingStyle.useHashtags ? "Yes, include relevant hashtags" : "No hashtags"}
- Call to action style: ${profile.writingStyle.callToAction.join(", ") || "natural engagement"}
- Guidelines: ${profile.guidelines.join("; ")}

Sample content for reference:
${profile.sampleContent.slice(0, 3).join("\n---\n")}

Generate content that perfectly matches this brand voice. Return only the content, no explanations.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a brand voice copywriter. Generate content that perfectly matches the provided brand voice profile. Return only the content.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("Failed to generate on-brand content:", error);
    return "";
  }
}

export async function suggestVoiceImprovements(
  profile: BrandVoiceProfile
): Promise<{
  suggestions: string[];
  missingElements: string[];
  strengthAreas: string[];
}> {
  const prompt = `Analyze this brand voice profile and suggest improvements:

BRAND VOICE PROFILE:
- Name: ${profile.name}
- Description: ${profile.description || "None"}
- Tone: ${profile.tone.join(", ")}
- Personality: ${profile.personality.join(", ")}
- Preferred vocabulary: ${profile.vocabulary.preferred.join(", ")}
- Words to avoid: ${profile.vocabulary.avoid.join(", ")}
- Writing style: ${JSON.stringify(profile.writingStyle)}
- Guidelines: ${profile.guidelines.join("; ")}
- Sample content count: ${profile.sampleContent.length}

Provide:
1. Suggestions to make the profile more comprehensive and effective
2. Missing elements that should be added
3. Strong areas that are well-defined

Return as JSON with fields: suggestions (array of strings), missingElements (array of strings), strengthAreas (array of strings).`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a brand strategist. Analyze brand voice profiles and provide actionable improvements. Return valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    const result = response.choices[0].message.content;
    if (!result) {
      throw new Error("No response from AI");
    }

    return JSON.parse(result);
  } catch (error) {
    console.error("Failed to suggest improvements:", error);
    return {
      suggestions: [],
      missingElements: [],
      strengthAreas: [],
    };
  }
}

// CRUD operations for brand voice profiles
export function createVoiceProfile(
  userId: string,
  data: Omit<BrandVoiceProfile, "id" | "userId" | "createdAt" | "updatedAt">
): BrandVoiceProfile {
  const profile: BrandVoiceProfile = {
    id: crypto.randomUUID(),
    userId,
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  voiceProfiles.set(profile.id, profile);

  if (!userProfiles.has(userId)) {
    userProfiles.set(userId, new Set());
  }
  userProfiles.get(userId)!.add(profile.id);

  return profile;
}

export function getUserVoiceProfiles(userId: string): BrandVoiceProfile[] {
  const profileIds = userProfiles.get(userId);
  if (!profileIds) return [];

  return Array.from(profileIds)
    .map((id) => voiceProfiles.get(id))
    .filter((profile): profile is BrandVoiceProfile => profile !== undefined)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getVoiceProfile(profileId: string, userId: string): BrandVoiceProfile | null {
  const profile = voiceProfiles.get(profileId);
  if (!profile || profile.userId !== userId) return null;
  return profile;
}

export function updateVoiceProfile(
  profileId: string,
  userId: string,
  updates: Partial<Omit<BrandVoiceProfile, "id" | "userId" | "createdAt" | "updatedAt">>
): BrandVoiceProfile | null {
  const profile = voiceProfiles.get(profileId);
  if (!profile || profile.userId !== userId) return null;

  const updatedProfile = {
    ...profile,
    ...updates,
    updatedAt: new Date(),
  };

  voiceProfiles.set(profileId, updatedProfile);
  return updatedProfile;
}

export function deleteVoiceProfile(profileId: string, userId: string): boolean {
  const profile = voiceProfiles.get(profileId);
  if (!profile || profile.userId !== userId) return false;

  voiceProfiles.delete(profileId);
  userProfiles.get(userId)?.delete(profileId);
  return true;
}

export function addSampleContent(
  profileId: string,
  userId: string,
  content: string
): BrandVoiceProfile | null {
  const profile = voiceProfiles.get(profileId);
  if (!profile || profile.userId !== userId) return null;

  profile.sampleContent.push(content);
  profile.updatedAt = new Date();

  voiceProfiles.set(profileId, profile);
  return profile;
}

export const TONE_OPTIONS = [
  "Professional",
  "Casual",
  "Friendly",
  "Authoritative",
  "Playful",
  "Serious",
  "Inspiring",
  "Educational",
  "Humorous",
  "Empathetic",
  "Bold",
  "Conversational",
];

export const PERSONALITY_OPTIONS = [
  "Innovative",
  "Reliable",
  "Caring",
  "Bold",
  "Sophisticated",
  "Down-to-earth",
  "Adventurous",
  "Trustworthy",
  "Creative",
  "Passionate",
  "Expert",
  "Approachable",
];
