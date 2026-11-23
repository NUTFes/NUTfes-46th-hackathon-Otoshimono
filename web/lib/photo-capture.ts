// 画面側で写真を送れる形にする（拾得者の撮影・本登録の撮影で共用）。
// 何が写っているか分かれば十分なので、長い辺を 1280px に縮めた JPEG にする。
// canvas に描き直すので、写真に埋め込まれた撮影場所（GPS）などの情報も消える。
const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.8;

function toJpeg(source: CanvasImageSource, width: number, height: number): Promise<Blob | null> {
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d")?.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
}

/** カメラの映像の今のこま。 */
export function captureVideo(video: HTMLVideoElement): Promise<Blob | null> {
  return toJpeg(video, video.videoWidth, video.videoHeight);
}

/** 端末から選んだ写真（ブラウザーが開ける形式なら JPEG 以外も）。開けなければ null。 */
export async function fileToJpeg(file: File): Promise<Blob | null> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => null);
  if (!bitmap) return null;
  try {
    return await toJpeg(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}
