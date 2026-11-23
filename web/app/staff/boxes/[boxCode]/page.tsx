import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink, DefinitionList, Notice, Page, PageHeading, StaffHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { isBoxCode } from "@/lib/drops";
import { requireStaff } from "@/lib/staff-auth";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "BOXの状況 | 技大祭 落とし物管理",
};

// M-BOX: BOX に届いている仮登録の件数と写真。巡回で QR を読んで回収を記録する。
export default function StaffBoxPage(props: PageProps<"/staff/boxes/[boxCode]">) {
  return (
    <>
      <StaffHeader backHref="/staff/boxes" />
      <Page>
        <Suspense fallback={null}>
          <Box params={props.params} />
        </Suspense>
      </Page>
    </>
  );
}

type Summary = { name: string; area: string; provisional: string; valuable: string; with_photo: string };

async function Box({ params }: Pick<PageProps<"/staff/boxes/[boxCode]">, "params">) {
  await requireStaff();
  const { boxCode } = await params;
  if (!isBoxCode(boxCode)) notFound();

  const { rows } = await db.query<Summary>(
    `SELECT b.name, b.area,
            count(i.id) AS provisional,
            count(i.id) FILTER (WHERE i.is_valuable) AS valuable,
            count(i.id) FILTER (WHERE EXISTS (
              SELECT 1 FROM item_photos p WHERE p.item_id = i.id AND p.kind = 'drop')) AS with_photo
       FROM boxes b
       LEFT JOIN items i ON i.box_id = b.id AND i.status = 'provisional'
      WHERE b.code = $1
      GROUP BY b.id`,
    [boxCode],
  );
  const box = rows[0];
  if (!box) notFound();

  // 届いている写真（古い順）
  const photos = await db.query<{ id: string }>(
    `SELECT p.id
       FROM item_photos p
       JOIN items i ON i.id = p.item_id
       JOIN boxes b ON b.id = i.box_id
      WHERE b.code = $1 AND i.status = 'provisional' AND p.kind = 'drop'
      ORDER BY i.dropped_at, p.created_at`,
    [boxCode],
  );
  const provisional = Number(box.provisional);
  const withPhoto = Number(box.with_photo);

  return (
    <>
      <PageHeading title={box.name} description={box.area} />
      <DefinitionList
        title="仮登録の状況"
        items={[
          { label: "仮登録", value: `${provisional}件` },
          { label: "貴重品チェック", value: `${box.valuable}件` },
          { label: "投稿写真", value: `${withPhoto}件 / 写真なし${provisional - withPhoto}件` },
        ]}
      />
      <section className={styles.photos} aria-labelledby="photos-title">
        <h2 id="photos-title" className={styles.sectionTitle}>
          届いている写真
        </h2>
        {photos.rows.length === 0 ? (
          <p className={styles.muted}>写真はまだ届いていません。</p>
        ) : (
          <ul className={styles.grid}>
            {photos.rows.map((photo, index) => (
              <li key={photo.id}>
                {/* eslint-disable-next-line @next/next/no-img-element -- 実行委員だけが見られる API から出すので next/image の最適化は使わない */}
                <img src={`/api/photos/${photo.id}`} alt={`投稿写真 ${index + 1}`} className={styles.photo} loading="lazy" />
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className={styles.muted}>写真のない通知も含まれます。物品の種類は本登録するまで確定しません。</p>
      <Notice title="QRを読むと回収完了になります">
        箱の中の物をまとめて回収してください。回収数の入力を待たず、QRで状態を更新します。
      </Notice>
      <div className={styles.actions}>
        <ButtonLink href="/staff/scan">QRを読んで回収を記録</ButtonLink>
        <ButtonLink href={`/staff/boxes/${boxCode}/unknown`} variant="secondary">
          箱に見当たらない通知を不明にする
        </ButtonLink>
      </div>
    </>
  );
}
