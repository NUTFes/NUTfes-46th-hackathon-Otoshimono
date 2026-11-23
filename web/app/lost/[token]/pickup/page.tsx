import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Notice, Page, PageHeading } from "@/components/ui";
import { db } from "@/lib/db";
import { isLostReportToken } from "@/lib/lost-reports";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "受け取りのご案内 | 技大祭 落とし物管理",
  // 届け出た本人だけが開く URL なので、検索結果に出さない
  robots: { index: false, follow: false },
};

// V-PICKUP: 照合が済んだ落とし主が、管理番号と保管場所を確かめる（受け取りのときに実行委員へ見せる）。
// 受取案内（E-FOUND）のリンクから開く。照合前の紛失届や、違う token では管理番号を出さない（not-found）。
export default function PickupPage(props: PageProps<"/lost/[token]/pickup">) {
  return (
    <Page>
      <Suspense fallback={null}>
        <Pickup params={props.params} />
      </Suspense>
    </Page>
  );
}

type Matched = { management_number: string; storage_location: string; item_status: string };

async function Pickup({ params }: Pick<PageProps<"/lost/[token]/pickup">, "params">) {
  const { token } = await params;
  if (!isLostReportToken(token)) notFound();

  // 実行委員が受取案内を送った（found_notified）紛失届の、照合した物（#15 の matched_item_id）だけを出す
  const { rows } = await db.query<Matched>(
    `SELECT i.management_number, i.storage_location, i.status AS item_status
       FROM lost_reports r
       JOIN items i ON i.id = r.matched_item_id
      WHERE r.token = $1
        AND r.status = 'found_notified'
        AND i.management_number IS NOT NULL
        AND i.storage_location IS NOT NULL`,
    [token],
  );
  const matched = rows[0];
  if (!matched) notFound();

  // 案内を送った後に、物が別の人に渡ったり見当たらなくなったりしたら、無い物を取りに来てもらわないよう管理番号は出さない
  if (matched.item_status !== "registered") {
    return (
      <PageHeading
        title="ご案内を確認しています"
        description="お手数ですが、実行委員会の本部にお問い合わせください。"
      />
    );
  }

  return (
    <>
      <PageHeading title="落とし物が見つかりました" description="受け取り場所へお越しください。" />

      <section className={styles.card} aria-labelledby="pickup-number-title">
        <h2 id="pickup-number-title" className={styles.cardTitle}>
          管理番号
        </h2>
        <p className={styles.number}>{matched.management_number}</p>
        <dl className={styles.details}>
          <div className={styles.row}>
            <dt className={styles.label}>保管場所</dt>
            <dd className={styles.value}>{matched.storage_location}</dd>
          </div>
        </dl>
      </section>

      <Notice title="この画面か、届いたメールを見せてください">
        受け取りの際に管理番号を実行委員へお伝えください。
      </Notice>

      <p className={styles.muted}>確認済みの紛失届からのみ、この案内を開けます。</p>
    </>
  );
}
