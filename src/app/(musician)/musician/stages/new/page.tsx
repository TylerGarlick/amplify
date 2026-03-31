"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewStageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/musician/stages/create");
  }, [router]);

  return null;
}
