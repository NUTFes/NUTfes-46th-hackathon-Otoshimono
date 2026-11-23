import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // README の手順どおり http://127.0.0.1:3000 で開いたときも、開発サーバーの JS が動くようにする
  // （既定では localhost 以外からの開発用リソースへのアクセスが止められ、画面のボタンが効かない）
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
