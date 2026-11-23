"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button, Checkbox, Field, Select } from "@/components/ui";
import { CATEGORIES } from "@/lib/categories";
import { ensureDrop, ensureDropUntilDone, finishDrop, sendAnswers, type DropAnswers } from "./drop-client";
import styles from "./drop.module.css";

function readAnswers(form: HTMLFormElement): DropAnswers {
  const data = new FormData(form);
  return {
    reportedCategory: (data.get("reportedCategory") as string) || null,
    isValuable: data.get("isValuable") ? true : null,
  };
}

export function DropForm({ boxCode }: { boxCode: string }) {
  const router = useRouter();
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void ensureDrop(boxCode);
  }, [boxCode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const answers = readAnswers(event.currentTarget);
    setSending(true);
    // 仮登録が送れるまでは完了画面へ進まない
    const dropId = await ensureDropUntilDone(boxCode);
    // 追加の情報は任意なので、送れなかったときも完了の画面へ進む
    await sendAnswers(dropId, answers);
    finishDrop(boxCode);
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
