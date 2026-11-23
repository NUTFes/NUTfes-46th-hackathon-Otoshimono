"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button, ButtonLink, Field, Notice, Select, Textarea } from "@/components/ui";
import { UNKNOWN_NOTE_MAX_LENGTH, UNKNOWN_REASONS, validateUnknown, type UnknownErrors } from "@/lib/unknown";
import styles from "./unknown-actions.module.css";

/** status は画面で見た状態（不明にするときに、今も同じ状態かを API で確かめる） */
type Target = { id: string; label: string; status: string };

type Failure = { ok: false; message: string; errors?: UnknownErrors; stale?: boolean };

async function call(url: string, init: RequestInit): Promise<{ ok: true } | Failure | "login"> {
  try {
    const response = await fetch(url, init);
    if (response.status === 401) return "login";
    if (response.ok) return { ok: true };
    const body = (await response.json().catch(() => ({}))) as { error?: { message?: string; errors?: UnknownErrors } };
    return {
      ok: false,
      message: body.error?.message ?? "記録できませんでした。もう一度お試しください。",
      errors: body.error?.errors,
      // 画面を開いた後に、ほかの実行委員が状態を変えていた
      stale: response.status === 409,
    };
  } catch {
    return { ok: false, message: "通信できませんでした。電波の良い場所でもう一度お試しください。" };
  }
}

/** 失敗の案内。ほかの実行委員が状態を変えていたときは、読み直すボタンも出す（自動で読み直すと案内が消えるため）。 */
function FailureNotice({ failure, onReload }: { failure: Failure; onReload: () => void }) {
  return (
    <div role="alert" className={styles.actions}>
      <Notice tone="warning" title={failure.message} />
      {failure.stale && (
        <Button variant="secondary" onClick={onReload}>
          最新の状態を表示する
        </Button>
      )}
    </div>
  );
}

/**
 * M-BOX-UNKNOWN・M-UNKNOWN: 理由を選んで「不明」にする。
 * targets が2件以上なら「対象の通知」を選ばせる（BOX の画面）。1件ならその物を不明にする（物品の画面）。
 */
export function UnknownForm({
  targets,
  backHref,
  warning,
}: {
  targets: Target[];
  backHref: string;
  /** 物品の画面の「来場者への照合対象から外れます」 */
  warning?: boolean;
}) {
  const router = useRouter();
  const [itemId, setItemId] = useState(targets[0]?.id ?? "");
  const [reason, setReason] = useState<string>(UNKNOWN_REASONS[0]);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<UnknownErrors>({});
  const [failure, setFailure] = useState<Failure | null>(null);
  const [sending, setSending] = useState(false);
  // 記録した後、画面を読み直し終わるまで（不明にした通知が選択肢から消えるまで）は押せないようにする
  const [refreshing, startRefresh] = useTransition();

  // 画面を離れても状態は残る（cacheComponents）ので、戻ってきたときに押せるよう戻しておく
  useEffect(() => () => setSending(false), []);

  async function submit() {
    setFailure(null);
    const result = validateUnknown({ reason, note });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setSending(true);
    const expectedStatus = targets.find((target) => target.id === itemId)?.status;
    const outcome = await call(`/api/staff/items/${itemId}/unknown`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, note, expectedStatus }),
    });
    if (outcome === "login") return router.replace("/staff/login");
    if (outcome.ok) {
      setNote("");
      startRefresh(() => router.refresh());
    } else {
      if (outcome.errors) setErrors(outcome.errors);
      setFailure(outcome);
    }
    setSending(false);
  }

  return (
    <>
      {warning && (
        <Notice title="来場者への照合対象から外れます" tone="warning">
          見つかった場合は、前の状態に戻せます。
        </Notice>
      )}
      {targets.length > 1 && (
        <Field label="対象の通知" htmlFor="unknown-item">
          <Select id="unknown-item" value={itemId} onChange={(e) => setItemId(e.target.value)}>
            {targets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {targets.length === 1 && targets[0].label && (
        <Field label="対象の通知" htmlFor="unknown-item">
          <Select id="unknown-item" value={itemId} disabled>
            <option value={itemId}>{targets[0].label}</option>
          </Select>
        </Field>
      )}
      <Field
        label="理由"
        htmlFor="unknown-reason"
        required
        error={errors.reason}
        hint={warning ? `理由：${UNKNOWN_REASONS.join(" / ")}` : undefined}
      >
        <Select
          id="unknown-reason"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setErrors({});
          }}
        >
          {UNKNOWN_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label={reason === "その他" ? "補足" : "補足（任意）"}
        htmlFor="unknown-note"
        required={reason === "その他"}
        error={errors.note}
      >
        <Textarea
          id="unknown-note"
          rows={3}
          value={note}
          maxLength={UNKNOWN_NOTE_MAX_LENGTH}
          onChange={(e) => {
            setNote(e.target.value);
            setErrors((current) => ({ ...current, note: undefined }));
          }}
        />
      </Field>
      {failure && (
        <FailureNotice
          failure={failure}
          onReload={() => {
            setFailure(null);
            router.refresh();
          }}
        />
      )}
      <div className={styles.actions}>
        <Button onClick={submit} disabled={sending || refreshing || !itemId}>
          {sending || refreshing ? "記録しています…" : "理由を記録して不明にする"}
        </Button>
        <ButtonLink href={backHref} variant="secondary">
          戻る
        </ButtonLink>
      </div>
    </>
  );
}

/**
 * 「見つかった通知を元に戻す」など。戻したら afterHref へ移るか、同じ画面を読み直す。
 * updatedAt は画面を作ったときの items.updated_at（DB の文字列のまま）。今と違えば、別の不明の記録なので戻さない。
 */
export function RestoreButton({
  itemId,
  updatedAt,
  label,
  afterHref,
}: {
  itemId: string;
  updatedAt: string;
  label: string;
  afterHref?: string;
}) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  // 戻した後、画面を読み直し終わるまでは押せないようにする
  const [refreshing, startRefresh] = useTransition();

  useEffect(() => () => setSending(false), []);

  async function restore() {
    setSending(true);
    setFailure(null);
    const outcome = await call(`/api/staff/items/${itemId}/unknown`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expectedUpdatedAt: updatedAt }),
    });
    if (outcome === "login") return router.replace("/staff/login");
    if (!outcome.ok) {
      setFailure(outcome);
      setSending(false);
      return;
    }
    if (afterHref) {
      router.push(afterHref);
      router.refresh();
      return;
    }
    startRefresh(() => router.refresh());
    setSending(false);
  }

  return (
    <>
      {failure && (
        <FailureNotice
          failure={failure}
          onReload={() => {
            setFailure(null);
            router.refresh();
          }}
        />
      )}
      <Button onClick={restore} disabled={sending || refreshing}>
        {sending || refreshing ? "戻しています…" : label}
      </Button>
    </>
  );
}
