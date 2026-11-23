import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Notice, Page, PageHeading, StaffHeader, StaffTabs } from "@/components/ui";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/staff-auth";
import { minutesAgo } from "./time";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "BOXの通知・巡回 | 技大祭 落とし物管理",
};

// M-BOXES: BOX ごとの仮登録（QR から届いた通知）の件数。巡回で回る順の目安にする。
export default function StaffBoxesPage() {
  return (
    <>
      <StaffHeader />
      <Page>
        <PageHeading title="BOXの通知・巡回" description="BOXごとの新着通知を確認します。" />
        <StaffTabs current="boxes" />
        <Notice title="貴重品チェックのあるBOXを先に確認">件数はBOXのQRから届いた仮登録の件数です。</Notice>
        <Suspense fallback={null}>
          <Boxes />
        </Suspense>
      </Page>
    </>
  );
}

type Row = {
  code: string;
  name: string;
  area: string;
  provisional: string;
  valuable: string;
  oldest_minutes: number | null;
};

async function Boxes() {
  await requireStaff();
  // 貴重品チェックのある BOX → 古い通知のある BOX → 通知のない BOX（登録順）
  const { rows } = await db.query<Row>(
    `SELECT b.code, b.name, b.area,
            count(i.id) AS provisional,
            count(i.id) FILTER (WHERE i.is_valuable) AS valuable,
            floor(extract(epoch FROM now() - min(i.dropped_at)) / 60)::int AS oldest_minutes
       FROM boxes b
       LEFT JOIN items i ON i.box_id = b.id AND i.status = 'provisional'
      GROUP BY b.id
      ORDER BY count(i.id) FILTER (WHERE i.is_valuable) > 0 DESC,
               min(i.dropped_at) ASC NULLS LAST,
               b.sort_order`,
  );
  return (
    <ul className={styles.list}>
      {rows.map((row) => (
        <li key={row.code}>
          <Link href={`/staff/boxes/${row.code}`} className={styles.row}>
            <span className={styles.title}>{row.name}</span>
            <span className={styles.counts}>
              仮登録 {row.provisional}件 / 貴重品チェック {row.valuable}件
            </span>
            <span className={styles.meta}>
              {row.area} / {row.oldest_minutes === null ? "通知なし" : `最も古い通知 ${minutesAgo(row.oldest_minutes)}`}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
