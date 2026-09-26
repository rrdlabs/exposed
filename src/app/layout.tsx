import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const siteUrl = "https://rrdlabs.online/exposed";

const title = "Exposed — continuous attack-surface monitoring";

const description =
  "Exposed watches your public footprint and tells you when something changes. Free instant exposure report for any domain. Daily re-scans and change alerts from $19/mo. Built by rrdlabs.online.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  applicationName: "Exposed",
  keywords: [
    "attack surface monitoring",
    "domain monitoring",
    "subdomain monitoring",
    "certificate transparency",
    "dangling DNS",
    "subdomain takeover",
    "TLS monitoring",
    "security headers",
    "exposure scanning",
    "rrdlabs",
  ],
  openGraph: {
    title,
    description,
    url: siteUrl,
    siteName: "Exposed",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/",
  },
};

export const viewport: Viewport = {
  themeColor: "#04060c",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
