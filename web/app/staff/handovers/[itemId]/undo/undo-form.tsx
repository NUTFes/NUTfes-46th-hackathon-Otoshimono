"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect, useState } from "react";
import { Button, ButtonLink, Notice } from "@/components/ui";
import styles from "../page.module.css";

/** 「受渡を取り消して戻す」と「取り消さずに戻る」。 */
export function UndoForm({ itemId, cancelHref }: { itemId: string; cancelHref: string }) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  // cacheComponents では、離れた画面の状態が残る。画面を移ったときや送信中に離れたときに
  // 「取り消しています…」のまま残らないよう、画面が隠れるときに戻す（受渡の記録画面と同じ）
  useLayoutEffect(() => () => setSending(false), []);

  async function undo() {
    if (sending) return;
    setSending(true);
    setFailure(null);
    try {
      const response = await fetch(`/api/staff/items/${itemId}/handover`, { method: "DELETE" });
      // 応答を待つあいだに画面を離れていたら、遅れて届いた応答で画面を切り替えない
      const stillHere = window.location.pathname === `/staff/handovers/${itemId}/undo`;
      if (response.ok) {
        // 本登録済に戻った物品の詳細へ
        if (stillHere) router.replace(`/staff/items/${itemId}`);
        return;
      }
      if (response.status === 401) {
        if (stillHere) router.replace("/staff/login");
        return;
      }
      const body = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      setFailure(body.error?.message ?? "取り消せませんでした。もう一度お試しください。");
    } catch {
      setFailure("通信できませんでした。電波の良い場所でもう一度お試しください。");
    }
    setSending(false);
  }

  return (
    <>
      {failure && (
        <div role="alert">
          <Notice tone="warning" title={failure} />
        </div>
      )}
      <div className={styles.actions}>
        <Button onClick={undo} disabled={sending}>
          {sending ? "取り消しています…" : "受渡を取り消して戻す"}
        </Button>
        {sending ? (
          // 送信中は押せないようにする（押しても送った取り消しは止まらず、やめられたと誤解するため）
          <Button variant="secondary" disabled>
            取り消さずに戻る
          </Button>
        ) : (
          <ButtonLink href={cancelHref} variant="secondary">
            取り消さずに戻る
          </ButtonLink>
        )}
      </div>
    </>
  );
}
