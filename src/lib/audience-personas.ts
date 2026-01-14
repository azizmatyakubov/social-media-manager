// AI Audience Persona Generator

export interface Persona {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  tagline: string;
  demographics: PersonaDemographics;
  psychographics: PersonaPsychographics;
  behaviors: PersonaBehaviors;
  contentPreferences: ContentPreferences;
  painPoints: string[];
  goals: string[];
  objections: string[];
  triggers: string[];
  platforms: PlatformPresence[];
  buyingJourney: BuyingJourney;
  communicationStyle: CommunicationStyle;
  score: number;
  status: "draft" | "active" | "archived";
  source: "ai_generated" | "manual" | "survey" | "analytics";
  createdAt: Date;
  updatedAt: Date;
}

export interface PersonaDemographics {
  ageRange: [number, number];
  gender: "male" | "female" | "non-binary" | "all";
  location: string[];
  education: string;
  income: string;
  occupation: string;
  industry: string;
  companySize?: string;
  familyStatus: string;
}

export interface PersonaPsychographics {
  values: string[];
  interests: string[];
  lifestyle: string;
  personality: string[];
  motivations: string[];
  fears: string[];
  aspirations: string[];
}

export interface PersonaBehaviors {
  onlineHabits: string[];
  purchaseBehavior: string;
  brandLoyalty: "low" | "medium" | "high";
  researchStyle: string;
  decisionMaking: "impulsive" | "considered" | "committee";
  contentConsumption: string[];
  deviceUsage: string[];
}

export interface ContentPreferences {
  formats: string[];
  topics: string[];
  tone: string[];
  length: "short" | "medium" | "long" | "varies";
  visualStyle: string[];
  frequency: string;
  bestTimes: string[];
}

export interface PlatformPresence {
  platform: string;
  usage: "daily" | "weekly" | "occasional";
  purpose: string[];
  engagementLevel: "passive" | "moderate" | "active";
  followsCount: string;
}

export interface BuyingJourney {
  awareness: string[];
  consideration: string[];
  decision: string[];
  retention: string[];
  advocacy: string[];
}

export interface CommunicationStyle {
  formalityLevel: "formal" | "semi-formal" | "casual" | "very-casual";
  preferredChannels: string[];
  responseExpectation: string;
  languageComplexity: "simple" | "moderate" | "technical";
  emojiUsage: "none" | "minimal" | "moderate" | "frequent";
}

export interface PersonaTemplate {
  id: string;
  name: string;
  description: string;
  category: "b2b" | "b2c" | "ecommerce" | "saas" | "creator" | "agency";
  basePersona: Partial<Persona>;
  popularity: number;
}

export interface PersonaInsight {
  id: string;
  personaId: string;
  type: "content_idea" | "best_time" | "platform_tip" | "messaging" | "pain_point" | "opportunity";
  title: string;
  description: string;
  actionable: string;
  priority: "low" | "medium" | "high";
  createdAt: Date;
}

// In-memory storage
const personas = new Map<string, Persona>();
const insights = new Map<string, PersonaInsight>();

