"use client";

import { use, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Sparkles, Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

const VIS_TYPES = [
  { value: "PARTICLE_SYSTEM", label: "Particle System" },
  { value: "GEOMETRY_PULSE", label: "Geometry Pulse" },
  { value: "WAVEFORM_RIBBON", label: "Waveform Ribbon" },
  { value: "FREQUENCY_BARS", label: "Frequency Bars" },
  { value: "LIGHT_SHOW", label: "Light Show" },
  { value: "GLTF_ANIMATOR", label: "GLTF Animator" },
  { value: "SHADER_EFFECT", label: "Shader Effect" },
];

const DEFAULT_CONFIGS: Record<string, object> = {
  PARTICLE_SYSTEM: { count: 500, color: "#7c3aed", size: 0.5, spread: 3, lifetime: 2, beatMultiplier: 3 },
  GEOMETRY_PULSE: { geometry: "icosahedron", color: "#7c3aed", emissiveColor: "#a855f7", wireframe: false, pulseScale: 1.5, rotationSpeed: 0.5 },
  WAVEFORM_RIBBON: { color: "#06b6d4", width: 0.2, segments: 64, radius: 4 },
  FREQUENCY_BARS: { count: 32, color: "#ec4899", maxHeight: 5, arrangement: "arc" },
  LIGHT_SHOW: { lights: [{ type: "point", color: "#7c3aed", intensity: 2, orbitRadius: 3, orbitSpeed: 1, reactTo: "bass" }] },
  GLTF_ANIMATOR: { animationName: "idle", baseScale: 1 },
  SHADER_EFFECT: { vertexShader: "// custom vertex", fragmentShader: "// custom fragment", uniforms: {} },
};

interface Visualization {
  id: string;
  name: string;
  type: string;
  isVisible: boolean;
  configJson: string;
  offsetX: number;
  offsetY: number;
  reactToFrequency: string;
  reactIntensity: number;
}

export default function VisualizePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: stageId } = use(params);

  const [visualizations, setVisualizations] = useState<Visualization[]>([]);
  const [selected, setSelected] = useState<Visualization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  // Form state for editing
  const [name, setName] = useState("");
  const [type, setType] = useState("PARTICLE_SYSTEM");
  const [configJson, setConfigJson] = useState("{}");
  const [offsetY, setOffsetY] = useState([0]);
  const [reactTo, setReactTo] = useState("bass");
  const [intensity, setIntensity] = useState([1]);

  useEffect(() => {
    fetch(`/api/stages/${stageId}/visualizations`)
      .then((r) => r.json())
      .then((d) => { setVisualizations(d.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [stageId]);

  function selectVis(vis: Visualization) {
    setSelected(vis);
    setName(vis.name);
    setType(vis.type);
    setConfigJson(vis.configJson);
    setOffsetY([vis.offsetY]);
    setReactTo(vis.reactToFrequency);
    setIntensity([vis.reactIntensity]);
  }

  function newVis() {
    setSelected(null);
    setName("");
    setType("PARTICLE_SYSTEM");
    setConfigJson(JSON.stringify(DEFAULT_CONFIGS.PARTICLE_SYSTEM, null, 2));
    setOffsetY([0]);
    setReactTo("bass");
    setIntensity([1]);
  }

  function handleTypeChange(t: string) {
    setType(t);
    setConfigJson(JSON.stringify(DEFAULT_CONFIGS[t] ?? {}, null, 2));
  }

  async function handleSuggest() {
    if (!aiPrompt.trim()) { toast.error("Describe what you want first."); return; }
    setAiLoading(true);
    const res = await fetch("/api/ai/suggest-visualization", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: aiPrompt, type, trackMetadata: { bpm: 128, key: "C major", energy: 0.7 } }),
    });
    setAiLoading(false);
    if (!res.ok) { toast.error("AI suggestion failed."); return; }
    const { data } = await res.json();
    setConfigJson(JSON.stringify(data, null, 2));
    toast.success("AI config generated!");
    setAiPrompt("");
  }

  async function handleSave() {
    setSaving(true);
    try {
      JSON.parse(configJson);
    } catch {
      toast.error("Invalid JSON in config.");
      setSaving(false);
      return;
    }

    const body = { name, type, configJson, offsetY: offsetY[0], reactToFrequency: reactTo, reactIntensity: intensity[0] };
    let res: Response;

    if (selected) {
      res = await fetch(`/api/visualizations/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      res = await fetch(`/api/stages/${stageId}/visualizations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    setSaving(false);
    if (!res.ok) { toast.error("Failed to save."); return; }
    const { data } = await res.json();
    toast.success(selected ? "Visualization updated!" : "Visualization added!");

    if (selected) {
      setVisualizations((prev) => prev.map((v) => (v.id === selected.id ? data : v)));
    } else {
      setVisualizations((prev) => [...prev, data]);
      setSelected(data);
    }
  }

  async function handleDelete(visId: string) {
    if (!confirm("Delete this visualization?")) return;
    await fetch(`/api/visualizations/${visId}`, { method: "DELETE" });
    setVisualizations((prev) => prev.filter((v) => v.id !== visId));
    if (selected?.id === visId) newVis();
    toast.success("Deleted.");
  }

  return (
    <div className="flex h-screen">
      {/* Left: visualization list */}
      <div className="w-56 flex-shrink-0 border-r border-zinc-800 bg-zinc-950 flex flex-col">
        <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
          <span className="text-xs text-zinc-400 uppercase tracking-wider">Visuals</span>
          <button onClick={newVis} className="w-6 h-6 rounded-md bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 flex items-center justify-center transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />
            </div>
          ) : visualizations.length === 0 ? (
            <p className="text-xs text-zinc-600 p-3 text-center">No visualizations yet. Click + to add one.</p>
          ) : (
            visualizations.map((vis) => (
              <button
                key={vis.id}
                onClick={() => selectVis(vis)}
                className={`w-full text-left p-2.5 rounded-lg transition-colors ${
                  selected?.id === vis.id
                    ? "bg-violet-600/15 border border-violet-600/20"
                    : "hover:bg-zinc-800/60"
                }`}
              >
                <p className="text-xs font-medium text-white truncate">{vis.name || "(unnamed)"}</p>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{vis.type}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: editor */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-lg space-y-5">
          <h2 className="text-lg font-bold text-white">
            {selected ? "Edit Visualization" : "New Visualization"}
          </h2>

          <div className="space-y-1.5">
            <Label className="text-zinc-300 text-xs tracking-wider uppercase">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bass Pulse"
              className="bg-zinc-900 border-zinc-700 text-white h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-zinc-300 text-xs tracking-wider uppercase">Type</Label>
            <Select value={type} onValueChange={handleTypeChange}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {VIS_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-white hover:bg-zinc-800">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* AI Suggest */}
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-pink-400" />
              <span className="text-xs font-medium text-white">AI Suggest Config</span>
            </div>
            <Input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Describe the effect, e.g. 'Blue particles that explode on the beat'"
              className="bg-zinc-800 border-zinc-700 text-white text-sm h-10"
            />
            <Button
              onClick={handleSuggest}
              disabled={aiLoading}
              size="sm"
              className="bg-pink-600/20 text-pink-400 hover:bg-pink-600/30 border border-pink-800/30"
            >
              {aiLoading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Sparkles className="w-3 h-3 mr-2" />}
              Generate Config
            </Button>
          </div>

          {/* Config JSON */}
          <div className="space-y-1.5">
            <Label className="text-zinc-300 text-xs tracking-wider uppercase">Config JSON</Label>
            <textarea
              value={configJson}
              onChange={(e) => setConfigJson(e.target.value)}
              rows={10}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-xs font-mono text-green-400 focus:outline-none focus:border-violet-500 resize-none"
            />
          </div>

          {/* Position & reactivity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-400 text-xs">Height Offset</Label>
                <span className="text-xs text-violet-400 font-mono">{offsetY[0]}m</span>
              </div>
              <Slider value={offsetY} onValueChange={setOffsetY} min={-5} max={20} step={0.5} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-400 text-xs">Intensity</Label>
                <span className="text-xs text-violet-400 font-mono">{intensity[0]}x</span>
              </div>
              <Slider value={intensity} onValueChange={setIntensity} min={0} max={5} step={0.1} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-zinc-300 text-xs tracking-wider uppercase">React To</Label>
            <Select value={reactTo} onValueChange={setReactTo}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {["bass", "mid", "treble", "all"].map((f) => (
                  <SelectItem key={f} value={f} className="text-white hover:bg-zinc-800 capitalize">{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3D preview placeholder */}
          <div className="rounded-xl bg-zinc-950 border border-zinc-800 h-40 flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
            <p className="text-xs text-zinc-600">3D preview — AR device required</p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/20"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {selected ? "Save Changes" : "Add Visualization"}
            </Button>
            {selected && (
              <Button
                onClick={() => handleDelete(selected.id)}
                variant="outline"
                className="border-red-800/50 text-red-400 hover:bg-red-950/30"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
