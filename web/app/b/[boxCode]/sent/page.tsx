import type { Metadata } from "next";
import { Page } from "@/components/ui";
import styles from "../drop.module.css";

export const metadata: Metadata = {
  title: "受付完了 | 技大祭 落とし物管理",
  robots: { index: false, follow: false },
};

// V-DROP-SENT
export default function DropSentPage() {
  return (
    <Page className={styles.sent}>
      <h1 className={styles.title}>ご協力ありがとうございました。</h1>
      <p>落とし物をBOXに入れてください。</p>
      <p>この画面を閉じて大丈夫です。</p>
    </Page>
  );
}
