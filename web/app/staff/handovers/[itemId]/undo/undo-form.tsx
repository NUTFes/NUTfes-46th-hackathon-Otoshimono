"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink, Notice } from "@/components/ui";
import styles from "../page.module.css";

/** 「受渡を取り消して戻す」と「取り消さずに戻る」。 */
export function UndoForm({ itemId, cancelHref }: { itemId: string; cancelHref: string }) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function undo() {
    if (sending) return;
    setSending(true);
    setFailure(null);
    try {
      const response = await fetch(`/api/staff/items/${itemId}/handover`, { method: "DELETE" });
      if (response.ok) {
        // 本登録済に戻った物品の詳細へ
        router.replace(`/staff/items/${itemId}`);
        return;
      }
      if (response.status === 401) {
        router.replace("/staff/login");
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
        <ButtonLink href={cancelHref} variant="secondary">
          取り消さずに戻る
        </ButtonLink>
      </div>
    </>
  );
}