// Persona templates
export const PERSONA_TEMPLATES: PersonaTemplate[] = [
  {
    id: "tmpl-1",
    name: "Tech-Savvy Professional",
    description: "Early adopter who values efficiency and innovation",
    category: "b2b",
    basePersona: {
      demographics: {
        ageRange: [28, 45],
        gender: "all",
        location: ["United States", "Canada", "UK"],
        education: "Bachelor's or Master's degree",
        income: "$80,000 - $150,000",
        occupation: "Manager/Director",
        industry: "Technology",
        companySize: "50-500 employees",
        familyStatus: "Married with children",
      },
      psychographics: {
        values: ["Innovation", "Efficiency", "Work-life balance", "Continuous learning"],
        interests: ["Technology", "Productivity tools", "Leadership", "Industry trends"],
        lifestyle: "Busy professional balancing career and family",
        personality: ["Analytical", "Results-driven", "Open to new ideas"],
        motivations: ["Career advancement", "Team success", "Personal growth"],
        fears: ["Falling behind competitors", "Inefficiency", "Making wrong decisions"],
        aspirations: ["Industry leadership", "Building high-performing teams"],
      },
    },
    popularity: 92,
  },
  {
    id: "tmpl-2",
    name: "Small Business Owner",
    description: "Entrepreneur wearing many hats with limited resources",
    category: "b2b",
    basePersona: {
      demographics: {
        ageRange: [30, 55],
        gender: "all",
        location: ["United States"],
        education: "Bachelor's degree",
        income: "$60,000 - $120,000",
        occupation: "Business Owner/Founder",
        industry: "Various",
        companySize: "1-20 employees",
        familyStatus: "Varies",
      },
      psychographics: {
        values: ["Independence", "Customer relationships", "Quality", "Growth"],
        interests: ["Business growth", "Marketing", "Operations", "Finance"],
        lifestyle: "Dedicated entrepreneur working long hours",
        personality: ["Resourceful", "Hands-on", "Risk-tolerant"],
        motivations: ["Business success", "Financial freedom", "Creating impact"],
        fears: ["Cash flow issues", "Competition", "Losing customers"],
        aspirations: ["Scaling the business", "Work-life balance", "Building legacy"],
      },
    },
    popularity: 88,
  },
  {
    id: "tmpl-3",
    name: "Gen Z Digital Native",
    description: "Young consumer who lives online and values authenticity",
    category: "b2c",
    basePersona: {
      demographics: {
        ageRange: [18, 26],
        gender: "all",
        location: ["Global"],
        education: "In college or recent graduate",
        income: "$20,000 - $50,000",
        occupation: "Student/Entry-level professional",
        industry: "Various",
        familyStatus: "Single",
      },
      psychographics: {
        values: ["Authenticity", "Social justice", "Sustainability", "Self-expression"],
        interests: ["Social media", "Entertainment", "Fashion", "Causes"],
        lifestyle: "Digital-first, socially conscious",
        personality: ["Expressive", "Skeptical of brands", "Community-oriented"],
        motivations: ["Self-expression", "Connection", "Making a difference"],
        fears: ["Missing out", "Inauthenticity", "Climate crisis"],
        aspirations: ["Success on own terms", "Making impact", "Financial stability"],
      },
    },
    popularity: 85,
  },
  {
    id: "tmpl-4",
    name: "E-commerce Enthusiast",
    description: "Online shopper who researches extensively before buying",
    category: "ecommerce",
    basePersona: {
      demographics: {
        ageRange: [25, 45],
        gender: "all",
        location: ["United States", "UK", "Australia"],
        education: "College educated",
        income: "$50,000 - $100,000",
        occupation: "Professional",
        industry: "Various",
        familyStatus: "Varies",
      },
      psychographics: {
        values: ["Value for money", "Convenience", "Quality", "Reviews"],
        interests: ["Shopping", "Product reviews", "Deals", "Lifestyle"],
        lifestyle: "Busy, convenience-focused",
        personality: ["Research-oriented", "Deal-seeking", "Brand-aware"],
        motivations: ["Getting best value", "Saving time", "Quality products"],
        fears: ["Buyer's remorse", "Scams", "Poor quality"],
        aspirations: ["Smart shopping", "Lifestyle improvement"],
      },
    },
    popularity: 82,
  },
  {
    id: "tmpl-5",
    name: "SaaS Decision Maker",
    description: "B2B buyer evaluating software solutions for their team",
    category: "saas",
    basePersona: {
      demographics: {
        ageRange: [32, 50],
        gender: "all",
        location: ["United States", "Canada", "Europe"],
        education: "Bachelor's or MBA",
        income: "$100,000 - $200,000",
        occupation: "VP/Director level",
        industry: "Technology/Business",
        companySize: "100-1000 employees",
        familyStatus: "Married",
      },
      psychographics: {
        values: ["ROI", "Reliability", "Support", "Integration"],
        interests: ["Industry solutions", "Best practices", "Case studies"],
        lifestyle: "Results-focused executive",
        personality: ["Analytical", "Risk-averse", "Data-driven"],
        motivations: ["Team efficiency", "Business outcomes", "Career success"],
        fears: ["Implementation failure", "Wasted budget", "Team resistance"],
        aspirations: ["Digital transformation", "Team productivity", "Recognition"],
      },
    },
    popularity: 79,
  },
  {
    id: "tmpl-6",
    name: "Content Creator",
    description: "Influencer or creator building their personal brand",
    category: "creator",
    basePersona: {
      demographics: {
        ageRange: [22, 35],
        gender: "all",
        location: ["Global"],
        education: "Varies",
        income: "$30,000 - $150,000",
        occupation: "Content Creator/Influencer",
        industry: "Media/Entertainment",
        familyStatus: "Varies",
      },
      psychographics: {
        values: ["Authenticity", "Creativity", "Community", "Growth"],
        interests: ["Content creation", "Audience building", "Monetization", "Trends"],
        lifestyle: "Creative, flexible schedule",
        personality: ["Creative", "Entrepreneurial", "Adaptable"],
        motivations: ["Audience growth", "Creative fulfillment", "Income"],
        fears: ["Algorithm changes", "Burnout", "Losing relevance"],
        aspirations: ["Major following", "Brand deals", "Sustainable income"],
      },
    },
    popularity: 86,
  },
];

