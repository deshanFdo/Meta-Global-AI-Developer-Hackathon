import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BlueprintTo3D - Floor Plan to 3D Digital Twin",
  description:
    "Upload a residential floor plan and get an interactive 3D reconstruction with Meta Muse Spark, SAM 3.1 and Muse Image.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
