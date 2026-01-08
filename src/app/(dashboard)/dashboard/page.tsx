import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PostStatus } from "@prisma/client";
import { InlineComposer } from "@/components/dashboard/InlineComposer";
import { PostQueue } from "@/components/dashboard/PostQueue";
import { ActivityPanel } from "@/components/dashboard/ActivityPanel";
import { StatusBar } from "@/components/dashboard/StatusBar";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Get current date boundaries for filtering
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const [xAccount, postingConfig, allPosts, queuePosts, todayPosts, weekPosts] = await Promise.all([
    prisma.xAccount.findFirst({
      where: { userId: session.user.id, isDefault: true },
    }).then(acc => acc || prisma.xAccount.findFirst({ where: { userId: session.user.id } })),
    prisma.postingConfig.findUnique({
      where: { userId: session.user.id },
    }),
    prisma.post.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    // Get both pending and scheduled posts for the queue
    prisma.post.findMany({
      where: {
        userId: session.user.id,
        OR: [
          { status: PostStatus.PENDING },
          { status: PostStatus.SCHEDULED },
        ],
      },
      orderBy: [
        { scheduledFor: "asc" },
        { createdAt: "desc" },
      ],
    }),
    prisma.post.findMany({
      where: {
        userId: session.user.id,
        createdAt: { gte: todayStart },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.post.findMany({
      where: {
        userId: session.user.id,
        createdAt: { gte: weekStart },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const isXConnected = !!xAccount;
  const hasConfig = !!postingConfig;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-zinc-400 text-sm mt-0.5">Create, schedule, and publish in one place</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/50 border border-white/5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-zinc-400">
              {queuePosts.length} in queue
            </span>
          </div>
        </div>
      </div>

      {/* Connection Warning */}
      {!isXConnected && (
        <div className="relative overflow-hidden rounded-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-orange-500/10" />
          <div className="relative p-4 border border-amber-500/20 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-amber-300 text-sm">Connect your X account to publish posts</p>
                <p className="text-xs text-zinc-400">You can still generate and save drafts</p>
              </div>
            </div>
            <a
              href="/api/x/connect"
              className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-zinc-200 transition"
            >
              Connect X
            </a>
          </div>
        </div>
      )}

      {/* Instant Post Composer */}
      <InlineComposer isXConnected={isXConnected} hasConfig={hasConfig} />

      {/* Main Grid: Queue + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Post Queue - 3 columns */}
        <div className="lg:col-span-3">
          <PostQueue posts={queuePosts} isXConnected={isXConnected} />
        </div>

        {/* Activity Panel - 2 columns */}
        <div className="lg:col-span-2">
          <ActivityPanel
            posts={allPosts}
            todayPosts={todayPosts}
            weekPosts={weekPosts}
          />
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar xAccount={xAccount} postingConfig={postingConfig} />
    </div>
  );
}
