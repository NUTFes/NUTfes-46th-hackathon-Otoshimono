-- 拾得物（要件定義v2 要求1・3・4・11・12）
-- 状態: provisional（仮登録済）/ collected（回収済）/ registered（本登録済）/ handed_over（受渡済）/ unknown（不明）
-- id は拾得者が写真を足すときの dropId にも使うので、推測できない UUID にする。

-- 管理番号（L-0001 の形）の採番用。本登録のときに nextval で取る。
CREATE SEQUENCE item_management_number_seq;

CREATE TABLE items (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id             integer     NOT NULL REFERENCES boxes(id),
  status             text        NOT NULL DEFAULT 'provisional'
                                 CHECK (status IN ('provisional', 'collected', 'registered', 'handed_over', 'unknown')),

  -- 拾得者が任意で答えるもの
  reported_category  text        REFERENCES categories(code),
  is_valuable        boolean,

  -- 本登録で実行委員が入力するもの
  management_number  text        UNIQUE CHECK (management_number ~ '^L-[0-9]{4,}$'),
  category           text        REFERENCES categories(code),
  category_note      text,       -- カテゴリが「その他」のときの、何かの記述
  color              text,       -- web/lib/colors.ts の code
  color_note         text,       -- 色が「その他」のときの自由記述
  description        text,       -- 特徴・備考
  storage_location   text,

  -- 不明にしたとき（元に戻すと NULL に戻す）
  previous_status    text        CHECK (previous_status IN ('provisional', 'collected', 'registered', 'handed_over')),
  unknown_reason     text,
  unknown_note       text,

  dropped_at         timestamptz NOT NULL DEFAULT now(),
  collected_at       timestamptz,
  registered_at      timestamptz,
  updated_at         timestamptz NOT NULL DEFAULT now(),

  CHECK ((status = 'unknown') = (previous_status IS NOT NULL AND unknown_reason IS NOT NULL)),
  CHECK (status NOT IN ('registered', 'handed_over')
         OR (management_number IS NOT NULL AND category IS NOT NULL AND storage_location IS NOT NULL))
);

CREATE INDEX items_box_id_status_idx ON items (box_id, status);
CREATE INDEX items_status_idx ON items (status);
