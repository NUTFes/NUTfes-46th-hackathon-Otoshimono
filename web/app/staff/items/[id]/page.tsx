import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink, DefinitionList, Notice, Page, PageHeading, StaffHeader } from "@/components/ui";
import { isCategoryCode } from "@/lib/categories";
import { isColorCode } from "@/lib/colors";
import { db } from "@/lib/db";
import { isUuid } from "@/lib/drops";
import { describeCategory, describeItemColor } from "@/lib/item-registration";
import { itemStatusLabel } from "@/lib/item-status";
import { requireStaff } from "@/lib/staff-auth";
import { formatDateTime } from "../format";
import styles from "./detail.module.css";

export const metadata: Metadata = {
  title: "物品の詳細 | 技大祭 落とし物管理",
};

// M-DETAIL: 拾得物の詳細。管理番号を大きく出し、写真・登録情報・届けられた場所と日時を出す。
export default function ItemDetailPage(props: PageProps<"/staff/items/[id]">) {
  return (
    <>
      <StaffHeader backHref="/staff/items" />
      <Page>
        <Suspense fallback={null}>
          <ItemDetail params={props.params} searchParams={props.searchParams} />
        </Suspense>
      </Page>
    </>
  );
}

type Item = {
  status: string;
  management_number: string | null;
  category: string | null;
  category_note: string | null;
  reported_category: string | null;
  color: string | null;
  color_note: string | null;
  description: string | null;
  storage_location: string | null;
  box_name: string;
  box_area: string;
  dropped_at: Date;
  register_photo_id: string | null;
  drop_photo_id: string | null;
};

async function ItemDetail({ params, searchParams }: PageProps<"/staff/items/[id]">) {
  await requireStaff();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { saved, restored } = await searchParams;

  const { rows } = await db.query<Item>(
    `SELECT i.status, i.management_number, i.category, i.category_note, i.reported_category,
            i.color, i.color_note, i.description, i.storage_location,
            b.name AS box_name, b.area AS box_area, i.dropped_at,
            (SELECT p.id FROM item_photos p WHERE p.item_id = i.id AND p.kind = 'register') AS register_photo_id,
            (SELECT p.id FROM item_photos p WHERE p.item_id = i.id AND p.kind = 'drop') AS drop_photo_id
       FROM items i JOIN boxes b ON b.id = i.box_id
      WHERE i.id = $1`,
    [id],
  );
  const item = rows[0];
  if (!item) notFound();

  const name =
    item.category && isCategoryCode(item.category)
      ? describeCategory(item.category, item.category_note)
      : `${item.box_name}の通知`;
  const color = item.color && isColorCode(item.color) ? describeItemColor(item.color, item.color_note) : null;
  // 本登録の写真がなければ、拾得者の写真を出す
  const photoId = item.register_photo_id ?? item.drop_photo_id;

  return (
    <>
      <PageHeading title={`${name} / ${itemStatusLabel(item.status)}`} />
      {saved === "1" && (
        <div role="status">
          <Notice title="変更を保存しました" />
        </div>
      )}
      {restored === "1" && (
        <div role="status">
          <Notice title="元の状態に戻しました" />
        </div>
      )}
      {item.management_number && (
        <section className={styles.numberCard} aria-labelledby="number-title">
          <h2 id="number-title" className={styles.cardTitle}>
            管理番号
          </h2>
          <p className={styles.number}>{item.management_number}</p>
          <p className={styles.muted}>この番号を物品に記入してください。</p>
        </section>
      )}
      {photoId ? (
        <figure className={styles.figure}>
          {/* eslint-disable-next-line @next/next/no-img-element -- 実行委員だけが見られる API から出すので next/image の最適化は使わない */}
          <img src={`/api/photos/${photoId}`} alt="物品の写真" className={styles.photo} />
          {!item.register_photo_id && <figcaption className={styles.muted}>拾得者の写真</figcaption>}
        </figure>
      ) : (
        <p className={styles.muted}>写真はありません。</p>
      )}
      <DefinitionList
        title="登録情報"
        items={[
          ...(item.management_number ? [] : [{ label: "拾得者の回答", value: reportedText(item.reported_category) }]),
          { label: "色", value: color ?? "—" },
          { label: "特徴・備考", value: <span className={styles.multiline}>{item.description ?? "—"}</span> },
          { label: "保管場所", value: item.storage_location ?? "—" },
          { label: "届けられた場所", value: item.box_area },
          { label: "届いた日時", value: formatDateTime(item.dropped_at) },
        ]}
      />
      <Actions id={id} status={item.status} />
    </>
  );
}

function reportedText(category: string | null): string {
  return category && isCategoryCode(category) ? describeCategory(category, null) : "—";
}

/** 状態ごとに、次にできる操作。 */
function Actions({ id, status }: { id: string; status: string }) {
  switch (status) {
    case "registered":
      return (
        <div className={styles.actions}>
          <ButtonLink href={`/staff/items/${id}/edit`}>登録情報を編集する</ButtonLink>
          <ButtonLink href={`/staff/items/${id}/handover`} variant="secondary">
            受渡を記録する
          </ButtonLink>
          <ButtonLink href={`/staff/items/${id}/unknown`} variant="secondary">
            不明にする
          </ButtonLink>
        </div>
      );
    case "handed_over":
      return <ButtonLink href={`/staff/handovers/${id}`}>受渡記録を見る</ButtonLink>;
    case "collected":
      return <ButtonLink href={`/staff/items/${id}/register`}>本登録する</ButtonLink>;
    case "provisional":
      return (
        <ButtonLink href={`/staff/items/${id}/unknown`} variant="secondary">
          不明にする
        </ButtonLink>
      );
    case "unknown":
      return (
        <ButtonLink href={`/staff/items/${id}/unknown`} variant="secondary">
          不明の内容を見る
        </ButtonLink>
      );
    default:
      return null;
  }
}
