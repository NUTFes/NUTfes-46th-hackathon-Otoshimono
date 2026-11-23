import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink, DefinitionList, Page, PageHeading, StaffHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { isItemId } from "@/lib/handovers";
import { maskEmail, maskName, maskPhone } from "@/lib/mask";
import { requireStaff } from "@/lib/staff-auth";
import { getLatestHandover, summarize } from "./data";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "受渡記録 | 技大祭 落とし物管理",
};

// M-RECEIPT: 受渡記録。氏名・連絡先は伏せ字で出す（要件定義v2 要求14）。
// 伏せる前の値はここで捨て、ブラウザーには伏せた値だけを送る。
export default function HandoverReceiptPage(props: PageProps<"/staff/handovers/[itemId]">) {
  return (
    <Suspense fallback={<StaffHeader />}>
      <Receipt params={props.params} />
    </Suspense>
  );
}

async function Receipt({ params }: Pick<PageProps<"/staff/handovers/[itemId]">, "params">) {
  await requireStaff();
  const { itemId } = await params;
  if (!isItemId(itemId)) notFound();
  const record = await getLatestHandover(itemId);
  if (!record) notFound();

  return (
    <>
      <StaffHeader backHref="/staff/items" />
      <Page>
        <PageHeading title="受渡済" description={summarize(record)} />
        <DefinitionList
          title="受渡記録"
          items={[
            { label: "受渡日時", value: formatDateTime(record.handedOverAt) },
            { label: "氏名", value: maskName(record.recipientName) },
            { label: "電話番号", value: maskPhone(record.phone) },
            { label: "メール", value: record.email ? maskEmail(record.email) : "—" },
            {
              label: "確認メモ",
              value: <span className={styles.multiline}>{record.identityNote ?? "—"}</span>,
            },
          ]}
        />
        {/* 先読みすると、押す前に伏せる前の値がブラウザーに届くことがあるので先読みしない */}
        <ButtonLink href={`/staff/handovers/${itemId}/contact`} variant="secondary" prefetch={false}>
          氏名・連絡先を表示
        </ButtonLink>
        <p className={styles.muted}>誤って受渡済にした場合は、記録の取り消しを行えます。</p>
        <div className={styles.actions}>
          <ButtonLink href="/staff/items">物品一覧へ戻る</ButtonLink>
          <ButtonLink href={`/staff/handovers/${itemId}/undo`} variant="secondary">
            受渡を取り消す
          </ButtonLink>
        </div>
      </Page>
    </>
  );
}
