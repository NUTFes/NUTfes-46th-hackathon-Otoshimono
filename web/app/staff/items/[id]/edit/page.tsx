import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink, Notice, Page, PageHeading, StaffHeader } from "@/components/ui";
import { isCategoryCode } from "@/lib/categories";
import { db } from "@/lib/db";
import { isUuid } from "@/lib/drops";
import { describeCategory } from "@/lib/item-registration";
import { requireStaff } from "@/lib/staff-auth";
import { EditForm } from "./edit-form";

export const metadata: Metadata = {
  title: "登録情報を編集 | 技大祭 落とし物管理",
};

// M-EDIT・M-PHOTO-EDIT: 本登録済の物の登録情報と写真を直す。管理番号は変わらない。
export default function EditItemPage(props: PageProps<"/staff/items/[id]/edit">) {
  return (
    <Suspense fallback={<StaffHeader />}>
      <EditItem params={props.params} />
    </Suspense>
  );
}

type Item = {
  status: string;
  management_number: string | null;
  category: string | null;
  category_note: string | null;
  color: string | null;
  color_note: string | null;
  description: string | null;
  storage_location: string | null;
  box_area: string;
  photo_id: string | null;
  updated_at: Date;
};

async function EditItem({ params }: Pick<PageProps<"/staff/items/[id]/edit">, "params">) {
  await requireStaff();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const { rows } = await db.query<Item>(
    `SELECT i.status, i.management_number, i.category, i.category_note, i.color, i.color_note,
            i.description, i.storage_location, b.area AS box_area, i.updated_at,
            (SELECT p.id FROM item_photos p WHERE p.item_id = i.id AND p.kind = 'register') AS photo_id
       FROM items i JOIN boxes b ON b.id = i.box_id
      WHERE i.id = $1`,
    [id],
  );
  const item = rows[0];
  if (!item) notFound();
  const detailHref = `/staff/items/${id}`;

  if (item.status !== "registered" || !item.management_number || !item.category || !isCategoryCode(item.category)) {
    return (
      <>
        <StaffHeader backHref={detailHref} />
        <Page>
          <PageHeading title="登録情報を編集" />
          <Notice title="この物品は編集できません" tone="warning">
            本登録済の物品だけ編集できます。
          </Notice>
          <ButtonLink href={detailHref} variant="secondary">
            物品の詳細へ戻る
          </ButtonLink>
        </Page>
      </>
    );
  }

  return (
    <>
      <StaffHeader backHref={detailHref} />
      <Page>
        {/* 保存されて中身が変わったら、前の入力を残さずに作り直す */}
        <EditForm
          key={item.updated_at.toISOString()}
          itemId={id}
          summary={`${item.management_number} / ${describeCategory(item.category, item.category_note)}`}
          boxArea={item.box_area}
          photoId={item.photo_id}
          initial={{
            category: item.category,
            categoryNote: item.category_note ?? "",
            color: item.color ?? "",
            colorNote: item.color_note ?? "",
            description: item.description ?? "",
            storageLocation: item.storage_location ?? "",
          }}
        />
      </Page>
    </>
  );
}
