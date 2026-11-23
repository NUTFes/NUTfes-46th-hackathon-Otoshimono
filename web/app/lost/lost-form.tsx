"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CATEGORIES, requiresDescription, isCategoryCode } from "@/lib/categories";
import { COLORS, OTHER_COLOR } from "@/lib/colors";
import {
  EMPTY_LOST_REPORT_INPUT,
  MAX_LENGTH,
  validateLostReport,
  type LostReportErrors,
  type LostReportField,
  type LostReportInput,
} from "@/lib/lost-reports";
import { saveLostReportDraft, useLostReportDraft } from "./draft";
import styles from "./lost.module.css";

export function LostReportForm() {
  const draft = useLostReportDraft();
  // 確認画面から「修正する」で戻ったときは、ブラウザーで下書きを読んだ時点で一度だけ入力欄を作り直す。
  // そのあとに下書きが消えても（送信の完了など）作り直さないので、入力中の内容は消えない
  return (
    <Form
      key={draft === undefined ? "server" : "client"}
      initial={draft?.input ?? EMPTY_LOST_REPORT_INPUT}
    />
  );
}

function Form({ initial }: { initial: LostReportInput }) {
  const router = useRouter();
  const [input, setInput] = useState<LostReportInput>(initial);
  const [errors, setErrors] = useState<LostReportErrors>({});

  const showItemDescription = isCategoryCode(input.category) && requiresDescription(input.category);
  const showColorNote = input.color === OTHER_COLOR;

  function update(field: LostReportField, value: string) {
    setInput((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateLostReport(input);
    if (!result.ok) {
      setErrors(result.errors);
      const first = Object.keys(result.errors)[0];
      if (first) document.getElementById(`lost-${first}`)?.focus();
      return;
    }
    saveLostReportDraft(input);
    router.push("/lost/review");
  }

  function fieldProps(field: LostReportField) {
    const error = errors[field];
    return {
      id: `lost-${field}`,
      name: field,
      value: input[field],
      maxLength: MAX_LENGTH[field],
      "aria-invalid": error ? true : undefined,
      "aria-describedby": error ? `lost-${field}-error` : undefined,
    };
  }

  function errorText(field: LostReportField) {
    const error = errors[field];
    return error ? (
      <p id={`lost-${field}-error`} className={styles.error}>
        {error}
      </p>
    ) : null;
  }

  const cls = (base: string, field: LostReportField) =>
    errors[field] ? `${base} ${styles.invalid}` : base;

  return (
    // method="post": JavaScript が動く前に押されても、メールアドレスが URL に載らないようにする
    <form className={styles.form} method="post" onSubmit={handleSubmit} noValidate>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="lost-category">
          カテゴリ *
        </label>
        <select
          {...fieldProps("category")}
          className={cls(styles.select, "category")}
          required
          onChange={(event) => update("category", event.target.value)}
        >
          <option value="">選択してください</option>
          {CATEGORIES.map((category) => (
            <option key={category.code} value={category.code}>
              {category.label}
            </option>
          ))}
        </select>
        {errorText("category")}
      </div>

      {showItemDescription && (
        <div className={styles.field}>
          <label className={styles.label} htmlFor="lost-itemDescription">
            なくした物 *
          </label>
          <input
            {...fieldProps("itemDescription")}
            className={cls(styles.input, "itemDescription")}
            type="text"
            required
            placeholder="例: 折りたたみの扇子"
            onChange={(event) => update("itemDescription", event.target.value)}
          />
          {errorText("itemDescription")}
        </div>
      )}

      <div className={styles.field}>
        <label className={styles.label} htmlFor="lost-color">
          色（任意）
        </label>
        <select
          {...fieldProps("color")}
          className={cls(styles.select, "color")}
          onChange={(event) => update("color", event.target.value)}
        >
          <option value="">選択してください</option>
          {COLORS.map((color) => (
            <option key={color.code} value={color.code}>
              {color.label}
            </option>
          ))}
        </select>
        {errorText("color")}
      </div>

      {showColorNote && (
        <div className={styles.field}>
          <label className={styles.label} htmlFor="lost-colorNote">
            その他の色（任意）
          </label>
          <input
            {...fieldProps("colorNote")}
            className={cls(styles.input, "colorNote")}
            type="text"
            placeholder="選択肢にない色、2色以上の場合など"
            onChange={(event) => update("colorNote", event.target.value)}
          />
          {errorText("colorNote")}
        </div>
      )}

      <div className={styles.field}>
        <label className={styles.label} htmlFor="lost-features">
          特徴・備考 *
        </label>
        <textarea
          {...fieldProps("features")}
          className={cls(styles.textarea, "features")}
          required
          rows={3}
          placeholder="形、柄、目印などをご記入ください。"
          onChange={(event) => update("features", event.target.value)}
        />
        {errorText("features")}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="lost-lostPlace">
          なくした場所（任意）
        </label>
        <input
          {...fieldProps("lostPlace")}
          className={cls(styles.input, "lostPlace")}
          type="text"
          placeholder="ステージ付近"
          onChange={(event) => update("lostPlace", event.target.value)}
        />
        {errorText("lostPlace")}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="lost-lostTime">
          おおよその日時（任意）
        </label>
        <input
          {...fieldProps("lostTime")}
          className={cls(styles.input, "lostTime")}
          type="text"
          placeholder="1日目 12:00〜13:00ごろ"
          onChange={(event) => update("lostTime", event.target.value)}
        />
        {errorText("lostTime")}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="lost-email">
          連絡先メール *
        </label>
        <input
          {...fieldProps("email")}
          className={cls(styles.input, "email")}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="sample@example.com"
          onChange={(event) => update("email", event.target.value)}
        />
        {errorText("email")}
        <p className={styles.note}>確認結果や、後から見つかった場合の連絡に使用します。</p>
      </div>

      <div className={styles.actions}>
        <button type="submit" className={styles.primary}>
          入力内容を確認する
        </button>
      </div>
    </form>
  );
}
