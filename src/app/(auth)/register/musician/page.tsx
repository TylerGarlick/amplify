"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus, Music, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function MusicianRegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/register/musician", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, displayName, bio }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Registration failed. Please try again.");
    } else {
      toast.success("Application submitted! We'll review your request and notify you.");
      router.push("/login");
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link 
          href="/register" 
          className="inline-flex items-center text-xs text-zinc-500 hover:text-violet-400 transition-colors mb-3"
        >
          <ArrowLeft className="w-3 h-3 mr-1" />
          Back to regular signup
        </Link>
        <div className="flex items-center gap-2 mb-2">
          <Music className="w-5 h-5 text-violet-400" />
          <h1 className="text-xl font-bold text-white">Apply as Musician</h1>
        </div>
        <p className="text-sm text-zinc-500">
          Create an artist account to upload tracks and create AR stages
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-zinc-300 text-xs tracking-wider uppercase">Your Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-violet-500 h-11"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-zinc-300 text-xs tracking-wider uppercase">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-violet-500 h-11"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-zinc-300 text-xs tracking-wider uppercase">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Min. 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-violet-500 h-11"
          />
        </div>

        <div className="border-t border-zinc-800 pt-4 mt-6">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-4">Artist Profile</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="displayName" className="text-zinc-300 text-xs tracking-wider uppercase">Artist / Band Name</Label>
          <Input
            id="displayName"
            type="text"
            placeholder="The Midnight Echo"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-violet-500 h-11"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bio" className="text-zinc-300 text-xs tracking-wider uppercase">Bio (Optional)</Label>
          <textarea
            id="bio"
            placeholder="Tell us about your music..."
            value={bio}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBio(e.target.value)}
            rows={3}
            className="flex w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-950/50 border border-red-800/50 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11 bg-violet-600 hover:bg-violet-500 text-white font-medium tracking-wide shadow-lg shadow-violet-600/20"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <UserPlus className="w-4 h-4 mr-2" />
          )}
          {loading ? "Submitting application…" : "Submit Application"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="text-violet-400 hover:text-violet-300 transition-colors font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}