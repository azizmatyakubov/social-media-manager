import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 bg-grid opacity-40" />
      <div className="fixed inset-0">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-500/20 rounded-full blur-[120px]" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-sm">
              A
            </div>
            <span className="font-semibold text-lg tracking-tight">AutoPost</span>
          </Link>
          <div className="flex items-center gap-8">
            <Link href="#features" className="text-sm text-zinc-400 hover:text-white transition">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm text-zinc-400 hover:text-white transition">
              How it works
            </Link>
            <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition">
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium px-4 py-2 rounded-full bg-white text-black hover:bg-zinc-200 transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-40 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-strong mb-8">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-zinc-300">Powered by Claude AI</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            Grow your audience
            <br />
            <span className="gradient-text">while you sleep</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            AI-powered posts that sound like you. Automated daily publishing.
            <br className="hidden sm:block" />
            Built for creators who&apos;d rather ship than tweet.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/register"
              className="btn-premium px-8 py-4 rounded-full text-white font-medium text-sm relative z-10"
            >
              <span className="relative z-10">Start free trial</span>
            </Link>
            <Link
              href="#how-it-works"
              className="px-8 py-4 rounded-full text-sm font-medium text-zinc-300 hover:text-white glass shine"
            >
              See how it works
            </Link>
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-8 text-sm text-zinc-500">
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
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="relative px-6 pb-32">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden glass-strong p-1">
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
            <div className="rounded-xl bg-zinc-950 p-6">
              {/* Window controls */}
              <div className="flex items-center gap-2 mb-6">
                <div className="w-3 h-3 rounded-full bg-zinc-700" />
                <div className="w-3 h-3 rounded-full bg-zinc-700" />
                <div className="w-3 h-3 rounded-full bg-zinc-700" />
              </div>
              {/* Mock content */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-4">
                  <div className="h-32 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white/5 p-4">
                    <div className="text-sm text-zinc-400 mb-2">Next scheduled post</div>
                    <div className="text-white">Building in public is the best marketing strategy I&apos;ve ever tried. Here&apos;s what I learned after 100 days...</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-24 rounded-xl bg-zinc-900/50 border border-white/5 p-4">
                      <div className="text-xs text-zinc-500 mb-1">Posts this week</div>
                      <div className="text-2xl font-bold">28</div>
                      <div className="text-xs text-green-400">+40%</div>
                    </div>
                    <div className="h-24 rounded-xl bg-zinc-900/50 border border-white/5 p-4">
                      <div className="text-xs text-zinc-500 mb-1">Engagement</div>
                      <div className="text-2xl font-bold">4.8%</div>
                      <div className="text-xs text-green-400">+12%</div>
                    </div>
                    <div className="h-24 rounded-xl bg-zinc-900/50 border border-white/5 p-4">
                      <div className="text-xs text-zinc-500 mb-1">New followers</div>
                      <div className="text-2xl font-bold">+847</div>
                      <div className="text-xs text-green-400">+28%</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-full rounded-xl bg-zinc-900/50 border border-white/5 p-4">
                    <div className="text-xs text-zinc-500 mb-3">Recent activity</div>
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-green-400" />
                          <div className="flex-1 h-2 bg-zinc-800 rounded" />
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
      <section id="features" className="relative py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Everything you need to grow
            </h2>
            <p className="text-zinc-400 text-lg max-w-xl mx-auto">
              Stop spending hours crafting posts. Let AI do the heavy lifting while you focus on building.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
                title: "AI-Powered Content",
                description: "Claude AI generates posts that match your voice, style, and topics perfectly.",
                gradient: "from-amber-500/20 to-orange-500/20",
                iconBg: "bg-amber-500/10",
                iconColor: "text-amber-400"
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: "Auto-Scheduling",
                description: "Set your preferred time and let posts go out automatically every day.",
                gradient: "from-blue-500/20 to-cyan-500/20",
                iconBg: "bg-blue-500/10",
                iconColor: "text-blue-400"
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
                title: "Growth Analytics",
                description: "Track performance, engagement, and find your optimal posting times.",
                gradient: "from-emerald-500/20 to-green-500/20",
                iconBg: "bg-emerald-500/10",
                iconColor: "text-emerald-400"
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                ),
                title: "Your Voice",
                description: "Customize tone, topics, and style. Every post sounds authentically you.",
                gradient: "from-violet-500/20 to-purple-500/20",
                iconBg: "bg-violet-500/10",
                iconColor: "text-violet-400"
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ),
                title: "Preview First",
                description: "Review and edit AI-generated content before it goes live.",
                gradient: "from-pink-500/20 to-rose-500/20",
                iconBg: "bg-pink-500/10",
                iconColor: "text-pink-400"
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                ),
                title: "Secure OAuth",
                description: "Connect via X&apos;s official OAuth. We never see your password.",
                gradient: "from-indigo-500/20 to-blue-500/20",
                iconBg: "bg-indigo-500/10",
                iconColor: "text-indigo-400"
              }
            ].map((feature, i) => (
              <div
                key={i}
                className={`group relative rounded-2xl bg-gradient-to-br ${feature.gradient} p-px card-hover`}
              >
                <div className="rounded-2xl bg-zinc-950 p-6 h-full">
                  <div className={`w-12 h-12 rounded-xl ${feature.iconBg} ${feature.iconColor} flex items-center justify-center mb-4`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              How it works
            </h2>
            <p className="text-zinc-400 text-lg">
              Get started in under 2 minutes
            </p>
          </div>

          <div className="space-y-8">
            {[
              { step: "01", title: "Connect your X account", desc: "Securely link your X account with OAuth 2.0. Takes 30 seconds." },
              { step: "02", title: "Configure your preferences", desc: "Tell us your niche, tone, and topics. The AI learns your style." },
              { step: "03", title: "Enable auto-posting", desc: "Turn it on and watch your audience grow while you focus on building." }
            ].map((item, i) => (
              <div key={i} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/5 flex items-center justify-center">
                  <span className="text-xl font-bold gradient-text">{item.step}</span>
                </div>
                <div className="pt-3">
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-zinc-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 via-purple-600/30 to-pink-600/30" />
            <div className="absolute inset-0 bg-zinc-950/80" />

            <div className="relative px-8 py-16 sm:px-16 sm:py-24 text-center">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                Ready to grow on autopilot?
              </h2>
              <p className="text-zinc-400 text-lg mb-8 max-w-xl mx-auto">
                Join thousands of creators who are building in public without the posting burnout.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black font-medium hover:bg-zinc-200 transition"
              >
                Get started for free
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs">
              A
            </div>
            <span className="font-medium text-sm">AutoPost</span>
          </div>
          <p className="text-zinc-500 text-sm">
            Built for creators, by creators.
          </p>
        </div>
      </footer>
    </div>
  );
}
