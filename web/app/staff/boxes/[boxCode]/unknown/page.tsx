import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Fragment, Suspense } from "react";
import { ButtonLink, DefinitionList, Page, PageHeading, StaffHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { isBoxCode } from "@/lib/drops";
import { itemStatusLabel } from "@/lib/item-status";
import { requireStaff } from "@/lib/staff-auth";
import { formatDateTime } from "@/lib/format";
import { RestoreButton, UnknownForm } from "../../../unknown-actions";
import styles from "../page.module.css";

export const metadata: Metadata = {
  title: "見当たらない通知を不明にする | 技大祭 落とし物管理",
};

// M-BOX-UNKNOWN・M-BOX-UNKNOWN-STATE: BOX の通知（仮登録済・回収済）のうち、物が見当たらないものを理由付きで不明にし、
// 見つかったら元に戻す。不明にした通知の記録と、入力を1画面に並べる。
export default function BoxUnknownPage(props: PageProps<"/staff/boxes/[boxCode]/unknown">) {
  return (
    <Suspense fallback={<StaffHeader />}>
      <BoxUnknown params={props.params} />
    </Suspense>
  );
}

type Notification = {
  id: string;
  status: string;
  previous_status: string | null;
  unknown_reason: string | null;
  unknown_note: string | null;
  /** 元に戻すときに、画面を作った後で不明の記録が変わっていないかを確かめる（DB の文字列のまま） */
  updated_at: string;
  dropped_at: Date;
  has_photo: boolean;
};

async function BoxUnknown({ params }: Pick<PageProps<"/staff/boxes/[boxCode]/unknown">, "params">) {
  await requireStaff();
  const { boxCode } = await params;
  if (!isBoxCode(boxCode)) notFound();

  const box = await db.query<{ name: string; area: string }>("SELECT name, area FROM boxes WHERE code = $1", [boxCode]);
  if (!box.rows[0]) notFound();
  const { name, area } = box.rows[0];

  // この BOX の通知のうち、まだ本登録していないもの（仮登録済・回収済）と、そこから不明にしたもの
  const { rows } = await db.query<Notification>(
    `SELECT i.id, i.status, i.previous_status, i.unknown_reason, i.unknown_note, i.updated_at::text AS updated_at, i.dropped_at,
            EXISTS (SELECT 1 FROM item_photos p WHERE p.item_id = i.id AND p.kind = 'drop') AS has_photo
       FROM items i JOIN boxes b ON b.id = i.box_id
      WHERE b.code = $1
        AND (i.status IN ('provisional', 'collected')
             OR (i.status = 'unknown' AND i.previous_status IN ('provisional', 'collected')))
      ORDER BY i.dropped_at, i.id`,
    [boxCode],
  );
  const targets = rows.filter((row) => row.status !== "unknown");
  const unknowns = rows.filter((row) => row.status === "unknown");
  const boxHref = `/staff/boxes/${boxCode}`;

  return (
    <>
      <StaffHeader backHref={boxHref} />
      <Page>
        <PageHeading title={unknowns.length > 0 ? name : "見当たらない通知を不明にする"} description={unknowns.length > 0 ? area : `${name} / ${area}`} />
        {unknowns.length > 0 && (
          <>
            <DefinitionList
              title="BOXの通知"
              items={[
                { label: "仮登録済", value: `${rows.filter((row) => row.status === "provisional").length}件` },
                { label: "回収済", value: `${rows.filter((row) => row.status === "collected").length}件` },
                { label: "不明", value: `${unknowns.length}件` },
              ]}
            />
            {unknowns.map((row) => (
              <Fragment key={row.id}>
                <DefinitionList
                  title="不明の理由"
                  items={[
                    { label: "対象", value: describe(row) },
                    { label: "理由", value: row.unknown_reason ?? "—" },
                    ...(row.unknown_note ? [{ label: "補足", value: <span className={styles.multiline}>{row.unknown_note}</span> }] : []),
                  ]}
                />
                <p className={styles.muted}>見つかった場合は、元の{itemStatusLabel(row.previous_status ?? "")}に戻せます。</p>
                <div className={styles.actions}>
                  <RestoreButton itemId={row.id} updatedAt={row.updated_at} label="見つかった通知を元に戻す" />
                  {row === unknowns[unknowns.length - 1] && (
                    <ButtonLink href="/staff/boxes" variant="secondary">
                      BOX一覧に戻る
                    </ButtonLink>
                  )}
                </div>
              </Fragment>
            ))}
          </>
        )}
        {targets.length > 0 ? (
          <>
            {unknowns.length > 0 && <h2 className={styles.sectionTitle}>ほかの通知を不明にする</h2>}
            <p className={styles.muted}>箱の中と周囲を確認し、物が見当たらない通知を1件ずつ記録します。</p>
            {/* 不明にした通知は選択肢から消えるので、選択肢が変わったら選んだ通知も先頭に戻す */}
            <UnknownForm
              key={targets.map((row) => row.id).join()}
              targets={targets.map((row) => ({ id: row.id, label: describe(row), status: row.status }))}
              backHref={boxHref}
            />
          </>
        ) : (
          <p className={styles.muted}>不明にできる通知（仮登録済・回収済）はありません。</p>
        )}
      </Page>
    </>
  );
}

/** 「写真なし / 11/23 13:04受付」。回収済なら「（回収済）」を添える。 */
function describe(row: Notification): string {
  const collected = (row.status === "unknown" ? row.previous_status : row.status) === "collected";
  return `${row.has_photo ? "写真あり" : "写真なし"} / ${formatDateTime(row.dropped_at)}受付${collected ? "（回収済）" : ""}`;
}
