"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Tribe {
  id: string;
  name: string;
  genre: string;
  color: string;
  description?: string;
  isOfficial: boolean;
}

interface TribeSelectionProps {
  onComplete?: () => void;
}

export function TribeSelection({ onComplete }: TribeSelectionProps) {
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [selectedTribe, setSelectedTribe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTribe, setNewTribe] = useState({ name: "", genre: "", color: "#8B5CF6", description: "" });
  const router = useRouter();

  useEffect(() => {
    fetchTribes();
  }, []);

  const fetchTribes = async () => {
    try {
      const res = await fetch("/api/tribes");
      const data = await res.json();
      setTribes(data);
    } catch (error) {
      console.error("Failed to load tribes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!selectedTribe) return;
    
    setJoining(true);
    try {
      const res = await fetch("/api/tribes/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tribeId: selectedTribe }),
      });

      if (res.ok) {
        onComplete?.();
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to join tribe:", error);
    } finally {
      setJoining(false);
    }
  };

  const handleCreate = async () => {
    if (!newTribe.name || !newTribe.genre) return;

    try {
      const res = await fetch("/api/tribes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTribe),
      });

      if (res.ok) {
        const tribe = await res.json();
        setSelectedTribe(tribe.id);
        setShowCreate(false);
        fetchTribes();
      }
    } catch (error) {
      console.error("Failed to create tribe:", error);
    }
  };

  const colorPresets = [
    "#8B5CF6", // Violet
    "#00FFFF", // Cyan
    "#FF4444", // Red
    "#FF9900", // Orange
    "#32CD32", // Green
    "#FF69B4", // Pink
    "#9966FF", // Purple
    "#FFD700", // Gold
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Choose Your Tribe</h2>
        <p className="text-zinc-400">Join a music community and claim territories!</p>
      </div>

      {!showCreate ? (
        <>
          <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-2">
            {tribes.map((tribe) => (
              <button
                key={tribe.id}
                onClick={() => setSelectedTribe(tribe.id)}
                className={cn(
                  "relative p-4 rounded-xl border-2 transition-all duration-200 text-left",
                  selectedTribe === tribe.id
                    ? "border-violet-500 bg-violet-500/10"
                    : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/50"
                )}
                style={{
                  borderColor: selectedTribe === tribe.id ? tribe.color : undefined,
                }}
              >
                <div
                  className="w-10 h-10 rounded-full mb-2 flex items-center justify-center text-xl font-bold"
                  style={{ backgroundColor: tribe.color + "20", color: tribe.color }}
                >
                  {tribe.name[0]}
                </div>
                <h3 className="font-semibold text-white text-sm">{tribe.name}</h3>
                <p className="text-xs text-zinc-500">{tribe.genre}</p>
                {tribe.isOfficial && (
                  <span className="absolute top-2 right-2 text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                    Official
                  </span>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="w-full py-3 border-2 border-dashed border-zinc-700 rounded-xl text-zinc-400 hover:border-zinc-600 hover:text-zinc-300 transition-colors"
          >
            + Create Your Own Tribe
          </button>
        </>
      ) : (
        <div className="space-y-4 p-4 bg-zinc-900/50 rounded-xl">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Tribe Name</label>
            <input
              type="text"
              value={newTribe.name}
              onChange={(e) => setNewTribe({ ...newTribe, name: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
              placeholder="e.g., Vinyl Heads"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Genre</label>
            <input
              type="text"
              value={newTribe.genre}
              onChange={(e) => setNewTribe({ ...newTribe, genre: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
              placeholder="e.g., House Music"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Color</label>
            <div className="flex gap-2">
              {colorPresets.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewTribe({ ...newTribe, color })}
                  className={cn(
                    "w-8 h-8 rounded-full transition-transform",
                    newTribe.color === color && "scale-110 ring-2 ring-white ring-offset-2 ring-offset-zinc-900"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Description (optional)</label>
            <textarea
              value={newTribe.description}
              onChange={(e) => setNewTribe({ ...newTribe, description: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white resize-none"
              rows={2}
              placeholder="What makes your tribe unique?"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreate(false)}
              className="flex-1 py-2 text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-white font-medium transition-colors"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {selectedTribe && !showCreate && (
        <button
          onClick={handleJoin}
          disabled={joining}
          className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-xl text-white font-semibold transition-all disabled:opacity-50"
        >
          {joining ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Joining...
            </span>
          ) : (
            "Join Tribe"
          )}
        </button>
      )}
    </div>
  );
}