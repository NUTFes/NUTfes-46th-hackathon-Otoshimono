-- 拾得物の写真（要件定義v2 要求1・4）。本体は永続ボリュームに置き、ここには保存先の識別子だけを記録する。
-- kind: drop（拾得者が送った写真）/ register（本登録で実行委員が撮った写真）
CREATE TABLE item_photos (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id      uuid        NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  kind         text        NOT NULL CHECK (kind IN ('drop', 'register')),
  file_key     text        NOT NULL UNIQUE,
  content_type text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX item_photos_item_id_idx ON item_photos (item_id);
