import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "@/components/dashboard/SettingsForm";
import { XConnectionCard } from "@/components/dashboard/XConnectionCard";
import { SubscriptionCard } from "@/components/dashboard/SubscriptionCard";
import { TwoFactorCard } from "@/components/dashboard/TwoFactorCard";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SettingsPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const params = await searchParams;

  const [xAccounts, postingConfig] = await Promise.all([
    prisma.xAccount.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    }),
    prisma.postingConfig.findUnique({
      where: { userId: session.user.id },
    }),
  ]);

  const xAccount = xAccounts.find(a => a.isDefault) || xAccounts[0] || null;

  // Check if X credentials are configured
  const xCredentialsConfigured = !!(process.env.X_CLIENT_ID && process.env.X_CLIENT_SECRET);

  // Get error/success from URL params
  const error = params.error as string | undefined;
  const success = params.success as string | undefined;
  const message = params.message as string | undefined;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-zinc-400 mt-1">Configure your auto-posting preferences</p>
      </div>

      {/* Success Message */}
      {success === "x_connected" && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-green-400">X account connected successfully!</p>
            <p className="text-sm text-zinc-400">You can now publish posts to X.</p>
          </div>
        </div>
      )}

      {/* Error Messages */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-red-400">
              {error === "x_not_configured" && "X API credentials not configured"}
              {error === "x_auth_denied" && "X authorization was denied"}
              {error === "x_auth_failed" && "X authentication failed"}
              {error === "invalid_state" && "Invalid OAuth state - please try again"}
              {error === "no_code" && "No authorization code received"}
              {error === "no_verifier" && "Session expired - please try again"}
              {error === "x_connect_failed" && "Failed to connect to X"}
            </p>
            {message && <p className="text-sm text-zinc-400 mt-1">{decodeURIComponent(message)}</p>}
            {error === "x_not_configured" && (
              <p className="text-sm text-zinc-400 mt-1">
                See the setup guide below to configure your X API credentials.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Subscription & Billing */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Subscription & Billing</h2>
        <SubscriptionCard />
      </section>

      {/* Security */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Security</h2>
        <TwoFactorCard />
      </section>

      {/* X Account Connection */}
      <section>
        <h2 className="text-xl font-semibold mb-4">X Account</h2>
        <XConnectionCard
          xAccount={xAccount}
          xCredentialsConfigured={xCredentialsConfigured}
        />
      </section>

      {/* Posting Configuration */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Posting Configuration</h2>
        {!xAccount ? (
          <div className="relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-orange-500/10" />
          <div className="relative p-6 border border-amber-500/20 rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-amber-400 mb-1">Connect X Account Required</p>
                <p className="text-sm text-zinc-400">
                  Connect your X account above to configure auto-posting settings and start growing your audience.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <SettingsForm
          initialConfig={
            postingConfig
              ? {
                  instructions: postingConfig.instructions,
                  tone: postingConfig.tone,
                  topics: postingConfig.topics,
                  postingTime: postingConfig.postingTime,
                  timezone: postingConfig.timezone,
                  isActive: postingConfig.isActive,
                }
              : undefined
          }
        />
      )}
      </section>
    </div>
  );
}
