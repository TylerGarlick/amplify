"use client";

import { useState, useEffect } from "react";
import { Trophy, Medal, Crown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  tribeId: string;
  tribeName: string;
  tribeColor: string;
  territoryCount: number;
  totalInfluence: number;
}

interface TribeLeaderboardProps {
  limit?: number;
}

export function TribeLeaderboard({ limit }: TribeLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaderboard = async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await fetch("/api/tribes/leaderboard");
      const data = await res.json();
      setLeaderboard(limit ? data.slice(0, limit) : data);
    } catch (error) {
      console.error("Failed to load leaderboard:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchLeaderboard(true), 30000);
    return () => clearInterval(interval);
  }, [limit]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-400 fill-yellow-400" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-300" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 text-center text-zinc-500 font-mono">{rank}</span>;
    }
  };

  const formatInfluence = (influence: number) => {
    if (influence >= 3600) {
      return `${(influence / 3600).toFixed(1)}h`;
    }
    return `${Math.round(influence / 60)}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="text-center p-8 text-zinc-500">
        <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No territories claimed yet.</p>
        <p className="text-sm mt-1">Start watching stages to claim territory!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {leaderboard.map((entry, index) => {
        const rank = index + 1;
        return (
          <div
            key={entry.tribeId}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
              rank <= 3 ? "bg-zinc-800/50" : "bg-zinc-900/30 hover:bg-zinc-800/30"
            )}
          >
            {/* Rank */}
            <div className="w-8 flex justify-center">
              {getRankIcon(rank)}
            </div>

            {/* Tribe Info */}
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
              style={{ 
                backgroundColor: entry.tribeColor + '20',
                color: entry.tribeColor 
              }}
            >
              {entry.tribeName[0]}
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-white truncate">{entry.tribeName}</h4>
              <div className="flex items-center gap-3 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {entry.territoryCount} {entry.territoryCount === 1 ? 'territory' : 'territories'}
                </span>
                <span>{formatInfluence(entry.totalInfluence)} watch time</span>
              </div>
            </div>

            {/* Territory Count Badge */}
            {rank <= 3 && (
              <div 
                className="px-3 py-1 rounded-full text-sm font-bold"
                style={{ 
                  backgroundColor: entry.tribeColor + '20',
                  color: entry.tribeColor 
                }}
              >
                #{rank}
              </div>
            )}
          </div>
        );
      })}

      {/* Refresh indicator */}
      {refreshing && (
        <div className="flex justify-center">
          <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}