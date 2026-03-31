"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Navigation, Loader2, CheckCircle, Map, Play, Save, Eye } from "lucide-react";
import { toast } from "sonner";
import { MapPicker } from "@/components/stages/MapPicker";
import { MusicUploader } from "@/components/stages/MusicUploader";
import { StagePreview, type StageElement } from "@/components/stages/StagePreview";
import { ARStageVizSelector, type VizStyle } from "@/components/stages/ARStageVizSelector";

// Dynamic import for AR Stage Builder (needs window/canvas)
const ARStageBuilder = dynamic(
  () => import("@/components/stages/ARStageBuilder").then(mod => mod.ARStageBuilder),
  { 
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
          <p className="text-xs text-zinc-500">Loading 3D Builder...</p>
        </div>
      </div>
    )
  }
);

interface TrackData {
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  title: string;
}

interface StageFormData {
  name: string;
  description: string;
  latitude: number | "";
  longitude: number | "";
  radius: number[];
  isPublic: boolean;
  vizStyle: VizStyle | null;
}

const DEFAULT_ELEMENTS: StageElement[] = [
  {
    id: "el-default-platform",
    type: "platform",
    name: "Main Stage",
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [6, 6, 6],
    color: "#374151",
    config: {},
    isVisible: true,
  },
  {
    id: "el-default-crowd",
    type: "crowd",
    name: "Crowd Area",
    position: [0, 0, -5],
    rotation: [0, 0, 0],
    scale: [5, 5, 5],
    color: "#4b5563",
    config: {},
    isVisible: true,
  },
];

