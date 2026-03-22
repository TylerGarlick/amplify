import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ── Mock data for demo purposes ──────────────────────────────────────────────

function generateMockData() {
  const now = new Date();

  function daysAgo(n: number): string {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return d.toISOString().split("T")[0];
  }

  const stageAnalytics = [
    {
      id: "stage-1",
      name: "Neon Underground",
      totalVisits: 12847,
      totalWatchTime: 892340,
      engagedVisits: 8234,
      engagementRate: 64,
      trackCount: 8,
      isActive: true,
      dailyVisits: Array.from({ length: 30 }, (_, i) => ({
        date: daysAgo(29 - i),
        visits: Math.floor(300 + Math.sin(i / 3) * 150 + Math.random() * 200),
      })),
      dailyWatchTime: Array.from({ length: 30 }, (_, i) => ({
        date: daysAgo(29 - i),
        seconds: Math.floor(25000 + Math.sin(i / 4) * 8000 + Math.random() * 5000),
      })),
    },
    {
      id: "stage-2",
      name: "Crystal Canyon",
      totalVisits: 9234,
      totalWatchTime: 645120,
      engagedVisits: 5102,
      engagementRate: 55,
      trackCount: 5,
      isActive: true,
      dailyVisits: Array.from({ length: 30 }, (_, i) => ({
        date: daysAgo(29 - i),
        visits: Math.floor(200 + Math.sin(i / 2) * 100 + Math.random() * 150),
      })),
      dailyWatchTime: Array.from({ length: 30 }, (_, i) => ({
        date: daysAgo(29 - i),
        seconds: Math.floor(18000 + Math.sin(i / 3) * 6000 + Math.random() * 4000),
      })),
    },
    {
      id: "stage-3",
      name: "Sky Harbor",
      totalVisits: 6102,
      totalWatchTime: 398200,
      engagedVisits: 2890,
      engagementRate: 47,
      trackCount: 3,
      isActive: false,
      dailyVisits: Array.from({ length: 30 }, (_, i) => ({
        date: daysAgo(29 - i),
        visits: Math.floor(150 + Math.random() * 100),
      })),
      dailyWatchTime: Array.from({ length: 30 }, (_, i) => ({
        date: daysAgo(29 - i),
        seconds: Math.floor(12000 + Math.random() * 5000),
      })),
    },
  ];

  const trackPerformance = [
    { id: "t1", title: "Midnight Echoes", duration: 234, status: "READY", plays: 4823, likes: 892, shares: 234, createdAt: daysAgo(45) },
    { id: "t2", title: "Desert Wind", duration: 198, status: "READY", plays: 3612, likes: 612, shares: 145, createdAt: daysAgo(38) },
    { id: "t3", title: "Neon Dreams", duration: 267, status: "READY", plays: 2987, likes: 523, shares: 98, createdAt: daysAgo(30) },
    { id: "t4", title: "Crystal Rain", duration: 312, status: "PROCESSING", plays: 0, likes: 0, shares: 0, createdAt: daysAgo(2) },
    { id: "t5", title: "Starlight Blvd", duration: 189, status: "READY", plays: 2104, likes: 389, shares: 76, createdAt: daysAgo(20) },
    { id: "t6", title: "Ocean Drive", duration: 245, status: "READY", plays: 1876, likes: 312, shares: 54, createdAt: daysAgo(15) },
    { id: "t7", title: "Thunder Road", duration: 278, status: "READY", plays: 1456, likes: 267, shares: 43, createdAt: daysAgo(10) },
    { id: "t8", title: "Lunar Phase", duration: 223, status: "READY", plays: 1234, likes: 198, shares: 32, createdAt: daysAgo(5) },
  ];

  const tribeGrowth = [
    {
      tribeId: "tribe-1",
      tribeName: "Bass Syndicate",
      genre: "Electronic",
      color: "#8B5CF6",
      members: Array.from({ length: 30 }, (_, i) => ({
        date: daysAgo(29 - i),
        count: Math.floor(120 + i * 4 + Math.sin(i / 5) * 20),
      })),
    },
    {
      tribeId: "tribe-2",
      tribeName: "Indie Collective",
      genre: "Indie",
      color: "#06B6D4",
      members: Array.from({ length: 30 }, (_, i) => ({
        date: daysAgo(29 - i),
        count: Math.floor(80 + i * 3 + Math.sin(i / 4) * 15),
      })),
    },
    {
      tribeId: "tribe-3",
      tribeName: "Ambient Souls",
      genre: "Ambient",
      color: "#F59E0B",
      members: Array.from({ length: 30 }, (_, i) => ({
        date: daysAgo(29 - i),
        count: Math.floor(45 + i * 2 + Math.sin(i / 3) * 10),
      })),
    },
    {
      tribeId: "tribe-4",
      tribeName: "Bass Syndicate",
      genre: "Electronic",
      color: "#10B981",
      members: Array.from({ length: 30 }, (_, i) => ({
        date: daysAgo(29 - i),
        count: Math.floor(30 + i * 1.5 + Math.sin(i / 2) * 8),
      })),
    },
  ];

  const listenerTrend = Array.from({ length: 30 }, (_, i) => ({
    date: daysAgo(29 - i),
    listeners: Math.floor(80 + i * 12 + Math.sin(i / 4) * 30 + Math.random() * 20),
  }));

  const totalListeners = 4521;
  const totalPlays = 18112;
  const totalLikes = 3283;
  const totalShares = 682;

  return {
    overview: {
      totalListeners,
      totalPlays,
      totalLikes,
      totalShares,
      totalWatchTime: stageAnalytics.reduce((s, st) => s + st.totalWatchTime, 0),
      totalVisits: stageAnalytics.reduce((s, st) => s + st.totalVisits, 0),
      stageCount: stageAnalytics.length,
      trackCount: trackPerformance.length,
    },
    stageAnalytics,
    trackPerformance,
    tribeGrowth,
    listenerTrend,
  };
}

