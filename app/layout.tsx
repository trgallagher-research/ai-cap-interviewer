import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aligned Interviewer",
  description: "AI-led interviews for qualitative research.",
};

// viewportFit: "cover" lets the safe-area insets used in globals.css take effect on
// notched devices; width/initial-scale keep mobile rendering at device width.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
