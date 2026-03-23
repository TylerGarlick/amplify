import type { Metadata } from "next";
import { GeofenceNotificationProvider } from "@/contexts/GeofenceNotificationContext";
import { ARViewClient } from "@/components/ar/ARViewClient";

export const metadata: Metadata = {
  title: "AR View — Amplify",
  description: "Experience location-aware AR music visualizations.",
};

export default function ARPage() {
  return (
    <GeofenceNotificationProvider nearbyRadius={2000} debounceMs={10_000}>
      <ARViewClient />
    </GeofenceNotificationProvider>
  );
}
