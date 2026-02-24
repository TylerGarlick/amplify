export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-black overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-950/40 via-black to-black pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Logo */}
      <div className="relative z-10 mb-8 flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/40">
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" stroke="currentColor" strokeWidth={1.5}>
              <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            <div className="absolute -inset-0.5 rounded-xl bg-violet-400/30 blur-sm -z-10" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">amplify</span>
        </div>
        <p className="text-xs text-zinc-500 tracking-widest uppercase">AR Concert Experience</p>
      </div>

      {/* Form card */}
      <div className="relative z-10 w-full max-w-sm px-4">
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl shadow-2xl shadow-black/50 p-8">
          {children}
        </div>
      </div>

      {/* Bottom grid lines decorative */}
      <div
        className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, transparent, #7c3aed 100%), repeating-linear-gradient(90deg, #7c3aed 0px, transparent 1px, transparent 60px, #7c3aed 61px)",
          backgroundSize: "61px 100%, 61px 100%",
        }}
      />
    </div>
  );
}
