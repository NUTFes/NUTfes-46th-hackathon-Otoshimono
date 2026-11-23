import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink, DefinitionList, Page, PageHeading, StaffHeader } from "@/components/ui";
import { isItemId } from "@/lib/handovers";
import { requireStaff } from "@/lib/staff-auth";
import { formatDateTime, getLatestHandover, summarize } from "../data";
import styles from "../page.module.css";

export const metadata: Metadata = {
  title: "受渡記録（氏名・連絡先） | 技大祭 落とし物管理",
};

// M-REVEAL: 受渡記録の氏名・連絡先を伏せずに出す。実行委員なら誰でも、必要なときに開ける（要求14）。
export default function HandoverContactPage(props: PageProps<"/staff/handovers/[itemId]/contact">) {
  return (
    <Suspense fallback={<StaffHeader />}>
      <Contact params={props.params} />
    </Suspense>
  );
}

async function Contact({ params }: Pick<PageProps<"/staff/handovers/[itemId]/contact">, "params">) {
  await requireStaff();
  const { itemId } = await params;
  if (!isItemId(itemId)) notFound();
  const record = await getLatestHandover(itemId);
  if (!record) notFound();

  const receiptHref = `/staff/handovers/${itemId}`;
  return (
    <>
      <StaffHeader backHref={receiptHref} />
      <Page>
        <PageHeading title="受渡記録" description={summarize(record)} />
        <DefinitionList
          title="氏名・連絡先"
          items={[
            { label: "氏名", value: record.recipientName },
            { label: "電話番号", value: record.phone },
            { label: "メール", value: record.email ?? "—" },
            { label: "受渡日時", value: formatDateTime(record.handedOverAt) },
          ]}
        />
        <p className={styles.muted}>確認が終わったら、伏せ字表示に戻してください。</p>
        {/* replace: この画面を履歴から外し、伏せ字の画面で「戻る」を押しても氏名・連絡先が再表示されないようにする */}
        <ButtonLink href={receiptHref} replace>
          伏せ字表示に戻す
        </ButtonLink>
      </Page>
    </>
  );
}
