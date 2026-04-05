import type { Metadata } from "next";
import { DemoARView } from "@/components/ar/DemoARView";

export const metadata: Metadata = {
  title: "AR Demo — Amplify",
  description: "Experience audio-reactive AR music visualizations.",
};

export default function DemoARPage() {
  return <DemoARView />;
}
