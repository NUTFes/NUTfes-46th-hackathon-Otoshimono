import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ButtonLink, Field, Input, Page, PageHeading, StaffHeader, StaffTabs } from "@/components/ui";
import { CATEGORIES, isCategoryCode } from "@/lib/categories";
import { isColorCode } from "@/lib/colors";
import { db } from "@/lib/db";
import { describeCategory, describeItemColor } from "@/lib/item-registration";
import { isItemStatus, itemStatusLabel } from "@/lib/item-status";
import { requireStaff } from "@/lib/staff-auth";
import { formatDateTime } from "@/lib/format";
import { ItemStatusFilter } from "./status-filter";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "物品一覧 | 技大祭 落とし物管理",
};

// M-ITEMS: 拾得物の一覧。?q= で管理番号・特徴などを探し、?state= で状態を絞り込む。
export default function ItemsPage(props: PageProps<"/staff/items">) {
  return (
    <>
      <StaffHeader />
      <Page>
        <PageHeading title="物品一覧" description="保管中の物品を確認・管理します。" />
        <StaffTabs current="items" />
        <Suspense fallback={null}>
          <Items searchParams={props.searchParams} />
        </Suspense>
      </Page>
    </>
  );
}

type Row = {
  id: string;
  status: string;
  management_number: string | null;
  category: string | null;
  category_note: string | null;
  color: string | null;
  color_note: string | null;
  storage_location: string | null;
  unknown_reason: string | null;
  box_name: string;
  box_area: string;
  dropped_at: Date;
  registered_at: Date | null;
};

async function Items({ searchParams }: Pick<PageProps<"/staff/items">, "searchParams">) {
  await requireStaff();
  const { q: rawQ, state: rawState } = await searchParams;
  const q = typeof rawQ === "string" ? rawQ.trim().slice(0, 100) : "";
  // 一覧にない値（でたらめな ?state=）は、絞り込まずに全件を出す
  const state = isItemStatus(rawState) ? rawState : null;
  // 「財布」のようにカテゴリ名で探したときは、そのカテゴリの物も出す
  const categories = q ? CATEGORIES.filter((c) => c.label.includes(q)).map((c) => c.code) : [];

  const { rows } = await db.query<Row>(
    `SELECT i.id, i.status, i.management_number, i.category, i.category_note, i.color, i.color_note,
            i.storage_location, i.unknown_reason, b.name AS box_name, b.area AS box_area,
            i.dropped_at, i.registered_at
       FROM items i JOIN boxes b ON b.id = i.box_id
      WHERE ($1::text IS NULL OR i.status = $1)
        AND ($2 = '' OR i.management_number ILIKE '%' || $2 || '%' OR i.description ILIKE '%' || $2 || '%'
             OR i.category_note ILIKE '%' || $2 || '%' OR i.color_note ILIKE '%' || $2 || '%'
             OR i.category = ANY($3::text[]))
      ORDER BY i.registered_at DESC NULLS LAST, i.dropped_at DESC, i.id
      LIMIT 200`,
    [state, q.replace(/[\\%_]/g, (c) => `\\${c}`), categories],
  );

  return (
    <>
      <form action="/staff/items" className={styles.search}>
        <Field label="管理番号・特徴で探す" htmlFor="items-q">
          <Input id="items-q" name="q" type="search" defaultValue={q} placeholder="例：L-0042 / 二つ折り財布" />
        </Field>
        {state && <input type="hidden" name="state" value={state} />}
      </form>
      <ButtonLink href="/staff/items/queue">回収済の物を本登録する</ButtonLink>
      <ItemStatusFilter value={state ?? ""} />
      {rows.length === 0 ? (
        <p className={styles.empty}>該当する物品はありません。</p>
      ) : (
        <ul className={styles.list}>
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/staff/items/${row.id}`} className={styles.row}>
                <span className={styles.title}>{title(row)}</span>
                <span className={styles.detail}>{detail(row)}</span>
                <span className={styles.meta}>
                  {itemStatusLabel(row.status)} / {formatDateTime(row.registered_at ?? row.dropped_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** 「財布 / L-0042」。管理番号のない物（仮登録済・回収済）は「正門前BOXの通知」。 */
function title(row: Row): string {
  if (!row.management_number) return `${row.box_name}の通知`;
  const name = row.category && isCategoryCode(row.category) ? describeCategory(row.category, row.category_note) : "—";
  return `${name} / ${row.management_number}`;
}

function detail(row: Row): string {
  switch (row.status) {
    case "registered": {
      const color = row.color && isColorCode(row.color) ? describeItemColor(row.color, row.color_note) : null;
      return [`${row.storage_location}に保管`, color].filter(Boolean).join(" / ");
    }
    case "handed_over":
      return "受渡記録あり";
    case "unknown":
      return `不明：${row.unknown_reason ?? ""}`;
    default:
      return row.box_area;
  }
}
