"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Map, Trophy, Users, Shield } from "lucide-react";
import { TribeSelection } from "@/components/tribes/TribeSelection";
import { TribeLeaderboard } from "@/components/tribes/TribeLeaderboard";
import { TerritoryMap } from "@/components/tribes/TerritoryMap";

interface Tribe {
  id: string;
  name: string;
  genre: string;
  color: string;
  description?: string;
  members?: { count: number }[];
}

type Tab = "territories" | "leaderboard" | "my-tribe";

export function TribePageClient() {
  const { data: session, status } = useSession({ required: false });
  const [activeTab, setActiveTab] = useState<Tab>("territories");
  const [userTribe, setUserTribe] = useState<Tribe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "loading") {
      fetchUserTribe();
    }
  }, [status]);

  const fetchUserTribe = async () => {
    try {
      const res = await fetch("/api/tribes/mine");
      if (res.ok) {
        const data = await res.json();
        setUserTribe(data);
      }
    } catch (error) {
      console.error("Failed to fetch user tribe:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTribeJoined = () => {
    fetchUserTribe();
  };

  const tabs = [
    { id: "territories" as Tab, label: "Territories", Icon: Map },
    { id: "leaderboard" as Tab, label: "Leaderboard", Icon: Trophy },
    { id: "my-tribe" as Tab, label: "My Tribe", Icon: Users },
  ];

  if (loading || status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show tribe selection if user is logged in but not in a tribe
  if (session && !userTribe) {
    return (
      <div className="min-h-screen bg-black p-4">
        <div className="max-w-md mx-auto pt-8">
          <TribeSelection onComplete={handleTribeJoined} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800/60">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-violet-400" />
          Tribe Territory
        </h1>
        {userTribe && (
          <div className="flex items-center gap-2 mt-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: userTribe.color }}
            />
            <span className="text-zinc-400">
              You&apos;re a member of <span className="text-white font-medium">{userTribe.name}</span>
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800/60">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              activeTab === id
                ? "text-violet-400 border-b-2 border-violet-400"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === "territories" && (
          <div className="space-y-4">
            <p className="text-zinc-400 text-sm">
              Watch stages to earn influence for your tribe and claim territories!
            </p>
            <TerritoryMap />
          </div>
        )}

        {activeTab === "leaderboard" && (
          <div className="space-y-4">
            <p className="text-zinc-400 text-sm">
              Top tribes ranked by territory ownership
            </p>
            <TribeLeaderboard />
          </div>
        )}

        {activeTab === "my-tribe" && userTribe && (
          <div className="space-y-6">
            {/* Tribe Card */}
            <div 
              className="p-6 rounded-2xl"
              style={{ 
                background: `linear-gradient(135deg, ${userTribe.color}20 0%, ${userTribe.color}05 100%)`,
                border: `1px solid ${userTribe.color}30`
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-bold"
                  style={{ 
                    backgroundColor: userTribe.color + '20',
                    color: userTribe.color 
                  }}
                >
                  {userTribe.name[0]}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{userTribe.name}</h2>
                  <p className="text-zinc-400">{userTribe.genre}</p>
                  {userTribe.description && (
                    <p className="text-sm text-zinc-500 mt-1">{userTribe.description}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-zinc-900 rounded-xl">
                <div className="text-2xl font-bold text-white">0</div>
                <div className="text-sm text-zinc-500">Territories Owned</div>
              </div>
              <div className="p-4 bg-zinc-900 rounded-xl">
                <div className="text-2xl font-bold text-white">0h</div>
                <div className="text-sm text-zinc-500">Total Watch Time</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <button className="w-full p-4 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-left transition-colors">
                <div className="font-medium text-white">View Territory Map</div>
                <div className="text-sm text-zinc-500">See all claimed territories</div>
              </button>
              <button className="w-full p-4 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-left transition-colors">
                <div className="font-medium text-white">Invite Friends</div>
                <div className="text-sm text-zinc-500">Grow your tribe</div>
              </button>
            </div>
          </div>
        )}
      </div>

      {!session && (
        <div className="p-4 fixed bottom-16 left-0 right-0 bg-black/80 backdrop-blur border-t border-zinc-800">
          <a
            href="/login"
            className="block w-full py-3 bg-violet-600 hover:bg-violet-500 rounded-xl text-center text-white font-medium"
          >
            Sign in to Join a Tribe
          </a>
        </div>
      )}
    </div>
  );
}