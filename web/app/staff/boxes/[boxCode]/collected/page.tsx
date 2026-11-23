import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink, DefinitionList, Notice, Page, PageHeading, StaffHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { isBoxCode } from "@/lib/drops";
import { requireStaff } from "@/lib/staff-auth";
import styles from "../page.module.css";

export const metadata: Metadata = {
  title: "回収を記録しました | 技大祭 落とし物管理",
};

// M-COLLECTED: QR を読んで回収を記録したあと。件数は回収の API が返した数を ?count= で受け取る。
export default function CollectedPage(props: PageProps<"/staff/boxes/[boxCode]/collected">) {
  return (
    <>
      <StaffHeader />
      <Page>
        <Suspense fallback={<PageHeading title="回収を記録しました" />}>
          <Collected params={props.params} searchParams={props.searchParams} />
        </Suspense>
      </Page>
    </>
  );
}

async function Collected({ params, searchParams }: PageProps<"/staff/boxes/[boxCode]/collected">) {
  await requireStaff();
  const { boxCode } = await params;
  if (!isBoxCode(boxCode)) notFound();
  const { rows } = await db.query<{ name: string }>("SELECT name FROM boxes WHERE code = $1", [boxCode]);
  if (!rows[0]) notFound();

  const { count: rawCount } = await searchParams;
  const count = typeof rawCount === "string" && /^[0-9]{1,6}$/.test(rawCount) ? Number(rawCount) : null;

  return (
    <>
      <PageHeading title="回収を記録しました" description={rows[0].name} />
      <DefinitionList
        title="今回の記録"
        items={[{ label: "回収対象の通知", value: count === null ? "—" : `${count}件` }]}
      />
      {count === 0 && (
        <p className={styles.muted}>このBOXに仮登録はありませんでした（すでに回収済みの可能性があります）。</p>
      )}
      <Notice title="保管場所で本登録してください">
        QRを読んだ時点で回収済にしました。管理番号は本登録のときに発行します。
      </Notice>
      <div className={styles.actions}>
        <ButtonLink href="/staff/boxes">次のBOXを確認する</ButtonLink>
        <ButtonLink href="/staff/items/queue" variant="secondary">
          保管場所で本登録する
        </ButtonLink>
      </div>
    </>
  );
}
