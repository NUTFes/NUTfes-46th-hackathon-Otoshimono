"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, DefinitionList, Field, Notice, Select } from "@/components/ui";
import styles from "./page.module.css";

export type MatchCandidate = { id: string; managementNumber: string; label: string; storageLocation: string };

type Sending = "none" | "found" | "notFound";

export function ReportActions({
  reportId,
  email,
  status,
  matchedItemId,
  candidates,
}: {
  reportId: string;
  email: string;
  status: string;
  matchedItemId: string | null;
  candidates: MatchCandidate[];
}) {
  const router = useRouter();
  const [itemId, setItemId] = useState(matchedItemId ?? "");
  const [sending, setSending] = useState<Sending>("none");
  const [result, setResult] = useState<{ tone: "info" | "warning"; message: string } | null>(null);
  const selected = candidates.find((candidate) => candidate.id === itemId);

  // 画面を離れても状態は残る（cacheComponents）ので、戻ってきたときに押せるよう戻しておく
  useEffect(() => () => setSending("none"), []);

  async function send(kind: Exclude<Sending, "none">) {
    setSending(kind);
    setResult(null);
    try {
      const response = await fetch(`/api/staff/reports/${reportId}/${kind === "found" ? "found-notice" : "not-found-notice"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: kind === "found" ? JSON.stringify({ itemId }) : "{}",
      });
      if (response.status === 401) {
        router.replace("/staff/login");
        return;
      }
      const body = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!response.ok) {
        setResult({ tone: "warning", message: body.error?.message ?? "送れませんでした。もう一度お試しください。" });
        return;
      }
      setResult({
        tone: "info",
        message: kind === "found" ? "受取案内を送りました。" : "現在は見つかっていないことを連絡しました。",
      });
      // 状況の表示を読み直す
      router.refresh();
    } catch {
      setResult({ tone: "warning", message: "通信できませんでした。電波の良い場所でもう一度お試しください。" });
    } finally {
      setSending("none");
    }
  }

  return (
    <>
      {candidates.length === 0 ? (
        <p className={styles.muted}>本登録済の物品がまだありません。</p>
      ) : (
        <Field label="見つかった物の管理番号" htmlFor="matched-item">
          <Select id="matched-item" value={itemId} onChange={(event) => setItemId(event.target.value)}>
            <option value="">選んでください</option>
            {candidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <DefinitionList
        title="送る受取案内"
        items={[
          { label: "管理番号", value: selected?.managementNumber ?? "—" },
          { label: "保管場所", value: selected?.storageLocation ?? "—" },
          { label: "宛先", value: email },
        ]}
      />
      {result && (
        <div role={result.tone === "warning" ? "alert" : "status"}>
          <Notice tone={result.tone} title={result.message} />
        </div>
      )}
      <Button onClick={() => send("found")} disabled={!selected || sending !== "none"}>
        {sending === "found" ? "送信しています…" : "受取案内を送る"}
      </Button>
      {status === "pending" && (
        <section className={styles.notFound} aria-labelledby="not-found-title">
          <h2 id="not-found-title" className={styles.sectionTitle}>
            見つからない場合
          </h2>
          <p className={styles.muted}>現在は見つかっていないことをメールで知らせ、照合を続けます。</p>
          <Button variant="secondary" onClick={() => send("notFound")} disabled={sending !== "none"}>
            {sending === "notFound" ? "送信しています…" : "未発見を連絡する"}
          </Button>
        </section>
      )}
    </>
  );
}
