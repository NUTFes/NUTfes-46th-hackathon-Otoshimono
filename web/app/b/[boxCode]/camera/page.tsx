import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Page } from "@/components/ui";
import { db } from "@/lib/db";
import { isBoxCode } from "@/lib/drops";
import { Camera } from "./camera";

export const metadata: Metadata = {
  title: "落とし物を撮影 | 技大祭 落とし物管理",
  robots: { index: false, follow: false },
};

// V-CAMERA → V-PHOTO-READY。V-DROP の「写真を撮る（任意）」から来る。
export default function CameraPage(props: PageProps<"/b/[boxCode]/camera">) {
  return (
    <Suspense fallback={null}>
      <CameraForBox params={props.params} />
    </Suspense>
  );
}

async function CameraForBox({ params }: Pick<PageProps<"/b/[boxCode]/camera">, "params">) {
  const { boxCode } = await params;
  if (!isBoxCode(boxCode)) notFound();
  const { rowCount } = await db.query("SELECT 1 FROM boxes WHERE code = $1", [boxCode]);
  if (rowCount === 0) notFound();
  return (
    <Page>
      <Camera boxCode={boxCode} />
    </Page>
  );
}
