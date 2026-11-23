-- 受渡記録（要件定義v2 要求10・14、docs/spec/routes.md）
-- 受渡のときに氏名と連絡先を必ず記録する。情報は削除しない（取り消しも行を残す）。
-- 1つの拾得物に、取り消し済みを含めて複数の行ができることがある。
CREATE TABLE handovers (
  id             bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  item_id        uuid        NOT NULL REFERENCES items (id) ON DELETE CASCADE,
  recipient_name text        NOT NULL CHECK (btrim(recipient_name) <> ''),
  phone          text        NOT NULL CHECK (btrim(phone) <> ''),
  email          text,
  identity_note  text,       -- 本人確認メモ
  handed_over_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX handovers_item_id_idx ON handovers (item_id, handed_over_at DESC);
