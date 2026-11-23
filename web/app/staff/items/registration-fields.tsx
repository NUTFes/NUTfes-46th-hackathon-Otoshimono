"use client";

import type { ReactNode } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { CATEGORIES, OTHER_CATEGORY } from "@/lib/categories";
import { COLORS, OTHER_COLOR } from "@/lib/colors";
import { REGISTRATION_MAX_LENGTH, type RegistrationErrors, type RegistrationInput } from "@/lib/item-registration";
import { STORAGE_LOCATIONS } from "@/lib/storage-locations";

/** 本登録（M-REGISTER）と編集（M-EDIT）で共通の入力欄。検証は web/lib/item-registration.ts。 */
export function RegistrationFields({
  input,
  errors,
  onChange,
  beforeStorage,
}: {
  input: RegistrationInput;
  errors: RegistrationErrors;
  onChange: (field: keyof RegistrationInput, value: string) => void;
  /** 保管場所の前に足す欄（編集の「届けられたエリア」） */
  beforeStorage?: ReactNode;
}) {
  return (
    <>
      <Field label="カテゴリ" htmlFor="register-category" required error={errors.category}>
        <Select id="register-category" value={input.category} onChange={(e) => onChange("category", e.target.value)}>
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
            onChange={(e) => onChange("categoryNote", e.target.value)}
          />
        </Field>
      )}
      <Field label="色" htmlFor="register-color" error={errors.color} hint="2色以上のときは「その他」を選んで書いてください。">
        <Select id="register-color" value={input.color} onChange={(e) => onChange("color", e.target.value)}>
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
            onChange={(e) => onChange("colorNote", e.target.value)}
          />
        </Field>
      )}
      <Field label="特徴・備考" htmlFor="register-description" error={errors.description}>
        <Textarea
          id="register-description"
          rows={3}
          value={input.description}
          maxLength={REGISTRATION_MAX_LENGTH.description}
          onChange={(e) => onChange("description", e.target.value)}
        />
      </Field>
      {beforeStorage}
      <Field label="保管場所" htmlFor="register-storageLocation" required error={errors.storageLocation}>
        <Select
          id="register-storageLocation"
          value={input.storageLocation}
          onChange={(e) => onChange("storageLocation", e.target.value)}
        >
          {STORAGE_LOCATIONS.map((location) => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </Select>
      </Field>
    </>
  );
}
