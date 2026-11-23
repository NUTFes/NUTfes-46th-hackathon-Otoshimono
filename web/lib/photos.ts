// 拾得物の写真の保存と読み出し（要件定義v2 要求1・4）。
// 本体は web/data/photos（Docker では /app/data/photos の永続ボリューム）に <写真の id>.jpg で置き、
// DB の item_photos には file_key だけを記録する。
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_CONTENT_TYPE = "image/jpeg";

// 場所を固定しておくと、ビルドがプロジェクト全体を本番の出力に含めずに済む
function photoDir(): string {
  return path.join(process.cwd(), "data", "photos");
}

function filePath(fileKey: string): string {
  // file_key はこちらで作った値だけだが、念のためフォルダーの外を指せないようにする
  if (!/^[0-9a-f-]{36}\.jpg$/.test(fileKey)) throw new Error(`写真の file_key が正しくありません: ${fileKey}`);
  return path.join(process.cwd(), "data", "photos", fileKey);
}

/** JPEG の先頭（FF D8 FF）で始まるか。Content-Type ではなく中身で確かめる。 */
function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

// 画面側では長い辺 1280px に縮めて送るので、それより大きい画像は API を直接呼んだもの
const MAX_EDGE = 1280;
// 画素数の大きすぎる画像で、展開のメモリーを使い切らないようにする
const MAX_INPUT_PIXELS = 4096 * 4096;

/**
 * JPEG として最後まで展開できるかを確かめ、保存用の JPEG に作り直す。開けなければ null。
 * 作り直すので、撮影場所（GPS）などの情報は画面側で消し忘れても（API を直接呼ばれても）残らない。
 */
export async function normalizePhoto(bytes: Uint8Array): Promise<Buffer | null> {
  if (!isJpeg(bytes)) return null;
  try {
    return await sharp(bytes, { failOn: "truncated", limitInputPixels: MAX_INPUT_PIXELS })
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
  } catch {
    return null;
  }
}

/** 写真を保存して、DB に記録する id と file_key を返す。 */
export async function savePhotoFile(bytes: Uint8Array): Promise<{ id: string; fileKey: string }> {
  const id = randomUUID();
  const fileKey = `${id}.jpg`;
  await mkdir(photoDir(), { recursive: true });
  await writeFile(filePath(fileKey), bytes, { flag: "wx" });
  return { id, fileKey };
}

export async function readPhotoFile(fileKey: string): Promise<Buffer> {
  return readFile(filePath(fileKey));
}

/** 消せなくても処理は続ける（DB からは外れているので、表示されることはない）。 */
export async function deletePhotoFile(fileKey: string): Promise<void> {
  await unlink(filePath(fileKey)).catch((error) => {
    console.error("写真のファイルを消せませんでした", fileKey, error);
  });
}
