"use client";

// 入力画面（/lost）と確認画面（/lost/review）のあいだで、入力途中の紛失届を受け渡す。
// メールアドレスを含むので URL には載せず、このタブの sessionStorage にだけ置く。

import { useSyncExternalStore } from "react";
import { toLostReportInput, type LostReportInput } from "@/lib/lost-reports";

const KEY = "lost-report-draft";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  for (const listener of listeners) listener();
}

function readRaw(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** サーバーと、ブラウザーでの最初の描画では「まだ読んでいない」ことを表す。 */
const NOT_LOADED = "__not_loaded__";

/**
 * 保存されている下書きを返す。
 * - `undefined`: まだブラウザーで読んでいない（サーバーでの描画中など）
 * - `null`: 下書きがない
 */
export function useLostReportDraft(): LostReportInput | null | undefined {
  const raw = useSyncExternalStore(subscribe, readRaw, () => NOT_LOADED);
  if (raw === NOT_LOADED) return undefined;
  if (raw === null) return null;
  try {
    return toLostReportInput(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveLostReportDraft(input: LostReportInput) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(input));
  } catch {
    // 保存できない環境（プライベートブラウズの一部など）では、確認画面で入力画面に戻す
  }
  notify();
}

export function clearLostReportDraft() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // 何もしない
  }
  notify();
}
