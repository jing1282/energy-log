import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/energy/bottom-nav";
import { PwaRegister } from "@/components/energy/pwa-register";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "能量记录",
  description: "每天一两分钟,记录精力,给自己的能量账户存点款。",
  manifest: `${BASE}/manifest.webmanifest`,
  applicationName: "能量记录",
  appleWebApp: { capable: true, title: "能量记录", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  other: { "apple-mobile-web-app-capable": "yes" },
  icons: {
    icon: [
      { url: `${BASE}/icons/icon-192.png`, sizes: "192x192", type: "image/png" },
      { url: `${BASE}/icons/icon.svg`, type: "image/svg+xml" },
    ],
    apple: [{ url: `${BASE}/icons/apple-touch-icon.png`, sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#eef7f1",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full bg-[radial-gradient(120%_60%_at_50%_0%,oklch(0.95_0.045_170),transparent_70%),linear-gradient(180deg,oklch(0.985_0.015_100),oklch(0.965_0.02_160))] bg-fixed">
        <div className="relative mx-auto min-h-dvh w-full max-w-[430px] sm:border-x sm:border-white/60 sm:bg-background/40 sm:shadow-[0_0_60px_-20px_oklch(0.5_0.08_180/0.25)]">
          {children}
          <BottomNav />
          <PwaRegister />
        </div>
      </body>
    </html>
  );
}
