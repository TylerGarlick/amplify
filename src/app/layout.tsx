import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const mono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Amplify — AR Concert Experience",
  description:
    "Location-aware augmented reality music visualizations. Experience music like never before.",
  manifest: "/manifest.json",
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${mono.variable} font-mono bg-black text-white antialiased`}>
        {children}
        <Toaster position="top-center" theme="dark" />
      </body>
    </html>
  );
}
