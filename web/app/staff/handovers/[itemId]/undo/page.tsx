import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink, DefinitionList, Notice, Page, PageHeading, StaffHeader } from "@/components/ui";
import { isCategoryCode } from "@/lib/categories";
import { db } from "@/lib/db";
import { isItemId } from "@/lib/handovers";
import { describeCategory } from "@/lib/item-registration";
import { itemStatusLabel } from "@/lib/item-status";
import { requireStaff } from "@/lib/staff-auth";
import { formatDateTime } from "../data";
import { UndoForm } from "./undo-form";

export const metadata: Metadata = {
  title: "受渡の取り消し | 技大祭 落とし物管理",
};

// M-UNDO: 誤って受渡済にしたとき、本登録済に戻す確認画面。
export default function HandoverUndoPage(props: PageProps<"/staff/handovers/[itemId]/undo">) {
  return (
    <Suspense fallback={<StaffHeader />}>
      <Undo params={props.params} />
    </Suspense>
  );
}

async function Undo({ params }: Pick<PageProps<"/staff/handovers/[itemId]/undo">, "params">) {
  await requireStaff();
  const { itemId } = await params;
  if (!isItemId(itemId)) notFound();

  // 取り消す対象は、画面を開いた時点で有効な受渡記録（取り消すときにその ID を API に渡す）
  const { rows } = await db.query<{
    status: string;
    management_number: string | null;
    category: string | null;
    category_note: string | null;
    handover_id: string | null;
    handed_over_at: Date | null;
  }>(
    `SELECT i.status, i.management_number, i.category, i.category_note,
            h.id AS handover_id, h.handed_over_at
       FROM items i
       LEFT JOIN handovers h ON h.item_id = i.id AND h.cancelled_at IS NULL
      WHERE i.id = $1`,
    [itemId],
  );
  const item = rows[0];
  if (!item) notFound();
  const canUndo = item.status === "handed_over" && item.handover_id !== null;

  const receiptHref = `/staff/handovers/${itemId}`;
  const name = item.category && isCategoryCode(item.category) ? describeCategory(item.category, item.category_note) : "—";

  return (
    <>
      <StaffHeader backHref={receiptHref} />
      <Page>
        <PageHeading title="受渡を取り消しますか？" />
        {canUndo ? (
          <Notice title="受渡済から本登録済に戻します" tone="warning">
            管理番号は {item.management_number ?? "—"} のままです。物品が手元にあることを確認してください。
          </Notice>
        ) : (
          <Notice title="この物品は受渡済ではありません" tone="warning">
            受渡済の物品だけ取り消せます。
          </Notice>
        )}
        <DefinitionList
          title="対象の物品"
          items={[
            { label: "カテゴリ", value: name },
            { label: "管理番号", value: item.management_number ?? "—" },
            { label: "現在の状態", value: itemStatusLabel(item.status) },
            // どの受渡を取り消すのかを見て確かめられるように
            ...(canUndo && item.handed_over_at
              ? [{ label: "受渡日時", value: formatDateTime(item.handed_over_at) }]
              : []),
          ]}
        />
        {canUndo && item.handover_id ? (
          <UndoForm itemId={itemId} handoverId={item.handover_id} cancelHref={receiptHref} />
        ) : (
          <ButtonLink href={`/staff/items/${itemId}`} variant="secondary">
            物品の詳細へ戻る
          </ButtonLink>
        )}
      </Page>
    </>
  );
}
