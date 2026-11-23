import { notFound } from "next/navigation";
import {
  Button,
  ButtonLink,
  Checkbox,
  DefinitionList,
  Field,
  Input,
  Notice,
  Page,
  PageHeading,
  Select,
  StaffHeader,
  StaffTabs,
  Textarea,
} from "@/components/ui";
import { CATEGORIES } from "@/lib/categories";
import { maskEmail, maskName, maskPhone } from "@/lib/mask";

// 共通の UI 部品の見本。開発中だけ開ける（本番のビルドでは 404）。
export default function UiPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <>
      <StaffHeader backHref="/dev/ui" />
      <Page>
        <PageHeading title="UI 部品の見本" description="docs/design/DESIGN.md の値で作った共通の部品です。" />
        <StaffTabs current="items" />

        <Field label="管理番号・特徴で探す" htmlFor="q">
          <Input id="q" placeholder="例：L-0042 / 二つ折り財布" />
        </Field>
        <Field label="カテゴリ" htmlFor="category" required>
          <Select id="category" defaultValue="wallet">
            {CATEGORIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="特徴・備考" htmlFor="description" required error="特徴・備考を入力してください。">
          <Textarea id="description" aria-invalid placeholder="形、柄、目印などをご記入ください。" />
        </Field>
        <Field label="連絡先メール" htmlFor="email" required hint="確認結果や、後から見つかった場合の連絡に使用します。">
          <Input id="email" type="email" placeholder="sample@example.com" />
        </Field>
        <Checkbox label="本人確認と、現物の受渡が完了しました" defaultChecked />

        <Notice title="QRを読むと回収完了になります">
          箱の中の物をまとめて回収してください。回収数の入力を待たず、QRで状態を更新します。
        </Notice>
        <Notice title="物品が手元にあることを確認してください" tone="warning">
          受渡済から本登録済に戻します。
        </Notice>

        <DefinitionList
          title="受渡記録（伏せ字）"
          items={[
            { label: "氏名", value: maskName("山田 太郎") },
            { label: "電話番号", value: maskPhone("090-0000-0000") },
            { label: "メール", value: maskEmail("sample@example.com") },
            { label: "確認メモ", value: "管理番号と物品の特徴を確認。" },
          ]}
        />

        <Button>受渡済として記録する</Button>
        <ButtonLink href="/dev/ui" variant="secondary">
          記録せずに戻る
        </ButtonLink>
        <Button disabled>押せないボタン</Button>
      </Page>
    </>
  );
}
