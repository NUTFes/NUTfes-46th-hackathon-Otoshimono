import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Page, PageHeading, StaffHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/staff-auth";
import { IssuedNumber } from "../issued-number";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "回収済の物を本登録 | 技大祭 落とし物管理",
};

// M-QUEUE: 回収済の物を BOX ごとに出す。行を押すと、その BOX の一番古い回収済の物の本登録へ進む。
export default function QueuePage(props: PageProps<"/staff/items/queue">) {
  return (
    <>
      <StaffHeader backHref="/staff/boxes" />
      <Page>
        <PageHeading title="回収済の物を本登録" description="保管場所へ持ち帰った物を、写真から登録します。" />
        <Suspense fallback={null}>
          <Queue searchParams={props.searchParams} />
        </Suspense>
      </Page>
    </>
  );
}

type Row = { code: string; name: string; area: string; collected: string; first_item_id: string };

async function Queue({ searchParams }: Pick<PageProps<"/staff/items/queue">, "searchParams">) {
  await requireStaff();
  const { issued } = await searchParams;
  const { rows } = await db.query<Row>(
    `SELECT b.code, b.name, b.area, count(*) AS collected,
            (array_agg(i.id ORDER BY i.dropped_at, i.id))[1] AS first_item_id
       FROM items i JOIN boxes b ON b.id = i.box_id
      WHERE i.status = 'collected'
      GROUP BY b.id
      ORDER BY min(i.collected_at), b.sort_order`,
  );

  return (
    <>
      <IssuedNumber issued={issued} />
      {rows.length === 0 ? (
        <p className={styles.muted}>本登録を待っている回収済の物はありません。</p>
      ) : (
        <ul className={styles.list}>
          {rows.map((row) => (
            <li key={row.code}>
              <Link href={`/staff/items/${row.first_item_id}/register`} className={styles.row}>
                <span className={styles.title}>{row.name}からの回収</span>
                <span className={styles.counts}>回収対象の通知 {row.collected}件</span>
                <span className={styles.meta}>{row.area} / 回収済</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className={styles.muted}>現物を1点ずつ登録するときに、管理番号を自動で発行します。</p>
    </>
  );
}
