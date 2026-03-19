"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { MapPin, Navigation, Loader2, CheckCircle, Map } from "lucide-react";
import { toast } from "sonner";
import { MapPicker } from "@/components/stages/MapPicker";

export default function NewStagePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState<number | "">("");
  const [lng, setLng] = useState<number | "">("");
  const [radius, setRadius] = useState([50]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [showMap, setShowMap] = useState(false);

  function useMyLocation() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocating(false);
        toast.success("Location captured!");
      },
      () => {
        toast.error("Could not get location. Please enter manually.");
        setLocating(false);
      },
      { enableHighAccuracy: true }
    );
  }

  // Initialize with current location or default
  useEffect(() => {
    if (!lat && !lng && navigator.geolocation) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          setLocating(false);
        },
        () => {
          // Default to SF if geolocation fails
          setLat(37.7749);
          setLng(-122.4194);
          setLocating(false);
        }
      );
    }
  }, []);

  function handleLocationChange(newLat: number, newLng: number) {
    setLat(newLat);
    setLng(newLng);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lat || !lng) { toast.error("Latitude and longitude are required."); return; }

    setLoading(true);
    const res = await fetch("/api/stages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || undefined,
        latitude: lat,
        longitude: lng,
        radius: radius[0],
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "Failed to create stage.");
      return;
    }

    const { data } = await res.json();
    toast.success("Stage created!");
    router.push(`/musician/stages/${data.id}/visualize`);
  }

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-xl font-bold text-white mb-1">Create Stage</h1>
      <p className="text-sm text-zinc-500 mb-6">Place an AR stage at a GPS location</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label className="text-zinc-300 text-xs tracking-wider uppercase">Stage Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. The Underground, Rooftop Rave"
            required
            className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-violet-500 h-11"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-zinc-300 text-xs tracking-wider uppercase">Description</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional — describe this venue"
            className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-violet-500 h-11"
          />
        </div>

        {/* Location */}
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-zinc-300 text-xs tracking-wider uppercase flex items-center gap-1.5">
              <MapPin className="w-3 h-3" /> Location
            </Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={`h-7 text-xs ${showMap ? 'bg-violet-600/20 text-violet-400' : 'text-zinc-400'}`}
                onClick={() => setShowMap(!showMap)}
              >
                <Map className="w-3 h-3 mr-1" />
                {showMap ? "Hide Map" : "Show Map"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                onClick={useMyLocation}
                disabled={locating}
              >
                {locating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Navigation className="w-3 h-3 mr-1" />}
                Use My Location
              </Button>
            </div>
          </div>

          {/* Map Picker */}
          {showMap && lat && lng && (
            <MapPicker
              latitude={lat}
              longitude={lng}
              onLocationChange={handleLocationChange}
              radius={radius[0]}
            />
          )}

          {/* Manual coordinates input */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-zinc-500">Latitude</Label>
              <Input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value ? parseFloat(e.target.value) : "")}
                placeholder="37.7749"
                required
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 h-10 text-sm font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-zinc-500">Longitude</Label>
              <Input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value ? parseFloat(e.target.value) : "")}
                placeholder="-122.4194"
                required
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 h-10 text-sm font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-zinc-500">Detection Radius</Label>
              <span className="text-xs font-mono text-violet-400">{radius[0]}m</span>
            </div>
            <Slider
              value={radius}
              onValueChange={setRadius}
              min={10}
              max={500}
              step={10}
              className="w-full"
            />
            <p className="text-[10px] text-zinc-600">Users within {radius[0]}m will see this stage in AR</p>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11 bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/20"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating…</>
          ) : (
            <><CheckCircle className="w-4 h-4 mr-2" /> Create Stage & Add Visuals</>
          )}
        </Button>
      </form>
    </div>
  );
}
