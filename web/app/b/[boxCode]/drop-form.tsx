"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
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
  const formRef = useRef<HTMLFormElement>(null);
  const [sending, setSending] = useState(false);

  // 画面を開いた時点で仮登録を送り、届くまで送り続ける（ボタンを押さない人も記録する）
  // 画面を離れたら送り直しをやめる（showDropPage の後片付け）
  useEffect(() => {
    const hide = showDropPage(boxCode);
    void ensureDropUntilDone(boxCode);
    return () => {
      hide();
      // 画面を離れても状態は残る（cacheComponents）ので、戻ってきたときに押せるよう戻しておく
      setSending(false);
    };
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
    if (dropId && isDropPageShown(boxCode)) {
      // 完了画面に切り替わるまでは「送信しています…」のままにする（push は切り替えを待たずに戻る）
      router.push(`/b/${boxCode}/sent`);
      return;
    }
    setSending(false);
  }

  // 撮影には dropId はいらないので、回線が悪くても待たせずに撮影画面へ移る。
  // 仮登録と種類・貴重品の回答は、撮影画面を開いている間も送り続ける（撮影画面も showDropPage で数える）
  function openCamera() {
    if (!formRef.current) return;
    const answers = readAnswers(formRef.current);
    router.push(`/b/${boxCode}/camera`);
    void ensureDropUntilDone(boxCode).then((dropId) => {
      if (dropId) return sendAnswers(boxCode, dropId, answers);
    });
  }

  return (
    <form ref={formRef} onSubmit={submit} className={styles.form}>
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
      <Button type="button" variant="secondary" disabled={sending} onClick={openCamera}>
        写真を撮る（任意）
      </Button>
      <Button type="submit" disabled={sending}>
        {sending ? "送信しています…" : "写真を撮らずに送信"}
      </Button>
    </form>
  );
}
