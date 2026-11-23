"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, ButtonLink, Checkbox, Field, Input, Notice, Textarea } from "@/components/ui";
import {
  EMPTY_HANDOVER_INPUT,
  HANDOVER_MAX_LENGTH,
  validateHandover,
  type HandoverErrors,
  type HandoverInput,
} from "@/lib/handovers";
import styles from "./page.module.css";

export function HandoverForm({ itemId, backHref }: { itemId: string; backHref: string }) {
  const router = useRouter();
  const [input, setInput] = useState<HandoverInput>(EMPTY_HANDOVER_INPUT);
  const [errors, setErrors] = useState<HandoverErrors>({});
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  function update<K extends keyof HandoverInput>(field: K, value: HandoverInput[K]) {
    setInput((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    const result = validateHandover(input);
    if (!result.ok) {
      setErrors(result.errors);
      const first = Object.keys(result.errors)[0];
      if (first) document.getElementById(`handover-${first}`)?.focus();
      return;
    }

    setSending(true);
    setFailure(null);
    try {
      const response = await fetch(`/api/staff/items/${itemId}/handover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (response.ok) {
        // 受渡記録の表示（#20）ができるまでは、物品の詳細へ戻る
        router.replace(backHref);
        router.refresh();
        return;
      }
      const body = (await response.json().catch(() => ({}))) as {
        error?: { message?: string; errors?: HandoverErrors };
      };
      if (response.status === 401) {
        router.replace("/staff/login");
        return;
      }
      if (body.error?.errors) setErrors(body.error.errors);
      setFailure(body.error?.message ?? "記録できませんでした。もう一度お試しください。");
    } catch {
      setFailure("通信できませんでした。電波の良い場所でもう一度お試しください。");
    }
    setSending(false);
  }

  return (
    // method="post": JavaScript が動く前に押されても、氏名・電話番号が URL に載らないようにする
    <form className={styles.form} method="post" onSubmit={handleSubmit} noValidate>
      <Field label="氏名" htmlFor="handover-recipientName" required error={errors.recipientName}>
        <Input
          id="handover-recipientName"
          name="recipientName"
          value={input.recipientName}
          maxLength={HANDOVER_MAX_LENGTH.recipientName}
          autoComplete="off"
          required
          aria-invalid={errors.recipientName ? true : undefined}
          onChange={(e) => update("recipientName", e.target.value)}
        />
      </Field>
      <Field label="電話番号" htmlFor="handover-phone" required error={errors.phone}>
        <Input
          id="handover-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          value={input.phone}
          maxLength={HANDOVER_MAX_LENGTH.phone}
          autoComplete="off"
          required
          placeholder="090-0000-0000"
          aria-invalid={errors.phone ? true : undefined}
          onChange={(e) => update("phone", e.target.value)}
        />
      </Field>
      <Field label="メール（任意）" htmlFor="handover-email" error={errors.email}>
        <Input
          id="handover-email"
          name="email"
          type="email"
          inputMode="email"
          value={input.email}
          maxLength={HANDOVER_MAX_LENGTH.email}
          autoComplete="off"
          aria-invalid={errors.email ? true : undefined}
          onChange={(e) => update("email", e.target.value)}
        />
      </Field>
      <Field label="本人確認メモ（任意）" htmlFor="handover-identityNote" error={errors.identityNote}>
        <Textarea
          id="handover-identityNote"
          name="identityNote"
          rows={3}
          value={input.identityNote}
          maxLength={HANDOVER_MAX_LENGTH.identityNote}
          placeholder="管理番号と物品の特徴を確認。"
          aria-invalid={errors.identityNote ? true : undefined}
          onChange={(e) => update("identityNote", e.target.value)}
        />
      </Field>
      <div className={styles.check}>
        <Checkbox
          id="handover-confirmed"
          name="confirmed"
          label="本人確認と、現物の受渡が完了しました"
          checked={input.confirmed}
          aria-invalid={errors.confirmed ? true : undefined}
          onChange={(e) => update("confirmed", e.target.checked)}
        />
        {errors.confirmed && (
          <p className={styles.error} role="alert">
            {errors.confirmed}
          </p>
        )}
      </div>

      {failure && (
        <div role="alert">
          <Notice tone="warning" title={failure} />
        </div>
      )}

      <div className={styles.actions}>
        <Button type="submit" disabled={sending}>
          {sending ? "記録しています…" : "受渡済として記録する"}
        </Button>
        <ButtonLink href={backHref} variant="secondary">
          記録せずに戻る
        </ButtonLink>
      </div>
    </form>
  );
}
