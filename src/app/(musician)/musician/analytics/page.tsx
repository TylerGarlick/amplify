"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Users,
  Play,
  Heart,
  Share2,
  Eye,
  Clock,
  TrendingUp,
  Music,
  Radio,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────

interface StageAnalytics {
  id: string;
  name: string;
  totalVisits: number;
  totalWatchTime: number;
  engagedVisits: number;
  engagementRate: number;
  trackCount: number;
  isActive: boolean;
  dailyVisits: { date: string; visits: number }[];
  dailyWatchTime: { date: string; seconds: number }[];
}

interface TrackPerformance {
  id: string;
  title: string;
  duration: number | null;
  status: string;
  plays: number;
  likes: number;
  shares: number;
  createdAt: string;
}

interface TribeGrowth {
  tribeId: string;
  tribeName: string;
  genre: string;
  color: string;
  members: { date: string; count: number }[];
}

interface ListenerTrend {
  date: string;
  listeners: number;
}

interface Overview {
  totalListeners: number;
  totalPlays: number;
  totalLikes: number;
  totalShares: number;
  totalWatchTime: number;
  totalVisits: number;
  stageCount: number;
  trackCount: number;
}

interface AnalyticsData {
  overview: Overview;
  stageAnalytics: StageAnalytics[];
  trackPerformance: TrackPerformance[];
  tribeGrowth: TribeGrowth[];
  listenerTrend: ListenerTrend[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function cn(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-5">
              <Skeleton className="h-4 w-24 bg-zinc-800 rounded mb-2" />
              <Skeleton className="h-8 w-16 bg-zinc-800 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-80 bg-zinc-900 border-zinc-800 rounded-xl w-full" />
      <div className="grid grid-cols-2 gap-6">
        <Skeleton className="h-72 bg-zinc-900 border-zinc-800 rounded-xl" />
        <Skeleton className="h-72 bg-zinc-900 border-zinc-800 rounded-xl" />
      </div>
    </div>
  );
}

// ── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  color = "text-violet-400",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtext?: string;
  color?: string;
}) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <div className={cn("p-1.5 rounded-md bg-zinc-800", color)}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
            {label}
          </span>
        </div>
        <p className="text-3xl font-bold text-white">{value}</p>
        {subtext && (
          <p className="text-xs text-zinc-500 mt-1">{subtext}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-zinc-400 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-medium" style={{ color: entry.color }}>
          {entry.name}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function MusicianDashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetch("/api/musician/analytics")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((res) => setData(res.data))
      .catch((err) => {
        console.error("Failed to load analytics:", err);
        setError("Failed to load analytics data. Make sure you have stages and tracks set up.");
      });
  }, []);

  if (error) {
    return (
      <div className="p-6 max-w-3xl">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-8 text-center">
            <Radio className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-zinc-300 mb-2">No Analytics Yet</h2>
            <p className="text-sm text-zinc-500 max-w-sm mx-auto">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return <DashboardSkeleton />;

  const { overview, stageAnalytics, trackPerformance, tribeGrowth, listenerTrend } = data;

  // Tribe colors for pie chart
  const TRIBE_COLORS = ["#8B5CF6", "#06B6D4", "#F59E0B", "#10B981", "#EC4899", "#EF4444"];

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Analytics Dashboard</h1>
        <p className="text-sm text-zinc-500">Track your stage performance, listener growth, and track metrics</p>
      </div>

      {/* Top-level stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Listeners"
          value={formatNumber(overview.totalListeners)}
          color="text-violet-400"
        />
        <StatCard
          icon={Play}
          label="Total Plays"
          value={formatNumber(overview.totalPlays)}
          color="text-cyan-400"
        />
        <StatCard
          icon={Heart}
          label="Total Likes"
          value={formatNumber(overview.totalLikes)}
          color="text-pink-400"
        />
        <StatCard
          icon={Share2}
          label="Total Shares"
          value={formatNumber(overview.totalShares)}
          color="text-amber-400"
        />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={Eye}
          label="Total Visits"
          value={formatNumber(overview.totalVisits)}
          subtext={`across ${overview.stageCount} stage${overview.stageCount !== 1 ? "s" : ""}`}
          color="text-green-400"
        />
        <StatCard
          icon={Clock}
          label="Watch Time"
          value={formatDuration(overview.totalWatchTime)}
          color="text-blue-400"
        />
        <StatCard
          icon={Radio}
          label="Stages"
          value={overview.stageCount.toString()}
          color="text-cyan-400"
        />
        <StatCard
          icon={Music}
          label="Tracks"
          value={overview.trackCount.toString()}
          color="text-violet-400"
        />
      </div>

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="overview" className="data-[state=active]:bg-zinc-800">Overview</TabsTrigger>
          <TabsTrigger value="stages" className="data-[state=active]:bg-zinc-800">Stage Analytics</TabsTrigger>
          <TabsTrigger value="tracks" className="data-[state=active]:bg-zinc-800">Track Performance</TabsTrigger>
          <TabsTrigger value="tribes" className="data-[state=active]:bg-zinc-800">Tribe Growth</TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ── */}
        <TabsContent value="overview" className="mt-4 space-y-6">
          {/* Listener trend */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-violet-400" />
                Listener Trend (30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {listenerTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={listenerTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      stroke="#71717a"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#71717a"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => formatNumber(v)}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="listeners"
                      name="Listeners"
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: "#8B5CF6" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-zinc-600">
                  <p className="text-sm">No listener data yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stage visits + tribe share pie */}
          <div className="grid grid-cols-2 gap-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  Stage Visits (30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stageAnalytics.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={stageAnalytics.map((s) => ({
                        name: s.name.length > 12 ? s.name.slice(0, 12) + "…" : s.name,
                        visits: s.totalVisits,
                        engaged: s.engagedVisits,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis
                        stroke="#71717a"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => formatNumber(v)}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11, color: "#71717a" }} />
                      <Bar dataKey="visits" name="Total Visits" fill="#0891B2" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="engaged" name="Engaged" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-60 flex items-center justify-center text-zinc-600">
                    <p className="text-sm">No stage data yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tribe member distribution */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  Tribe Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tribeGrowth.length > 0 ? (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width="50%" height={200}>
                      <PieChart>
                        <Pie
                          data={tribeGrowth.map((t) => ({
                            name: t.tribeName,
                            value: t.members[t.members.length - 1]?.count ?? 0,
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          dataKey="value"
                          stroke="#18181b"
                          strokeWidth={2}
                        >
                          {tribeGrowth.map((_, i) => (
                            <Cell key={i} fill={TRIBE_COLORS[i % TRIBE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            return (
                              <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl">
                                <p className="text-sm font-medium text-white">{payload[0].name}</p>
                                <p className="text-xs text-zinc-400">{payload[0].value} members</p>
                              </div>
                            );
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {tribeGrowth.map((tribe, i) => (
                        <div key={tribe.tribeId} className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: TRIBE_COLORS[i % TRIBE_COLORS.length] }}
                          />
                          <span className="text-xs text-zinc-300 truncate">{tribe.tribeName}</span>
                          <span className="text-xs text-zinc-600 ml-auto">
                            {tribe.members[tribe.members.length - 1]?.count ?? 0}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-60 flex items-center justify-center text-zinc-600">
                    <p className="text-sm">No tribe data yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Stage Analytics Tab ── */}
        <TabsContent value="stages" className="mt-4 space-y-4">
          {stageAnalytics.length > 0 ? (
            stageAnalytics.map((stage) => (
              <Card key={stage.id} className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-base">{stage.name}</CardTitle>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-zinc-500">
                        {stage.totalVisits} visits · {stage.engagedVisits} engaged ·{" "}
                        {stage.engagementRate}% rate
                      </span>
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          stage.isActive ? "bg-green-500" : "bg-zinc-600"
                        )}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={stage.dailyVisits}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDate}
                        stroke="#71717a"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#71717a"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => formatNumber(v)}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="visits"
                        name="Visits"
                        stroke="#0891B2"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: "#0891B2" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-12 text-center">
                <Radio className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500">Create a stage to start seeing analytics</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Track Performance Tab ── */}
        <TabsContent value="tracks" className="mt-4 space-y-4">
          {trackPerformance.length > 0 ? (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left text-xs text-zinc-500 uppercase tracking-wider font-medium px-6 py-3">
                          Track
                        </th>
                        <th className="text-right text-xs text-zinc-500 uppercase tracking-wider font-medium px-4 py-3">
                          Plays
                        </th>
                        <th className="text-right text-xs text-zinc-500 uppercase tracking-wider font-medium px-4 py-3">
                          Likes
                        </th>
                        <th className="text-right text-xs text-zinc-500 uppercase tracking-wider font-medium px-4 py-3">
                          Shares
                        </th>
                        <th className="text-right text-xs text-zinc-500 uppercase tracking-wider font-medium px-4 py-3">
                          Like Rate
                        </th>
                        <th className="text-left text-xs text-zinc-500 uppercase tracking-wider font-medium px-4 py-3">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {trackPerformance.map((track) => {
                        const likeRate =
                          track.plays > 0
                            ? Math.round((track.likes / track.plays) * 100)
                            : 0;
                        return (
                          <tr
                            key={track.id}
                            className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center flex-shrink-0">
                                  <Music className="w-4 h-4 text-violet-400" />
                                </div>
                                <div>
                                  <p className="text-white font-medium">{track.title}</p>
                                  {track.duration && (
                                    <p className="text-xs text-zinc-500">
                                      {formatDuration(track.duration)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-right text-zinc-300 tabular-nums">
                              {formatNumber(track.plays)}
                            </td>
                            <td className="px-4 py-4 text-right text-pink-400 tabular-nums">
                              {formatNumber(track.likes)}
                            </td>
                            <td className="px-4 py-4 text-right text-amber-400 tabular-nums">
                              {formatNumber(track.shares)}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-pink-500 rounded-full"
                                    style={{ width: `${likeRate}%` }}
                                  />
                                </div>
                                <span className="text-xs text-zinc-500 tabular-nums w-8 text-right">
                                  {likeRate}%
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={cn(
                                  "text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-medium",
                                  track.status === "READY"
                                    ? "bg-green-950 text-green-400 border border-green-800/50"
                                    : track.status === "PROCESSING"
                                    ? "bg-yellow-950 text-yellow-400 border border-yellow-800/50"
                                    : "bg-red-950 text-red-400 border border-red-800/50"
                                )}
                              >
                                {track.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-12 text-center">
                <Music className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500">Upload tracks to see performance metrics</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Tribe Growth Tab ── */}
        <TabsContent value="tribes" className="mt-4 space-y-6">
          {tribeGrowth.length > 0 ? (
            tribeGrowth.map((tribe) => {
              const color = tribe.color || "#8B5CF6";
              const latest = tribe.members[tribe.members.length - 1]?.count ?? 0;
              const first = tribe.members[0]?.count ?? 0;
              const growth = latest - first;
              const growthPct = first > 0 ? Math.round((growth / first) * 100) : 0;

              return (
                <Card key={tribe.tribeId} className="bg-zinc-900 border-zinc-800">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <CardTitle className="text-white text-base">{tribe.tribeName}</CardTitle>
                        <span className="text-xs text-zinc-500 uppercase tracking-wider">
                          {tribe.genre}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-white">{latest} members</p>
                          <p
                            className={cn(
                              "text-xs",
                              growth >= 0 ? "text-green-400" : "text-red-400"
                            )}
                          >
                            {growth >= 0 ? "+" : ""}
                            {growth} ({growthPct}%) this month
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={tribe.members}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={formatDate}
                          stroke="#71717a"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#71717a"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => formatNumber(v)}
                        />
                        <Tooltip
                          content={({ active, payload, label: lbl }) => {
                            if (!active || !payload?.length) return null;
                            return (
                              <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl">
                                <p className="text-xs text-zinc-400 mb-1">{lbl}</p>
                                <p className="text-sm font-semibold" style={{ color }}>
                                  {payload[0].value} members
                                </p>
                              </div>
                            );
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="count"
                          name="Members"
                          stroke={color}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, fill: color }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-12 text-center">
                <Users className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500">
                  Tribe data will appear when stages have territory claims
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
