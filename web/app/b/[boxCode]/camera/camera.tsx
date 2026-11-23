"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, ButtonLink, Notice } from "@/components/ui";
import { ensureDropUntilDone, sendPhoto, showDropPage } from "../drop-client";
import styles from "./camera.module.css";

// 何が写っているか分かれば十分なので、長い辺を 1280px に縮めて送る。
// canvas に描き直すので、写真に埋め込まれた撮影場所（GPS）などの情報も消える。
const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.8;

type Step =
  | { kind: "starting" }
  | { kind: "live" }
  | { kind: "unavailable" }
  | { kind: "captured"; photo: Blob; url: string }
  | { kind: "sending"; photo: Blob; url: string };

function CameraIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function capture(video: HTMLVideoElement): Promise<Blob | null> {
  const scale = Math.min(1, MAX_EDGE / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
}

export function Camera({ boxCode }: { boxCode: string }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [step, setStep] = useState<Step>({ kind: "starting" });
  // カメラを動かすのは撮影前だけ。撮った後に画面を離れて戻っても（effect が動き直しても）起動しない
  const needsCamera = step.kind === "starting" || step.kind === "live";
  // この撮影画面そのものを表示しているか。同じ BOX の V-DROP に戻ったら、写真の送り直しも完了画面への移動もしない
  const shownRef = useRef(false);
  // 画面を離れるたびに増やす。離れる前に始めた送信は、同じ画面を開き直しても続けない（古い写真の再送や移動をしない）
  const visitRef = useRef(0);

  // この画面を離れたら、仮登録や写真の送り直しをやめる
  useEffect(() => {
    shownRef.current = true;
    const hide = showDropPage(boxCode);
    return () => {
      shownRef.current = false;
      visitRef.current += 1;
      hide();
      // 画面を離れても状態は残る（cacheComponents）ので、完了画面から戻ってきたときにボタンを押せるよう戻しておく
      setStep((current) => (current.kind === "sending" ? { ...current, kind: "captured" } : current));
    };
  }, [boxCode]);

  useEffect(() => {
    if (!needsCamera) return;
    let stream: MediaStream | null = null;
    let cancelled = false;
    // HTTPS でない、または対応していないブラウザーでは getUserMedia が無い
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
        // 「写真を撮る」は、映像の大きさが分かった時点（onLoadedMetadata）で押せるようにする
        if (videoRef.current) videoRef.current.srcObject = started;
      })
      .catch(() => {
        if (!cancelled) setStep({ kind: "unavailable" });
      });
    return () => {
      // 画面を離れたら、すぐにカメラを止める
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
      // 戻ってきたときは、映像が出るまで「写真を撮る」を押せないようにする
      setStep((current) => (current.kind === "live" ? { kind: "starting" } : current));
    };
  }, [needsCamera]);

  // 撮った写真のプレビュー用 URL を片付ける
  const previewUrl = step.kind === "captured" || step.kind === "sending" ? step.url : null;
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function takePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const photo = await capture(video);
    if (!photo) return;
    (video.srcObject as MediaStream | null)?.getTracks().forEach((track) => track.stop());
    setStep({ kind: "captured", photo, url: URL.createObjectURL(photo) });
  }

  async function send() {
    if (step.kind !== "captured") return;
    const captured = step;
    setStep({ ...captured, kind: "sending" });
    const visit = visitRef.current;
    const stillHere = () => shownRef.current && visitRef.current === visit;
    // 仮登録が送れるまでは完了画面へ進まない
    const dropId = await ensureDropUntilDone(boxCode);
    // 写真は任意なので、送れなかったときも完了の画面へ進む（通信エラーの画面は作らない）
    if (dropId && stillHere()) await sendPhoto(dropId, captured.photo, stillHere);
    // 待っている間に画面を離れていたら、画面に触らない（離れたときに確認画面へ戻してある）
    if (!stillHere()) return;
    // 受け付けられない（BOX が無いなど）ときは完了と出さない
    if (dropId) router.push(`/b/${boxCode}/sent`);
    else setStep(captured);
  }

  if (step.kind === "captured" || step.kind === "sending") {
    return (
      <>
        <h1 className={styles.title}>撮影した写真</h1>
        {/* eslint-disable-next-line @next/next/no-img-element -- ブラウザーの中だけにある写真なので next/image は使えない */}
        <img src={step.url} alt="撮影した落とし物の写真" className={styles.photo} />
        <div className={styles.actions}>
          <Button onClick={send} disabled={step.kind === "sending"}>
            {step.kind === "sending" ? "送信しています…" : "この写真を送る"}
          </Button>
          <Button
            variant="secondary"
            disabled={step.kind === "sending"}
            onClick={() => setStep({ kind: "starting" })}
          >
            撮り直す
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className={styles.title}>落とし物を撮影</h1>
      {step.kind === "unavailable" ? (
        <Notice title="カメラを使えませんでした" tone="warning">
          ブラウザーの設定でカメラを許可してから、もう一度開いてください。
        </Notice>
      ) : (
        <div className={styles.viewfinder}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={styles.video}
            onLoadedMetadata={() => setStep((current) => (current.kind === "starting" ? { kind: "live" } : current))}
          />
          {step.kind === "starting" && (
            <span className={styles.placeholder}>
              <CameraIcon />
            </span>
          )}
        </div>
      )}
      <div className={styles.actions}>
        {step.kind !== "unavailable" && (
          <Button onClick={takePhoto} disabled={step.kind !== "live"}>
            写真を撮る
          </Button>
        )}
        <ButtonLink href={`/b/${boxCode}`} variant="secondary">
          撮影をやめる
        </ButtonLink>
      </div>
    </>
  );
}
