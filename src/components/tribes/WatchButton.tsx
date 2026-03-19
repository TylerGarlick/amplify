"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Eye, CheckCircle, Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface WatchButtonProps {
  territoryId: string;
  stageName: string;
  isEnhanced?: boolean;
  enhancedTribeId?: string;
  userTribeId?: string;
  onWatchComplete?: (result: { counted: boolean; ownershipChanged: boolean }) => void;
}

const MIN_WATCH_SECONDS = 60;
const HEARTBEAT_INTERVAL_MS = 5000; // Send update every 5 seconds

export function WatchButton({
  territoryId,
  stageName,
  isEnhanced = false,
  enhancedTribeId,
  userTribeId,
  onWatchComplete,
}: WatchButtonProps) {
  const [isWatching, setIsWatching] = useState(false);
  const [watchTime, setWatchTime] = useState(0);
  const [counted, setCounted] = useState(false);
  const [ownershipChanged, setOwnershipChanged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const handleWatchStart = async () => {
    setError(null);
    setIsWatching(true);
    setOwnershipChanged(false);
    startTimeRef.current = Date.now();
    
    // Start heartbeat
    intervalRef.current = setInterval(async () => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setWatchTime(elapsed);
      
      try {
        const res = await fetch("/api/watch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            territoryId,
            seconds: HEARTBEAT_INTERVAL_MS / 1000,
          }),
        });
        
        if (res.ok) {
          const data = await res.json();
          setCounted(data.counted);
          setOwnershipChanged(data.ownershipChanged);
          
          if (data.counted) {
            onWatchComplete?.({ counted: true, ownershipChanged: data.ownershipChanged });
          }
        }
      } catch (err) {
        console.error("Watch heartbeat failed:", err);
      }
    }, HEARTBEAT_INTERVAL_MS);
  };

  const handleWatchStop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsWatching(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const isEnhancedForUser = isEnhanced && enhancedTribeId === userTribeId;
  const progress = Math.min((watchTime / MIN_WATCH_SECONDS) * 100, 100);

  return (
    <div className="space-y-3">
      <button
        onClick={isWatching ? handleWatchStop : handleWatchStart}
        disabled={!userTribeId}
        className={cn(
          "w-full py-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2",
          !userTribeId && "opacity-50 cursor-not-allowed",
          isWatching 
            ? "bg-red-500/20 text-red-400 border-2 border-red-500 animate-pulse" 
            : counted
              ? "bg-green-500/20 text-green-400 border-2 border-green-500"
              : "bg-violet-600 hover:bg-violet-500 text-white border-2 border-violet-500"
        )}
      >
        {isWatching ? (
          <>
            <span className="w-3 h-3 bg-red-400 rounded-full animate-pulse" />
            Stop Watching
          </>
        ) : counted ? (
          <>
            <CheckCircle className="w-5 h-5" />
            Watch Complete!
          </>
        ) : (
          <>
            <Eye className="w-5 h-5" />
            Watch Stage
          </>
        )}
      </button>

      {isEnhancedForUser && !isWatching && !counted && (
        <div className="flex items-center justify-center gap-1 text-yellow-400 text-sm">
          <Zap className="w-4 h-4 fill-yellow-400" />
          <span>2x Influence Active!</span>
        </div>
      )}

      {(isWatching || counted) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Watch time
            </span>
            <span className="text-white font-mono">
              {watchTime}s / {MIN_WATCH_SECONDS}s
            </span>
          </div>
          
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-500",
                counted ? "bg-green-500" : "bg-violet-500"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>

          {!counted && (
            <p className="text-xs text-zinc-500 text-center">
              Watch for {MIN_WATCH_SECONDS - watchTime}s more to contribute to your tribe!
            </p>
          )}

          {counted && (
            <p className="text-xs text-green-400 text-center flex items-center justify-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Influence contributed to your tribe!
            </p>
          )}

          {ownershipChanged && (
            <div className="p-2 bg-yellow-500/20 border border-yellow-500 rounded-lg text-center">
              <span className="text-yellow-400 text-sm font-medium">
                🎉 Territory Captured!
              </span>
            </div>
          )}
        </div>
      )}

      {!userTribeId && (
        <p className="text-xs text-zinc-500 text-center">
          Join a tribe to watch and earn influence
        </p>
      )}
    </div>
  );
}