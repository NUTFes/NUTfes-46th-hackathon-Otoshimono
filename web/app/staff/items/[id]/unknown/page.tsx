import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink, DefinitionList, Notice, Page, PageHeading, StaffHeader } from "@/components/ui";
import { isCategoryCode } from "@/lib/categories";
import { db } from "@/lib/db";
import { isUuid } from "@/lib/drops";
import { describeCategory } from "@/lib/item-registration";
import { itemStatusLabel } from "@/lib/item-status";
import { requireStaff } from "@/lib/staff-auth";
import { UNKNOWN_FROM_STATUSES } from "@/lib/unknown";
import { RestoreButton, UnknownForm } from "../../../unknown-actions";
import styles from "../detail.module.css";

export const metadata: Metadata = {
  title: "物品を不明にする | 技大祭 落とし物管理",
};

// M-UNKNOWN・M-UNKNOWN-DETAIL: 物品を理由付きで不明にし、不明の記録を見て、見つかったら前の状態に戻す。
export default function ItemUnknownPage(props: PageProps<"/staff/items/[id]/unknown">) {
  return (
    <Suspense fallback={<StaffHeader />}>
      <ItemUnknown params={props.params} />
    </Suspense>
  );
}

type Item = {
  status: string;
  previous_status: string | null;
  unknown_reason: string | null;
  unknown_note: string | null;
  management_number: string | null;
  category: string | null;
  category_note: string | null;
  storage_location: string | null;
  box_name: string;
};

async function ItemUnknown({ params }: Pick<PageProps<"/staff/items/[id]/unknown">, "params">) {
  await requireStaff();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const { rows } = await db.query<Item>(
    `SELECT i.status, i.previous_status, i.unknown_reason, i.unknown_note, i.management_number,
            i.category, i.category_note, i.storage_location, b.name AS box_name
       FROM items i JOIN boxes b ON b.id = i.box_id
      WHERE i.id = $1`,
    [id],
  );
  const item = rows[0];
  if (!item) notFound();

  const detailHref = `/staff/items/${id}`;
  const name =
    item.category && isCategoryCode(item.category)
      ? describeCategory(item.category, item.category_note)
      : `${item.box_name}の通知`;
  const summary = [item.management_number, name].filter(Boolean).join(" / ");

  if (item.status === "unknown") {
    const previous = itemStatusLabel(item.previous_status ?? "");
    return (
      <>
        <StaffHeader backHref={detailHref} />
        <Page>
          <PageHeading title={`${name} / 不明`} description={item.management_number ?? undefined} />
          <DefinitionList
            title="不明の記録"
            items={[
              { label: "理由", value: item.unknown_reason ?? "—" },
              { label: "前の状態", value: previous },
              ...(item.storage_location ? [{ label: "保管場所", value: item.storage_location }] : []),
              ...(item.unknown_note ? [{ label: "補足", value: <span className={styles.multiline}>{item.unknown_note}</span> }] : []),
            ]}
          />
          <Notice title="見つかったら元の状態に戻してください">不明の間は、新しい照合候補には含めません。</Notice>
          <RestoreButton itemId={id} label={`見つかったので${previous}に戻す`} afterHref={`${detailHref}?restored=1`} />
        </Page>
      </>
    );
  }

  return (
    <>
      <StaffHeader backHref={detailHref} />
      <Page>
        <PageHeading title="物品を不明にする" description={summary} />
        {UNKNOWN_FROM_STATUSES.some((status) => status === item.status) ? (
          <UnknownForm targets={[{ id, label: "" }]} backHref={detailHref} warning />
        ) : (
          <>
            <Notice title="この物品は不明にできません" tone="warning">
              {itemStatusLabel(item.status)}の物品は不明にできません。
            </Notice>
            <ButtonLink href={detailHref} variant="secondary">
              物品の詳細へ戻る
            </ButtonLink>
          </>
        )}
      </Page>
    </>
  );
}