export default function CreateStagePage() {
  const router = useRouter();
  const [stageData, setStageData] = useState<StageFormData>({
    name: "",
    description: "",
    latitude: "",
    longitude: "",
    radius: [50],
    isPublic: true,
    vizStyle: null,
  });
  
  const [elements, setElements] = useState<StageElement[]>(DEFAULT_ELEMENTS);
  const [track, setTrack] = useState<TrackData | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  // Initialize with current location
  useState(() => {
    if (navigator.geolocation) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setStageData(prev => ({
            ...prev,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }));
          setLocating(false);
        },
        () => {
          // Default to SF
          setStageData(prev => ({
            ...prev,
            latitude: 37.7749,
            longitude: -122.4194,
          }));
          setLocating(false);
        }
      );
    }
  });

  function useMyLocation() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStageData(prev => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }));
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

  function handleLocationChange(newLat: number, newLng: number) {
    setStageData(prev => ({ ...prev, latitude: newLat, longitude: newLng }));
  }

  function handleTrackUploaded(trackData: any) {
    setTrack(trackData);
  }

  async function handleSubmit(publish: boolean = false) {
    if (!stageData.name.trim()) {
      toast.error("Stage name is required");
      return;
    }
    if (!stageData.latitude || !stageData.longitude) {
      toast.error("Location is required");
      return;
    }

    setLoading(true);

    try {
      // Create the stage
      const stageRes = await fetch("/api/stages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: stageData.name.trim(),
          description: stageData.description.trim() || undefined,
          latitude: stageData.latitude,
          longitude: stageData.longitude,
          radius: stageData.radius[0],
          isPublic: publish,
          vizStyle: stageData.vizStyle,
        }),
      });

      if (!stageRes.ok) {
        const err = await stageRes.json();
        throw new Error(err.error || "Failed to create stage");
      }

      const { data: stage } = await stageRes.json();

      // Save stage elements
      await fetch(`/api/stages/${stage.id}/elements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          elements: elements.map((el, idx) => ({
            ...el,
            sortOrder: idx,
            // Remove React-specific properties
            id: undefined,
          })),
        }),
      });

      // If track uploaded, link it
      if (track) {
        await fetch(`/api/stages/${stage.id}/tracks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trackUrl: track.fileUrl,
            title: track.title,
            mimeType: track.mimeType,
            fileSize: track.fileSize,
          }),
        });
      }

      toast.success(publish ? "Stage published!" : "Stage created!");
      router.push(`/musician/stages/${stage.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create stage");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Create AR Stage</h1>
            <p className="text-sm text-zinc-500">Design your immersive performance space</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowPreview(true)}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSubmit(false)}
              disabled={loading}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Draft
            </Button>
            <Button
              onClick={() => handleSubmit(true)}
              disabled={loading}
              className="bg-violet-600 hover:bg-violet-500"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Publish Stage
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Panel - Tabs */}
        <div className="w-80 border-r border-zinc-800 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="w-full bg-transparent border-b border-zinc-800 rounded-none px-4 pt-2">
              <TabsTrigger 
                value="details" 
                className="flex-1 data-[state=active]:bg-violet-600/20 data-[state=active]:text-violet-400"
              >
                Details
              </TabsTrigger>
              <TabsTrigger 
                value="music" 
                className="flex-1 data-[state=active]:bg-violet-600/20 data-[state=active]:text-violet-400"
              >
                Music
              </TabsTrigger>
              <TabsTrigger 
                value="visualization" 
                className="flex-1 data-[state=active]:bg-violet-600/20 data-[state=active]:text-violet-400"
              >
                Visualization
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="flex-1 overflow-y-auto p-4 space-y-5 mt-0">
              {/* Stage Name */}
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-xs tracking-wider uppercase">Stage Name</Label>
                <Input
                  value={stageData.name}
                  onChange={(e) => setStageData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. The Underground, Rooftop Rave"
                  className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-violet-500 h-11"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-xs tracking-wider uppercase">Description</Label>
                <Input
                  value={stageData.description}
                  onChange={(e) => setStageData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your venue..."
                  className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-violet-500 h-11"
                />
              </div>

              {/* Location */}
              <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-zinc-300 text-xs tracking-wider uppercase flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" /> Location
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={`h-7 text-xs ${showMap ? 'bg-violet-600/20 text-violet-400' : 'text-zinc-400'}`}
                    onClick={() => setShowMap(!showMap)}
                  >
                    <Map className="w-3 h-3 mr-1" />
                    {showMap ? "Hide" : "Map"}
                  </Button>
                </div>

                {showMap && stageData.latitude && stageData.longitude && (
                  <MapPicker
                    latitude={Number(stageData.latitude)}
                    longitude={Number(stageData.longitude)}
                    onLocationChange={handleLocationChange}
                    radius={stageData.radius[0]}
                  />
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-500">Latitude</Label>
                    <Input
                      type="number"
                      step="any"
                      value={stageData.latitude}
                      onChange={(e) => setStageData(prev => ({ ...prev, latitude: e.target.value ? parseFloat(e.target.value) : "" }))}
                      placeholder="37.7749"
                      className="bg-zinc-800 border-zinc-700 text-white h-10 text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-500">Longitude</Label>
                    <Input
                      type="number"
                      step="any"
                      value={stageData.longitude}
                      onChange={(e) => setStageData(prev => ({ ...prev, longitude: e.target.value ? parseFloat(e.target.value) : "" }))}
                      placeholder="-122.4194"
                      className="bg-zinc-800 border-zinc-700 text-white h-10 text-sm font-mono"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  onClick={useMyLocation}
                  disabled={locating}
                >
                  {locating ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Navigation className="w-3 h-3 mr-2" />}
                  Use My Location
                </Button>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-zinc-500">Detection Radius</Label>
                    <span className="text-xs font-mono text-violet-400">{stageData.radius[0]}m</span>
                  </div>
                  <Slider
                    value={stageData.radius}
                    onValueChange={(v) => setStageData(prev => ({ ...prev, radius: v }))}
                    min={10}
                    max={500}
                    step={10}
                  />
                </div>
              </div>

              {/* Visibility */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                <div>
                  <p className="text-sm text-white">Public Stage</p>
                  <p className="text-xs text-zinc-500">Anyone can discover this stage</p>
                </div>
                <button
                  onClick={() => setStageData(prev => ({ ...prev, isPublic: !prev.isPublic }))}
                  className={`w-11 h-6 rounded-full transition-colors ${
                    stageData.isPublic ? "bg-violet-600" : "bg-zinc-700"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    stageData.isPublic ? "translate-x-5" : "translate-x-0.5"
                  }`} />
                </button>
              </div>
            </TabsContent>

            <TabsContent value="music" className="flex-1 overflow-y-auto p-4 mt-0">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-white mb-1">Upload Track</h3>
                  <p className="text-xs text-zinc-500 mb-4">Add music that will play when users visit your stage</p>
                </div>
                <MusicUploader onTrackUploaded={handleTrackUploaded} />
                
                {track && (
                  <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                    <p className="text-xs text-zinc-400">
                      Track will be linked to your stage. You can change it later.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="visualization" className="flex-1 overflow-y-auto p-4 mt-0">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-white mb-1">Choose Visualization Style</h3>
                  <p className="text-xs text-zinc-500 mb-4">
                    Select how your stage will visualize audio. You can customize further after creation.
                  </p>
                </div>
                <ARStageVizSelector
                  selectedStyle={stageData.vizStyle}
                  onSelect={(style) => setStageData(prev => ({ ...prev, vizStyle: style }))}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Panel - 3D Builder */}
        <div className="flex-1">
          <ARStageBuilder elements={elements} onElementsChange={setElements} />
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-5xl h-[80vh]">
            <StagePreview 
              elements={elements} 
              trackUrl={track?.fileUrl}
              stageName={stageData.name || "Untitled Stage"}
            />
            <Button
              variant="outline"
              onClick={() => setShowPreview(false)}
              className="absolute top-4 right-4 bg-zinc-900/80 border-zinc-700 text-white hover:bg-zinc-800"
            >
              Close Preview
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}