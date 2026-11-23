"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Button, DefinitionList, Field, Input, Notice, PageHeading, Select, Textarea } from "@/components/ui";
import { CATEGORIES, isCategoryCode, OTHER_CATEGORY } from "@/lib/categories";
import { COLORS, isColorCode, OTHER_COLOR } from "@/lib/colors";
import {
  describeCategory,
  describeItemColor,
  REGISTRATION_MAX_LENGTH,
  validateRegistration,
  type Registration,
  type RegistrationErrors,
  type RegistrationInput,
} from "@/lib/item-registration";
import { captureVideo, fileToJpeg } from "@/lib/photo-capture";
import { STORAGE_LOCATIONS } from "@/lib/storage-locations";
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

function CameraIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

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
        <PhotoStep sending={sending} onPhoto={uploadPhoto} onFailure={setFailure} />
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
        <Field label="カテゴリ" htmlFor="register-category" required error={errors.category}>
          <Select id="register-category" value={input.category} onChange={(e) => update("category", e.target.value)}>
            <option value="">選んでください</option>
            {CATEGORIES.map((category) => (
              <option key={category.code} value={category.code}>
                {category.label}
              </option>
            ))}
          </Select>
        </Field>
        {input.category === OTHER_CATEGORY && (
          <Field label="何の落とし物か" htmlFor="register-categoryNote" required error={errors.categoryNote}>
            <Input
              id="register-categoryNote"
              value={input.categoryNote}
              maxLength={REGISTRATION_MAX_LENGTH.categoryNote}
              placeholder="例: 帽子"
              onChange={(e) => update("categoryNote", e.target.value)}
            />
          </Field>
        )}
        <Field label="色" htmlFor="register-color" error={errors.color} hint="2色以上のときは「その他」を選んで書いてください。">
          <Select id="register-color" value={input.color} onChange={(e) => update("color", e.target.value)}>
            <option value="">選択しない</option>
            {COLORS.map((color) => (
              <option key={color.code} value={color.code}>
                {color.label}
              </option>
            ))}
          </Select>
        </Field>
        {input.color === OTHER_COLOR && (
          <Field label="色（自由記述）" htmlFor="register-colorNote" error={errors.colorNote}>
            <Input
              id="register-colorNote"
              value={input.colorNote}
              maxLength={REGISTRATION_MAX_LENGTH.colorNote}
              placeholder="例: 青と白"
              onChange={(e) => update("colorNote", e.target.value)}
            />
          </Field>
        )}
        <Field label="特徴・備考" htmlFor="register-description" error={errors.description}>
          <Textarea
            id="register-description"
            rows={3}
            value={input.description}
            maxLength={REGISTRATION_MAX_LENGTH.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </Field>
        <Field label="保管場所" htmlFor="register-storageLocation" required error={errors.storageLocation}>
          <Select
            id="register-storageLocation"
            value={input.storageLocation}
            onChange={(e) => update("storageLocation", e.target.value)}
          >
            {STORAGE_LOCATIONS.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </Select>
        </Field>
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

/** M-PHOTO: ブラウザーの中のカメラで撮るか、端末の写真を選ぶ。 */
function PhotoStep({
  sending,
  onPhoto,
  onFailure,
}: {
  sending: boolean;
  onPhoto: (photo: Blob | null) => void;
  onFailure: (message: string | null) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [camera, setCamera] = useState<"starting" | "live" | "unavailable">("starting");

  // この手順を表示している間だけカメラを動かす
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    const request = navigator.mediaDevices?.getUserMedia
      ? navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1920 } },
          audio: false,
        })
      : Promise.reject(new Error("カメラに対応していません"));
    request
      .then((started) => {
        if (cancelled) {
          started.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = started;
        if (videoRef.current) videoRef.current.srcObject = started;
      })
      .catch(() => {
        if (!cancelled) setCamera("unavailable");
      });
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
      setCamera((current) => (current === "live" ? "starting" : current));
    };
  }, []);

  async function takePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    onPhoto(await captureVideo(video));
  }

  async function pickFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    onFailure(null);
    onPhoto(await fileToJpeg(file));
  }

  return (
    <>
      {camera === "unavailable" ? (
        <Notice title="カメラを使えませんでした" tone="warning">
          「端末の写真を選ぶ」から写真を選べます。
        </Notice>
      ) : (
        <div className={styles.viewfinder}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={styles.video}
            onLoadedMetadata={() => setCamera((current) => (current === "starting" ? "live" : current))}
          />
          {camera === "starting" && (
            <span className={styles.placeholder}>
              <CameraIcon />
            </span>
          )}
        </div>
      )}
      <p className={styles.muted}>物全体と目印になる部分が分かるように撮影してください。</p>
      <div className={styles.actions}>
        {camera !== "unavailable" && (
          <Button onClick={takePhoto} disabled={camera !== "live" || sending}>
            {sending ? "送信しています…" : "写真を撮って入力へ"}
          </Button>
        )}
        <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={sending}>
          端末の写真を選ぶ
        </Button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickFile} />
      </div>
    </>
  );
}
