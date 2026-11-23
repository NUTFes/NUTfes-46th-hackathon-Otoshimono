"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui";

/** 「結果を更新する」。サーバーから件数を読み直す。 */
export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button onClick={() => startTransition(() => router.refresh())} disabled={pending}>
      {pending ? "更新しています…" : "結果を更新する"}
    </Button>
  );
}
