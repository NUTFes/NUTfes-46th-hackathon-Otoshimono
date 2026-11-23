"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Button, DefinitionList, Notice, PageHeading } from "@/components/ui";
import { isCategoryCode } from "@/lib/categories";
import { isColorCode } from "@/lib/colors";
import {
  describeCategory,
  describeItemColor,
  validateRegistration,
  type Registration,
  type RegistrationErrors,
  type RegistrationInput,
} from "@/lib/item-registration";
import { STORAGE_LOCATIONS } from "@/lib/storage-locations";
import { PhotoStep } from "../../photo-step";
import { RegistrationFields } from "../../registration-fields";
import styles from "./register.module.css";

type Step = "photo" | "form" | "review";

const EMPTY_INPUT: RegistrationInput = {
  category: "",
  categoryNote: "",
  color: "",
  colorNote: "",
  description: "",
  storageLocation: STORAGE_LOCATIONS[0],
};

export function RegisterFlow({
  itemId,
  boxName,
  boxArea,
  initialPhotoId,
  issued,
}: {
  itemId: string;
  boxName: string;
  boxArea: string;
  initialPhotoId: string | null;
  issued: ReactNode;
}) {
  const router = useRouter();
  // 写真がもう登録されていれば（入力の途中で戻ってきたなど）、入力から始める
  const [step, setStep] = useState<Step>(initialPhotoId ? "form" : "photo");
  const [photoId, setPhotoId] = useState(initialPhotoId);
  const [input, setInput] = useState<RegistrationInput>(EMPTY_INPUT);
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [checked, setChecked] = useState<Registration | null>(null);
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  // 画面を離れても状態は残る（cacheComponents）ので、戻ってきたときに押せるよう戻しておく
  useEffect(() => () => setSending(false), []);

  function go(next: Step) {
    setFailure(null);
    setStep(next);
    window.scrollTo(0, 0);
  }

  async function uploadPhoto(photo: Blob | null) {
    if (!photo) {
      setFailure("写真を開けませんでした。撮り直すか、別の写真を選んでください。");
      return;
    }
    setSending(true);
    setFailure(null);
    try {
      const response = await fetch(`/api/staff/items/${itemId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: photo,
      });
      if (response.status === 401) return router.replace("/staff/login");
      const body = (await response.json().catch(() => ({}))) as { photoId?: string; error?: { message?: string } };
      if (!response.ok || !body.photoId) {
        setFailure(body.error?.message ?? "写真を送れませんでした。もう一度お試しください。");
        return;
      }
      setPhotoId(body.photoId);
      go("form");
    } catch {
      setFailure("通信できませんでした。電波の良い場所でもう一度お試しください。");
    } finally {
      setSending(false);
    }
  }

  function update(field: keyof RegistrationInput, value: string) {
    setInput((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function review() {
    const result = validateRegistration(input);
    if (!result.ok) {
      setErrors(result.errors);
      const first = Object.keys(result.errors)[0];
      if (first) document.getElementById(`register-${first}`)?.focus();
      return;
    }
    setChecked(result.value);
    go("review");
  }

  async function confirm() {
    if (!checked) return;
    setSending(true);
    setFailure(null);
    try {
      const response = await fetch(`/api/staff/items/${itemId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 確認した写真も送り、確定までに差し替えられていないかをサーバーで確かめる
        body: JSON.stringify({ ...input, photoId }),
      });
      if (response.status === 401) return router.replace("/staff/login");
      const body = (await response.json().catch(() => ({}))) as {
        managementNumber?: string;
        nextItemId?: string | null;
        error?: { message?: string; errors?: RegistrationErrors };
      };
      if (response.ok && body.managementNumber) {
        const issuedParam = `issued=${encodeURIComponent(body.managementNumber)}`;
        // 同じ BOX から回収した次の物があれば続けて本登録し、なければ回収済の一覧へ戻る
        router.push(body.nextItemId ? `/staff/items/${body.nextItemId}/register?${issuedParam}` : `/staff/items/queue?${issuedParam}`);
        return;
      }
      if (body.error?.errors) {
        setErrors(body.error.errors);
        go("form");
        return;
      }
      setFailure(body.error?.message ?? "本登録できませんでした。もう一度お試しください。");
      setSending(false);
    } catch {
      setFailure("通信できませんでした。電波の良い場所でもう一度お試しください。");
      setSending(false);
    }
  }

  const failureNotice = failure && (
    <div role="alert">
      <Notice tone="warning" title={failure} />
    </div>
  );
  const photo = photoId && (
    // eslint-disable-next-line @next/next/no-img-element -- 実行委員だけが見られる API から出すので next/image の最適化は使わない
    <img src={`/api/photos/${photoId}`} alt="登録する物品の写真" className={step === "review" ? styles.reviewPhoto : styles.formPhoto} />
  );

  if (step === "photo") {
    return (
      <>
        <PageHeading title="落とし物の写真を撮る" description="保管場所で、現物を1件ずつ本登録します。" />
        {issued}
        <PhotoStep sending={sending} takeLabel="写真を撮って入力へ" onPhoto={uploadPhoto} onFailure={setFailure} />
        {failureNotice}
        <p className={styles.muted}>{boxName}から回収した物を、1点ずつ本登録します。</p>
      </>
    );
  }

  if (step === "form") {
    return (
      <>
        <PageHeading title="回収した物を本登録" />
        {issued}
        <Notice title={`${boxName} / ${boxArea}`}>QRから記録した場所です。</Notice>
        {photo}
        <Button variant="secondary" onClick={() => go("photo")}>
          写真を撮り直す
        </Button>
        <RegistrationFields input={input} errors={errors} onChange={update} />
        <p className={styles.muted}>管理番号は本登録と同時に発行されます。</p>
        {failureNotice}
        <Button onClick={review}>登録内容を確認する</Button>
      </>
    );
  }

  const category = checked && isCategoryCode(checked.category) ? describeCategory(checked.category, checked.categoryNote) : "";
  const color = checked && (checked.color === null || isColorCode(checked.color)) ? describeItemColor(checked.color, checked.colorNote) : null;
  return (
    <>
      <PageHeading title="登録内容の確認" />
      {photo}
      <DefinitionList
        title="物品情報"
        items={[
          { label: "カテゴリ", value: category },
          { label: "色", value: color ?? "—" },
          { label: "特徴・備考", value: <span className={styles.multiline}>{checked?.description ?? "—"}</span> },
          { label: "届けられた場所", value: boxArea },
          { label: "保管場所", value: checked?.storageLocation ?? "" },
        ]}
      />
      {failureNotice}
      <div className={styles.actions}>
        <Button onClick={confirm} disabled={sending}>
          {sending ? "登録しています…" : "本登録を確定する"}
        </Button>
        <Button variant="secondary" onClick={() => go("form")} disabled={sending}>
          入力内容を修正する
        </Button>
      </div>
    </>
  );
}
