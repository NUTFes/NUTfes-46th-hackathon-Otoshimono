"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, Field, Notice, PageHeading, Select } from "@/components/ui";
import {
  validateRegistration,
  type RegistrationErrors,
  type RegistrationInput,
} from "@/lib/item-registration";
import { PhotoStep } from "../../photo-step";
import { RegistrationFields } from "../../registration-fields";
import styles from "./edit.module.css";

export function EditForm({
  itemId,
  summary,
  boxArea,
  photoId,
  initial,
}: {
  itemId: string;
  summary: string;
  boxArea: string;
  photoId: string | null;
  initial: RegistrationInput;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "photo">("form");
  const [input, setInput] = useState<RegistrationInput>(initial);
  // 保存済みの内容（保存されたらこのフォームは key で作り直される）
  const initialRef = useRef(initial);
  const [errors, setErrors] = useState<RegistrationErrors>({});
  // 撮り直した写真。「変更を保存する」まで送らない（保存せずに戻れば写真も変わらない）
  const [newPhoto, setNewPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  // 画面を離れても状態は残る（cacheComponents）。保存しないで離れたら、入力も写真も保存済みの内容に戻しておく
  useEffect(
    () => () => {
      setSending(false);
      setStep("form");
      setInput(initialRef.current);
      setErrors({});
      setNewPhoto(null);
      setFailure(null);
    },
    [],
  );
  // プレビュー用の URL を片付ける
  useEffect(() => {
    if (!newPhoto) return;
    return () => URL.revokeObjectURL(newPhoto.url);
  }, [newPhoto]);

  function go(next: "form" | "photo") {
    setFailure(null);
    setStep(next);
    window.scrollTo(0, 0);
  }

  function update(field: keyof RegistrationInput, value: string) {
    setInput((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function save() {
    setFailure(null);
    const result = validateRegistration(input);
    if (!result.ok) {
      setErrors(result.errors);
      const first = Object.keys(result.errors)[0];
      if (first) document.getElementById(`register-${first}`)?.focus();
      return;
    }
    setSending(true);
    setFailure(null);
    try {
      // 写真も変えるときは、写真と登録情報を1回の送信でまとめて保存する（どちらかだけ保存されることはない）
      let request: RequestInit;
      if (newPhoto) {
        const form = new FormData();
        form.append("fields", JSON.stringify(input));
        form.append("photo", newPhoto.blob, "photo.jpg");
        request = { method: "PATCH", body: form };
      } else {
        request = { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) };
      }
      const response = await fetch(`/api/staff/items/${itemId}`, request);
      if (response.status === 401) return router.replace("/staff/login");
      if (response.ok) {
        // この画面の中身も読み直しておく（戻ってきたときに保存した内容が出るように）
        router.refresh();
        router.push(`/staff/items/${itemId}?saved=1`);
        return;
      }
      const body = (await response.json().catch(() => ({}))) as {
        error?: { message?: string; errors?: RegistrationErrors };
      };
      if (body.error?.errors) setErrors(body.error.errors);
      setFailure(body.error?.message ?? "保存できませんでした。もう一度お試しください。");
    } catch {
      setFailure("通信できませんでした。電波の良い場所でもう一度お試しください。");
    }
    setSending(false);
  }

  const failureNotice = failure && (
    <div role="alert">
      <Notice tone="warning" title={failure} />
    </div>
  );

  if (step === "photo") {
    return (
      <>
        <PageHeading title="写真を変更する" description={summary} />
        <PhotoStep
          sending={false}
          takeLabel="写真を撮って編集に戻る"
          onPhoto={(blob) => {
            if (!blob) {
              setFailure("写真を開けませんでした。撮り直すか、別の写真を選んでください。");
              return;
            }
            setNewPhoto({ blob, url: URL.createObjectURL(blob) });
            go("form");
          }}
          onFailure={setFailure}
        >
          <Button variant="secondary" onClick={() => go("form")}>
            変更せずに戻る
          </Button>
        </PhotoStep>
        {failureNotice}
      </>
    );
  }

  const photoSrc = newPhoto?.url ?? (photoId ? `/api/photos/${photoId}` : null);
  return (
    <>
      <PageHeading title="登録情報を編集" description={summary} />
      {photoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- 撮り直した写真はブラウザーの中だけにあり、登録済の写真は実行委員だけが見られる API から出す
        <img src={photoSrc} alt="登録写真" className={styles.photo} />
      ) : (
        <p className={styles.muted}>写真はありません。</p>
      )}
      {newPhoto && <p className={styles.muted}>新しい写真は、「変更を保存する」を押すと保存されます。</p>}
      <Button variant="secondary" onClick={() => go("photo")} disabled={sending}>
        写真を変更する
      </Button>
      <RegistrationFields
        input={input}
        errors={errors}
        onChange={update}
        beforeStorage={
          <Field label="届けられたエリア（QRで記録）" htmlFor="edit-area">
            <Select id="edit-area" value={boxArea} disabled>
              <option value={boxArea}>{boxArea}</option>
            </Select>
          </Field>
        }
      />
      {failureNotice}
      <Button onClick={save} disabled={sending}>
        {sending ? "保存しています…" : "変更を保存する"}
      </Button>
    </>
  );
}
