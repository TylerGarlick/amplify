"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Music, Clock, MapPin, Users, Loader2, Play, Radio, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Tribe {
  id: string;
  name: string;
  genre: string;
  color: string;
  logo: string | null;
  description: string | null;
  isOfficial: boolean;
}

interface TribeMembership {
  id: string;
  role: string;
  joinedAt: string;
  tribe: Tribe;
}

interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number | null;
  fileUrl: string;
}

interface Stage {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  musician: {
    displayName: string;
  };
  track: Track | null;
  owningTribe: Tribe | null;
  lastVisited: string | null;
}

interface HistoryItem {
  id: string;
  watchTimeSeconds: number;
  lastWatched: string;
  stage: Stage;
  tribe: Tribe | null;
}

interface ProfileData {
  playlistsCount: number;
  listeningHours: number;
  stagesVisited: number;
  tribeMemberships: TribeMembership[];
  recentHistory: HistoryItem[];
  visitedStages: Stage[];
  musicianData: {
    tracks: Track[];
    stages: Stage[];
  } | null;
}

export function UserProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      setLoading(true);
      const res = await fetch("/api/profile");
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch profile");
      }
      const data = await res.json();
      setProfileData(data.data);
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      setError("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          <p className="text-sm text-zinc-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">{error || "Failed to load profile"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Stats Cards */}
      <div className="px-4 pt-6 pb-4">
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<Music className="w-4 h-4" />}
            label="Playlists"
            value={profileData.playlistsCount.toString()}
            color="violet"
          />
          <StatCard
            icon={<Clock className="w-4 h-4" />}
            label="Listening Hours"
            value={profileData.listeningHours.toString()}
            color="pink"
          />
          <StatCard
            icon={<MapPin className="w-4 h-4" />}
            label="Stages Visited"
            value={profileData.stagesVisited.toString()}
            color="green"
          />
          <StatCard
            icon={<Users className="w-4 h-4" />}
            label="Tribes"
            value={profileData.tribeMemberships.length.toString()}
            color="blue"
          />
        </div>
      </div>

      {/* Tabs Section */}
      <div className="px-4">
        <Tabs defaultValue="history" className="w-full">
          <TabsList className="w-full bg-zinc-900/50 p-1">
            <TabsTrigger value="history" className="flex-1 data-[state=active]:bg-violet-600">
              History
            </TabsTrigger>
            <TabsTrigger value="stages" className="flex-1 data-[state=active]:bg-violet-600">
              Stages
            </TabsTrigger>
            <TabsTrigger value="tribes" className="flex-1 data-[state=active]:bg-violet-600">
              Tribes
            </TabsTrigger>
          </TabsList>

          {/* Listening History */}
          <TabsContent value="history" className="mt-4 space-y-3">
            {profileData.recentHistory.length === 0 ? (
              <EmptyState
                icon={<Music className="w-8 h-8" />}
                title="No listening history yet"
                description="Start exploring stages to build your history"
              />
            ) : (
              profileData.recentHistory.map((item) => (
                <HistoryCard key={item.id} item={item} />
              ))
            )}
          </TabsContent>

          {/* Visited Stages */}
          <TabsContent value="stages" className="mt-4 space-y-3">
            {profileData.visitedStages.length === 0 ? (
              <EmptyState
                icon={<Radio className="w-8 h-8" />}
                title="No stages visited yet"
                description="Discover and visit stages to see them here"
                action={{ label: "Explore Stages", href: "/explore" }}
              />
            ) : (
              profileData.visitedStages.map((stage) => (
                <VisitedStageCard key={stage.id} stage={stage} />
              ))
            )}
          </TabsContent>

          {/* Tribe Memberships */}
          <TabsContent value="tribes" className="mt-4 space-y-3">
            {profileData.tribeMemberships.length === 0 ? (
              <EmptyState
                icon={<Users className="w-8 h-8" />}
                title="No tribe memberships"
                description="Join tribes to connect with music communities"
                action={{ label: "Browse Tribes", href: "/tribes" }}
              />
            ) : (
              profileData.tribeMemberships.map((membership) => (
                <TribeCard key={membership.id} membership={membership} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "violet" | "pink" | "green" | "blue";
}) {
  const colorClasses = {
    violet: "bg-violet-600/20 text-violet-400 border-violet-800/50",
    pink: "bg-pink-600/20 text-pink-400 border-pink-800/50",
    green: "bg-green-600/20 text-green-400 border-green-800/50",
    blue: "bg-blue-600/20 text-blue-400 border-blue-800/50",
  };

  return (
    <div
      className={`rounded-xl border p-4 ${colorClasses[color]}`}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs opacity-70">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function HistoryCard({ item }: { item: HistoryItem }) {
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m`;
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  };

  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 hover:border-violet-800/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
          {item.stage.track ? (
            <Music className="w-5 h-5 text-violet-400" />
          ) : (
            <Radio className="w-5 h-5 text-zinc-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-white truncate">{item.stage.name}</h3>
            {item.tribe && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0"
                style={{
                  borderColor: item.tribe.color,
                  color: item.tribe.color,
                }}
              >
                {item.tribe.name}
              </Badge>
            )}
          </div>
          <p className="text-xs text-zinc-500 truncate">
            {item.stage.track?.title ?? item.stage.musician.displayName}
          </p>
          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-600">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(item.watchTimeSeconds)}
            </span>
            <span>{formatTimeAgo(item.lastWatched)}</span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-zinc-600 flex-shrink-0" />
      </div>
    </div>
  );
}

function VisitedStageCard({ stage }: { stage: Stage }) {
  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 hover:border-violet-800/50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-white truncate">{stage.name}</h3>
            {stage.owningTribe && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0"
                style={{
                  borderColor: stage.owningTribe.color,
                  color: stage.owningTribe.color,
                }}
              >
                {stage.owningTribe.name}
              </Badge>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">{stage.musician.displayName}</p>
          {stage.track && (
            <div className="flex items-center gap-1.5 mt-2">
              <Music className="w-3 h-3 text-violet-400 flex-shrink-0" />
              <span className="text-xs text-zinc-400 truncate">{stage.track.title}</span>
            </div>
          )}
          <div className="flex items-center gap-1 mt-2">
            <MapPin className="w-3 h-3 text-zinc-600" />
            <span className="text-[10px] text-zinc-600 font-mono">
              {stage.latitude.toFixed(4)}, {stage.longitude.toFixed(4)}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {stage.lastVisited && (
            <span className="text-[10px] text-zinc-600">
              {new Date(stage.lastVisited).toLocaleDateString()}
            </span>
          )}
          <ChevronRight className="w-4 h-4 text-zinc-600" />
        </div>
      </div>
    </div>
  );
}

function TribeCard({ membership }: { membership: TribeMembership }) {
  const roleColors: Record<string, string> = {
    LEADER: "bg-yellow-600/20 text-yellow-400 border-yellow-800/50",
    CAPTAIN: "bg-blue-600/20 text-blue-400 border-blue-800/50",
    MEMBER: "bg-zinc-800 text-zinc-400 border-zinc-700",
  };

  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 hover:border-violet-800/50 transition-colors">
      <div className="flex items-center gap-3">
        <Avatar
          className="w-12 h-12 border-2"
          style={{ borderColor: membership.tribe.color }}
        >
          <AvatarFallback
            style={{ backgroundColor: `${membership.tribe.color}30` }}
            className="text-lg font-bold"
          >
            {membership.tribe.name[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-white truncate">{membership.tribe.name}</h3>
            {membership.tribe.isOfficial && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-violet-600/20 text-violet-400 border-violet-800/50">
                Official
              </Badge>
            )}
          </div>
          <p className="text-xs text-zinc-500">{membership.tribe.genre}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${roleColors[membership.role] ?? roleColors.MEMBER}`}>
            {membership.role}
          </span>
          <span className="text-[10px] text-zinc-600">
            Joined {new Date(membership.joinedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
      {membership.tribe.description && (
        <p className="mt-3 text-xs text-zinc-400">{membership.tribe.description}</p>
      )}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-600 mb-4">
        {icon}
      </div>
      <h3 className="font-medium text-white mb-1">{title}</h3>
      <p className="text-sm text-zinc-500 max-w-xs">{description}</p>
      {action && (
        <Link
          href={action.href}
          className="mt-4 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-500 transition-colors"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
