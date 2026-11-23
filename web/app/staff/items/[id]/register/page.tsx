import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink, Notice, Page, PageHeading, StaffHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { isUuid } from "@/lib/drops";
import { requireStaff } from "@/lib/staff-auth";
import { IssuedNumber } from "../../issued-number";
import { RegisterFlow } from "./register-flow";

export const metadata: Metadata = {
  title: "本登録 | 技大祭 落とし物管理",
};

// M-PHOTO → M-REGISTER → M-REVIEW: 回収済の物を1点ずつ写真付きで本登録し、管理番号を発行する。
export default function RegisterPage(props: PageProps<"/staff/items/[id]/register">) {
  return (
    <>
      <StaffHeader backHref="/staff/items/queue" />
      <Page>
        <Suspense fallback={null}>
          <Register params={props.params} searchParams={props.searchParams} />
        </Suspense>
      </Page>
    </>
  );
}

type Item = {
  status: string;
  management_number: string | null;
  box_name: string;
  box_area: string;
  photo_id: string | null;
};

async function Register({ params, searchParams }: PageProps<"/staff/items/[id]/register">) {
  await requireStaff();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { issued } = await searchParams;

  const { rows } = await db.query<Item>(
    `SELECT i.status, i.management_number, b.name AS box_name, b.area AS box_area,
            (SELECT p.id FROM item_photos p WHERE p.item_id = i.id AND p.kind = 'register') AS photo_id
       FROM items i JOIN boxes b ON b.id = i.box_id
      WHERE i.id = $1`,
    [id],
  );
  const item = rows[0];
  if (!item) notFound();

  if (item.status !== "collected") {
    return (
      <>
        <PageHeading title="回収した物を本登録" />
        <IssuedNumber issued={issued} />
        <Notice title="この物品は本登録できません" tone="warning">
          {item.status === "registered"
            ? `すでに本登録済です（${item.management_number}）。`
            : "回収済の物品だけ本登録できます。"}
        </Notice>
        <ButtonLink href="/staff/items/queue" variant="secondary">
          回収済の一覧へ戻る
        </ButtonLink>
      </>
    );
  }

  return (
    <RegisterFlow
      itemId={id}
      boxName={item.box_name}
      boxArea={item.box_area}
      initialPhotoId={item.photo_id}
      issued={<IssuedNumber issued={issued} />}
    />
  );
}
