import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agen.cy — Build Better Requirements",
  description:
    "AI-powered interface for constructing website requirements with live preview",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="h-full">
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
