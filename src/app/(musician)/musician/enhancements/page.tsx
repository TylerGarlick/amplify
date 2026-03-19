import type { Metadata } from "next";
import { EnhancementsClient } from "./EnhancementsClient";

export const metadata: Metadata = {
  title: "Enhancements — Amplify Musician",
  description: "Apply to enhance your stages for 2x influence boost.",
};

export default function EnhancementsPage() {
  return <EnhancementsClient />;
}