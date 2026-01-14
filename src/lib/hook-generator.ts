import { getOpenAI } from "./openai";

export type HookType =
  | "question"
  | "statistic"
  | "story"
  | "controversy"
  | "claim"
  | "list"
  | "how-to"
  | "mistake"
  | "secret"
  | "prediction";

export interface GeneratedHook {
  hook: string;
  type: HookType;
  strength: "weak" | "moderate" | "strong" | "viral";
  score: number;
  explanation: string;
  fullPost?: string;
}

export interface HookGenerationOptions {
  topic: string;
  tone?: string;
  hookTypes?: HookType[];
  count?: number;
  includeFullPost?: boolean;
  maxLength?: number;
  voiceProfile?: {
    styleAnalysis: string | null;
    commonPhrases: string[];
  } | null;
}

// Hook patterns that historically perform well
const HOOK_PATTERNS: Record<HookType, { template: string; example: string }> = {
  question: {
    template: "Ask a thought-provoking question that readers can't ignore",
    example: "What if everything you knew about [topic] was wrong?",
  },
  statistic: {
    template: "Lead with a surprising number or statistic",
    example: "97% of [audience] make this mistake...",
  },
  story: {
    template: "Start with a personal story or anecdote",
    example: "3 years ago, I was [situation]. Today, I [result].",
  },
  controversy: {
    template: "Challenge a common belief or take a bold stance",
    example: "Unpopular opinion: [controversial take]",
  },
  claim: {
    template: "Make a bold claim that demands attention",
    example: "I [achieved result] in [timeframe]. Here's exactly how:",
  },
  list: {
    template: "Promise a specific number of items/lessons",
    example: "7 lessons I learned after [experience]:",
  },
  "how-to": {
    template: "Promise to teach something valuable",
    example: "How to [achieve result] in [timeframe] (step-by-step):",
  },
  mistake: {
    template: "Highlight a common mistake to avoid",
    example: "The #1 mistake [audience] make when [activity]:",
  },
  secret: {
    template: "Promise exclusive or insider information",
    example: "Most people don't know this about [topic]:",
  },
  prediction: {
    template: "Make a prediction about the future",
    example: "In 5 years, [prediction]. Here's why:",
  },
};

export async function generateHooks(
  options: HookGenerationOptions
): Promise<GeneratedHook[]> {
  const {
    topic,
    tone = "professional",
    hookTypes = ["question", "statistic", "claim", "list", "story"],
    count = 5,
    includeFullPost = false,
    maxLength = 280,
    voiceProfile,
  } = options;

  const hookPatternExamples = hookTypes
    .map((type) => `- ${type}: "${HOOK_PATTERNS[type].example}"`)
    .join("\n");

  const voiceGuidance = voiceProfile?.styleAnalysis
    ? `Match this writing style: ${voiceProfile.styleAnalysis}\nUse phrases like: ${voiceProfile.commonPhrases.slice(0, 3).join(", ")}`
    : "";

  const systemPrompt = `You are a world-class copywriter specializing in viral social media hooks.
Your hooks have generated millions of impressions on X (Twitter).

Hook patterns to use:
${hookPatternExamples}

Guidelines:
- The first line is EVERYTHING - it determines 80% of engagement
- Create curiosity gaps that make readers NEED to know more
- Use power words: discover, secret, mistake, truth, hack, proven
- Be specific when possible (numbers, timeframes, results)
- Match the tone: ${tone}
${voiceGuidance}

Return JSON with array "hooks" containing ${count} hooks:
{
  "hooks": [
    {
      "hook": "<the hook text, max ${maxLength} chars>",
      "type": "<hook type>",
      "strength": "weak|moderate|strong|viral",
      "score": <0-100>,
      "explanation": "<why this hook works>"${
        includeFullPost ? ',\n      "fullPost": "<complete post using this hook>"' : ""
      }
    }
  ]
}`;

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 1500,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Generate ${count} powerful hooks for this topic: "${topic}"

Tone: ${tone}
Hook types to use: ${hookTypes.join(", ")}
${includeFullPost ? "Include a complete post for each hook." : ""}`,
      },
    ],
  });

  const result = response.choices[0]?.message?.content;
  if (!result) {
    throw new Error("No hooks generated");
  }

  const parsed = JSON.parse(result);
  return (parsed.hooks || []).map((h: GeneratedHook) => ({
    hook: h.hook || "",
    type: (h.type as HookType) || "claim",
    strength: h.strength || "moderate",
    score: Math.round(h.score || 50),
    explanation: h.explanation || "",
    fullPost: h.fullPost,
  }));
}

// Improve an existing hook
export async function improveHook(
  originalHook: string,
  feedback?: string
): Promise<{
  improvedHooks: GeneratedHook[];
  analysis: {
    originalScore: number;
    issues: string[];
    strengths: string[];
  };
}> {
  const systemPrompt = `You are a hook optimization expert.
Analyze the original hook, identify weaknesses, and provide improved versions.

Return JSON with:
{
  "analysis": {
    "originalScore": <0-100>,
    "issues": ["issue1", "issue2"],
    "strengths": ["strength1"]
  },
  "improvedHooks": [
    {
      "hook": "<improved version>",
      "type": "<hook type>",
      "strength": "weak|moderate|strong|viral",
      "score": <0-100>,
      "explanation": "<what was improved>"
    }
  ]
}`;

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 800,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Original hook: "${originalHook}"
${feedback ? `\nUser feedback: ${feedback}` : ""}

Provide 3 improved versions.`,
      },
    ],
  });

  const result = response.choices[0]?.message?.content;
  if (!result) {
    throw new Error("No improvement generated");
  }

  return JSON.parse(result);
}

// Get hook templates for a specific niche
export async function getHookTemplates(
  niche: string
): Promise<{
  templates: { template: string; example: string; effectiveness: string }[];
  nicheTips: string[];
}> {
  const systemPrompt = `You are a hook template curator for specific niches.
Provide proven hook templates that work well for the given niche.

Return JSON with:
{
  "templates": [
    {
      "template": "<fill-in-the-blank template>",
      "example": "<filled example for this niche>",
      "effectiveness": "<why this works for this niche>"
    }
  ],
  "nicheTips": ["tip1", "tip2", "tip3"]
}`;

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 800,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Provide 10 hook templates specifically for the "${niche}" niche.`,
      },
    ],
  });

  const result = response.choices[0]?.message?.content;
  if (!result) {
    throw new Error("No templates generated");
  }

  return JSON.parse(result);
}

// Analyze a post and extract what makes its hook effective
export async function analyzeHook(
  post: string
): Promise<{
  hook: string;
  type: HookType;
  score: number;
  analysis: {
    powerWords: string[];
    curiosityGap: string;
    emotionalTrigger: string;
    specificity: string;
  };
  improvements: string[];
}> {
  const systemPrompt = `You are a hook analysis expert.
Extract and analyze the hook (first line/sentence) from a post.

Return JSON with:
{
  "hook": "<the extracted hook>",
  "type": "<hook type>",
  "score": <0-100>,
  "analysis": {
    "powerWords": ["word1", "word2"],
    "curiosityGap": "<does it create curiosity? how?>",
    "emotionalTrigger": "<what emotion does it target?>",
    "specificity": "<is it specific or vague?>"
  },
  "improvements": ["improvement1", "improvement2"]
}`;

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 500,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Analyze the hook in this post:\n\n"${post}"`,
      },
    ],
  });

  const result = response.choices[0]?.message?.content;
  if (!result) {
    throw new Error("No analysis generated");
  }

  return JSON.parse(result);
}
