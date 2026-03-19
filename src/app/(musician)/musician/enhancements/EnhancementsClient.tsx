"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Zap, Clock, CheckCircle, XCircle, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface Stage {
  id: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
}

interface Enhancement {
  id: string;
  stageId: string;
  tribeId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  appliedAt: string;
  reviewedAt?: string;
  multiplier: number;
  stage: Stage;
  tribe: {
    id: string;
    name: string;
    color: string;
  };
}

export function EnhancementsClient() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [enhancements, setEnhancements] = useState<Enhancement[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [stagesRes, enhancementsRes] = await Promise.all([
        fetch("/api/stages"),
        fetch("/api/enhancements"),
      ]);

      const stagesData = await stagesRes.json();
      const enhancementsData = await enhancementsRes.json();

      setStages(stagesData);
      setEnhancements(enhancementsData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (stageId: string) => {
    setApplying(stageId);
    try {
      const res = await fetch("/api/enhancements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to apply:", error);
    } finally {
      setApplying(null);
    }
  };

  const getEnhancementForStage = (stageId: string) => {
    return enhancements.find((e) => e.stageId === stageId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="flex items-center gap-1 text-green-400 text-sm">
            <CheckCircle className="w-4 h-4" />
            Approved
          </span>
        );
      case "REJECTED":
        return (
          <span className="flex items-center gap-1 text-red-400 text-sm">
            <XCircle className="w-4 h-4" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-yellow-400 text-sm">
            <Clock className="w-4 h-4" />
            Pending
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-yellow-400" />
          Location Enhancements
        </h1>
        <p className="text-zinc-400 mt-1">
          Apply to enhance your stages for 2x tribe influence boost at your locations.
        </p>
      </div>

      {/* Info Card */}
      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-yellow-400 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-400">2x Influence Multiplier</h3>
            <p className="text-sm text-zinc-400 mt-1">
              When approved, members of your tribe will earn double influence when 
              watching stages at your enhanced locations. This helps your tribe 
              capture and defend territories!
            </p>
          </div>
        </div>
      </div>

      {/* Stages List */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Your Stages</h2>
        
        {stages.length === 0 ? (
          <div className="text-center p-8 text-zinc-500">
            <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>You haven&apos;t created any stages yet.</p>
            <button
              onClick={() => router.push("/musician/stages/new")}
              className="mt-3 text-violet-400 hover:text-violet-300"
            >
              Create your first stage →
            </button>
          </div>
        ) : (
          stages.map((stage) => {
            const enhancement = getEnhancementForStage(stage.id);
            
            return (
              <div
                key={stage.id}
                className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-white">{stage.name}</h3>
                    <p className="text-sm text-zinc-500 mt-0.5">
                      {stage.latitude.toFixed(4)}, {stage.longitude.toFixed(4)}
                    </p>
                    {enhancement && (
                      <div className="mt-2">
                        {getStatusBadge(enhancement.status)}
                      </div>
                    )}
                  </div>
                  
                  {!enhancement ? (
                    <button
                      onClick={() => handleApply(stage.id)}
                      disabled={applying === stage.id}
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
                    >
                      {applying === stage.id ? (
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Applying...
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Zap className="w-4 h-4" />
                          Apply
                        </span>
                      )}
                    </button>
                  ) : enhancement.status === "PENDING" ? (
                    <span className="text-sm text-zinc-500">Awaiting review</span>
                  ) : enhancement.status === "APPROVED" ? (
                    <span className="flex items-center gap-1 text-green-400 text-sm font-medium">
                      <Zap className="w-4 h-4 fill-yellow-400" />
                      Active
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pending Applications */}
      {enhancements.filter((e) => e.status === "PENDING").length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Pending Applications</h2>
          {enhancements
            .filter((e) => e.status === "PENDING")
            .map((enhancement) => (
              <div
                key={enhancement.id}
                className="p-4 bg-zinc-900/50 rounded-xl border border-yellow-500/20"
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-yellow-400" />
                  <div>
                    <p className="text-white">
                      {enhancement.stage.name}
                      <span className="text-zinc-500"> — {enhancement.tribe.name}</span>
                    </p>
                    <p className="text-sm text-zinc-500">
                      Applied {new Date(enhancement.appliedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}