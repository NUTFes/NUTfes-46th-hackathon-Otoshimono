"use client";

// 入力画面（/lost）と確認画面（/lost/review）のあいだで、入力途中の紛失届を受け渡す。
// メールアドレスを含むので URL には載せない。
//
// - まずこのページのメモリに置き、あわせてこのタブの sessionStorage にも写す。
//   sessionStorage が使えない端末（容量の上限、プライベートブラウズの一部など）でも、
//   画面の移動のあいだはメモリの下書きで届け出られる（再読み込みすると消える）。
// - 下書きごとに requestId を持たせる。送り直しても同じ ID を送り、サーバー側で二重登録を防ぐ。

import { useSyncExternalStore } from "react";
import {
  isRequestId,
  sameLostReportInput,
  toLostReportInput,
  type LostReportInput,
} from "@/lib/lost-reports";

export type LostReportDraft = { input: LostReportInput; requestId: string };

const KEY = "lost-report-draft";
const listeners = new Set<() => void>();

// メモリの下書き。undefined はまだ一度も読み書きしていない（sessionStorage を見る）、null は下書きなし
let memory: string | null | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  for (const listener of listeners) listener();
}

function readRaw(): string | null {
  if (memory !== undefined) return memory;
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): LostReportDraft | null {
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw) as { input?: unknown; requestId?: unknown };
    if (!isRequestId(value.requestId)) return null;
    return { input: toLostReportInput(value.input), requestId: value.requestId };
  } catch {
    return null;
  }
}

function write(raw: string | null) {
  memory = raw;
  try {
    if (raw === null) sessionStorage.removeItem(KEY);
    else sessionStorage.setItem(KEY, raw);
  } catch {
    // 写せなくても、メモリの下書きで画面の移動はできる。
    // 古い下書きが sessionStorage に残っていても、メモリを先に読むので表示されない
  }
  notify();
}

/** サーバーと、ブラウザーでの最初の描画では「まだ読んでいない」ことを表す。 */
const NOT_LOADED = "__not_loaded__";

/**
 * 保存されている下書きを返す。
 * - `undefined`: まだブラウザーで読んでいない（サーバーでの描画中など）
 * - `null`: 下書きがない
 */
export function useLostReportDraft(): LostReportDraft | null | undefined {
  const raw = useSyncExternalStore(subscribe, readRaw, () => NOT_LOADED);
  if (raw === NOT_LOADED) return undefined;
  return parse(raw);
}

/**
 * 入力を下書きとして保存する。内容が前の下書きと同じなら requestId を引き継ぐ
 * （受け付け済みかもしれない届け出を、修正せずに出し直したときに二重登録しないため）。
 */
export function saveLostReportDraft(input: LostReportInput): LostReportDraft {
  const current = parse(readRaw());
  const requestId =
    current && sameLostReportInput(current.input, input) ? current.requestId : newRequestId();
  const draft = { input: toLostReportInput(input), requestId };
  write(JSON.stringify(draft));
  return draft;
}

/**
 * 送信が済んだ下書きを消す。送信のあいだに新しい下書きに変わっていたら（入力画面で直した場合など）、
 * そちらは消さない。
 */
export function clearLostReportDraft(requestId: string) {
  if (parse(readRaw())?.requestId === requestId) write(null);
}

function newRequestId(): string {
  // randomUUID は HTTPS か localhost でしか使えないので、使えないときは同じ形を自分で作る
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
