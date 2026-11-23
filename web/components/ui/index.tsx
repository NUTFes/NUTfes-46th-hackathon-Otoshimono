// 共通の UI 部品（担当1が持つ）。見た目は docs/design/DESIGN.md に合わせている。
// 並べた見本は開発中だけ /dev/ui で見られる。
import Link from "next/link";
import { Fragment, type ComponentProps, type ReactNode } from "react";
import styles from "./ui.module.css";

function cx(...names: (string | false | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}

/** 実行委員の画面の上端。backHref を渡すと左に「戻る」を出す。 */
export function StaffHeader({ backHref }: { backHref?: string }) {
  return (
    <header className={styles.header}>
      {backHref && (
        <Link href={backHref} className={cx(styles.button, styles.secondary, styles.headerBack)}>
          戻る
        </Link>
      )}
      <span className={styles.headerTitle}>技大祭 / 実行委員</span>
    </header>
  );
}

/** ページ本文。左右 24px の余白で縦に並べる。 */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cx(styles.page, className)}>{children}</main>;
}

export function PageHeading({ title, description }: { title: ReactNode; description?: ReactNode }) {
  return (
    <div className={styles.headingBlock}>
      <h1 className={styles.title}>{title}</h1>
      {description && <p className={styles.description}>{description}</p>}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary";

/** 幅いっぱい・高さ 48px のボタン。primary は1画面に1つ（いちばん進めてほしい操作）。 */
export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button type={type} className={cx(styles.button, styles[variant], className)} {...props} />;
}

/** 見た目はボタンと同じリンク。 */
export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={cx(styles.button, styles[variant], className)} {...props} />;
}

/** 項目名・入力欄・補足・エラーをまとめる。htmlFor と入力欄の id をそろえること。 */
export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
}: {
  label: ReactNode;
  htmlFor: string;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={htmlFor} className={styles.label}>
        {label}
        {required && " *"}
      </label>
      {children}
      {hint && <p className={styles.hint}>{hint}</p>}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(styles.control, styles.input, className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cx(styles.control, styles.select, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cx(styles.control, styles.textarea, className)} {...props} />;
}

export function Checkbox({ label, ...props }: Omit<ComponentProps<"input">, "type"> & { label: ReactNode }) {
  return (
    <label className={styles.checkbox}>
      <input type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
}

/** 案内の枠。tone="warning" は注意してほしいことに使う（1画面に1つまで）。 */
export function Notice({
  title,
  children,
  tone = "info",
}: {
  title?: ReactNode;
  children?: ReactNode;
  tone?: "info" | "warning";
}) {
  return (
    <div className={cx(styles.notice, tone === "warning" && styles.warning)}>
      {title && <p className={styles.noticeTitle}>{title}</p>}
      {children && <div className={styles.noticeBody}>{children}</div>}
    </div>
  );
}

const STAFF_TABS = [
  { key: "boxes", label: "巡回", href: "/staff/boxes" },
  { key: "items", label: "物品", href: "/staff/items" },
  { key: "reports", label: "紛失届", href: "/staff/reports" },
] as const;

/** 実行委員の一覧画面の切り替え（巡回 / 物品 / 紛失届）。 */
export function StaffTabs({ current }: { current: (typeof STAFF_TABS)[number]["key"] }) {
  return (
    <nav className={styles.tabs} aria-label="実行委員のメニュー">
      {STAFF_TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={tab.key === current ? styles.tabCurrent : styles.tab}
          aria-current={tab.key === current ? "page" : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

/** 「色: 黒」のような項目と値の一覧を枠で囲んで出す。 */
export function DefinitionList({
  title,
  items,
}: {
  title?: ReactNode;
  items: { label: ReactNode; value: ReactNode }[];
}) {
  return (
    <section className={styles.definitionCard}>
      {title && <h2 className={styles.definitionTitle}>{title}</h2>}
      <dl className={styles.definitionList}>
        {items.map((item, i) => (
          <Fragment key={i}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </Fragment>
        ))}
      </dl>
    </section>
  );
}
