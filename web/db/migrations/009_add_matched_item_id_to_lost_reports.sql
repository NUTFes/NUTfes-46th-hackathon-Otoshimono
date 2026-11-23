-- 紛失届に照合した拾得物（要件定義v2 要求6・9、#15）。
-- 実行委員が受取案内（E-FOUND）を送ったときに記録する。受け取りのご案内（/lost/[token]/pickup）はこの物の管理番号と保管場所を出す。
-- 取り違えの訂正で送り直したときは上書きする。
ALTER TABLE lost_reports ADD COLUMN matched_item_id uuid REFERENCES items (id);
