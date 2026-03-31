import type { Metadata } from "next";
import { TribePageClient } from "./TribePageClient";
import { SessionProvider } from "next-auth/react";

export const dynamic = "force-dynamic";
export const dynamicParams = false;

export const metadata: Metadata = {
  title: "Tribes — Amplify",
  description: "Join a music tribe and claim territories!",
};

export default function TribePage() {
  return (
    <SessionProvider>
      <TribePageClient />
    </SessionProvider>
  );
}