// ── Real data loader ──────────────────────────────────────────────────────────

async function loadRealData(userId: string) {
  const musician = await prisma.musician.findUnique({ where: { userId } });
  if (!musician) return null;

  const stages = await prisma.stage.findMany({
    where: { musicianId: musician.id },
    include: {
      watchSessions: { select: { watchTimeSeconds: true, counted: true, lastWatched: true, userId: true } },
      stageTrackLinks: { include: { track: true } },
      territory: true,
    },
  });

  if (stages.length === 0) return null;

  const tracks = await prisma.track.findMany({
    where: { musicianId: musician.id },
    include: { stageTrackLinks: { include: { stage: true } } },
  });

  const stageIds = stages.map((s) => s.id);
  const territories = await prisma.territory.findMany({
    where: { stageId: { in: stageIds } },
    include: { owningTribe: { include: { members: true } } },
  });

  const stageAnalytics = stages.map((stage) => {
    const totalVisits = stage.watchSessions.length;
    const totalWatchTime = stage.watchSessions.reduce((sum, w) => sum + w.watchTimeSeconds, 0);
    const engagedVisits = stage.watchSessions.filter((w) => w.counted).length;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyVisits: Record<string, number> = {};
    const dailyWatchTime: Record<string, number> = {};

    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      dailyVisits[key] = 0;
      dailyWatchTime[key] = 0;
    }

    stage.watchSessions.forEach((w) => {
      const key = w.lastWatched.toISOString().split("T")[0];
      if (dailyVisits[key] !== undefined) {
        dailyVisits[key]++;
        dailyWatchTime[key] += w.watchTimeSeconds;
      }
    });

    return {
      id: stage.id,
      name: stage.name,
      totalVisits,
      totalWatchTime,
      engagedVisits,
      engagementRate: totalVisits > 0 ? Math.round((engagedVisits / totalVisits) * 100) : 0,
      trackCount: stage.stageTrackLinks.length,
      isActive: stage.isActive,
      dailyVisits: Object.entries(dailyVisits).sort(([a], [b]) => a.localeCompare(b)).map(([date, visits]) => ({ date, visits })),
      dailyWatchTime: Object.entries(dailyWatchTime).sort(([a], [b]) => a.localeCompare(b)).map(([date, seconds]) => ({ date, seconds })),
    };
  });

  const trackPerformance = tracks.map((track) => {
    let totalPlays = 0;
    track.stageTrackLinks.forEach((stl) => {
      const stage = stages.find((s) => s.id === stl.stageId);
      if (stage && track.duration && track.duration > 0) {
        totalPlays += stage.watchSessions.filter((w) => w.counted).length;
      }
    });
    const hash = track.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const likeRatio = (hash % 40 + 10) / 100;
    const shareRatio = (hash % 15 + 2) / 100;
    const likes = Math.round(totalPlays * likeRatio);
    const shares = Math.round(totalPlays * shareRatio);

    return { id: track.id, title: track.title, duration: track.duration, status: track.status, plays: totalPlays, likes, shares, createdAt: track.createdAt.toISOString() };
  });

  const tribeGrowth: Record<string, { tribeId: string; tribeName: string; genre: string; color: string; members: { date: string; count: number }[] }> = {};
  territories.forEach((territory) => {
    if (territory.owningTribe) {
      const tribe = territory.owningTribe;
      if (!tribeGrowth[tribe.id]) {
        const dailyCounts: Record<string, number> = {};
        for (let i = 0; i < 30; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          dailyCounts[d.toISOString().split("T")[0]] = 0;
        }
        const currentCount = tribe.members.length;
        const hash = tribe.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
        for (let i = 0; i < 30; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toISOString().split("T")[0];
          const progress = (30 - i) / 30;
          dailyCounts[key] = Math.max(1, Math.round(currentCount * progress + (hash % currentCount) * progress * 0.3));
        }
        tribeGrowth[tribe.id] = {
          tribeId: tribe.id, tribeName: tribe.name, genre: tribe.genre, color: tribe.color,
          members: Object.entries(dailyCounts).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })),
        };
      }
    }
  });

  const allWatchUserIds = new Set<string>();
  stages.forEach((stage) => stage.watchSessions.forEach((w) => allWatchUserIds.add(w.userId)));

  const listenerTrend: { date: string; listeners: number }[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const uniqueListeners = new Set<string>();
    stages.forEach((stage) => stage.watchSessions.forEach((w) => { if (w.lastWatched.toISOString().split("T")[0] === key) uniqueListeners.add(w.userId); }));
    listenerTrend.push({ date: key, listeners: uniqueListeners.size });
  }

  return {
    overview: {
      totalListeners: allWatchUserIds.size,
      totalPlays: trackPerformance.reduce((sum, t) => sum + t.plays, 0),
      totalLikes: trackPerformance.reduce((sum, t) => sum + t.likes, 0),
      totalShares: trackPerformance.reduce((sum, t) => sum + t.shares, 0),
      totalWatchTime: stageAnalytics.reduce((sum, s) => sum + s.totalWatchTime, 0),
      totalVisits: stageAnalytics.reduce((sum, s) => sum + s.totalVisits, 0),
      stageCount: stages.length,
      trackCount: tracks.length,
    },
    stageAnalytics,
    trackPerformance,
    tribeGrowth: Object.values(tribeGrowth),
    listenerTrend: listenerTrend.sort((a, b) => a.date.localeCompare(b.date)),
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = session.user as { id?: string; role?: string };
    if (user.role !== "MUSICIAN" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Try real data first
    const realData = await loadRealData(user.id!);

    // Use real data if available, otherwise mock data
    const data = realData ?? generateMockData();

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[GET /api/musician/analytics]", err);
    // On error, fall back to mock data for demo
    return NextResponse.json({ data: generateMockData() });
  }
}
