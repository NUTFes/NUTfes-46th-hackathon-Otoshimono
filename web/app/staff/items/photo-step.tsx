"use client";

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Button, Notice } from "@/components/ui";
import { captureVideo, fileToJpeg } from "@/lib/photo-capture";
import styles from "./photo-step.module.css";

function CameraIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

/** M-PHOTO: ブラウザーの中のカメラで撮るか、端末の写真を選ぶ。 */
export function PhotoStep({
  sending,
  takeLabel,
  onPhoto,
  onFailure,
  children,
}: {
  sending: boolean;
  /** 撮るボタンの文字（本登録は「写真を撮って入力へ」、編集は「写真を撮って編集に戻る」） */
  takeLabel: string;
  onPhoto: (photo: Blob | null) => void;
  onFailure: (message: string | null) => void;
  /** ボタンの下に足すもの（編集の「変更せずに戻る」など） */
  children?: ReactNode;
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
            {sending ? "送信しています…" : takeLabel}
          </Button>
        )}
        <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={sending}>
          端末の写真を選ぶ
        </Button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickFile} />
        {children}
      </div>
    </>
  );
}
