import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink, DefinitionList, Notice, Page, PageHeading, StaffHeader } from "@/components/ui";
import { categoryLabel, isCategoryCode } from "@/lib/categories";
import { db } from "@/lib/db";
import { isItemId } from "@/lib/handovers";
import { requireStaff } from "@/lib/staff-auth";
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

const STATUS_LABELS: Record<string, string> = {
  provisional: "仮登録済",
  collected: "回収済",
  registered: "本登録済",
  handed_over: "受渡済",
  unknown: "不明",
};

async function Undo({ params }: Pick<PageProps<"/staff/handovers/[itemId]/undo">, "params">) {
  await requireStaff();
  const { itemId } = await params;
  if (!isItemId(itemId)) notFound();

  const { rows } = await db.query<{
    status: string;
    management_number: string | null;
    category: string | null;
    category_note: string | null;
  }>("SELECT status, management_number, category, category_note FROM items WHERE id = $1", [itemId]);
  const item = rows[0];
  if (!item) notFound();

  const receiptHref = `/staff/handovers/${itemId}`;
  const name =
    item.category === "other" && item.category_note
      ? item.category_note
      : item.category && isCategoryCode(item.category)
        ? categoryLabel(item.category)
        : "—";

  return (
    <>
      <StaffHeader backHref={receiptHref} />
      <Page>
        <PageHeading title="受渡を取り消しますか？" />
        {item.status === "handed_over" ? (
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
            { label: "現在の状態", value: STATUS_LABELS[item.status] ?? item.status },
          ]}
        />
        {item.status === "handed_over" ? (
          <UndoForm itemId={itemId} cancelHref={receiptHref} />
        ) : (
          <ButtonLink href={`/staff/items/${itemId}`} variant="secondary">
            物品の詳細へ戻る
          </ButtonLink>
        )}
      </Page>
    </>
  );
}
