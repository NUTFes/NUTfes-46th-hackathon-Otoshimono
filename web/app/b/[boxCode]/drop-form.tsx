"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button, Checkbox, Field, Select } from "@/components/ui";
import { CATEGORIES } from "@/lib/categories";
import { ensureDropUntilDone, isDropPageShown, sendAnswers, showDropPage, type DropAnswers } from "./drop-client";
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

  // 画面を開いた時点で仮登録を送り、届くまで送り続ける（ボタンを押さない人も記録する）
  // 画面を離れたら送り直しをやめる（showDropPage の後片付け）
  useEffect(() => {
    const hide = showDropPage(boxCode);
    void ensureDropUntilDone(boxCode);
    return hide;
  }, [boxCode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const answers = readAnswers(event.currentTarget);
    setSending(true);
    // 仮登録が送れるまでは完了画面へ進まない
    const dropId = await ensureDropUntilDone(boxCode);
    // 追加の情報は任意なので、送れなかったときも完了の画面へ進む
    if (dropId) await sendAnswers(boxCode, dropId, answers);
    // 待っている間に画面を離れていたら、別の画面を見ている人を動かさない。
    // 送り直しても受け付けられない（BOX が無くなったなど）ときは、完了とは出さない
    if (dropId && isDropPageShown(boxCode)) router.push(`/b/${boxCode}/sent`);
    // 画面を離れても状態は残る（cacheComponents）ので、戻ってきたときに押せるよう戻しておく
    setSending(false);
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
