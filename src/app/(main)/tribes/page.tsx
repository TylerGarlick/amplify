import type { Metadata } from "next";
import { TribePageClient } from "./TribePageClient";

export const metadata: Metadata = {
  title: "Tribes — Amplify",
  description: "Join a music tribe and claim territories!",
};

export default function TribePage() {
  return <TribePageClient />;
}