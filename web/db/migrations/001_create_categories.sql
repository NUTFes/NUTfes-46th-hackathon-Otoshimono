-- 拾得物の本登録と紛失届で共用するカテゴリ（要件定義v2 要求4・7）
-- 選択肢を変えるときは web/lib/categories.ts も同じ内容に直し、新しい番号のSQLで変更する。
CREATE TABLE categories (
  code       text    PRIMARY KEY,
  label      text    NOT NULL UNIQUE,
  sort_order integer NOT NULL UNIQUE
);

INSERT INTO categories (code, label, sort_order) VALUES
  ('wallet',       '財布',     1),
  ('smartphone',   'スマホ',   2),
  ('key',          '鍵',       3),
  ('card',         'カード類', 4),
  ('earphones',    'イヤホン', 5),
  ('bag',          'バッグ',   6),
  ('umbrella',     '傘',       7),
  ('clothing',     '衣類',     8),
  ('water_bottle', '水筒',     9),
  ('other',        'その他',  10);
