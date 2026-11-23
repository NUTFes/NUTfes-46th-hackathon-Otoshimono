import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "技大祭 落とし物管理",
  description: "技大祭の落とし物を届け出・管理するためのアプリ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
