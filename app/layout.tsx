import type { Metadata } from "next";
import "./globals.css";
import "./tradingview.css";

export const metadata: Metadata = {
  title: "逐刻 · K线回放",
  description: "真实行情，多周期回放与画线复盘工作台。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
