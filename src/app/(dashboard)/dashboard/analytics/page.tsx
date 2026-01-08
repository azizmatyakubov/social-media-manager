import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AnalyticsDashboard } from "@/components/dashboard/AnalyticsDashboard";

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-zinc-400 text-sm mt-0.5">Track your posting performance and insights</p>
      </div>

      <AnalyticsDashboard />
    </div>
  );
}
