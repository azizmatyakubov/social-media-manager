"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

interface AnalyticsSummary {
  totalPageViews: number;
  totalUniqueVisitors: number;
  avgBounceRate: number;
  avgSessionTime: number;
}

interface DailyData {
  date: string;
  pageViews: number;
  uniqueVisitors: number;
  bounceRate: number;
  avgSessionTime: number;
}

interface TrafficSource {
  name: string;
  count: number;
  percentage: number;
}

interface SocialPlatform {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

interface TopPage {
  path: string;
  views: number;
}

interface AnalyticsData {
  summary: AnalyticsSummary;
  dailyData: DailyData[];
  trafficSources: {
    direct: number;
    social: number;
    search: number;
    referral: number;
  };
  socialBreakdown: {
    twitter: number;
    linkedin: number;
    instagram: number;
  };
  topPages: TopPage[];
}

const DATE_RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

export default function WebsiteAnalyticsPage() {
  const { data: session, status } = useSession();
  const [domains, setDomains] = useState<string[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [newDomain, setNewDomain] = useState("");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [trafficSources, setTrafficSources] = useState<TrafficSource[]>([]);
  const [socialBreakdown, setSocialBreakdown] = useState<SocialPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");
  const [showTrackingCode, setShowTrackingCode] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      fetchDomains();
    }
  }, [status]);

  useEffect(() => {
    if (selectedDomain) {
      fetchAnalytics();
    }
  }, [selectedDomain, dateRange]);

  if (status === "loading") return <div className="p-8">Loading...</div>;
  if (status === "unauthenticated") redirect("/login");

  async function fetchDomains() {
    try {
      const res = await fetch("/api/website-analytics?action=domains");
      const data = await res.json();
      setDomains(data.domains || []);
      if (data.domains?.length > 0) {
        setSelectedDomain(data.domains[0]);
      }
    } catch (error) {
      console.error("Failed to fetch domains:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAnalytics() {
    if (!selectedDomain) return;

    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      const params = new URLSearchParams({
        domain: selectedDomain,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      // Fetch all data in parallel
      const [analyticsRes, sourcesRes, socialRes] = await Promise.all([
        fetch(`/api/website-analytics?${params}`),
        fetch(`/api/website-analytics?action=traffic-sources&${params}`),
        fetch(`/api/website-analytics?action=social-breakdown&${params}`),
      ]);

      const analyticsData = await analyticsRes.json();
      const sourcesData = await sourcesRes.json();
      const socialData = await socialRes.json();

      setAnalytics(analyticsData);
      setTrafficSources(sourcesData.sources || []);
      setSocialBreakdown(socialData.platforms || []);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  }

  async function getTrackingCode() {
    if (!selectedDomain) return;

    try {
      const res = await fetch(
        `/api/website-analytics?action=tracking-code&domain=${encodeURIComponent(selectedDomain)}`
      );
      const data = await res.json();
      setTrackingCode(data.code);
      setShowTrackingCode(true);
    } catch (error) {
      console.error("Failed to get tracking code:", error);
    }
  }

  function addDomain() {
    if (!newDomain) return;

    // Clean domain input
    let domain = newDomain.toLowerCase().trim();
    domain = domain.replace(/^https?:\/\//, "");
    domain = domain.replace(/\/.*$/, "");

    if (!domains.includes(domain)) {
      setDomains([...domains, domain]);
      setSelectedDomain(domain);
    }
    setNewDomain("");
  }

  function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    alert("Tracking code copied to clipboard!");
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Website Analytics</h1>
          <p className="text-[var(--x-text-secondary)]">
            Track traffic from social media to your website
          </p>
        </div>
      </div>

      {/* Domain Selector */}
      <div className="x-card p-6 mb-8">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-1">Domain</label>
            {domains.length > 0 ? (
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="x-input"
              >
                {domains.map((domain) => (
                  <option key={domain} value={domain}>
                    {domain}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-[var(--x-text-secondary)] text-sm">No domains tracked yet</p>
            )}
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-1">Add New Domain</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="example.com"
                className="x-input flex-1"
                onKeyDown={(e) => e.key === "Enter" && addDomain()}
              />
              <button onClick={addDomain} className="btn-primary">
                Add
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="x-input"
            >
              {DATE_RANGES.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>

          {selectedDomain && (
            <button onClick={getTrackingCode} className="btn-secondary">
              Get Tracking Code
            </button>
          )}
        </div>
      </div>

      {!selectedDomain ? (
        <div className="x-card p-12 text-center">
          <div className="text-4xl mb-4">📈</div>
          <h3 className="font-bold text-lg mb-2">No domain selected</h3>
          <p className="text-[var(--x-text-secondary)]">
            Add a domain to start tracking website analytics from your social media traffic.
          </p>
        </div>
      ) : loading ? (
        <div className="text-center py-12 text-[var(--x-text-secondary)]">Loading analytics...</div>
      ) : analytics ? (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="x-card p-6">
              <div className="text-3xl font-bold">
                {analytics.summary.totalPageViews.toLocaleString()}
              </div>
              <div className="text-sm text-[var(--x-text-secondary)]">Page Views</div>
            </div>
            <div className="x-card p-6">
              <div className="text-3xl font-bold">
                {analytics.summary.totalUniqueVisitors.toLocaleString()}
              </div>
              <div className="text-sm text-[var(--x-text-secondary)]">Unique Visitors</div>
            </div>
            <div className="x-card p-6">
              <div className="text-3xl font-bold">{analytics.summary.avgBounceRate}%</div>
              <div className="text-sm text-[var(--x-text-secondary)]">Bounce Rate</div>
            </div>
            <div className="x-card p-6">
              <div className="text-3xl font-bold">
                {formatDuration(analytics.summary.avgSessionTime)}
              </div>
              <div className="text-sm text-[var(--x-text-secondary)]">Avg. Session Time</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Traffic Sources */}
            <div className="x-card p-6">
              <h3 className="font-bold text-lg mb-4">Traffic Sources</h3>
              {trafficSources.length > 0 ? (
                <div className="space-y-4">
                  {trafficSources.map((source) => (
                    <div key={source.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{source.name}</span>
                        <span>
                          {source.count.toLocaleString()} ({source.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-[var(--x-bg-tertiary)] rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${source.percentage}%`,
                            backgroundColor:
                              source.name === "Social"
                                ? "#1DA1F2"
                                : source.name === "Search"
                                ? "#22c55e"
                                : source.name === "Direct"
                                ? "#8b5cf6"
                                : "#f59e0b",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[var(--x-text-secondary)]">No traffic data yet</p>
              )}
            </div>

            {/* Social Traffic Breakdown */}
            <div className="x-card p-6">
              <h3 className="font-bold text-lg mb-4">Social Traffic Breakdown</h3>
              {socialBreakdown.length > 0 ? (
                <div className="space-y-4">
                  {socialBreakdown.map((platform) => (
                    <div key={platform.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{platform.name}</span>
                        <span>
                          {platform.count.toLocaleString()} ({platform.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-[var(--x-bg-tertiary)] rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${platform.percentage}%`,
                            backgroundColor: platform.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[var(--x-text-secondary)]">No social traffic data yet</p>
              )}
            </div>
          </div>

          {/* Daily Chart */}
          <div className="x-card p-6 mb-8">
            <h3 className="font-bold text-lg mb-4">Daily Page Views</h3>
            {analytics.dailyData.length > 0 ? (
              <div className="h-64 flex items-end gap-1">
                {analytics.dailyData.map((day, i) => {
                  const maxViews = Math.max(...analytics.dailyData.map((d) => d.pageViews), 1);
                  const height = (day.pageViews / maxViews) * 100;

                  return (
                    <div
                      key={day.date}
                      className="flex-1 flex flex-col items-center group"
                    >
                      <div
                        className="w-full bg-[var(--x-blue)] rounded-t transition-all hover:bg-[var(--x-blue-hover)]"
                        style={{ height: `${Math.max(height, 2)}%` }}
                        title={`${day.date}: ${day.pageViews} views`}
                      />
                      {/* Show every 7th label or first/last */}
                      {(i % 7 === 0 || i === analytics.dailyData.length - 1) && (
                        <span className="text-xs text-[var(--x-text-secondary)] mt-2 transform -rotate-45 origin-left">
                          {new Date(day.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[var(--x-text-secondary)]">No daily data yet</p>
            )}
          </div>

          {/* Top Pages */}
          <div className="x-card p-6">
            <h3 className="font-bold text-lg mb-4">Top Pages</h3>
            {analytics.topPages.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-[var(--x-text-secondary)]">
                      <th className="pb-3 font-medium">Page Path</th>
                      <th className="pb-3 font-medium text-right">Views</th>
                      <th className="pb-3 font-medium text-right">% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topPages.map((page, i) => {
                      const percentage =
                        analytics.summary.totalPageViews > 0
                          ? ((page.views / analytics.summary.totalPageViews) * 100).toFixed(1)
                          : "0";
                      return (
                        <tr key={i} className="border-t border-[var(--x-border)]">
                          <td className="py-3 font-mono text-sm">{page.path}</td>
                          <td className="py-3 text-right">{page.views.toLocaleString()}</td>
                          <td className="py-3 text-right text-[var(--x-text-secondary)]">
                            {percentage}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[var(--x-text-secondary)]">No page data yet</p>
            )}
          </div>
        </>
      ) : (
        <div className="x-card p-12 text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="font-bold text-lg mb-2">No data yet</h3>
          <p className="text-[var(--x-text-secondary)] mb-4">
            Install the tracking code on your website to start collecting analytics.
          </p>
          <button onClick={getTrackingCode} className="btn-primary">
            Get Tracking Code
          </button>
        </div>
      )}

      {/* Tracking Code Modal */}
      {showTrackingCode && (
        <div className="fixed inset-0 x-modal-overlay flex items-center justify-center z-50">
          <div className="x-modal p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Tracking Code</h2>
              <button
                onClick={() => setShowTrackingCode(false)}
                className="text-[var(--x-text-secondary)] hover:text-[var(--x-text)]"
              >
                Close
              </button>
            </div>

            <p className="text-[var(--x-text-secondary)] mb-4">
              Add this code to your website's <code>&lt;head&gt;</code> tag to track visitors from
              your social media posts.
            </p>

            <div className="relative">
              <pre className="bg-[var(--x-bg-tertiary)] p-4 rounded-lg overflow-x-auto text-sm max-h-96">
                <code>{trackingCode}</code>
              </pre>
              <button
                onClick={() => copyToClipboard(trackingCode)}
                className="absolute top-2 right-2 btn-primary text-sm"
              >
                Copy Code
              </button>
            </div>

            <div className="mt-4 p-4 bg-[var(--x-bg-tertiary)] rounded-lg">
              <h4 className="font-medium mb-2">Installation Instructions</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-[var(--x-text-secondary)]">
                <li>Copy the tracking code above</li>
                <li>
                  Paste it into your website's <code>&lt;head&gt;</code> tag
                </li>
                <li>Deploy your changes</li>
                <li>Data will start appearing within minutes</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
