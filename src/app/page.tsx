import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

const platformIcons = {
  x: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  linkedin: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  ),
  instagram: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  ),
  tiktok: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  ),
  youtube: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
  pinterest: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
    </svg>
  ),
  bluesky: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 01-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8z" />
    </svg>
  ),
  threads: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.182.408-2.256 1.332-3.023.85-.706 2.02-1.127 3.39-1.22 1.073-.073 2.074.02 2.988.27-.021-1.102-.158-1.993-.41-2.656-.37-.972-1.002-1.463-1.93-1.501-.672-.028-1.296.166-1.756.546-.442.365-.713.865-.762 1.407l-2.106-.168c.094-1.042.587-1.937 1.388-2.52.859-.627 1.974-.934 3.318-.915 1.61.024 2.857.623 3.71 1.782.673.913 1.053 2.16 1.128 3.71.027.566.008 1.167-.055 1.79 1.032.545 1.848 1.28 2.397 2.166.732 1.181.972 2.596.693 4.093-.335 1.793-1.249 3.283-2.644 4.307-1.39 1.02-3.212 1.566-5.422 1.623-.078.001-.156.002-.234.002zm-.063-7.652c-.964.052-1.697.295-2.182.721-.39.344-.57.74-.537 1.178.035.453.302.832.773 1.094.567.315 1.313.453 2.102.388 1.06-.056 1.868-.424 2.403-1.09.408-.509.675-1.197.795-2.046-.888-.181-1.828-.271-2.813-.238-.18.006-.361.012-.541-.007z" />
    </svg>
  ),
};

const features = [
  {
    id: "ai-content",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: "AI-Powered Content",
    description: "Generate posts that match your voice perfectly. Our AI learns your style from past content and creates engaging posts for every platform.",
    color: "from-amber-500 to-orange-500",
    bgColor: "bg-amber-500/10",
    textColor: "text-amber-400",
  },
  {
    id: "viral-library",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    title: "2M+ Viral Tweet Library",
    description: "Browse millions of proven viral tweets for inspiration. Filter by niche, engagement, and topic to find content that resonates.",
    color: "from-rose-500 to-pink-500",
    bgColor: "bg-rose-500/10",
    textColor: "text-rose-400",
  },
  {
    id: "auto-retweet",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    title: "Evergreen Auto-Retweet",
    description: "Mark your best posts as evergreen and let the system automatically repost them at optimal times for maximum reach.",
    color: "from-emerald-500 to-green-500",
    bgColor: "bg-emerald-500/10",
    textColor: "text-emerald-400",
  },
  {
    id: "unified-inbox",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
    ),
    title: "Unified Social Inbox",
    description: "Manage all DMs, comments, and mentions from every platform in one place. AI-powered reply suggestions included.",
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-500/10",
    textColor: "text-blue-400",
  },
  {
    id: "auto-dm",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    title: "Auto-DM on Keywords",
    description: "Automatically send personalized DMs when someone comments with specific keywords. Perfect for lead generation.",
    color: "from-violet-500 to-purple-500",
    bgColor: "bg-violet-500/10",
    textColor: "text-violet-400",
  },
  {
    id: "grid-planner",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
    title: "Instagram Grid Planner",
    description: "Visually plan your Instagram feed with drag-and-drop. See color harmony scores and preview your aesthetic.",
    color: "from-pink-500 to-rose-500",
    bgColor: "bg-pink-500/10",
    textColor: "text-pink-400",
  },
  {
    id: "rss-posting",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
      </svg>
    ),
    title: "RSS Auto-Posting",
    description: "Connect any RSS feed and automatically post new content to your social accounts with custom templates.",
    color: "from-orange-500 to-amber-500",
    bgColor: "bg-orange-500/10",
    textColor: "text-orange-400",
  },
  {
    id: "conditional",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: "Conditional Posting",
    description: "Set engagement triggers to automatically post follow-up content when your posts hit specific milestones.",
    color: "from-indigo-500 to-blue-500",
    bgColor: "bg-indigo-500/10",
    textColor: "text-indigo-400",
  },
  {
    id: "ai-copilot",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: "AI Strategy Copilot",
    description: "Get a personalized content strategy generated by AI. Includes content pillars, posting schedule, and growth tactics.",
    color: "from-cyan-500 to-teal-500",
    bgColor: "bg-cyan-500/10",
    textColor: "text-cyan-400",
  },
];

