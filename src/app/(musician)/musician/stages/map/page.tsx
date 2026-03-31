"use client";

import { useEffect, useState } from "react";
import { StageMap } from "@/components/stages/StageMap";
import { StageMapStage } from "@/components/stages/StageMap";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";

export default function StageMapPage() {
  const [stages, setStages] = useState<StageMapStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStages() {
      try {
        const res = await fetch("/api/stages");
        const json = await res.json();
        setStages(json.data || []);
      } catch {
        setError("Failed to load stages");
      } finally {
        setLoading(false);
      }
    }
    fetchStages();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link href="/musician/stages">
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-100">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-base font-semibold text-zinc-100">Stage Map</h1>
            <p className="text-xs text-zinc-500">
              {loading ? "Loading..." : `${stages.length} stage${stages.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <Link href="/musician/stages/create">
          <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white">
            <Plus className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-10">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-10">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        {!loading && !error && (
          <StageMap
            stages={stages}
            height="100%"
          />
        )}
      </div>
    </div>
  );
}
