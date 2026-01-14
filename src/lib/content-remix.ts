// Content Remix and Mashup Tool

export interface ContentSource {
  id: string;
  userId: string;
  type: "text" | "post" | "article" | "video_script" | "thread" | "url" | "transcript";
  title: string;
  content: string;
  platform?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface RemixTemplate {
  id: string;
  name: string;
  description: string;
  category: "transform" | "expand" | "condense" | "mashup" | "repurpose";
  inputTypes: ContentSource["type"][];
  outputFormat: OutputFormat;
  promptTemplate: string;
  example?: {
    input: string;
    output: string;
  };
  popularity: number;
}

export interface OutputFormat {
  type: "tweet" | "thread" | "carousel" | "story" | "reel_script" | "article" | "email" | "ad_copy" | "linkedin_post" | "instagram_caption" | "tiktok_script" | "youtube_shorts" | "quote_graphics" | "infographic_outline";
  platform: string;
  characterLimit?: number;
  slidesRange?: [number, number];
}

export interface RemixProject {
  id: string;
  userId: string;
  name: string;
  sources: ContentSource[];
  template?: RemixTemplate;
  outputs: RemixOutput[];
  status: "draft" | "processing" | "completed" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

export interface RemixOutput {
  id: string;
  projectId: string;
  format: OutputFormat;
  content: string | string[];
  variations: string[][];
  metadata?: {
    estimatedEngagement?: number;
    readingTime?: number;
    wordCount?: number;
    hashtags?: string[];
  };
  status: "pending" | "generated" | "approved" | "scheduled" | "published";
  createdAt: Date;
}

export interface MashupConfig {
  combineMethod: "sequential" | "interleave" | "thematic" | "contrast";
  toneAdjustment: "maintain" | "unify" | "professional" | "casual" | "humorous";
  lengthPreference: "short" | "medium" | "long" | "adaptive";
  includeTransitions: boolean;
  preserveKeyPoints: boolean;
}

// In-memory storage
const contentSources = new Map<string, ContentSource>();
const remixProjects = new Map<string, RemixProject>();
const remixOutputs = new Map<string, RemixOutput>();

// Default remix templates
export const REMIX_TEMPLATES: RemixTemplate[] = [
  {
    id: "tmpl-1",
    name: "Blog to Twitter Thread",
    description: "Transform a blog post or article into an engaging Twitter thread",
    category: "transform",
    inputTypes: ["article", "text"],
    outputFormat: {
      type: "thread",
      platform: "twitter",
      characterLimit: 280,
    },
    promptTemplate: "Convert this content into a compelling Twitter thread. Break it into digestible tweets, add hooks, and include a strong CTA at the end.",
    example: {
      input: "A 1000-word blog post about productivity tips",
      output: "A 10-tweet thread with key insights and actionable tips",
    },
    popularity: 95,
  },
  {
    id: "tmpl-2",
    name: "Video to Carousel",
    description: "Turn video script or transcript into an Instagram carousel",
    category: "transform",
    inputTypes: ["video_script", "transcript"],
    outputFormat: {
      type: "carousel",
      platform: "instagram",
      slidesRange: [5, 10],
    },
    promptTemplate: "Transform this video content into a visually-oriented carousel. Create slide headlines and descriptions that capture the key points.",
    popularity: 88,
  },
  {
    id: "tmpl-3",
    name: "Thread to LinkedIn Article",
    description: "Expand a Twitter thread into a full LinkedIn article",
    category: "expand",
    inputTypes: ["thread", "text"],
    outputFormat: {
      type: "article",
      platform: "linkedin",
    },
    promptTemplate: "Expand this thread into a comprehensive LinkedIn article. Add professional context, data points, and a thought-leadership angle.",
    popularity: 82,
  },
  {
    id: "tmpl-4",
    name: "Article to Quote Graphics",
    description: "Extract powerful quotes from content for visual posts",
    category: "condense",
    inputTypes: ["article", "text", "transcript"],
    outputFormat: {
      type: "quote_graphics",
      platform: "multi",
    },
    promptTemplate: "Extract 5-7 powerful, shareable quotes from this content that would work well as standalone visual posts.",
    popularity: 79,
  },
  {
    id: "tmpl-5",
    name: "Podcast to Shorts",
    description: "Turn podcast transcript into YouTube Shorts or TikTok scripts",
    category: "transform",
    inputTypes: ["transcript"],
    outputFormat: {
      type: "youtube_shorts",
      platform: "youtube",
    },
    promptTemplate: "Identify the most engaging moments from this transcript and create 3-5 short-form video scripts (30-60 seconds each).",
    popularity: 85,
  },
  {
    id: "tmpl-6",
    name: "Multiple Posts Mashup",
    description: "Combine multiple posts into a comprehensive piece",
    category: "mashup",
    inputTypes: ["post", "text"],
    outputFormat: {
      type: "article",
      platform: "multi",
    },
    promptTemplate: "Combine these related posts into a cohesive, comprehensive article that flows naturally and provides deeper insights.",
    popularity: 72,
  },
  {
    id: "tmpl-7",
    name: "Long-form to Snackable",
    description: "Break down long content into bite-sized social posts",
    category: "condense",
    inputTypes: ["article", "text"],
    outputFormat: {
      type: "tweet",
      platform: "multi",
      characterLimit: 280,
    },
    promptTemplate: "Break this long-form content into 10-15 standalone social media posts that each deliver a complete insight.",
    popularity: 91,
  },
  {
    id: "tmpl-8",
    name: "Email to Social Campaign",
    description: "Repurpose email content into a social media campaign",
    category: "repurpose",
    inputTypes: ["text"],
    outputFormat: {
      type: "tweet",
      platform: "multi",
    },
    promptTemplate: "Transform this email content into a multi-platform social campaign with posts for Twitter, LinkedIn, and Instagram.",
    popularity: 77,
  },
  {
    id: "tmpl-9",
    name: "Stats to Infographic",
    description: "Turn data points into infographic outline",
    category: "transform",
    inputTypes: ["text", "article"],
    outputFormat: {
      type: "infographic_outline",
      platform: "multi",
    },
    promptTemplate: "Extract key statistics and data points from this content and create an infographic outline with sections and visual suggestions.",
    popularity: 68,
  },
  {
    id: "tmpl-10",
    name: "Story to Reel Script",
    description: "Convert stories or narratives into Reel/TikTok scripts",
    category: "transform",
    inputTypes: ["text", "post"],
    outputFormat: {
      type: "reel_script",
      platform: "instagram",
    },
    promptTemplate: "Transform this story into an engaging Reel script with hooks, visual cues, and trending audio suggestions.",
    popularity: 86,
  },
];

// Initialize with demo data
function initDemoData() {
  // Demo content sources
  const demoSources: ContentSource[] = [
    {
      id: "src-1",
      userId: "user-1",
      type: "article",
      title: "10 Productivity Hacks for Remote Workers",
      content: `Working from home has become the new normal for millions of professionals. But with this shift comes unique challenges - distractions, isolation, and the blurring of work-life boundaries.

Here are 10 proven productivity hacks that will transform your remote work experience:

1. Create a dedicated workspace - Your environment shapes your mindset. Having a specific area for work helps your brain switch into "work mode."

2. Time-block your calendar - Instead of a endless to-do list, assign specific time blocks for different tasks. This creates structure and accountability.

3. Use the Pomodoro Technique - Work in focused 25-minute bursts followed by 5-minute breaks. This maintains high energy throughout the day.

4. Establish morning rituals - Start your day with intention. Whether it's exercise, meditation, or journaling, create a consistent routine.

5. Batch similar tasks together - Context switching is expensive. Group similar tasks (emails, calls, creative work) to maintain flow.

6. Set clear boundaries - Communicate your work hours to family members. Use visual cues like a closed door or headphones.

7. Take real lunch breaks - Step away from your desk. Eat mindfully. This mental reset improves afternoon productivity.

8. Use async communication - Not everything needs a meeting. Tools like Loom and Slack allow thoughtful responses without interruption.

9. End with a shutdown ritual - Review what you accomplished, plan tomorrow, and physically close your laptop.

10. Prioritize connection - Schedule virtual coffee chats with colleagues. Remote work shouldn't mean isolation.

The key to remote work success isn't working more - it's working smarter. Implement these strategies gradually and watch your productivity soar.`,
      platform: "blog",
      createdAt: new Date("2024-01-15"),
    },
    {
      id: "src-2",
      userId: "user-1",
      type: "video_script",
      title: "AI Tools Every Marketer Needs",
      content: `INTRO:
[HOOK] Are you still doing marketing the hard way? Let me show you 5 AI tools that will change everything.

SECTION 1: ChatGPT for Content
- Generate ideas in seconds
- Write first drafts
- A/B test headlines
- The key: use it as a starting point, not the final product

SECTION 2: Midjourney for Visuals
- Create stunning images without a designer
- Custom brand visuals on demand
- Social media graphics in minutes

SECTION 3: Jasper for Ad Copy
- Write high-converting ads fast
- Test multiple variations
- Built-in frameworks that work

SECTION 4: Otter.ai for Meetings
- Automatic transcription
- Find key moments instantly
- Never miss action items

SECTION 5: Notion AI for Organization
- Summarize long documents
- Create project plans
- Extract insights from research

OUTRO:
These tools won't replace marketers - they'll make you 10x more effective. Start with one, master it, then add another. The future of marketing is AI-assisted, not AI-replaced.`,
      platform: "youtube",
      createdAt: new Date("2024-02-01"),
    },
    {
      id: "src-3",
      userId: "user-1",
      type: "transcript",
      title: "Podcast: Building a Personal Brand",
      content: `Host: Welcome back to the show. Today we're diving into personal branding - what it means, why it matters, and how to build one that actually works.

Guest: Thanks for having me. I think the biggest misconception about personal branding is that it's about self-promotion. It's not. It's about clarity.

Host: What do you mean by clarity?

Guest: Well, think about the people you follow online. You probably know exactly what they stand for. When you see their content, there's no confusion. That's clarity. And it comes from understanding three things: what you know, what you care about, and who you want to help.

Host: That's a great framework. Can you break that down?

Guest: Sure. First, what you know - this is your expertise, your experience, your unique perspective. Not just what you learned in school, but what life has taught you.

Second, what you care about - these are the topics that light you up. The things you'd talk about even if no one was listening.

Third, who you want to help - this is crucial. A personal brand isn't about you, it's about the transformation you provide for others.

Host: I love that. "It's about the transformation." So how does someone actually build this?

Guest: I recommend starting with what I call the "Content Pillars" approach. Pick 3-5 themes that align with your expertise and interests. Then create content consistently around those themes. Over time, you become known for those specific topics.

The mistake people make is trying to be everything to everyone. That leads to a bland, forgettable brand. The magic happens when you go deep, not wide.

Host: Any practical tips for getting started?

Guest: Yes! Start with one platform. Master it before expanding. Create content in batches - it's more efficient. And most importantly, share your real thoughts and experiences. People connect with authenticity, not perfection.`,
      platform: "podcast",
      createdAt: new Date("2024-02-10"),
    },
  ];
  demoSources.forEach((src) => contentSources.set(src.id, src));

  // Demo remix project
  const demoProject: RemixProject = {
    id: "proj-1",
    userId: "user-1",
    name: "Productivity Content Campaign",
    sources: [demoSources[0]],
    template: REMIX_TEMPLATES[0],
    outputs: [],
    status: "completed",
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date("2024-01-20"),
  };
  remixProjects.set(demoProject.id, demoProject);

  // Demo outputs
  const demoOutputs: RemixOutput[] = [
    {
      id: "out-1",
      projectId: "proj-1",
      format: {
        type: "thread",
        platform: "twitter",
        characterLimit: 280,
      },
      content: [
        "Working from home sounds like a dream until you realize your couch is calling and Netflix is just one click away. Here's how to actually get stuff done remotely 🧵",
        "1/ CREATE A DEDICATED WORKSPACE Your environment shapes your mindset. A specific work area helps your brain switch into 'work mode' - even if it's just a corner of your kitchen table.",
        "2/ TIME-BLOCK YOUR CALENDAR Endless to-do lists are overwhelming. Instead, assign specific time blocks for tasks. This creates structure and accountability.",
        "3/ TRY THE POMODORO TECHNIQUE 25 minutes of focused work, 5 minutes of rest. Repeat. This keeps your energy high throughout the day.",
        "4/ ESTABLISH MORNING RITUALS How you start your day matters. Exercise, meditation, journaling - find what works and stick with it.",
        "5/ BATCH SIMILAR TASKS Context switching kills productivity. Group emails together. Calls together. Creative work together.",
        "6/ SET BOUNDARIES Tell your family your work hours. Close the door. Put on headphones. Create separation between work and life.",
        "7/ TAKE REAL LUNCH BREAKS Step away from your desk. Eat without screens. This mental reset improves your afternoon dramatically.",
        "8/ EMBRACE ASYNC COMMUNICATION Not everything needs a meeting. Loom messages and Slack allow thoughtful responses without interruption.",
        "9/ END WITH A SHUTDOWN RITUAL Review your day. Plan tomorrow. Close your laptop. This mental 'sign off' is crucial for work-life balance.",
        "10/ PRIORITIZE CONNECTION Remote doesn't mean isolated. Schedule virtual coffee chats. Maintain relationships.",
        "The key to remote work success isn't working more - it's working smarter. Start with one tip today. Which one will you try? 👇",
      ],
      variations: [
        [
          "Hot take: Your home office setup is sabotaging your productivity. Here's what nobody tells you about working remotely 🧵",
          "I've worked remotely for 5 years. Here's everything I wish I knew on day one...",
        ],
      ],
      metadata: {
        estimatedEngagement: 85,
        wordCount: 278,
        hashtags: ["#RemoteWork", "#Productivity", "#WorkFromHome", "#WFH"],
      },
      status: "approved",
      createdAt: new Date("2024-01-20"),
    },
  ];
  demoOutputs.forEach((out) => remixOutputs.set(out.id, out));
  demoProject.outputs = demoOutputs;
}

// Initialize demo data
initDemoData();

// Content source functions
export function getUserContentSources(userId: string): ContentSource[] {
  return Array.from(contentSources.values())
    .filter((src) => src.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getContentSource(sourceId: string): ContentSource | undefined {
  return contentSources.get(sourceId);
}

export function createContentSource(
  userId: string,
  data: {
    type: ContentSource["type"];
    title: string;
    content: string;
    platform?: string;
    metadata?: Record<string, unknown>;
  }
): ContentSource {
  const source: ContentSource = {
    id: `src-${Date.now()}`,
    userId,
    type: data.type,
    title: data.title,
    content: data.content,
    platform: data.platform,
    metadata: data.metadata,
    createdAt: new Date(),
  };

  contentSources.set(source.id, source);
  return source;
}

export function deleteContentSource(sourceId: string, userId: string): boolean {
  const source = contentSources.get(sourceId);
  if (!source || source.userId !== userId) return false;
  return contentSources.delete(sourceId);
}

// Remix project functions
export function getUserRemixProjects(userId: string): RemixProject[] {
  return Array.from(remixProjects.values())
    .filter((proj) => proj.userId === userId)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export function getRemixProject(projectId: string): RemixProject | undefined {
  return remixProjects.get(projectId);
}

export function createRemixProject(
  userId: string,
  data: {
    name: string;
    sourceIds: string[];
    templateId?: string;
  }
): RemixProject {
  const sources = data.sourceIds
    .map((id) => contentSources.get(id))
    .filter((src): src is ContentSource => !!src);

  const template = data.templateId
    ? REMIX_TEMPLATES.find((t) => t.id === data.templateId)
    : undefined;

  const project: RemixProject = {
    id: `proj-${Date.now()}`,
    userId,
    name: data.name,
    sources,
    template,
    outputs: [],
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  remixProjects.set(project.id, project);
  return project;
}

export function updateRemixProject(
  projectId: string,
  userId: string,
  updates: Partial<Pick<RemixProject, "name" | "status">>
): RemixProject | null {
  const project = remixProjects.get(projectId);
  if (!project || project.userId !== userId) return null;

  Object.assign(project, updates, { updatedAt: new Date() });
  return project;
}

export function addSourceToProject(
  projectId: string,
  userId: string,
  sourceId: string
): RemixProject | null {
  const project = remixProjects.get(projectId);
  if (!project || project.userId !== userId) return null;

  const source = contentSources.get(sourceId);
  if (!source) return null;

  if (!project.sources.some((s) => s.id === sourceId)) {
    project.sources.push(source);
    project.updatedAt = new Date();
  }

  return project;
}

export function removeSourceFromProject(
  projectId: string,
  userId: string,
  sourceId: string
): RemixProject | null {
  const project = remixProjects.get(projectId);
  if (!project || project.userId !== userId) return null;

  project.sources = project.sources.filter((s) => s.id !== sourceId);
  project.updatedAt = new Date();

  return project;
}

export function setProjectTemplate(
  projectId: string,
  userId: string,
  templateId: string
): RemixProject | null {
  const project = remixProjects.get(projectId);
  if (!project || project.userId !== userId) return null;

  const template = REMIX_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return null;

  project.template = template;
  project.updatedAt = new Date();

  return project;
}

export function deleteRemixProject(projectId: string, userId: string): boolean {
  const project = remixProjects.get(projectId);
  if (!project || project.userId !== userId) return false;

  // Delete associated outputs
  project.outputs.forEach((out) => remixOutputs.delete(out.id));

  return remixProjects.delete(projectId);
}

// Remix generation functions
export async function generateRemix(
  projectId: string,
  userId: string,
  options?: {
    format?: OutputFormat;
    variationCount?: number;
    mashupConfig?: MashupConfig;
  }
): Promise<RemixOutput | null> {
  const project = remixProjects.get(projectId);
  if (!project || project.userId !== userId) return null;

  if (project.sources.length === 0) return null;

  project.status = "processing";
  project.updatedAt = new Date();

  // Simulate AI processing delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const format = options?.format || project.template?.outputFormat || {
    type: "tweet" as const,
    platform: "twitter",
    characterLimit: 280,
  };

  // Generate content based on format
  const generatedContent = generateContentForFormat(
    project.sources,
    format,
    options?.mashupConfig
  );

  const output: RemixOutput = {
    id: `out-${Date.now()}`,
    projectId,
    format,
    content: generatedContent.content,
    variations: generatedContent.variations,
    metadata: {
      estimatedEngagement: Math.floor(Math.random() * 30) + 70,
      wordCount: Array.isArray(generatedContent.content)
        ? generatedContent.content.join(" ").split(" ").length
        : generatedContent.content.split(" ").length,
      hashtags: generateHashtags(project.sources),
    },
    status: "generated",
    createdAt: new Date(),
  };

  remixOutputs.set(output.id, output);
  project.outputs.push(output);
  project.status = "completed";
  project.updatedAt = new Date();

  return output;
}

function generateContentForFormat(
  sources: ContentSource[],
  format: OutputFormat,
  mashupConfig?: MashupConfig
): { content: string | string[]; variations: string[][] } {
  const combinedContent = sources.map((s) => s.content).join("\n\n");
  const keyPoints = extractKeyPoints(combinedContent);

  switch (format.type) {
    case "thread":
      return generateThread(keyPoints, format.characterLimit || 280);
    case "carousel":
      return generateCarousel(keyPoints, format.slidesRange || [5, 10]);
    case "tweet":
      return generateTweets(keyPoints, format.characterLimit || 280);
    case "linkedin_post":
      return generateLinkedInPost(keyPoints);
    case "reel_script":
      return generateReelScript(keyPoints);
    case "quote_graphics":
      return generateQuoteGraphics(combinedContent);
    case "article":
      return generateArticle(sources, mashupConfig);
    default:
      return generateGenericOutput(keyPoints);
  }
}

function extractKeyPoints(content: string): string[] {
  // Simplified key point extraction
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 20);
  const points: string[] = [];

  // Extract numbered items
  const numberedPattern = /\d+[\.\)]\s*([^.!?\n]+[.!?]?)/g;
  let match;
  while ((match = numberedPattern.exec(content)) !== null) {
    points.push(match[1].trim());
  }

  // Add key sentences if not enough points
  if (points.length < 5) {
    sentences.slice(0, 10 - points.length).forEach((s) => {
      if (!points.some((p) => p.includes(s.trim().substring(0, 30)))) {
        points.push(s.trim());
      }
    });
  }

  return points.slice(0, 12);
}

function generateThread(
  points: string[],
  charLimit: number
): { content: string[]; variations: string[][] } {
  const thread: string[] = [];

  // Hook
  thread.push("Here's something most people get wrong... 🧵");

  // Main points
  points.forEach((point, idx) => {
    const tweet = `${idx + 1}/ ${point.slice(0, charLimit - 10)}`;
    thread.push(tweet.slice(0, charLimit));
  });

  // CTA
  thread.push("Found this useful? Follow for more insights and RT the first tweet to share with others 🙏");

  return {
    content: thread,
    variations: [
      ["Let me tell you something that changed everything...", "I wish someone told me this earlier..."],
    ],
  };
}

function generateCarousel(
  points: string[],
  slidesRange: [number, number]
): { content: string[]; variations: string[][] } {
  const slideCount = Math.min(
    Math.max(points.length + 2, slidesRange[0]),
    slidesRange[1]
  );
  const slides: string[] = [];

  // Title slide
  slides.push("📱 SLIDE 1: [Attention-Grabbing Title]\nSwipe to learn more →");

  // Content slides
  points.slice(0, slideCount - 2).forEach((point, idx) => {
    slides.push(`📱 SLIDE ${idx + 2}: ${point}`);
  });

  // CTA slide
  slides.push("📱 FINAL SLIDE: Save this post for later!\nFollow for more content like this.");

  return {
    content: slides,
    variations: [["Alternative hook: Did you know?", "Alternative hook: Stop scrolling!"]],
  };
}

function generateTweets(
  points: string[],
  charLimit: number
): { content: string[]; variations: string[][] } {
  const tweets = points.slice(0, 10).map((point) => {
    const emoji = ["💡", "🔥", "✨", "🚀", "💪"][Math.floor(Math.random() * 5)];
    return `${emoji} ${point.slice(0, charLimit - 5)}`.slice(0, charLimit);
  });

  return {
    content: tweets,
    variations: tweets.slice(0, 3).map((t) => [t.replace(/^./, "📌")]),
  };
}

function generateLinkedInPost(points: string[]): { content: string; variations: string[][] } {
  const post = `I've been thinking about this a lot lately...

${points.slice(0, 5).map((p) => `→ ${p}`).join("\n\n")}

What's your take on this? I'd love to hear your thoughts in the comments.

#Leadership #Growth #Insights`;

  return {
    content: post,
    variations: [["Alternative opening: A lesson I learned the hard way..."]],
  };
}

function generateReelScript(points: string[]): { content: string; variations: string[][] } {
  const script = `🎬 REEL SCRIPT

[HOOK - 0:00-0:03]
"You're doing this wrong..." or attention-grabbing statement

[POINT 1 - 0:03-0:10]
${points[0] || "Main point here"}

[POINT 2 - 0:10-0:17]
${points[1] || "Supporting point"}

[POINT 3 - 0:17-0:24]
${points[2] || "Third key insight"}

[CTA - 0:24-0:30]
"Follow for more tips like this!"

VISUAL NOTES:
- Use text overlays for key points
- Quick cuts between sections
- Trending audio: [Check current trends]`;

  return {
    content: script,
    variations: [["Hook variation: 'Nobody talks about this but...'"]],
  };
}

function generateQuoteGraphics(content: string): { content: string[]; variations: string[][] } {
  // Extract quotable sentences
  const sentences = content.split(/[.!?]+/).filter((s) => {
    const trimmed = s.trim();
    return trimmed.length > 30 && trimmed.length < 150;
  });

  const quotes = sentences.slice(0, 7).map((s) => `"${s.trim()}"`);

  return {
    content: quotes,
    variations: [],
  };
}

function generateArticle(
  sources: ContentSource[],
  mashupConfig?: MashupConfig
): { content: string; variations: string[][] } {
  const combinedContent = sources.map((s) => s.content).join("\n\n---\n\n");

  const article = `# ${sources[0]?.title || "Comprehensive Guide"}

## Introduction

${sources[0]?.content.split("\n")[0] || "Opening paragraph here..."}

## Key Insights

${sources.map((s) => `### From: ${s.title}\n\n${s.content.slice(0, 500)}...`).join("\n\n")}

## Conclusion

The key takeaway is to apply these principles consistently. Start small, iterate often, and measure your progress.

---
*This article was created by combining multiple sources of content.*`;

  return {
    content: article,
    variations: [],
  };
}

function generateGenericOutput(points: string[]): { content: string; variations: string[][] } {
  return {
    content: points.join("\n\n"),
    variations: [],
  };
}

function generateHashtags(sources: ContentSource[]): string[] {
  const commonHashtags: Record<string, string[]> = {
    productivity: ["#Productivity", "#TimeManagement", "#WorkSmart"],
    marketing: ["#Marketing", "#DigitalMarketing", "#ContentStrategy"],
    business: ["#Business", "#Entrepreneurship", "#Startup"],
    technology: ["#Tech", "#AI", "#Innovation"],
    default: ["#Tips", "#Insights", "#Learn"],
  };

  const contentText = sources.map((s) => s.content.toLowerCase()).join(" ");

  for (const [topic, hashtags] of Object.entries(commonHashtags)) {
    if (contentText.includes(topic)) {
      return hashtags;
    }
  }

  return commonHashtags.default;
}

// Output functions
export function getProjectOutputs(projectId: string): RemixOutput[] {
  return Array.from(remixOutputs.values())
    .filter((out) => out.projectId === projectId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getOutput(outputId: string): RemixOutput | undefined {
  return remixOutputs.get(outputId);
}

export function updateOutputStatus(
  outputId: string,
  status: RemixOutput["status"]
): RemixOutput | null {
  const output = remixOutputs.get(outputId);
  if (!output) return null;

  output.status = status;
  return output;
}

export function deleteOutput(outputId: string): boolean {
  const output = remixOutputs.get(outputId);
  if (!output) return false;

  // Remove from project
  const project = remixProjects.get(output.projectId);
  if (project) {
    project.outputs = project.outputs.filter((o) => o.id !== outputId);
  }

  return remixOutputs.delete(outputId);
}

// Template functions
export function getRemixTemplates(category?: RemixTemplate["category"]): RemixTemplate[] {
  let templates = [...REMIX_TEMPLATES];

  if (category) {
    templates = templates.filter((t) => t.category === category);
  }

  return templates.sort((a, b) => b.popularity - a.popularity);
}

export function getTemplate(templateId: string): RemixTemplate | undefined {
  return REMIX_TEMPLATES.find((t) => t.id === templateId);
}

// Stats
export function getRemixStats(userId: string): {
  totalSources: number;
  totalProjects: number;
  totalOutputs: number;
  completedProjects: number;
  approvedOutputs: number;
  mostUsedTemplate: string | null;
} {
  const userSources = Array.from(contentSources.values()).filter(
    (s) => s.userId === userId
  );
  const userProjects = Array.from(remixProjects.values()).filter(
    (p) => p.userId === userId
  );
  const userOutputs = userProjects.flatMap((p) => p.outputs);

  // Find most used template
  const templateUsage: Record<string, number> = {};
  userProjects.forEach((p) => {
    if (p.template) {
      templateUsage[p.template.name] = (templateUsage[p.template.name] || 0) + 1;
    }
  });
  const mostUsedTemplate =
    Object.entries(templateUsage).sort(([, a], [, b]) => b - a)[0]?.[0] || null;

  return {
    totalSources: userSources.length,
    totalProjects: userProjects.length,
    totalOutputs: userOutputs.length,
    completedProjects: userProjects.filter((p) => p.status === "completed").length,
    approvedOutputs: userOutputs.filter((o) => o.status === "approved").length,
    mostUsedTemplate,
  };
}

// Export types and constants
export const SOURCE_TYPES = ["text", "post", "article", "video_script", "thread", "url", "transcript"] as const;
export const OUTPUT_FORMATS = [
  "tweet",
  "thread",
  "carousel",
  "story",
  "reel_script",
  "article",
  "email",
  "ad_copy",
  "linkedin_post",
  "instagram_caption",
  "tiktok_script",
  "youtube_shorts",
  "quote_graphics",
  "infographic_outline",
] as const;
export const TEMPLATE_CATEGORIES = ["transform", "expand", "condense", "mashup", "repurpose"] as const;
