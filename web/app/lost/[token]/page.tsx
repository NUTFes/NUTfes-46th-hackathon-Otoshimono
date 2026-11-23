import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DefinitionList, Notice, Page, PageHeading } from "@/components/ui";
import { categoryLabel, isCategoryCode, showsCount, type CategoryCode } from "@/lib/categories";
import { db } from "@/lib/db";
import { isLostReportToken } from "@/lib/lost-reports";
import { RefreshButton } from "./refresh-button";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "紛失届の受付・確認状況 | 技大祭 落とし物管理",
  // 届け出た本人だけが開く URL なので、検索結果に出さない
  robots: { index: false, follow: false },
};

// V-STATUS / V-STATUS-ZERO: 紛失届の受付・確認状況。届け出た本人だけが token 付きの URL で開く。
export default function LostStatusPage(props: PageProps<"/lost/[token]">) {
  return (
    <Page>
      <Suspense fallback={<PageHeading title="紛失届を登録しました" />}>
        <LostStatus params={props.params} />
      </Suspense>
    </Page>
  );
}

type Report = {
  report_number: string;
  category: string;
  item_description: string | null;
  features: string;
};

async function LostStatus({ params }: Pick<PageProps<"/lost/[token]">, "params">) {
  const { token } = await params;
  if (!isLostReportToken(token)) notFound();

  const { rows } = await db.query<Report>(
    "SELECT report_number, category, item_description, features FROM lost_reports WHERE token = $1",
    [token],
  );
  const report = rows[0];
  if (!report || !isCategoryCode(report.category)) notFound();

  const category = report.category;
  const count = showsCount(category) ? await countRegistered(category) : null;
  const label = categoryLabel(category);

  return (
    <>
      <PageHeading title="紛失届を登録しました" description={describeStatus(count)} />

      <Notice title="結果はメールでお知らせします">この画面のURLもメールでお送りしました。</Notice>

      {count !== null && (
        <section className={styles.card} aria-labelledby="status-title">
          <h2 id="status-title" className={styles.cardTitle}>
            現在の届出状況
          </h2>
          <p className={styles.count}>
            {count > 0 ? `「${label}」が${count}件届いています。` : `「${label}」はまだ届いていません。`}
          </p>
          <p className={styles.muted}>
            カテゴリ全体の件数です。あなたの物かどうかは、実行委員が特徴を照合して確認します。
          </p>
        </section>
      )}

      <DefinitionList
        title="登録した内容"
        items={[
          { label: "受付番号", value: report.report_number },
          { label: "カテゴリ", value: label },
          ...(report.item_description ? [{ label: "なくした物", value: report.item_description }] : []),
          { label: "特徴", value: <span className={styles.multiline}>{report.features}</span> },
        ]}
      />

      <p className={styles.muted}>まだ見つからない場合も、後から届いた物と照合を続けます。</p>
      <RefreshButton />
      <p className={styles.muted}>紛失届を取り消したい場合は、本部の実行委員へお知らせください。</p>
    </>
  );
}

/** 同じカテゴリで本登録済の拾得物の件数（受渡済・不明は数えない）。 */
async function countRegistered(category: CategoryCode): Promise<number> {
  const { rows } = await db.query<{ count: string }>(
    "SELECT count(*) FROM items WHERE status = 'registered' AND category = $1",
    [category],
  );
  return Number(rows[0].count);
}

/** 見出しの下の文言（要件定義v2 要求7）。count が null は「その他」で件数を出さないとき。 */
function describeStatus(count: number | null): string {
  if (count === null) return "実行委員が確認します。届いたらメールで連絡します。";
  if (count > 0) return "実行委員が本人確認中です。";
  return "今後届く可能性があります。届いたらメールで連絡します。";
}
