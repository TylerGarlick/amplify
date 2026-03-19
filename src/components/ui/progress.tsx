"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
}

function Progress({ 
  className, 
  value = 0, 
  max = 100,
  ...props 
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  return (
    <div
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-zinc-800",
        className
      )}
      {...props}
    >
      <div
        className="h-full bg-gradient-to-r from-violet-600 to-pink-500 transition-all duration-300"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export { Progress };