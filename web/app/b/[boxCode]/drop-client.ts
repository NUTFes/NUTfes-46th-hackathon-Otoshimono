"use client";

// 拾得者の画面からサーバーへ送る処理。
//
// - 1回の届け出（QR を読んでから完了画面まで）には1つの dropId を使う。dropId は送る前に作って
//   sessionStorage とメモリに置き、サーバーは同じ dropId を2件目にしない。再読み込み・戻る・
//   StrictMode・回線が切れての送り直しでは、仮登録は増えない。
// - 完了画面へ進むときに dropId を忘れる。同じタブで同じ BOX にもう一度届けると、新しい仮登録になる。
// - 仮登録が送れるまでは完了画面へ進まない（記録されていないのに「受け付けた」と出さない）。
//   エラーの画面は作らない（要件定義v2 で削除）ので、ボタンは「送信しています…」のまま送り続ける。

// sessionStorage が使えない環境でも、このページを開いている間は同じ dropId を使う
const memoryIds = new Map<string, string>();
// StrictMode で effect が2回動いても1回だけ送るよう、送信中の Promise も共有する
const inflight = new Map<string, Promise<string | null>>();

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

/** この届け出に使う dropId。まだ無ければ作って覚える。 */
function currentDropId(boxCode: string): string {
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

/** 完了画面へ進むときに呼ぶ。次にこの BOX の QR を読んだら、新しい届け出になる。 */
export function finishDrop(boxCode: string): void {
  memoryIds.delete(boxCode);
  try {
    sessionStorage.removeItem(storageKey(boxCode));
  } catch {
    // 何もしない
  }
}

/** 混雑時の不安定な回線を想定し、画面には何も出さずに数回やり直す。 */
export async function withRetry(
  send: (signal: AbortSignal) => Promise<Response>,
  timeoutMs = 8000,
): Promise<Response | null> {
  for (const wait of [0, 1000, 2000, 4000]) {
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
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

/** 仮登録を送る（同じ dropId なら何度送っても1件）。送れたら dropId、送れなければ null。 */
export function ensureDrop(boxCode: string): Promise<string | null> {
  let pending = inflight.get(boxCode);
  if (!pending) {
    const dropId = currentDropId(boxCode);
    pending = withRetry((signal) =>
      fetch("/api/drops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boxCode, dropId }),
        signal,
      }),
    ).then((response) => (response?.ok ? dropId : null));
    inflight.set(boxCode, pending);
    pending.finally(() => inflight.delete(boxCode));
  }
  return pending;
}

/** 仮登録が送れるまで、同じ dropId で送り続ける。 */
export async function ensureDropUntilDone(boxCode: string): Promise<string> {
  for (;;) {
    const dropId = await ensureDrop(boxCode);
    if (dropId) return dropId;
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

export type DropAnswers = { reportedCategory: string | null; isValuable: true | null };

/** 種類と「貴重品かも」を送る。何も答えていなければ送らない。送れなくても先へ進む（任意の情報のため）。 */
export async function sendAnswers(dropId: string, answers: DropAnswers): Promise<void> {
  if (!answers.reportedCategory && !answers.isValuable) return;
  await withRetry((signal) =>
    fetch(`/api/drops/${dropId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(answers),
      signal,
    }),
  );
}
