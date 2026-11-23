"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, ButtonLink, DefinitionList, Notice, PageHeading } from "@/components/ui";
import { categoryLabel, requiresDescription } from "@/lib/categories";
import { describeColor, validateLostReport } from "@/lib/lost-reports";
import { clearLostReportDraft, useLostReportDraft } from "../draft";
import styles from "./page.module.css";

const REVIEW_PATH = "/lost/review";

type Submission =
  | { state: "idle" }
  | { state: "sending" }
  | { state: "failed"; message: string }
  | { state: "done"; reportNumber: string; token: string };

export function LostReportReview() {
  const router = useRouter();
  const draft = useLostReportDraft();
  const [submission, setSubmission] = useState<Submission>({ state: "idle" });

  const result = draft ? validateLostReport(draft.input) : null;
  const report = result?.ok ? result.value : null;
  // 下書きがない、または入力に不備があるときは入力画面に戻す（受付完了の表示中は除く）
  const shouldGoBack = draft !== undefined && report === null && submission.state !== "done";

  useEffect(() => {
    if (shouldGoBack) router.replace("/lost");
  }, [shouldGoBack, router]);

  if (submission.state === "done") {
    // 受付・確認状況のページ（/lost/[token]）へ移るまでのあいだだけ出す
    return (
      <>
        <PageHeading title="紛失届を受け付けました" />
        <DefinitionList items={[{ label: "受付番号", value: submission.reportNumber }]} />
        <ButtonLink href={`/lost/${submission.token}`}>受付・確認状況を見る</ButtonLink>
      </>
    );
  }

  if (report === null || !draft) {
    // 読み込み中、または入力画面へ戻る途中
    return <PageHeading title="登録内容の確認" />;
  }

  // 送信する下書き。応答を待つあいだに下書きが変わっても、この ID のものだけを片付ける
  const { input, requestId } = draft;

  async function submit() {
    setSubmission({ state: "sending" });
    try {
      const response = await fetch("/api/lost-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 送り直しても同じ requestId を送るので、前回が受け付け済みなら同じ受付番号が返る
        body: JSON.stringify({ ...input, requestId }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        reportNumber?: string;
        token?: string;
        message?: string;
      };
      if (!response.ok || !body.reportNumber || !body.token) {
        setSubmission({
          state: "failed",
          message: body.message ?? "受け付けられませんでした。時間をおいてもう一度お試しください。",
        });
        return;
      }
      // 先に done にしてから下書きを消す（下書きが消えたことで入力画面へ戻されないように）
      setSubmission({ state: "done", reportNumber: body.reportNumber, token: body.token });
      clearLostReportDraft(requestId);
      // 応答を待つあいだに「戻る」などで確認画面を離れていたら、移動しない
      // （入力画面で書き足している途中の内容を、状況ページへの移動で失わないように）
      if (window.location.pathname === REVIEW_PATH) router.replace(`/lost/${body.token}`);
    } catch {
      setSubmission({
        state: "failed",
        message: "通信できませんでした。電波の良い場所でもう一度お試しください。",
      });
    }
  }

  const sending = submission.state === "sending";
  const items = [
    { label: "カテゴリ", value: categoryLabel(report.category) },
    ...(requiresDescription(report.category)
      ? [{ label: "なくした物", value: report.itemDescription }]
      : []),
    { label: "色", value: describeColor(report) ?? "—" },
    { label: "特徴・備考", value: <span className={styles.multiline}>{report.features}</span> },
    { label: "場所", value: report.lostPlace ?? "—" },
    { label: "日時", value: report.lostTime ?? "—" },
    { label: "メール", value: <span className={styles.breakAnywhere}>{report.email}</span> },
  ];

  return (
    <>
      <PageHeading title="登録内容の確認" />
      <DefinitionList title="紛失届" items={items} />
      <p className={styles.note}>実行委員が内容を確認し、メールでご連絡します。</p>

      {submission.state === "failed" && (
        <div role="alert">
          <Notice tone="warning" title={submission.message} />
        </div>
      )}

      <div className={styles.actions}>
        <Button onClick={submit} disabled={sending}>
          {sending ? "登録しています…" : "この内容で登録する"}
        </Button>
        {sending ? (
          // 送信中は修正に戻れないようにする（戻って直した内容と、送信中の届け出が食い違うため）
          <Button variant="secondary" disabled>
            入力内容を修正する
          </Button>
        ) : (
          <ButtonLink href="/lost" variant="secondary">
            入力内容を修正する
          </ButtonLink>
        )}
      </div>
    </>
  );
}