// Initialize demo data
function initDemoData() {
  const demoPersonas: Persona[] = [
    {
      id: "persona-1",
      userId: "user-1",
      name: "Marketing Mary",
      avatar: "M",
      tagline: "Data-driven marketer seeking efficiency tools",
      demographics: {
        ageRange: [30, 40],
        gender: "female",
        location: ["United States", "Canada"],
        education: "Bachelor's in Marketing",
        income: "$70,000 - $100,000",
        occupation: "Marketing Manager",
        industry: "Technology",
        companySize: "50-200 employees",
        familyStatus: "Married with young children",
      },
      psychographics: {
        values: ["Efficiency", "Data-driven decisions", "Creativity", "Work-life balance"],
        interests: ["Marketing automation", "Analytics", "Content strategy", "Social media trends"],
        lifestyle: "Busy professional juggling career and family",
        personality: ["Organized", "Creative", "Results-oriented", "Collaborative"],
        motivations: ["Proving marketing ROI", "Team success", "Career growth"],
        fears: ["Wasting budget", "Falling behind competitors", "Not meeting goals"],
        aspirations: ["CMO role", "Industry recognition", "Building high-performing team"],
      },
      behaviors: {
        onlineHabits: ["LinkedIn browsing during lunch", "Email in morning", "Research during evening"],
        purchaseBehavior: "Research-heavy, seeks trials and demos",
        brandLoyalty: "medium",
        researchStyle: "Reads reviews, case studies, compares alternatives",
        decisionMaking: "committee",
        contentConsumption: ["Industry blogs", "Podcasts during commute", "Webinars"],
        deviceUsage: ["Laptop for work", "Mobile for social", "Tablet for reading"],
      },
      contentPreferences: {
        formats: ["How-to guides", "Case studies", "Templates", "Video tutorials"],
        topics: ["Marketing ROI", "Automation tips", "Industry benchmarks", "Tool comparisons"],
        tone: ["Professional but friendly", "Data-backed", "Practical"],
        length: "medium",
        visualStyle: ["Clean infographics", "Charts", "Screenshots"],
        frequency: "2-3 times per week",
        bestTimes: ["Tuesday 10am", "Wednesday 2pm", "Thursday 9am"],
      },
      painPoints: [
        "Too many tools, not enough integration",
        "Proving ROI to leadership",
        "Limited budget for experiments",
        "Keeping up with platform changes",
        "Creating consistent content with small team",
      ],
      goals: [
        "Automate repetitive tasks",
        "Improve campaign performance",
        "Get better insights from data",
        "Scale content production",
        "Build stronger brand presence",
      ],
      objections: [
        "Will this integrate with our existing stack?",
        "What's the learning curve?",
        "Can I see case studies from similar companies?",
        "What's the total cost including training?",
      ],
      triggers: [
        "End of quarter planning",
        "Competitor launches new campaign",
        "Budget approval season",
        "Team growth",
        "Platform algorithm changes",
      ],
      platforms: [
        {
          platform: "LinkedIn",
          usage: "daily",
          purpose: ["Professional networking", "Industry news", "Thought leadership"],
          engagementLevel: "active",
          followsCount: "500-1000",
        },
        {
          platform: "Twitter",
          usage: "daily",
          purpose: ["Real-time news", "Industry conversations", "Customer service monitoring"],
          engagementLevel: "moderate",
          followsCount: "200-500",
        },
        {
          platform: "Instagram",
          usage: "weekly",
          purpose: ["Inspiration", "Competitor monitoring"],
          engagementLevel: "passive",
          followsCount: "100-300",
        },
      ],
      buyingJourney: {
        awareness: ["Industry blog posts", "Peer recommendations", "Social media ads"],
        consideration: ["Product demos", "Comparison articles", "Case studies"],
        decision: ["Free trial", "Sales call", "Reference customers"],
        retention: ["Onboarding support", "Regular check-ins", "New feature updates"],
        advocacy: ["Success stories", "Referral programs", "Community forums"],
      },
      communicationStyle: {
        formalityLevel: "semi-formal",
        preferredChannels: ["Email", "LinkedIn", "Webinars"],
        responseExpectation: "Within 24 hours",
        languageComplexity: "moderate",
        emojiUsage: "minimal",
      },
      score: 85,
      status: "active",
      source: "ai_generated",
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date("2024-01-20"),
    },
    {
      id: "persona-2",
      userId: "user-1",
      name: "Startup Steve",
      avatar: "S",
      tagline: "Growth-hungry founder looking for quick wins",
      demographics: {
        ageRange: [28, 38],
        gender: "male",
        location: ["United States"],
        education: "Bachelor's in Computer Science",
        income: "$80,000 - $150,000 (variable)",
        occupation: "Founder/CEO",
        industry: "SaaS/Technology",
        companySize: "5-20 employees",
        familyStatus: "Single or newly married",
      },
      psychographics: {
        values: ["Speed", "Innovation", "Growth", "Hustle"],
        interests: ["Startup news", "Growth hacking", "Fundraising", "Product development"],
        lifestyle: "24/7 startup mode",
        personality: ["Risk-taker", "Visionary", "Impatient", "Hands-on"],
        motivations: ["Building successful company", "Making impact", "Financial success"],
        fears: ["Running out of runway", "Being outcompeted", "Hiring wrong people"],
        aspirations: ["Successful exit", "Industry disruption", "Building great team"],
      },
      behaviors: {
        onlineHabits: ["Twitter constantly", "Hacker News daily", "Product Hunt weekly"],
        purchaseBehavior: "Quick decisions, values speed",
        brandLoyalty: "low",
        researchStyle: "Quick evaluation, trusts peer recommendations",
        decisionMaking: "impulsive",
        contentConsumption: ["Twitter threads", "Podcasts", "Startup blogs"],
        deviceUsage: ["Mobile primary", "Laptop for work"],
      },
      contentPreferences: {
        formats: ["Twitter threads", "Short videos", "Quick tips", "Templates"],
        topics: ["Growth tactics", "Fundraising", "Product-market fit", "Hiring"],
        tone: ["Direct", "Actionable", "No-BS", "Energetic"],
        length: "short",
        visualStyle: ["Screenshots", "Quick graphics", "Memes"],
        frequency: "Daily",
        bestTimes: ["Morning", "Late night"],
      },
      painPoints: [
        "Limited resources and time",
        "Wearing too many hats",
        "Finding product-market fit",
        "Scaling quickly",
        "Standing out in crowded market",
      ],
      goals: [
        "Grow user base rapidly",
        "Raise next funding round",
        "Build strong team",
        "Achieve profitability",
        "Become market leader",
      ],
      objections: [
        "Will this give us quick results?",
        "Is there a startup discount?",
        "How fast is implementation?",
        "What's the minimum commitment?",
      ],
      triggers: [
        "Funding round closed",
        "Competitor news",
        "Board meeting prep",
        "Rapid growth needs",
        "Hiring surge",
      ],
      platforms: [
        {
          platform: "Twitter",
          usage: "daily",
          purpose: ["Networking", "Learning", "Building in public"],
          engagementLevel: "active",
          followsCount: "1000+",
        },
        {
          platform: "LinkedIn",
          usage: "weekly",
          purpose: ["Hiring", "Investor connections", "PR"],
          engagementLevel: "moderate",
          followsCount: "500+",
        },
      ],
      buyingJourney: {
        awareness: ["Twitter recommendations", "Founder communities", "Product Hunt"],
        consideration: ["Quick demo", "Founder testimonials", "Pricing page"],
        decision: ["Free trial", "Fast signup", "Peer recommendation"],
        retention: ["Quick wins", "Growth results", "Community"],
        advocacy: ["Twitter shoutouts", "Referrals", "Case study"],
      },
      communicationStyle: {
        formalityLevel: "casual",
        preferredChannels: ["Twitter DM", "Slack", "Quick calls"],
        responseExpectation: "ASAP",
        languageComplexity: "simple",
        emojiUsage: "moderate",
      },
      score: 78,
      status: "active",
      source: "ai_generated",
      createdAt: new Date("2024-02-01"),
      updatedAt: new Date("2024-02-05"),
    },
  ];
  demoPersonas.forEach((p) => personas.set(p.id, p));

  // Demo insights
  const demoInsights: PersonaInsight[] = [
    {
      id: "insight-1",
      personaId: "persona-1",
      type: "best_time",
      title: "Peak Engagement Window",
      description: "Marketing Mary is most active on LinkedIn during lunch hours (11am-1pm) and post-work (5-7pm)",
      actionable: "Schedule LinkedIn posts for 11:30am and 5:30pm on weekdays",
      priority: "high",
      createdAt: new Date("2024-01-20"),
    },
    {
      id: "insight-2",
      personaId: "persona-1",
      type: "content_idea",
      title: "ROI Calculator Content",
      description: "Marketing Mary's biggest pain point is proving ROI. Create calculator tools and templates.",
      actionable: "Develop an interactive ROI calculator and downloadable Excel template",
      priority: "high",
      createdAt: new Date("2024-01-21"),
    },
    {
      id: "insight-3",
      personaId: "persona-2",
      type: "platform_tip",
      title: "Twitter Thread Strategy",
      description: "Startup Steve prefers quick, actionable content. Twitter threads perform best.",
      actionable: "Create weekly Twitter threads with 5-7 actionable growth tips",
      priority: "medium",
      createdAt: new Date("2024-02-05"),
    },
  ];
  demoInsights.forEach((i) => insights.set(i.id, i));
}

