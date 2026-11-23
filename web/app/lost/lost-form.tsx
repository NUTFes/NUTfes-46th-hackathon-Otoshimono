"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
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
import styles from "./page.module.css";

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

  /** 入力欄に渡す共通の属性。onChange で入力内容を更新する。 */
  function control(field: LostReportField) {
    return {
      id: `lost-${field}`,
      name: field,
      value: input[field],
      maxLength: MAX_LENGTH[field],
      "aria-invalid": errors[field] ? true : undefined,
      onChange: (event: { target: { value: string } }) => update(field, event.target.value),
    };
  }

  return (
    // method="post": JavaScript が動く前に押されても、メールアドレスが URL に載らないようにする
    <form className={styles.form} method="post" onSubmit={handleSubmit} noValidate>
      <Field label="カテゴリ" htmlFor="lost-category" required error={errors.category}>
        <Select {...control("category")} required>
          <option value="">選択してください</option>
          {CATEGORIES.map((category) => (
            <option key={category.code} value={category.code}>
              {category.label}
            </option>
          ))}
        </Select>
      </Field>

      {showItemDescription && (
        <Field
          label="なくした物"
          htmlFor="lost-itemDescription"
          required
          error={errors.itemDescription}
        >
          <Input {...control("itemDescription")} type="text" required placeholder="例: 折りたたみの扇子" />
        </Field>
      )}

      <Field label="色（任意）" htmlFor="lost-color" error={errors.color}>
        <Select {...control("color")}>
          <option value="">選択してください</option>
          {COLORS.map((color) => (
            <option key={color.code} value={color.code}>
              {color.label}
            </option>
          ))}
        </Select>
      </Field>

      {showColorNote && (
        <Field label="その他の色（任意）" htmlFor="lost-colorNote" error={errors.colorNote}>
          <Input
            {...control("colorNote")}
            type="text"
            placeholder="選択肢にない色、2色以上の場合など"
          />
        </Field>
      )}

      <Field label="特徴・備考" htmlFor="lost-features" required error={errors.features}>
        <Textarea
          {...control("features")}
          required
          rows={3}
          placeholder="形、柄、目印などをご記入ください。"
        />
      </Field>

      <Field label="なくした場所（任意）" htmlFor="lost-lostPlace" error={errors.lostPlace}>
        <Input {...control("lostPlace")} type="text" placeholder="ステージ付近" />
      </Field>

      <Field label="おおよその日時（任意）" htmlFor="lost-lostTime" error={errors.lostTime}>
        <Input {...control("lostTime")} type="text" placeholder="1日目 12:00〜13:00ごろ" />
      </Field>

      <Field
        label="連絡先メール"
        htmlFor="lost-email"
        required
        hint="確認結果や、後から見つかった場合の連絡に使用します。"
        error={errors.email}
      >
        <Input
          {...control("email")}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="sample@example.com"
        />
      </Field>

      <div className={styles.actions}>
        <Button type="submit">入力内容を確認する</Button>
      </div>
    </form>
  );
}