const testimonials = [
  {
    name: "Sarah Chen",
    handle: "@sarahbuilds",
    avatar: "SC",
    content: "AutoPost helped me grow from 5K to 50K followers in 6 months. The viral tweet library is an absolute game-changer for content inspiration.",
    followers: "52.4K",
    platform: "X",
  },
  {
    name: "Marcus Williams",
    handle: "@marcusw",
    avatar: "MW",
    content: "The auto-DM feature alone has generated over $30K in consulting leads. This tool pays for itself 100x over.",
    followers: "28.7K",
    platform: "X",
  },
  {
    name: "Elena Rodriguez",
    handle: "@elenacreates",
    avatar: "ER",
    content: "Finally, a tool that handles ALL my platforms. The unified inbox saves me 2+ hours every day managing comments and DMs.",
    followers: "125K",
    platform: "Instagram",
  },
  {
    name: "David Park",
    handle: "@davidparktech",
    avatar: "DP",
    content: "The AI content generation is scarily good. It writes posts that sound exactly like me. My engagement has tripled since switching.",
    followers: "41.2K",
    platform: "LinkedIn",
  },
];

const stats = [
  { value: "10K+", label: "Active Creators" },
  { value: "5B+", label: "Impressions Generated" },
  { value: "2M+", label: "Viral Tweets in Library" },
  { value: "98%", label: "Customer Satisfaction" },
];

const comparisonData = [
  { feature: "AI Content Generation", us: true, hootsuite: true, buffer: true, hypefury: false },
  { feature: "Viral Tweet Library (2M+)", us: true, hootsuite: false, buffer: false, hypefury: false },
  { feature: "Auto-Retweet Evergreen", us: true, hootsuite: false, buffer: false, hypefury: true },
  { feature: "Auto-DM on Keywords", us: true, hootsuite: false, buffer: false, hypefury: true },
  { feature: "8 Platform Support", us: true, hootsuite: true, buffer: true, hypefury: false },
  { feature: "Instagram Grid Planner", us: true, hootsuite: false, buffer: false, hypefury: false },
  { feature: "Unified Social Inbox", us: true, hootsuite: true, buffer: false, hypefury: false },
  { feature: "Conditional Posting", us: true, hootsuite: false, buffer: false, hypefury: false },
  { feature: "Starting Price", us: "$19/mo", hootsuite: "$99/mo", buffer: "Free", hypefury: "$19/mo" },
];

