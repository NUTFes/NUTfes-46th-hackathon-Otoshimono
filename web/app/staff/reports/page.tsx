import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Page, PageHeading, StaffHeader, StaffTabs } from "@/components/ui";
import { categoryLabel, isCategoryCode } from "@/lib/categories";
import { db } from "@/lib/db";
import { isLostReportStatus, lostReportStatusLabel } from "@/lib/lost-reports";
import { requireStaff } from "@/lib/staff-auth";
import { StatusFilter } from "./status-filter";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "紛失届 | 技大祭 落とし物管理",
};

// M-REPORTS / M-REPORTS-NOTIFIED / M-REPORTS-SEARCHING: 実行委員の紛失届一覧（新しい順）。
export default function StaffReportsPage(props: PageProps<"/staff/reports">) {
  return (
    <>
      <StaffHeader />
      <Page>
        <PageHeading title="紛失届" description="紛失届を確認し、メールで連絡します。" />
        <StaffTabs current="reports" />
        <Suspense fallback={null}>
          <Reports searchParams={props.searchParams} />
        </Suspense>
      </Page>
    </>
  );
}

type Row = {
  id: string;
  report_number: string;
  status: string;
  category: string;
  item_description: string | null;
  features: string;
  created_at: Date;
};

async function Reports({ searchParams }: Pick<PageProps<"/staff/reports">, "searchParams">) {
  await requireStaff();
  const { status: rawStatus } = await searchParams;
  // 一覧にない値（でたらめな ?status=）は、絞り込まずに全件を出す
  const status = isLostReportStatus(rawStatus) ? rawStatus : null;

  const { rows } = await db.query<Row>(
    `SELECT id, report_number, status, category, item_description, features, created_at
       FROM lost_reports
      WHERE $1::text IS NULL OR status = $1
      ORDER BY created_at DESC, id DESC`,
    [status],
  );

  return (
    <>
      <StatusFilter value={status ?? ""} />
      {rows.length === 0 ? (
        <p className={styles.empty}>該当する紛失届はありません。</p>
      ) : (
        <ul className={styles.list}>
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/staff/reports/${row.id}`} className={styles.row}>
                <span className={styles.title}>
                  {itemName(row)} / {row.report_number}
                </span>
                <span className={styles.features}>{row.features}</span>
                <span className={styles.meta}>{describeStatus(row)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** 「財布」のようなカテゴリ名。「その他」は届け出に書かれた品物の名前を出す。 */
function itemName(row: Row): string {
  if (row.category === "other" && row.item_description) return row.item_description;
  return isCategoryCode(row.category) ? categoryLabel(row.category) : row.category;
}

/** 「確認待ち / 11/23 13:58」のような状況の行。確認待ちのときだけ受け付けた日時を添える。 */
function describeStatus(row: Row): string {
  if (!isLostReportStatus(row.status)) return row.status;
  const label = lostReportStatusLabel(row.status);
  return row.status === "pending" ? `${label} / ${formatDateTime(row.created_at)}` : label;
}

const DATE_TIME = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDateTime(date: Date): string {
  return DATE_TIME.format(date);
}
