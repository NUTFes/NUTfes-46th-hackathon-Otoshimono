"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, Notice } from "@/components/ui";
import styles from "./scanner.module.css";

// QR を読み解く本体（wasm）は外部の CDN からではなく、ビルドに含めて自分のサーバーから配る。
// zxing-wasm は barcode-detector が使う版のもの（package-lock.json で barcode-detector と一緒に入る）。
const ZXING_WASM_URL = new URL("zxing-wasm/reader/zxing_reader.wasm", import.meta.url).href;
// 読み取りを試す間隔
const SCAN_INTERVAL_MS = 300;

type Detector = { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> };
type Step = "starting" | "live" | "unavailable" | "collecting";

/** ブラウザーに QR を読む機能があればそれを使い、無ければ（iOS Safari など）zxing-wasm で読む。 */
async function createDetector(): Promise<Detector> {
  const native = (globalThis as { BarcodeDetector?: { new (options: { formats: string[] }): Detector; getSupportedFormats(): Promise<string[]> } }).BarcodeDetector;
  if (native && (await native.getSupportedFormats()).includes("qr_code")) {
    return new native({ formats: ["qr_code"] });
  }
  const { BarcodeDetector, prepareZXingModule } = await import("barcode-detector/ponyfill");
  prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? ZXING_WASM_URL : prefix + path),
    },
  });
  return new BarcodeDetector({ formats: ["qr_code"] });
}

/** BOX の QR の URL（…/b/Gt7mQ2xa）から BOX のコードを取り出す。印刷した URL のドメインは問わない。 */
function boxCodeFrom(rawValue: string): string | null {
  return /\/b\/([A-Za-z0-9]{8})(?:[/?#]|$)/.exec(rawValue)?.[1] ?? null;
}

export function Scanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [step, setStep] = useState<Step>("starting");
  const [message, setMessage] = useState<string | null>(null);

  // 画面を表示している間だけカメラを動かし、読み取りを続ける（離れたら止める。戻ってきたら動かし直す）
  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function collect(boxCode: string): Promise<void> {
      setStep("collecting");
      setMessage(null);
      try {
        const response = await fetch(`/api/staff/boxes/${boxCode}/collect`, { method: "POST" });
        if (cancelled) return;
        if (response.status === 401) {
          router.replace("/staff/login");
          return;
        }
        const body = (await response.json().catch(() => ({}))) as { collected?: number; error?: { message?: string } };
        if (response.ok && typeof body.collected === "number") {
          router.push(`/staff/boxes/${boxCode}/collected?count=${body.collected}`);
          return;
        }
        setMessage(response.status === 404 ? "登録されていないBOXのQRです。" : (body.error?.message ?? "回収を記録できませんでした。もう一度読み取ってください。"));
      } catch {
        if (cancelled) return;
        setMessage("通信できませんでした。電波の良い場所でもう一度読み取ってください。");
      }
      setStep("live");
      scanSoon();
    }

    let detector: Detector | null = null;
    async function scan(): Promise<void> {
      const video = videoRef.current;
      if (cancelled || !detector || !video || video.readyState < 2) return scanSoon();
      const codes = await detector.detect(video).catch(() => []);
      if (cancelled) return;
      for (const code of codes) {
        const boxCode = boxCodeFrom(code.rawValue);
        if (boxCode) return collect(boxCode);
        setMessage("BOXのQRではありません。箱に貼られたQRを読み取ってください。");
      }
      scanSoon();
    }
    function scanSoon() {
      if (!cancelled) timer = setTimeout(() => void scan(), SCAN_INTERVAL_MS);
    }

    const request = navigator.mediaDevices?.getUserMedia
      ? navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      : Promise.reject(new Error("カメラに対応していません"));
    Promise.all([request, createDetector()])
      .then(([started, created]) => {
        if (cancelled) {
          started.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = started;
        detector = created;
        if (videoRef.current) videoRef.current.srcObject = started;
        setStep("live");
        scanSoon();
      })
      .catch(() => {
        if (!cancelled) setStep("unavailable");
      });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
      // 戻ってきたときは、カメラが動くまで待つ
      setStep("starting");
      setMessage(null);
    };
  }, [router]);

  if (step === "unavailable") {
    return (
      <Notice title="カメラを使えませんでした" tone="warning">
        ブラウザーの設定でカメラを許可してから、もう一度開いてください。
      </Notice>
    );
  }

  return (
    <>
      <div className={styles.viewfinder}>
        <video ref={videoRef} autoPlay playsInline muted className={styles.video} />
        <span className={styles.frame} aria-hidden="true" />
      </div>
      {message && (
        <div role="alert">
          <Notice tone="warning" title={message} />
        </div>
      )}
      <Button disabled>
        {step === "starting" ? "カメラを準備しています…" : step === "collecting" ? "回収を記録しています…" : "QRを読み取っています…"}
      </Button>
    </>
  );
}
