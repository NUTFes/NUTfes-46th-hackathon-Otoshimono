import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Page } from "@/components/ui";
import { db } from "@/lib/db";
import { isBoxCode } from "@/lib/drops";
import { DropForm } from "./drop-form";
import styles from "./drop.module.css";

export const metadata: Metadata = {
  title: "落とし物の受付 | 技大祭 落とし物管理",
  // QR の URL が検索結果に出ないようにする
  robots: { index: false, follow: false },
};

// V-DROP。拾得者が BOX の QR を読んで開く。仮登録は画面の表示後に DropForm が送る。
// BOX の名前は出さない（要件定義v2: 混乱を招くため削除）。
export default function DropPage(props: PageProps<"/b/[boxCode]">) {
  return (
    <Suspense fallback={null}>
      <DropPageForBox params={props.params} />
    </Suspense>
  );
}

// BOX があると分かってから「受付は完了しています」を出す（存在しない BOX で出さない）
async function DropPageForBox({ params }: Pick<PageProps<"/b/[boxCode]">, "params">) {
  const { boxCode } = await params;
  if (!isBoxCode(boxCode)) notFound();
  const { rowCount } = await db.query("SELECT 1 FROM boxes WHERE code = $1", [boxCode]);
  if (rowCount === 0) notFound();
  return (
    <Page>
      <div className={styles.thanks}>
        <h1 className={styles.title}>ご協力ありがとうございます。</h1>
        <p className={styles.instruction}>落とし物をこのBOXに入れてください。</p>
        <p className={styles.lead}>QRの読み取りで受付は完了しています。追加情報は、写真なしでも送信できます。</p>
      </div>
      <DropForm boxCode={boxCode} />
    </Page>
  );
}
