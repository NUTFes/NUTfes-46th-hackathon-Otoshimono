import type { Metadata } from "next";
import { ButtonLink, Page, PageHeading } from "@/components/ui";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "落とし物のご案内 | 技大祭 落とし物管理",
};

// V-HOME: パンフレットやホームページから来た人に、落とし物の窓口を説明する（要件定義v2 要求16）。
// 拾得者はボックスのQRから直接入るので、ここは通らない。説明だけの画面で、DB は読まない。
export default function Home() {
  return (
    <Page>
      <div className={styles.heading}>
        <p className={styles.audience}>技大祭</p>
        <PageHeading title="落とし物のご案内" description="なくした方と、見つけた方はこちらから。" />
      </div>
      <section className={styles.card} aria-labelledby="home-lost-title">
        <h2 id="home-lost-title" className={styles.cardTitle}>
          なくした方
        </h2>
        <p className={styles.cardBody}>物の特徴を登録すると、実行委員が届出と照合します。結果はメールでお知らせします。</p>
        <ButtonLink href="/lost">紛失届を登録する</ButtonLink>
      </section>
      <section className={styles.card} aria-labelledby="home-found-title">
        <h2 id="home-found-title" className={styles.cardTitle}>
          見つけた方
        </h2>
        <p className={styles.cardBody}>近くの落とし物BOXへ入れ、箱に貼られたQRを読み取ってください。</p>
      </section>
    </Page>
  );
}
