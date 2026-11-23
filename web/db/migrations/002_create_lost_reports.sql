-- 紛失届（要件定義v2 要求6・7、docs/spec/routes.md）
-- 照合した拾得物の列は、照合の Issue（#15）で担当1が追加する。
CREATE TABLE lost_reports (
  id               bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- 画面とメールで使う番号（R-0018 の形）。1万件を超えたら桁を増やす
  report_number    text        GENERATED ALWAYS AS (
                     'R-' || CASE WHEN id < 10000 THEN lpad(id::text, 4, '0') ELSE id::text END
                   ) STORED UNIQUE,
  -- 状況ページ（/lost/[token]）を届け出た本人だけが開けるようにするための推測できない値
  token            text        NOT NULL UNIQUE,
  -- 確認状況。値の意味は docs/spec/routes.md の表
  status           text        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'not_found_notified', 'found_notified')),
  category         text        NOT NULL REFERENCES categories (code),
  -- 何を落としたか。カテゴリが「その他」のときは必須
  item_description text,
  -- 色は web/lib/colors.ts の code。任意
  color            text,
  -- 色が「その他」のときの自由記述。任意
  color_note       text,
  -- 「特徴」と「備考」をまとめた欄
  features         text        NOT NULL CHECK (btrim(features) <> ''),
  lost_place       text,
  lost_time        text,
  -- 照合後の連絡先
  email            text        NOT NULL CHECK (btrim(email) <> ''),
  created_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (category <> 'other' OR btrim(coalesce(item_description, '')) <> '')
);

CREATE INDEX lost_reports_status_created_at_idx ON lost_reports (status, created_at DESC);
CREATE INDEX lost_reports_category_idx ON lost_reports (category);
