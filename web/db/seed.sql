-- 開発用のデータ。npm run db:seed で流す。何度流しても同じ状態になる。
-- items を参照するテーブル（紛失届・受渡記録など）の中身も CASCADE で消える。
TRUNCATE item_photos, items, boxes RESTART IDENTITY CASCADE;
ALTER SEQUENCE item_management_number_seq RESTART WITH 1;

INSERT INTO boxes (code, name, area, sort_order) VALUES
  ('Gt7mQ2xa', '正門前BOX',     '正門エリア',     1),
  ('St4kP9wd', 'ステージ横BOX', 'ステージエリア', 2),
  ('Lb2nR8ce', '図書館前BOX',   '図書館エリア',   3);

-- 仮登録済（拾得者がQRを読んだだけ、または種類・貴重品を答えたもの）
INSERT INTO items (box_id, status, reported_category, is_valuable, dropped_at) VALUES
  (1, 'provisional', NULL,     NULL,  now() - interval '50 minutes'),
  (1, 'provisional', 'wallet', true,  now() - interval '40 minutes'),
  (1, 'provisional', 'key',    NULL,  now() - interval '20 minutes'),
  (2, 'provisional', NULL,     false, now() - interval '10 minutes');

-- 回収済（本登録を待っているもの）
INSERT INTO items (box_id, status, reported_category, dropped_at, collected_at) VALUES
  (2, 'collected', 'umbrella', now() - interval '3 hours', now() - interval '2 hours'),
  (3, 'collected', NULL,       now() - interval '3 hours', now() - interval '2 hours');

-- 本登録済・受渡済（管理番号は採番の順に L-0001 から）
INSERT INTO items (box_id, status, management_number, category, category_note, color, color_note,
                   description, storage_location, dropped_at, collected_at, registered_at)
SELECT box_id, status, 'L-' || lpad(nextval('item_management_number_seq')::text, 4, '0'),
       category, category_note, color, color_note, description, storage_location,
       now() - interval '5 hours', now() - interval '4 hours', now() - interval '3 hours'
FROM (VALUES
  (1, 'registered',  'wallet',     NULL,       'black', NULL,        '黒い二つ折り財布。内側にイニシャル。', '本部'),
  (2, 'registered',  'wallet',     NULL,       'brown', NULL,        '茶色の長財布。小銭入れが外側にある。', '本部'),
  (2, 'registered',  'key',        NULL,       'other', '青と白',    '青いキーホルダー付きの鍵が2本。',     '案内所A'),
  (3, 'registered',  'other',      '帽子',     'white', NULL,        '白いキャップ。つばに名前の刺繍。',     '本部'),
  (1, 'handed_over', 'umbrella',   NULL,       'navy',  NULL,        '紺色の折りたたみ傘。',                 '本部')
) AS v(box_id, status, category, category_note, color, color_note, description, storage_location);

-- 受渡済の傘の受渡記録。受渡済の物には、取り消していない受渡記録が1件ある
INSERT INTO handovers (item_id, recipient_name, phone, email, identity_note, handed_over_at)
SELECT id, '山田 太郎', '090-0000-0000', 'taro.yamada@example.com', '学生証で確認', now() - interval '1 hour'
FROM items WHERE status = 'handed_over';

-- 不明（仮登録済から1件、本登録済から1件）
INSERT INTO items (box_id, status, previous_status, unknown_reason, unknown_note, dropped_at)
VALUES (3, 'unknown', 'provisional', '回収時に見当たらない', '箱の中と周囲を確認しました。', now() - interval '6 hours');

INSERT INTO items (box_id, status, previous_status, unknown_reason, management_number, category, color,
                   description, storage_location, dropped_at, collected_at, registered_at)
VALUES (2, 'unknown', 'registered', '保管場所で見当たらない',
        'L-' || lpad(nextval('item_management_number_seq')::text, 4, '0'),
        'earphones', 'white', '白いワイヤレスイヤホンのケース。', '案内所A',
        now() - interval '7 hours', now() - interval '6 hours', now() - interval '5 hours');
