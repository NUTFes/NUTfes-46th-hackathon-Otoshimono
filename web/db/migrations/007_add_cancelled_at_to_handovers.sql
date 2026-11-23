-- 受渡の取り消し（要件定義v2 要求10）。受渡記録の行は消さずに「取り消し済み」として残す。
ALTER TABLE handovers ADD COLUMN cancelled_at timestamptz;

-- 取り消していない受渡記録は、1つの拾得物に1件まで
CREATE UNIQUE INDEX handovers_active_item_id_idx ON handovers (item_id) WHERE cancelled_at IS NULL;
