import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

// 日本語の文字は数が多いので先読みせず、使った文字の分だけ読み込む
const notoSansJp = Noto_Sans_JP({
  weight: ["400", "500"],
  display: "swap",
  preload: false,
  variable: "--font-noto-sans-jp",
});

export const metadata: Metadata = {
  title: "技大祭 落とし物管理",
  description: "技大祭の落とし物を届け出・管理するためのアプリ",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={notoSansJp.variable}>
      <body>{children}</body>
    </html>
  );
}
