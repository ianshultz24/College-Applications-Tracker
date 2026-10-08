import type { Metadata, Viewport } from "next";
import { Geist, Newsreader } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

// Self-hosted at build time by next/font, so they're served from /collegetracker/_next.
const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: "College Tracker",
  description: "My college applications.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2a2623",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${newsreader.variable}`}>
      <body>
        {children}
        <Toaster position="bottom-center" offset={24} mobileOffset={16} gap={8} visibleToasts={3} />
      </body>
    </html>
  );
}
