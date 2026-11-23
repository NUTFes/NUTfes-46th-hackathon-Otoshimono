"use client";

// 拾得者の画面からサーバーへ送る処理。
//
// - QR を読んで新しくページを開いた（ブラウザーの記録が navigate）ときだけ、新しい届け出として dropId を作る。
//   再読み込み・戻る・進む・アプリ内の移動（完了画面から戻るなど）では同じ dropId を使う。
//   dropId は sessionStorage とメモリに置き、サーバーは同じ dropId を2件目にしない。
// - 画面を開いている間は、仮登録が届くまで同じ dropId で送り続ける（ボタンを押さない人も記録される）。
//   画面を離れたら送り直しをやめる。BOX が無いなど、送り直しても直らない応答でもやめる。
// - 仮登録が送れるまでは完了画面へ進まない（記録されていないのに「受け付けた」と出さない）。
//   エラーの画面は作らない（要件定義v2 で削除）ので、ボタンは「送信しています…」のまま待つ。

type DropResult = { kind: "ok"; dropId: string } | { kind: "retry" } | { kind: "gone" };

// sessionStorage が使えない環境でも、このページを開いている間は同じ dropId を使う
const memoryIds = new Map<string, string>();
// StrictMode で effect が2回動いても1回だけ送るよう、送信中の Promise も共有する
const inflight = new Map<string, Promise<DropResult>>();
// このページ（ドキュメント）で、BOX ごとに新しい届け出かどうかをもう判断したか
const decided = new Set<string>();
// BOX ごとに、受付の画面（V-DROP・撮影画面）をいくつ表示しているか。0 になったら送り直しをやめる
const shown = new Map<string, number>();

/** 受付の画面を表示している間だけ呼んでおく（useEffect で呼び、戻り値を後片付けで呼ぶ）。 */
export function showDropPage(boxCode: string): () => void {
  shown.set(boxCode, (shown.get(boxCode) ?? 0) + 1);
  return () => shown.set(boxCode, (shown.get(boxCode) ?? 1) - 1);
}

/** この BOX の受付の画面を表示しているか。離れたら送り直しも画面の移動もしない。 */
export function isDropPageShown(boxCode: string): boolean {
  return (shown.get(boxCode) ?? 0) > 0;
}

// crypto.randomUUID は HTTPS か localhost でしか使えないので、getRandomValues で UUID v4 を作る
function newDropId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function storageKey(boxCode: string) {
  return `drop:${boxCode}`;
}

/** QR を読んで URL を新しく開いたか（再読み込み・戻る・進むではないか）。 */
function openedFresh(): boolean {
  const entry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return !entry || entry.type === "navigate";
}

function forget(boxCode: string): void {
  memoryIds.delete(boxCode);
  try {
    sessionStorage.removeItem(storageKey(boxCode));
  } catch {
    // 何もしない
  }
}

/** この届け出に使う dropId。まだ無ければ作って覚える。 */
function currentDropId(boxCode: string): string {
  // QR を読み直して開いたページなら、前の届け出とは別の物なので新しい dropId にする。
  // 判断はページを開いて最初の1回だけ（その後のアプリ内の移動では同じ届け出）。
  if (!decided.has(boxCode)) {
    decided.add(boxCode);
    if (openedFresh()) forget(boxCode);
  }
  const remembered = memoryIds.get(boxCode);
  if (remembered) return remembered;
  let dropId: string | null = null;
  try {
    dropId = sessionStorage.getItem(storageKey(boxCode));
  } catch {
    // 読めなければ新しく作る
  }
  if (!dropId) {
    dropId = newDropId();
    try {
      sessionStorage.setItem(storageKey(boxCode), dropId);
    } catch {
      // 保存できなくてもメモリに持つので、このページの中では同じ dropId を使える
    }
  }
  memoryIds.set(boxCode, dropId);
  return dropId;
}

/**
 * 混雑時の不安定な回線を想定し、画面には何も出さずに数回やり直す。
 * shouldContinue() が false になったら、次の送り直しはしない（送信中の1回は終わるまで待つ）。
 */
export async function withRetry(
  send: (signal: AbortSignal) => Promise<Response>,
  { timeoutMs = 8000, shouldContinue = () => true }: { timeoutMs?: number; shouldContinue?: () => boolean } = {},
): Promise<Response | null> {
  for (const wait of [0, 1000, 2000, 4000]) {
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    if (!shouldContinue()) return null;
    try {
      // 応答が返らないまま待ち続けないよう、1回ごとに打ち切る
      const response = await send(AbortSignal.timeout(timeoutMs));
      if (response.ok || response.status < 500) return response;
    } catch {
      // 次の回でやり直す
    }
  }
  return null;
}

/** 仮登録を送る（同じ dropId なら何度送っても1件）。 */
function ensureDrop(boxCode: string): Promise<DropResult> {
  let pending = inflight.get(boxCode);
  if (!pending) {
    const dropId = currentDropId(boxCode);
    pending = withRetry(
      (signal) =>
        fetch("/api/drops", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ boxCode, dropId }),
          signal,
        }),
      { shouldContinue: () => isDropPageShown(boxCode) },
    ).then((response): DropResult => {
      if (response?.ok) return { kind: "ok", dropId };
      // 400・404 などは送り直しても同じ結果になる（408・429 は待てば通る）
      if (response && response.status < 500 && response.status !== 408 && response.status !== 429) {
        return { kind: "gone" };
      }
      return { kind: "retry" };
    });
    inflight.set(boxCode, pending);
    pending.finally(() => inflight.delete(boxCode));
  }
  return pending;
}

/**
 * 仮登録が届くまで、同じ dropId で送り続ける。
 * 送り直しても直らない応答、または受付の画面を離れたら null。
 */
export async function ensureDropUntilDone(boxCode: string): Promise<string | null> {
  while (isDropPageShown(boxCode)) {
    const result = await ensureDrop(boxCode);
    if (result.kind === "ok") return result.dropId;
    if (result.kind === "gone") return null;
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  return null;
}

export type DropAnswers = { reportedCategory: string | null; isValuable: true | null };

/** 種類と「貴重品かも」を送る。何も答えていなければ送らない。送れなくても先へ進む（任意の情報のため）。 */
export async function sendAnswers(boxCode: string, dropId: string, answers: DropAnswers): Promise<void> {
  if (!answers.reportedCategory && !answers.isValuable) return;
  await withRetry(
    (signal) =>
      fetch(`/api/drops/${dropId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
        signal,
      }),
    { shouldContinue: () => isDropPageShown(boxCode) },
  );
}
