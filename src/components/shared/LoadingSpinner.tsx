export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = { sm: "w-5 h-5", md: "w-8 h-8", lg: "w-12 h-12" };
  return (
    <div className="flex items-center justify-center">
      <div className={`${sizeClasses[size]} relative`}>
        <div className="absolute inset-0 rounded-full border-2 border-violet-600/20" />
        <div className="absolute inset-0 rounded-full border-2 border-t-violet-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        <div className="absolute inset-1 rounded-full border border-t-pink-500/50 border-r-transparent border-b-transparent border-l-transparent animate-spin" style={{ animationDuration: "0.6s", animationDirection: "reverse" }} />
      </div>
    </div>
  );
}
