"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button, Checkbox, Field, Select } from "@/components/ui";
import { CATEGORIES } from "@/lib/categories";
import styles from "./drop.module.css";

// 同じタブで再読み込みしたり戻ったりしても、仮登録を増やさない。
// dropId は送る前に作って sessionStorage に置き、サーバーは同じ dropId を2件目にしない。
// StrictMode で effect が2回動いても1回だけ送るよう、送信中の Promise もタブの中で共有する。
const inflight = new Map<string, Promise<string | null>>();

// crypto.randomUUID は HTTPS か localhost でしか使えないので、getRandomValues で UUID v4 を作る
function newDropId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function storageKey(boxCode: string) {
  return `drop:${boxCode}`;
}

/** このタブでこの BOX に使う dropId。まだ無ければ作って覚える。 */
function tabDropId(boxCode: string): string {
  try {
    const stored = sessionStorage.getItem(storageKey(boxCode));
    if (stored) return stored;
    const created = newDropId();
    sessionStorage.setItem(storageKey(boxCode), created);
    return created;
  } catch {
    // 保存できない環境では、再読み込みで仮登録がもう1件増えるだけ
    return newDropId();
  }
}

async function withRetry(send: (signal: AbortSignal) => Promise<Response>): Promise<Response | null> {
  // 混雑時の不安定な回線を想定し、画面には何も出さずに数回やり直す（通信エラーの画面は作らない）
  for (const wait of [0, 1000, 2000, 4000]) {
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    try {
      // 応答が返らないまま待ち続けないよう、1回ごとに打ち切る
      const response = await send(AbortSignal.timeout(8000));
      if (response.ok || response.status < 500) return response;
    } catch {
      // 次の回でやり直す
    }
  }
  return null;
}

/** 仮登録を送る（同じ dropId なら何度送っても1件）。送れたら dropId、送れなければ null。 */
function ensureDrop(boxCode: string): Promise<string | null> {
  let pending = inflight.get(boxCode);
  if (!pending) {
    const dropId = tabDropId(boxCode);
    pending = withRetry((signal) =>
      fetch("/api/drops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boxCode, dropId }),
        signal,
      }),
    ).then((response) => (response?.ok ? dropId : null));
    inflight.set(boxCode, pending);
    pending.finally(() => inflight.delete(boxCode));
  }
  return pending;
}

export function DropForm({ boxCode }: { boxCode: string }) {
  const router = useRouter();
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void ensureDrop(boxCode);
  }, [boxCode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const reportedCategory = form.get("reportedCategory") || null;
    const isValuable = form.get("isValuable") ? true : null;

    setSending(true);
    const dropId = await ensureDrop(boxCode);
    if (dropId && (reportedCategory || isValuable)) {
      await withRetry((signal) =>
        fetch(`/api/drops/${dropId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportedCategory, isValuable }),
          signal,
        }),
      );
    }
    // 追加の情報は任意なので、送れなかったときも完了の画面へ進む
    router.push(`/b/${boxCode}/sent`);
  }

  return (
    <form onSubmit={submit} className={styles.form}>
      <h2 className={styles.sectionTitle}>追加の情報（任意）</h2>
      <Field label="種類（任意）" htmlFor="reportedCategory">
        <Select id="reportedCategory" name="reportedCategory" defaultValue="">
          <option value="">選択しない</option>
          {CATEGORIES.map((category) => (
            <option key={category.code} value={category.code}>
              {category.label}
            </option>
          ))}
        </Select>
      </Field>
      <Checkbox name="isValuable" label="財布・スマホ・鍵など貴重品かも" />
      <Button type="submit" disabled={sending}>
        {sending ? "送信しています…" : "写真を撮らずに送信"}
      </Button>
    </form>
  );
}
