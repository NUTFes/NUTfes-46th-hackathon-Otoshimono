import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Page, PageHeading, StaffHeader, StaffTabs } from "@/components/ui";
import { isCategoryCode } from "@/lib/categories";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { describeCategory } from "@/lib/item-registration";
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
  /** 照合した物の管理番号（#15 の matched_item_id。受取案内を送っていなければ null） */
  matched_management_number: string | null;
};

async function Reports({ searchParams }: Pick<PageProps<"/staff/reports">, "searchParams">) {
  await requireStaff();
  const { status: rawStatus } = await searchParams;
  // 一覧にない値（でたらめな ?status=）は、絞り込まずに全件を出す
  const status = isLostReportStatus(rawStatus) ? rawStatus : null;

  const { rows } = await db.query<Row>(
    `SELECT r.id, r.report_number, r.status, r.category, r.item_description, r.features, r.created_at,
            i.management_number AS matched_management_number
       FROM lost_reports r
       LEFT JOIN items i ON i.id = r.matched_item_id
      WHERE $1::text IS NULL OR r.status = $1
      ORDER BY r.created_at DESC, r.id DESC`,
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

/** 「財布」のようなカテゴリ名。「その他」は「その他（帽子）」のように届け出に書かれた品物の名前を添える（物品の画面と同じ）。 */
function itemName(row: Row): string {
  return isCategoryCode(row.category) ? describeCategory(row.category, row.item_description) : row.category;
}

/**
 * 「確認待ち / 11/23 13:58」のような状況の行。確認待ちのときは受け付けた日時を、
 * 見つかった旨を通知済みのときは照合した物の管理番号（M-REPORTS-NOTIFIED の「… / L-0042」）を添える。
 */
function describeStatus(row: Row): string {
  if (!isLostReportStatus(row.status)) return row.status;
  const label = lostReportStatusLabel(row.status);
  if (row.status === "pending") return `${label} / ${formatDateTime(row.created_at)}`;
  if (row.status === "found_notified" && row.matched_management_number) {
    return `${label} / ${row.matched_management_number}`;
  }
  return label;
}

