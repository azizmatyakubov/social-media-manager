import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PostsList } from "@/components/dashboard/PostsList";

export default async function PostsPage() {
  const session = await getServerSession(authOptions);

  const [posts, xAccount] = await Promise.all([
    prisma.post.findMany({
      where: { userId: session!.user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.xAccount.findFirst({
      where: { userId: session!.user.id, isDefault: true },
    }).then(acc => acc || prisma.xAccount.findFirst({ where: { userId: session!.user.id } })),
  ]);

  const postedCount = posts.filter(p => p.status === "POSTED").length;
  const pendingCount = posts.filter(p => p.status === "PENDING").length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Posts</h1>
          <p className="text-zinc-400 mt-1">View and manage your generated content</p>
        </div>
        <Link
          href="/dashboard/compose"
          className="px-5 py-2.5 btn-premium rounded-xl text-white font-medium text-sm relative"
        >
          <span className="relative z-10 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Post
          </span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="group relative rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-2xl p-5 hover:border-white/10 transition">
            <div className="flex items-center justify-between mb-2">
              <p className="text-zinc-400 text-sm">Total</p>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold">{posts.length}</p>
          </div>
        </div>
        <div className="group relative rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-2xl p-5 hover:border-white/10 transition">
            <div className="flex items-center justify-between mb-2">
              <p className="text-zinc-400 text-sm">Posted</p>
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-green-400">{postedCount}</p>
          </div>
        </div>
        <div className="group relative rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-2xl p-5 hover:border-white/10 transition">
            <div className="flex items-center justify-between mb-2">
              <p className="text-zinc-400 text-sm">Pending</p>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-amber-400">{pendingCount}</p>
          </div>
        </div>
      </div>

      {/* Posts List */}
      <PostsList posts={posts} isXConnected={!!xAccount} />
    </div>
  );
}
