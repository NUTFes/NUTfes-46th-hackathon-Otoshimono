import type { Metadata } from "next";
import { LostReportForm } from "./lost-form";
import styles from "./lost.module.css";

export const metadata: Metadata = {
  title: "紛失届の登録 | 技大祭 落とし物管理",
};

// V-LOST: 紛失届の登録
export default function LostPage() {
  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>紛失届の登録</h1>
      <p className={styles.lead}>なくした物の特徴を教えてください。</p>
      <LostReportForm />
    </main>
  );
}
