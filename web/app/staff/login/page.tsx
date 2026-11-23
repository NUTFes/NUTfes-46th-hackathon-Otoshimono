import { Suspense } from "react";
import { Button, Field, Input, Page, PageHeading, StaffHeader } from "@/components/ui";
import styles from "./page.module.css";

// M-LOGIN。フォームは /api/staff/login へ直接送る（JavaScript なしでも動く）。
export default function StaffLoginPage(props: PageProps<"/staff/login">) {
  return (
    <>
      <StaffHeader />
      <Page>
        <div className={styles.heading}>
          <p className={styles.audience}>実行委員用</p>
          <PageHeading title="ログイン" description="パスワードを入力してください。" />
        </div>
        <form action="/api/staff/login" method="post" className={styles.form}>
          <Suspense fallback={<PasscodeField />}>
            <PasscodeFieldWithError searchParams={props.searchParams} />
          </Suspense>
          <Button type="submit">ログイン</Button>
        </form>
        <p className={styles.note}>パスワードが不明な場合は本部にお問い合わせください。</p>
      </Page>
    </>
  );
}

async function PasscodeFieldWithError({ searchParams }: Pick<PageProps<"/staff/login">, "searchParams">) {
  const { error } = await searchParams;
  return <PasscodeField error={error ? "パスワードが違います。もう一度入力してください。" : undefined} />;
}

function PasscodeField({ error }: { error?: string }) {
  return (
    <Field label="パスワード" htmlFor="passcode" error={error}>
      <Input
        id="passcode"
        name="passcode"
        type="password"
        autoComplete="current-password"
        required
        aria-invalid={error ? true : undefined}
      />
    </Field>
  );
}
