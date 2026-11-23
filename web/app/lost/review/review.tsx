"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { categoryLabel, requiresDescription } from "@/lib/categories";
import { describeColor, validateLostReport } from "@/lib/lost-reports";
import { clearLostReportDraft, useLostReportDraft } from "../draft";
import styles from "../lost.module.css";

type Submission =
  | { state: "idle" }
  | { state: "sending" }
  | { state: "failed"; message: string }
  | { state: "done"; reportNumber: string };

export function LostReportReview() {
  const router = useRouter();
  const draft = useLostReportDraft();
  const [submission, setSubmission] = useState<Submission>({ state: "idle" });

  const result = draft ? validateLostReport(draft) : null;
  const report = result?.ok ? result.value : null;
  // 下書きがない、または入力に不備があるときは入力画面に戻す（受付完了の表示中は除く）
  const shouldGoBack = draft !== undefined && report === null && submission.state !== "done";

  useEffect(() => {
    if (shouldGoBack) router.replace("/lost");
  }, [shouldGoBack, router]);

  if (submission.state === "done") {
    return (
      <>
        <h1 className={styles.heading}>紛失届を受け付けました</h1>
        <div className={styles.done}>
          <p className={styles.doneLabel}>受付番号</p>
          <p className={styles.doneNumber}>{submission.reportNumber}</p>
        </div>
        <p className={styles.notice}>実行委員が内容を確認し、メールでご連絡します。</p>
      </>
    );
  }

  if (report === null) {
    // 読み込み中、または入力画面へ戻る途中
    return <h1 className={styles.heading}>登録内容の確認</h1>;
  }

  async function submit() {
    setSubmission({ state: "sending" });
    try {
      const response = await fetch("/api/lost-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const body = (await response.json().catch(() => ({}))) as {
        reportNumber?: string;
        message?: string;
      };
      if (!response.ok || !body.reportNumber) {
        setSubmission({
          state: "failed",
          message: body.message ?? "受け付けられませんでした。時間をおいてもう一度お試しください。",
        });
        return;
      }
      clearLostReportDraft();
      setSubmission({ state: "done", reportNumber: body.reportNumber });
    } catch {
      setSubmission({
        state: "failed",
        message: "通信できませんでした。電波の良い場所でもう一度お試しください。",
      });
    }
  }

  const color = describeColor(report);
  const sending = submission.state === "sending";

  return (
    <>
      <h1 className={styles.heading}>登録内容の確認</h1>
      <section className={styles.card} aria-labelledby="review-title">
        <h2 id="review-title" className={styles.cardTitle}>
          紛失届
        </h2>
        <dl className={styles.list}>
          <dt>カテゴリ</dt>
          <dd>{categoryLabel(report.category)}</dd>
          {requiresDescription(report.category) && (
            <>
              <dt>なくした物</dt>
              <dd>{report.itemDescription}</dd>
            </>
          )}
          <dt>色</dt>
          <dd>{color ?? "—"}</dd>
          <dt>特徴・備考</dt>
          <dd>{report.features}</dd>
          <dt>場所</dt>
          <dd>{report.lostPlace ?? "—"}</dd>
          <dt>日時</dt>
          <dd>{report.lostTime ?? "—"}</dd>
          <dt>メール</dt>
          <dd>{report.email}</dd>
        </dl>
      </section>

      <p className={styles.lead}>実行委員が内容を確認し、メールでご連絡します。</p>

      {submission.state === "failed" && (
        <p className={styles.alert} role="alert">
          {submission.message}
        </p>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          disabled={sending}
          onClick={submit}
        >
          {sending ? "登録しています…" : "この内容で登録する"}
        </button>
        <Link href="/lost" className={styles.secondary}>
          入力内容を修正する
        </Link>
      </div>
    </>
  );
}