// Initialize
initDemoData();

// Persona functions
export function getUserPersonas(userId: string): Persona[] {
  return Array.from(personas.values())
    .filter((p) => p.userId === userId)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export function getPersona(personaId: string): Persona | undefined {
  return personas.get(personaId);
}

export function createPersona(
  userId: string,
  data: Partial<Omit<Persona, "id" | "userId" | "createdAt" | "updatedAt">>
): Persona {
  const persona: Persona = {
    id: `persona-${Date.now()}`,
    userId,
    name: data.name || "New Persona",
    avatar: data.avatar || data.name?.charAt(0) || "N",
    tagline: data.tagline || "",
    demographics: data.demographics || {
      ageRange: [25, 45],
      gender: "all",
      location: [],
      education: "",
      income: "",
      occupation: "",
      industry: "",
      familyStatus: "",
    },
    psychographics: data.psychographics || {
      values: [],
      interests: [],
      lifestyle: "",
      personality: [],
      motivations: [],
      fears: [],
      aspirations: [],
    },
    behaviors: data.behaviors || {
      onlineHabits: [],
      purchaseBehavior: "",
      brandLoyalty: "medium",
      researchStyle: "",
      decisionMaking: "considered",
      contentConsumption: [],
      deviceUsage: [],
    },
    contentPreferences: data.contentPreferences || {
      formats: [],
      topics: [],
      tone: [],
      length: "medium",
      visualStyle: [],
      frequency: "",
      bestTimes: [],
    },
    painPoints: data.painPoints || [],
    goals: data.goals || [],
    objections: data.objections || [],
    triggers: data.triggers || [],
    platforms: data.platforms || [],
    buyingJourney: data.buyingJourney || {
      awareness: [],
      consideration: [],
      decision: [],
      retention: [],
      advocacy: [],
    },
    communicationStyle: data.communicationStyle || {
      formalityLevel: "semi-formal",
      preferredChannels: [],
      responseExpectation: "",
      languageComplexity: "moderate",
      emojiUsage: "minimal",
    },
    score: data.score || 50,
    status: data.status || "draft",
    source: data.source || "manual",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  personas.set(persona.id, persona);
  return persona;
}

export function updatePersona(
  personaId: string,
  userId: string,
  updates: Partial<Omit<Persona, "id" | "userId" | "createdAt">>
): Persona | null {
  const persona = personas.get(personaId);
  if (!persona || persona.userId !== userId) return null;

  Object.assign(persona, updates, { updatedAt: new Date() });
  return persona;
}

export function deletePersona(personaId: string, userId: string): boolean {
  const persona = personas.get(personaId);
  if (!persona || persona.userId !== userId) return false;

  // Delete associated insights
  Array.from(insights.values())
    .filter((i) => i.personaId === personaId)
    .forEach((i) => insights.delete(i.id));

  return personas.delete(personaId);
}

export function duplicatePersona(personaId: string, userId: string): Persona | null {
  const original = personas.get(personaId);
  if (!original || original.userId !== userId) return null;

  const duplicate = createPersona(userId, {
    ...original,
    name: `${original.name} (Copy)`,
    status: "draft",
  });

  return duplicate;
}

// AI Generation functions
export async function generatePersonaFromData(
  userId: string,
  data: {
    businessType: string;
    targetAudience: string;
    industry: string;
    productDescription: string;
  }
): Promise<Persona> {
  // Simulate AI generation
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Generate persona based on inputs
  const persona = createPersona(userId, {
    name: generatePersonaName(data.targetAudience),
    tagline: `${data.targetAudience} in ${data.industry}`,
    demographics: {
      ageRange: [28, 45],
      gender: "all",
      location: ["United States"],
      education: "College educated",
      income: "$50,000 - $100,000",
      occupation: data.targetAudience,
      industry: data.industry,
      familyStatus: "Varies",
    },
    psychographics: {
      values: generateValues(data.businessType),
      interests: generateInterests(data.industry),
      lifestyle: `${data.targetAudience} lifestyle`,
      personality: ["Analytical", "Goal-oriented"],
      motivations: generateMotivations(data.productDescription),
      fears: generateFears(data.businessType),
      aspirations: ["Success", "Growth", "Efficiency"],
    },
    painPoints: generatePainPoints(data.productDescription),
    goals: generateGoals(data.productDescription),
    score: Math.floor(Math.random() * 20) + 70,
    status: "active",
    source: "ai_generated",
  });

  // Generate initial insights
  generateInsightsForPersona(persona);

  return persona;
}

function generatePersonaName(audience: string): string {
  const firstNames = ["Alex", "Jordan", "Sam", "Taylor", "Morgan", "Casey", "Riley", "Quinn"];
  const name = firstNames[Math.floor(Math.random() * firstNames.length)];
  const descriptor = audience.split(" ")[0];
  return `${descriptor} ${name}`;
}

function generateValues(businessType: string): string[] {
  const baseValues = ["Quality", "Reliability", "Innovation"];
  if (businessType.toLowerCase().includes("b2b")) {
    return [...baseValues, "ROI", "Efficiency", "Partnership"];
  }
  return [...baseValues, "Value", "Convenience", "Trust"];
}

function generateInterests(industry: string): string[] {
  return [
    `${industry} trends`,
    "Industry news",
    "Best practices",
    "Tools and technology",
    "Professional development",
  ];
}

function generateMotivations(productDescription: string): string[] {
  return [
    "Solving current challenges",
    "Improving efficiency",
    "Staying competitive",
    "Achieving goals faster",
  ];
}

function generateFears(businessType: string): string[] {
  if (businessType.toLowerCase().includes("b2b")) {
    return ["Wasting budget", "Implementation failure", "Wrong vendor choice"];
  }
  return ["Buyer's remorse", "Poor quality", "Wasted time"];
}

function generatePainPoints(productDescription: string): string[] {
  return [
    "Current solutions are too complex",
    "Lack of integration between tools",
    "Time-consuming manual processes",
    "Difficulty measuring results",
    "Limited resources",
  ];
}

function generateGoals(productDescription: string): string[] {
  return [
    "Streamline workflows",
    "Improve productivity",
    "Get better insights",
    "Save time and money",
    "Achieve growth targets",
  ];
}

function generateInsightsForPersona(persona: Persona): void {
  const insightTemplates = [
    {
      type: "best_time" as const,
      title: "Optimal Posting Times",
      description: `Based on ${persona.name}'s online habits, peak engagement is expected during business hours.`,
      actionable: "Schedule primary content between 9am-11am on weekdays",
      priority: "high" as const,
    },
    {
      type: "content_idea" as const,
      title: "Pain Point Content",
      description: `Address ${persona.name}'s top pain point: "${persona.painPoints[0] || "efficiency"}"`,
      actionable: "Create how-to content showing solutions to this specific challenge",
      priority: "high" as const,
    },
    {
      type: "messaging" as const,
      title: "Communication Tone",
      description: `${persona.name} prefers ${persona.communicationStyle.formalityLevel} communication`,
      actionable: `Use ${persona.communicationStyle.formalityLevel} language in all content`,
      priority: "medium" as const,
    },
  ];

  insightTemplates.forEach((template) => {
    const insight: PersonaInsight = {
      id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      personaId: persona.id,
      ...template,
      createdAt: new Date(),
    };
    insights.set(insight.id, insight);
  });
}

export function createFromTemplate(userId: string, templateId: string): Persona | null {
  const template = PERSONA_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return null;

  return createPersona(userId, {
    ...template.basePersona,
    name: template.name,
    tagline: template.description,
    status: "draft",
    source: "manual",
  });
}

// Insight functions
export function getPersonaInsights(personaId: string): PersonaInsight[] {
  return Array.from(insights.values())
    .filter((i) => i.personaId === personaId)
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
}

export function addInsight(
  personaId: string,
  data: Omit<PersonaInsight, "id" | "personaId" | "createdAt">
): PersonaInsight {
  const insight: PersonaInsight = {
    id: `insight-${Date.now()}`,
    personaId,
    ...data,
    createdAt: new Date(),
  };

  insights.set(insight.id, insight);
  return insight;
}

export function deleteInsight(insightId: string): boolean {
  return insights.delete(insightId);
}

// Stats
export function getPersonaStats(userId: string): {
  totalPersonas: number;
  activePersonas: number;
  aiGenerated: number;
  totalInsights: number;
  avgScore: number;
} {
  const userPersonas = Array.from(personas.values()).filter((p) => p.userId === userId);
  const userInsights = Array.from(insights.values()).filter((i) =>
    userPersonas.some((p) => p.id === i.personaId)
  );

  return {
    totalPersonas: userPersonas.length,
    activePersonas: userPersonas.filter((p) => p.status === "active").length,
    aiGenerated: userPersonas.filter((p) => p.source === "ai_generated").length,
    totalInsights: userInsights.length,
    avgScore: userPersonas.length
      ? Math.round(userPersonas.reduce((sum, p) => sum + p.score, 0) / userPersonas.length)
      : 0,
  };
}

// Export constants
export const GENDERS = ["male", "female", "non-binary", "all"] as const;
export const FORMALITY_LEVELS = ["formal", "semi-formal", "casual", "very-casual"] as const;
export const BRAND_LOYALTY_LEVELS = ["low", "medium", "high"] as const;
export const DECISION_MAKING_STYLES = ["impulsive", "considered", "committee"] as const;
export const PERSONA_STATUSES = ["draft", "active", "archived"] as const;
export const INSIGHT_TYPES = ["content_idea", "best_time", "platform_tip", "messaging", "pain_point", "opportunity"] as const;
