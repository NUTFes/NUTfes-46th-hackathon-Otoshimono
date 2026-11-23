import styles from "./issued-number.module.css";

/** 本登録の直後に出す「L-0005 を発行しました」。現物に番号を付けて保管するため、番号を大きく見せる。 */
export function IssuedNumber({ issued }: { issued: string | string[] | undefined }) {
  if (typeof issued !== "string" || !/^L-[0-9]{4,}$/.test(issued)) return null;
  return (
    <section className={styles.card} role="status" aria-labelledby="issued-title">
      <h2 id="issued-title" className={styles.title}>
        管理番号を発行しました
      </h2>
      <p className={styles.number}>{issued}</p>
      <p className={styles.muted}>現物に番号を付けて保管してください。</p>
    </section>
  );
}