export default async function HomePage() {
  // Try to get session, but don't fail if database is unavailable
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    // Database connection might not be available - continue without session
  }

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[150px]" />
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-sm">
              A
            </div>
            <span className="font-semibold text-lg tracking-tight">AutoPost</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            <Link href="#features" className="text-sm text-zinc-400 hover:text-white transition">
              Features
            </Link>
            <Link href="#platforms" className="text-sm text-zinc-400 hover:text-white transition">
              Platforms
            </Link>
            <Link href="#testimonials" className="text-sm text-zinc-400 hover:text-white transition">
              Testimonials
            </Link>
            <Link href="/pricing" className="text-sm text-zinc-400 hover:text-white transition">
              Pricing
            </Link>
            <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition">
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium px-4 py-2 rounded-full bg-white text-black hover:bg-zinc-200 transition"
            >
              Start Free Trial
            </Link>
          </div>
          {/* Mobile menu button */}
          <button className="md:hidden p-2 text-zinc-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 sm:pt-40 pb-16 sm:pb-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-strong mb-6 sm:mb-8">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs sm:text-sm text-zinc-300">Trusted by 10,000+ creators worldwide</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-4 sm:mb-6">
            The only social media tool
            <br />
            <span className="gradient-text">you&apos;ll ever need</span>
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-6 sm:mb-8 leading-relaxed px-4">
            AI-powered content creation, viral tweet library, auto-engagement, and unified inbox.
            <br className="hidden sm:block" />
            All 8 platforms. One powerful dashboard.
          </p>

          {/* Platform Icons */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-10 flex-wrap px-4">
            {Object.entries(platformIcons).map(([key, icon]) => (
              <div
                key={key}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl glass flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition"
              >
                {icon}
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-10 sm:mb-12 px-4">
            <Link
              href="/register"
              className="w-full sm:w-auto btn-premium px-6 sm:px-8 py-3 sm:py-4 rounded-full text-white font-medium text-sm relative z-10"
            >
              <span className="relative z-10">Start your free trial</span>
            </Link>
            <Link
              href="#features"
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-full text-sm font-medium text-zinc-300 hover:text-white glass shine text-center"
            >
              See all features
            </Link>
          </div>

          {/* Trust badges */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-zinc-500 px-4">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-12 sm:py-16 px-4 sm:px-6 border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold gradient-text mb-1 sm:mb-2">{stat.value}</div>
                <div className="text-xs sm:text-sm text-zinc-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="relative px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden glass-strong p-1">
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
            <div className="rounded-xl bg-zinc-950 p-4 sm:p-6">
              {/* Window controls */}
              <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <div className="w-3 h-3 rounded-full bg-zinc-700" />
                <div className="w-3 h-3 rounded-full bg-zinc-700" />
                <div className="w-3 h-3 rounded-full bg-zinc-700" />
              </div>
              {/* Mock content */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-4">
                  <div className="h-28 sm:h-32 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white/5 p-3 sm:p-4">
                    <div className="text-xs sm:text-sm text-zinc-400 mb-2">Next scheduled post</div>
                    <div className="text-sm sm:text-base text-white">Building in public is the best marketing strategy I&apos;ve ever tried. Here&apos;s what I learned after 100 days...</div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 sm:gap-4">
                    {[
                      { label: "Posts this week", value: "28", change: "+40%" },
                      { label: "Engagement", value: "4.8%", change: "+12%" },
                      { label: "New followers", value: "+847", change: "+28%" },
                    ].map((item, i) => (
                      <div key={i} className="h-20 sm:h-24 rounded-xl bg-zinc-900/50 border border-white/5 p-3 sm:p-4">
                        <div className="text-[10px] sm:text-xs text-zinc-500 mb-1">{item.label}</div>
                        <div className="text-lg sm:text-2xl font-bold">{item.value}</div>
                        <div className="text-[10px] sm:text-xs text-green-400">{item.change}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-full min-h-[120px] rounded-xl bg-zinc-900/50 border border-white/5 p-3 sm:p-4">
                    <div className="text-xs text-zinc-500 mb-3">Connected Platforms</div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(platformIcons).slice(0, 4).map(([key, icon]) => (
                        <div key={key} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-zinc-400">
                          {icon}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Glow effect under the card */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-40 bg-gradient-to-t from-indigo-500/20 to-transparent blur-3xl pointer-events-none" />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative py-20 sm:py-32 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-zinc-400 mb-4">
              <span>Features</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Everything competitors offer.
              <br />
              <span className="gradient-text">And way more.</span>
            </h2>
            <p className="text-zinc-400 text-base sm:text-lg max-w-2xl mx-auto px-4">
              We combined the best features from Hypefury, Tweet Hunter, Buffer, and Later into one powerful platform.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {features.map((feature) => (
              <div
                key={feature.id}
                className="group relative rounded-2xl bg-gradient-to-br p-px card-hover overflow-hidden"
                style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-10`} />
                <div className="relative rounded-2xl bg-zinc-950/90 p-5 sm:p-6 h-full backdrop-blur-sm">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${feature.bgColor} ${feature.textColor} flex items-center justify-center mb-4`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platforms Section */}
      <section id="platforms" className="relative py-20 sm:py-32 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-zinc-400 mb-4">
            <span>Platforms</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            One dashboard. Eight platforms.
          </h2>
          <p className="text-zinc-400 text-base sm:text-lg mb-10 sm:mb-12 px-4">
            Manage X, LinkedIn, Instagram, TikTok, YouTube, Pinterest, Bluesky, and Threads from a single, powerful dashboard.
          </p>

          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 sm:gap-4 max-w-2xl mx-auto">
            {Object.entries(platformIcons).map(([key, icon]) => (
              <div
                key={key}
                className="aspect-square rounded-2xl glass flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition group"
              >
                <div className="transform group-hover:scale-110 transition">
                  {icon}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="relative py-20 sm:py-32 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-zinc-400 mb-4">
              <span>Comparison</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              See how we compare
            </h2>
            <p className="text-zinc-400 text-base sm:text-lg px-4">
              More features. Better price. No compromises.
            </p>
          </div>

          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-[600px] px-4 sm:px-0">
              <div className="rounded-2xl glass-strong overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-zinc-400">Feature</th>
                      <th className="p-3 sm:p-4 text-xs sm:text-sm font-medium text-center">
                        <span className="gradient-text font-bold">AutoPost</span>
                      </th>
                      <th className="p-3 sm:p-4 text-xs sm:text-sm font-medium text-center text-zinc-400">Hootsuite</th>
                      <th className="p-3 sm:p-4 text-xs sm:text-sm font-medium text-center text-zinc-400">Buffer</th>
                      <th className="p-3 sm:p-4 text-xs sm:text-sm font-medium text-center text-zinc-400">Hypefury</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map((row, i) => (
                      <tr key={i} className="border-b border-white/5 last:border-0">
                        <td className="p-3 sm:p-4 text-xs sm:text-sm">{row.feature}</td>
                        <td className="p-3 sm:p-4 text-center">
                          {typeof row.us === "boolean" ? (
                            row.us ? (
                              <span className="inline-flex w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-green-500/20 text-green-400 items-center justify-center">
                                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </span>
                            ) : (
                              <span className="inline-flex w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-zinc-800 text-zinc-500 items-center justify-center">
                                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </span>
                            )
                          ) : (
                            <span className="text-xs sm:text-sm font-medium gradient-text">{row.us}</span>
                          )}
                        </td>
                        <td className="p-3 sm:p-4 text-center">
                          {typeof row.hootsuite === "boolean" ? (
                            row.hootsuite ? (
                              <span className="inline-flex w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-green-500/20 text-green-400 items-center justify-center">
                                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </span>
                            ) : (
                              <span className="inline-flex w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-zinc-800 text-zinc-500 items-center justify-center">
                                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </span>
                            )
                          ) : (
                            <span className="text-xs sm:text-sm text-zinc-400">{row.hootsuite}</span>
                          )}
                        </td>
                        <td className="p-3 sm:p-4 text-center">
                          {typeof row.buffer === "boolean" ? (
                            row.buffer ? (
                              <span className="inline-flex w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-green-500/20 text-green-400 items-center justify-center">
                                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </span>
                            ) : (
                              <span className="inline-flex w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-zinc-800 text-zinc-500 items-center justify-center">
                                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </span>
                            )
                          ) : (
                            <span className="text-xs sm:text-sm text-zinc-400">{row.buffer}</span>
                          )}
                        </td>
                        <td className="p-3 sm:p-4 text-center">
                          {typeof row.hypefury === "boolean" ? (
                            row.hypefury ? (
                              <span className="inline-flex w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-green-500/20 text-green-400 items-center justify-center">
                                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </span>
                            ) : (
                              <span className="inline-flex w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-zinc-800 text-zinc-500 items-center justify-center">
                                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </span>
                            )
                          ) : (
                            <span className="text-xs sm:text-sm text-zinc-400">{row.hypefury}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="relative py-20 sm:py-32 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-zinc-400 mb-4">
              <span>Testimonials</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Loved by creators worldwide
            </h2>
            <p className="text-zinc-400 text-base sm:text-lg px-4">
              See what our users are saying about AutoPost.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
            {testimonials.map((testimonial, i) => (
              <div key={i} className="rounded-2xl glass p-5 sm:p-6">
                <div className="flex items-start gap-3 sm:gap-4 mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs sm:text-sm">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-sm sm:text-base">{testimonial.name}</div>
                    <div className="text-xs sm:text-sm text-zinc-500">{testimonial.handle} &middot; {testimonial.followers} followers</div>
                  </div>
                </div>
                <p className="text-zinc-300 text-sm sm:text-base leading-relaxed">&ldquo;{testimonial.content}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 sm:py-32 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 via-purple-600/30 to-pink-600/30" />
            <div className="absolute inset-0 bg-zinc-950/80" />

            <div className="relative px-6 py-12 sm:px-16 sm:py-20 text-center">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Ready to grow on autopilot?
              </h2>
              <p className="text-zinc-400 text-base sm:text-lg mb-6 sm:mb-8 max-w-xl mx-auto px-4">
                Join 10,000+ creators who are building their audience without the posting burnout.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-full bg-white text-black font-medium hover:bg-zinc-200 transition text-sm sm:text-base"
              >
                Start your free trial
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <p className="text-xs sm:text-sm text-zinc-500 mt-4">No credit card required &middot; 14-day free trial</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs">
                A
              </div>
              <span className="font-medium text-sm">AutoPost</span>
            </div>
            <div className="flex items-center gap-6 text-xs sm:text-sm text-zinc-500">
              <Link href="/pricing" className="hover:text-white transition">Pricing</Link>
              <Link href="#features" className="hover:text-white transition">Features</Link>
              <Link href="/login" className="hover:text-white transition">Sign in</Link>
            </div>
            <p className="text-zinc-500 text-xs sm:text-sm">
              &copy; 2026 AutoPost. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
