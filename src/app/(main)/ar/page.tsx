import type { Metadata } from "next";
import { ARViewClient } from "@/components/ar/ARViewClient";

export const metadata: Metadata = {
  title: "AR View — Amplify",
  description: "Experience location-aware AR music visualizations.",
};

export default function ARPage() {
  return <ARViewClient />;
}
