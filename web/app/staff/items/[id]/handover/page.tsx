import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink, Notice, Page, PageHeading, StaffHeader } from "@/components/ui";
import { isCategoryCode } from "@/lib/categories";
import { db } from "@/lib/db";
import { isItemId } from "@/lib/handovers";
import { describeCategory } from "@/lib/item-registration";
import { foundNoticesFor } from "@/lib/report-notices";
import { requireStaff } from "@/lib/staff-auth";
import { FoundNotices } from "../found-notices";
import { HandoverForm } from "./handover-form";

export const metadata: Metadata = {
  title: "受渡を記録する | 技大祭 落とし物管理",
};

// M-HANDOVER: 本登録済の物品を落とし主に渡したときの記録。
export default function HandoverPage(props: PageProps<"/staff/items/[id]/handover">) {
  return (
    <Suspense fallback={<StaffHeader />}>
      <Handover params={props.params} />
    </Suspense>
  );
}

type Item = {
  status: string;
  management_number: string | null;
  category: string | null;
  category_note: string | null;
  storage_location: string | null;
  /** 取り消し済みを含む、いちばん新しい受渡記録。受渡と取り消しのあとに変わったら、フォームを作り直す */
  latest_handover_id: string | null;
};

async function Handover({ params }: Pick<PageProps<"/staff/items/[id]/handover">, "params">) {
  await requireStaff();
  const { id } = await params;
  if (!isItemId(id)) notFound();

  const { rows } = await db.query<Item>(
    `SELECT status, management_number, category, category_note, storage_location,
            (SELECT max(h.id) FROM handovers h WHERE h.item_id = items.id) AS latest_handover_id
       FROM items WHERE id = $1`,
    [id],
  );
  const item = rows[0];
  if (!item) notFound();

  const detailHref = `/staff/items/${id}`;
  // 受取案内を送った届け出人がいるなら、別の人に渡す前に気づけるようにする
  const foundNotices = item.status === "registered" ? await foundNoticesFor(id) : [];
  const summary = [item.management_number, itemName(item), item.storage_location]
    .filter(Boolean)
    .join(" / ");

  return (
    <>
      <StaffHeader backHref={detailHref} />
      <Page>
        <PageHeading title="受渡を記録する" description={summary || undefined} />
        {item.status === "registered" ? (
          <>
            <Notice title="管理番号と現物を確認してください">本登録した物品の受渡を記録します。</Notice>
            <FoundNotices reports={foundNotices} tone="warning">
              受け取りに来た人が届け出人本人か確かめてください。
            </FoundNotices>
            {/* 離れた画面の入力は残る（cacheComponents）ので、受渡を取り消して記録し直すときは作り直し、
                前に受け取った人の氏名・連絡先と確認のチェックを残さない。
                物品の編集（保管場所など）では作り直さず、入力中の内容を消さない */}
            <HandoverForm key={item.latest_handover_id ?? "none"} itemId={id} backHref={detailHref} />
          </>
        ) : item.status === "handed_over" ? (
          <>
            <Notice title="この物品はすでに受渡済です" tone="warning">
              受渡記録を確認してください。
            </Notice>
            <ButtonLink href={`/staff/handovers/${id}`}>受渡記録を確認する</ButtonLink>
          </>
        ) : (
          <>
            <Notice title="この物品は受渡を記録できません" tone="warning">
              本登録済の物品だけ受渡を記録できます。
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

function itemName(item: Item): string | null {
  return item.category && isCategoryCode(item.category) ? describeCategory(item.category, item.category_note) : null;
}
