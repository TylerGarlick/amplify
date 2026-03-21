"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Volume2,
  Bell,
  Shield,
  User,
  Palette,
  Music2,
  Loader2,
  Save,
  ChevronRight,
  Eye,
  EyeOff,
  MapPin,
  Share2,
  Wifi,
  Download,
  Radio,
  Sparkles,
  WifiHigh,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// ─── Settings Types ────────────────────────────────────────────────────────────

interface AudioSettings {
  streamingQuality: "low" | "medium" | "high" | "lossless";
  downloadQuality: "low" | "medium" | "high" | "lossless";
  autoPlayNext: boolean;
  crossfadeSeconds: number;
  bassBoost: number;
  spatialAudio: boolean;
}

interface NotificationSettings {
  stageProximity: boolean;
  tribeActivity: boolean;
  newTracks: boolean;
  tribeLeaderboard: boolean;
  marketingEmails: boolean;
  pushEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

interface PrivacySettings {
  locationSharing: boolean;
  profilePublic: boolean;
  showListeningActivity: boolean;
  allowTribeDiscovery: boolean;
  shareAnalytics: boolean;
}

interface ThemeSettings {
  mode: "dark" | "light" | "system";
  accentColor: "violet" | "cyan" | "pink" | "green" | "orange";
  reduceMotion: boolean;
  highContrast: boolean;
}

interface MusicianSettings {
  defaultVisualization: string;
  geofenceRadius: number;
  autoActivateStages: boolean;
  shareAnalyticsWithAI: boolean;
  defaultStageRadius: number;
  hapticFeedback: boolean;
}

interface AccountSettings {
  displayName: string;
  email: string;
  bio: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface UserSettings {
  audio: AudioSettings;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  theme: ThemeSettings;
  musician: MusicianSettings;
  account: AccountSettings;
}

// ─── Default Settings ─────────────────────────────────────────────────────────

const defaultSettings: UserSettings = {
  audio: {
    streamingQuality: "high",
    downloadQuality: "lossless",
    autoPlayNext: true,
    crossfadeSeconds: 3,
    bassBoost: 0,
    spatialAudio: false,
  },
  notifications: {
    stageProximity: true,
    tribeActivity: true,
    newTracks: false,
    tribeLeaderboard: true,
    marketingEmails: false,
    pushEnabled: true,
    quietHoursEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
  },
  privacy: {
    locationSharing: true,
    profilePublic: true,
    showListeningActivity: true,
    allowTribeDiscovery: true,
    shareAnalytics: true,
  },
  theme: {
    mode: "dark",
    accentColor: "violet",
    reduceMotion: false,
    highContrast: false,
  },
  musician: {
    defaultVisualization: "PARTICLE_SYSTEM",
    geofenceRadius: 50,
    autoActivateStages: true,
    shareAnalyticsWithAI: true,
    defaultStageRadius: 50,
    hapticFeedback: true,
  },
  account: {
    displayName: "",
    email: "",
    bio: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  },
};

// ─── Storage Helpers ──────────────────────────────────────────────────────────

const STORAGE_KEY = "amplify_settings";

function loadSettings(): UserSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch {}
  return defaultSettings;
}

function saveSettings(settings: UserSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

// ─── Toggle Setting Row ────────────────────────────────────────────────────────

function ToggleRow({
  icon: Icon,
  label,
  description,
  value,
  onChange,
  variant = "default",
}: {
  icon: React.ElementType<{ className?: string }>;
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  variant?: "default" | "danger";
}) {
  return (
    <div className="flex items-center justify-between py-3 px-1">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
            variant === "danger" ? "bg-red-600/20" : "bg-zinc-800"
          }`}
        >
          <Icon
            className={`w-4 h-4 ${variant === "danger" ? "text-red-400" : "text-zinc-400"}`}
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">{label}</p>
          {description && (
            <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-50 ml-4 ${
          value ? "bg-violet-600" : "bg-zinc-700"
        }`}
        role="switch"
        aria-checked={value}
      >
        <span
          className={`pointer-events-none inline-block size-4 rounded-full bg-white shadow-lg transform transition-transform duration-200 ${
            value ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

// ─── Select Row ───────────────────────────────────────────────────────────────

function SelectRow({
  icon: Icon,
  label,
  description,
  value,
  onChange,
  options,
}: {
  icon: React.ElementType<{ className?: string }>;
  label: string;
  description?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center justify-between py-3 px-1">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon className="w-4 h-4 text-zinc-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">{label}</p>
          {description && (
            <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-36 ml-4 bg-zinc-900 border-zinc-700 text-zinc-300 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-300">
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── Slider Row ───────────────────────────────────────────────────────────────

function SliderRow({
  icon: Icon,
  label,
  description,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = "",
  showValue = true,
}: {
  icon: React.ElementType<{ className?: string }>;
  label: string;
  description?: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  showValue?: boolean;
}) {
  return (
    <div className="py-3 px-1">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Icon className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white">{label}</p>
            {description && (
              <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>
        {showValue && (
          <span className="text-xs text-zinc-400 ml-4 font-mono">
            {value}
            {unit}
          </span>
        )}
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="ml-11"
      />
    </div>
  );
}

// ─── Text Input Row ────────────────────────────────────────────────────────────

function InputRow({
  icon: Icon,
  label,
  description,
  value,
  onChange,
  type = "text",
  placeholder,
  multiline,
}: {
  icon: React.ElementType<{ className?: string }>;
  label: string;
  description?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  multiline?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="flex items-start gap-3 py-3 px-1">
      <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-2">
        <Icon className="w-4 h-4 text-zinc-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white mb-2">{label}</p>
        {description && (
          <p className="text-xs text-zinc-500 mb-2 leading-relaxed">{description}</p>
        )}
        <div className="relative">
          {multiline ? (
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              rows={3}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 resize-none"
            />
          ) : (
            <Input
              type={isPassword && showPassword ? "text" : type}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="bg-zinc-900 border-zinc-700 text-white pr-10"
            />
          )}
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
      {description && <p className="text-xs text-zinc-500">{description}</p>}
    </div>
  );
}

// ─── Settings Page ─────────────────────────────────────────────────────────────

export function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState<string>("USER");
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [activeTab, setActiveTab] = useState("audio");

  // Load settings + user session on mount
  useEffect(() => {
    const stored = loadSettings();
    setSettings(stored);
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        const role = d.data?.role ?? "USER";
        setUserRole(role);
        if (role === "MUSICIAN" || role === "ADMIN") {
          setActiveTab("musician");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Sync a nested setting field
  const updateSetting = useCallback(
    <K extends keyof UserSettings>(
      category: K,
      field: keyof UserSettings[K],
      value: unknown
    ) => {
      setSettings((prev) => {
        const next = {
          ...prev,
          [category]: { ...(prev[category] as object), [field]: value },
        };
        saveSettings(next);
        return next;
      });
    },
    []
  );

  // Save all settings (mock — extend with real API)
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // Simulate API call
      await new Promise((r) => setTimeout(r, 800));
      saveSettings(settings);
      toast.success("Settings saved", {
        description: "Your preferences have been updated.",
      });
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }, [settings]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  const isMusicianOrAdmin = userRole === "MUSICIAN" || userRole === "ADMIN";

  return (
    <div className="min-h-screen bg-black pb-8">
      {/* Header */}
      <div className="px-4 pt-8 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Settings</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Customize your Amplify experience</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          size="sm"
          className="bg-violet-600 hover:bg-violet-500 text-white gap-1.5"
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          Save
        </Button>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full bg-zinc-900/50 p-1 flex flex-wrap gap-1 h-auto">
            <TabsTrigger
              value="audio"
              className="data-[state=active]:bg-violet-600 text-xs px-3 py-1.5"
            >
              <Volume2 className="w-3.5 h-3.5 mr-1.5" />
              Audio
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="data-[state=active]:bg-violet-600 text-xs px-3 py-1.5"
            >
              <Bell className="w-3.5 h-3.5 mr-1.5" />
              Notifications
            </TabsTrigger>
            <TabsTrigger
              value="privacy"
              className="data-[state=active]:bg-violet-600 text-xs px-3 py-1.5"
            >
              <Shield className="w-3.5 h-3.5 mr-1.5" />
              Privacy
            </TabsTrigger>
            <TabsTrigger
              value="theme"
              className="data-[state=active]:bg-violet-600 text-xs px-3 py-1.5"
            >
              <Palette className="w-3.5 h-3.5 mr-1.5" />
              Display
            </TabsTrigger>
            {isMusicianOrAdmin && (
              <TabsTrigger
                value="musician"
                className="data-[state=active]:bg-violet-600 text-xs px-3 py-1.5"
              >
                <Music2 className="w-3.5 h-3.5 mr-1.5" />
                Musician
              </TabsTrigger>
            )}
            <TabsTrigger
              value="account"
              className="data-[state=active]:bg-violet-600 text-xs px-3 py-1.5"
            >
              <User className="w-3.5 h-3.5 mr-1.5" />
              Account
            </TabsTrigger>
          </TabsList>

          {/* ─── Audio ─────────────────────────────────────────────── */}
          <TabsContent value="audio" className="mt-4 space-y-6">
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
              <SectionHeader
                title="Streaming Quality"
                description="Higher quality uses more data"
              />
              <SelectRow
                icon={Wifi}
                label="Streaming Quality"
                value={settings.audio.streamingQuality}
                onChange={(v) =>
                  updateSetting("audio", "streamingQuality", v as AudioSettings["streamingQuality"])
                }
                options={[
                  { value: "low", label: "Low (96 kbps)" },
                  { value: "medium", label: "Medium (160 kbps)" },
                  { value: "high", label: "High (320 kbps)" },
                  { value: "lossless", label: "Lossless (FLAC)" },
                ]}
              />
              <Separator className="my-1 bg-zinc-800" />
              <SelectRow
                icon={Download}
                label="Download Quality"
                value={settings.audio.downloadQuality}
                onChange={(v) =>
                  updateSetting("audio", "downloadQuality", v as AudioSettings["downloadQuality"])
                }
                options={[
                  { value: "low", label: "Low (96 kbps)" },
                  { value: "medium", label: "Medium (160 kbps)" },
                  { value: "high", label: "High (320 kbps)" },
                  { value: "lossless", label: "Lossless (FLAC)" },
                ]}
              />
            </div>

            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
              <SectionHeader title="Playback" />
              <ToggleRow
                icon={Radio}
                label="Auto-play Next Track"
                description="Automatically play the next track in your queue"
                value={settings.audio.autoPlayNext}
                onChange={(v) => updateSetting("audio", "autoPlayNext", v)}
              />
              <Separator className="my-1 bg-zinc-800" />
              <SliderRow
                icon={WifiHigh}
                label="Crossfade"
                description="Smooth transition between tracks"
                value={settings.audio.crossfadeSeconds}
                onChange={(v) => updateSetting("audio", "crossfadeSeconds", v)}
                min={0}
                max={12}
                unit="s"
              />
            </div>

            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
              <SectionHeader
                title="Audio Enhancement"
                description="Adjust how your audio sounds"
              />
              <SliderRow
                icon={Volume2}
                label="Bass Boost"
                description="Emphasize low frequencies"
                value={settings.audio.bassBoost}
                onChange={(v) => updateSetting("audio", "bassBoost", v)}
                min={0}
                max={100}
                unit="%"
              />
              <Separator className="my-1 bg-zinc-800" />
              <ToggleRow
                icon={Sparkles}
                label="Spatial Audio"
                description="Enable 3D surround sound effect"
                value={settings.audio.spatialAudio}
                onChange={(v) => updateSetting("audio", "spatialAudio", v)}
              />
            </div>
          </TabsContent>

          {/* ─── Notifications ─────────────────────────────────────── */}
          <TabsContent value="notifications" className="mt-4 space-y-6">
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
              <SectionHeader title="Push Notifications" />
              <ToggleRow
                icon={Bell}
                label="Enable Push Notifications"
                value={settings.notifications.pushEnabled}
                onChange={(v) => updateSetting("notifications", "pushEnabled", v)}
              />
            </div>

            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
              <SectionHeader
                title="Activity Alerts"
                description="Get notified about things that matter to you"
              />
              <ToggleRow
                icon={MapPin}
                label="Stage Proximity"
                description="Alert when you're near a stage"
                value={settings.notifications.stageProximity}
                onChange={(v) => updateSetting("notifications", "stageProximity", v)}
              />
              <Separator className="my-1 bg-zinc-800" />
              <ToggleRow
                icon={Shield}
                label="Tribe Activity"
                description="Updates from your tribes"
                value={settings.notifications.tribeActivity}
                onChange={(v) => updateSetting("notifications", "tribeActivity", v)}
              />
              <Separator className="my-1 bg-zinc-800" />
              <ToggleRow
                icon={Music2}
                label="New Track Releases"
                description="When musicians you follow release tracks"
                value={settings.notifications.newTracks}
                onChange={(v) => updateSetting("notifications", "newTracks", v)}
              />
              <Separator className="my-1 bg-zinc-800" />
              <ToggleRow
                icon={Radio}
                label="Tribe Leaderboard"
                description="Weekly tribe ranking updates"
                value={settings.notifications.tribeLeaderboard}
                onChange={(v) => updateSetting("notifications", "tribeLeaderboard", v)}
              />
            </div>

            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
              <SectionHeader title="Quiet Hours" description="Pause notifications during set hours" />
              <ToggleRow
                icon={Bell}
                label="Enable Quiet Hours"
                value={settings.notifications.quietHoursEnabled}
                onChange={(v) => updateSetting("notifications", "quietHoursEnabled", v)}
              />
              {settings.notifications.quietHoursEnabled && (
                <div className="flex items-center gap-3 mt-3 pl-11">
                  <div className="flex-1">
                    <label className="text-xs text-zinc-500 mb-1 block">Start</label>
                    <Input
                      type="time"
                      value={settings.notifications.quietHoursStart}
                      onChange={(e) =>
                        updateSetting("notifications", "quietHoursStart", e.target.value)
                      }
                      className="bg-zinc-800 border-zinc-700 text-white text-xs"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-zinc-500 mb-1 block">End</label>
                    <Input
                      type="time"
                      value={settings.notifications.quietHoursEnd}
                      onChange={(e) =>
                        updateSetting("notifications", "quietHoursEnd", e.target.value)
                      }
                      className="bg-zinc-800 border-zinc-700 text-white text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ─── Privacy ────────────────────────────────────────────── */}
          <TabsContent value="privacy" className="mt-4 space-y-6">
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
              <SectionHeader
                title="Location & Presence"
                description="Control who can see your location and activity"
              />
              <ToggleRow
                icon={MapPin}
                label="Share Location"
                description="Allow other users to see your general location"
                value={settings.privacy.locationSharing}
                onChange={(v) => updateSetting("privacy", "locationSharing", v)}
              />
              <Separator className="my-1 bg-zinc-800" />
              <ToggleRow
                icon={Eye}
                label="Listening Activity"
                description="Show what you're listening to in real-time"
                value={settings.privacy.showListeningActivity}
                onChange={(v) => updateSetting("privacy", "showListeningActivity", v)}
              />
            </div>

            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
              <SectionHeader title="Profile Visibility" />
              <ToggleRow
                icon={User}
                label="Public Profile"
                description="Anyone can view your profile and listening history"
                value={settings.privacy.profilePublic}
                onChange={(v) => updateSetting("privacy", "profilePublic", v)}
              />
              <Separator className="my-1 bg-zinc-800" />
              <ToggleRow
                icon={Shield}
                label="Allow Tribe Discovery"
                description="Allow yourself to be found by tribe members"
                value={settings.privacy.allowTribeDiscovery}
                onChange={(v) => updateSetting("privacy", "allowTribeDiscovery", v)}
              />
            </div>

            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
              <SectionHeader title="Data & Analytics" />
              <ToggleRow
                icon={Share2}
                label="Share Analytics"
                description="Help improve Amplify by sharing anonymous usage data"
                value={settings.privacy.shareAnalytics}
                onChange={(v) => updateSetting("privacy", "shareAnalytics", v)}
              />
            </div>
          </TabsContent>

          {/* ─── Theme / Display ─────────────────────────────────────── */}
          <TabsContent value="theme" className="mt-4 space-y-6">
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
              <SectionHeader title="Appearance" />
              <SelectRow
                icon={Palette}
                label="Theme Mode"
                value={settings.theme.mode}
                onChange={(v) => updateSetting("theme", "mode", v)}
                options={[
                  { value: "dark", label: "Dark" },
                  { value: "light", label: "Light" },
                  { value: "system", label: "System" },
                ]}
              />
              <Separator className="my-1 bg-zinc-800" />
              <SelectRow
                icon={Sparkles}
                label="Accent Color"
                value={settings.theme.accentColor}
                onChange={(v) =>
                  updateSetting("theme", "accentColor", v as ThemeSettings["accentColor"])
                }
                options={[
                  { value: "violet", label: "Violet" },
                  { value: "cyan", label: "Cyan" },
                  { value: "pink", label: "Pink" },
                  { value: "green", label: "Green" },
                  { value: "orange", label: "Orange" },
                ]}
              />
            </div>

            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
              <SectionHeader title="Accessibility" />
              <ToggleRow
                icon={Sparkles}
                label="Reduce Motion"
                description="Minimize animations and transitions"
                value={settings.theme.reduceMotion}
                onChange={(v) => updateSetting("theme", "reduceMotion", v)}
              />
              <Separator className="my-1 bg-zinc-800" />
              <ToggleRow
                icon={Eye}
                label="High Contrast"
                description="Increase contrast for better visibility"
                value={settings.theme.highContrast}
                onChange={(v) => updateSetting("theme", "highContrast", v)}
              />
            </div>
          </TabsContent>

          {/* ─── Musician-specific ──────────────────────────────────── */}
          {isMusicianOrAdmin && (
            <TabsContent value="musician" className="mt-4 space-y-6">
              <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
                <SectionHeader
                  title="Stage Defaults"
                  description="Default settings for new AR stages"
                />
                <SelectRow
                  icon={Sparkles}
                  label="Default Visualization"
                  value={settings.musician.defaultVisualization}
                  onChange={(v) => updateSetting("musician", "defaultVisualization", v)}
                  options={[
                    { value: "PARTICLE_SYSTEM", label: "Particle System" },
                    { value: "GEOMETRY_PULSE", label: "Geometry Pulse" },
                    { value: "WAVEFORM_RIBBON", label: "Waveform Ribbon" },
                    { value: "FREQUENCY_BARS", label: "Frequency Bars" },
                    { value: "LIGHT_SHOW", label: "Light Show" },
                    { value: "SHADER_EFFECT", label: "Shader Effect" },
                  ]}
                />
                <Separator className="my-1 bg-zinc-800" />
                <SliderRow
                  icon={MapPin}
                  label="Default Geofence Radius"
                  description="Default stage detection distance"
                  value={settings.musician.defaultStageRadius}
                  onChange={(v) => updateSetting("musician", "defaultStageRadius", v)}
                  min={10}
                  max={200}
                  unit="m"
                />
                <Separator className="my-1 bg-zinc-800" />
                <SliderRow
                  icon={Radio}
                  label="Geofence Alert Radius"
                  description="Distance at which users get proximity alerts"
                  value={settings.musician.geofenceRadius}
                  onChange={(v) => updateSetting("musician", "geofenceRadius", v)}
                  min={25}
                  max={500}
                  unit="m"
                />
              </div>

              <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
                <SectionHeader title="Playback Behavior" />
                <ToggleRow
                  icon={Radio}
                  label="Auto-activate Stages"
                  description="Stages automatically go live when you arrive"
                  value={settings.musician.autoActivateStages}
                  onChange={(v) => updateSetting("musician", "autoActivateStages", v)}
                />
                <Separator className="my-1 bg-zinc-800" />
                <ToggleRow
                  icon={Sparkles}
                  label="Haptic Feedback"
                  description="Vibrate on beat during AR performances"
                  value={settings.musician.hapticFeedback}
                  onChange={(v) => updateSetting("musician", "hapticFeedback", v)}
                />
              </div>

              <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
                <SectionHeader title="AI & Analytics" />
                <ToggleRow
                  icon={Share2}
                  label="Share Analytics with AI"
                  description="Allow AI Studio to access your stage analytics"
                  value={settings.musician.shareAnalyticsWithAI}
                  onChange={(v) => updateSetting("musician", "shareAnalyticsWithAI", v)}
                />
              </div>
            </TabsContent>
          )}

          {/* ─── Account ───────────────────────────────────────────── */}
          <TabsContent value="account" className="mt-4 space-y-6">
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
              <SectionHeader title="Profile Information" />
              <InputRow
                icon={User}
                label="Display Name"
                value={settings.account.displayName}
                onChange={(v) => updateSetting("account", "displayName", v)}
                placeholder="Your display name"
              />
              <Separator className="my-1 bg-zinc-800" />
              <InputRow
                icon={User}
                label="Email"
                value={settings.account.email}
                onChange={(v) => updateSetting("account", "email", v)}
                type="email"
                placeholder="your@email.com"
              />
              <Separator className="my-1 bg-zinc-800" />
              <InputRow
                icon={User}
                label="Bio"
                value={settings.account.bio}
                onChange={(v) => updateSetting("account", "bio", v)}
                placeholder="Tell us about yourself"
                multiline
              />
            </div>

            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
              <SectionHeader
                title="Change Password"
                description="Leave blank to keep your current password"
              />
              <InputRow
                icon={Shield}
                label="Current Password"
                value={settings.account.currentPassword}
                onChange={(v) => updateSetting("account", "currentPassword", v)}
                type="password"
                placeholder="••••••••"
              />
              <Separator className="my-1 bg-zinc-800" />
              <InputRow
                icon={Shield}
                label="New Password"
                value={settings.account.newPassword}
                onChange={(v) => updateSetting("account", "newPassword", v)}
                type="password"
                placeholder="Choose a new password"
              />
              <Separator className="my-1 bg-zinc-800" />
              <InputRow
                icon={Shield}
                label="Confirm Password"
                value={settings.account.confirmPassword}
                onChange={(v) => updateSetting("account", "confirmPassword", v)}
                type="password"
                placeholder="Confirm your new password"
              />
            </div>

            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
              <SectionHeader
                title="Danger Zone"
                description="Irreversible actions — please be certain"
              />
              <div className="flex items-center justify-between py-3 px-1">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-red-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Shield className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">Delete Account</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Permanently delete your account and all data
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-4 border-red-700 text-red-400 hover:bg-red-950 hover:text-red-300 hover:border-red-600"
                >
                  Delete
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
