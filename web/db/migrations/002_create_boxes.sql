-- 落とし物BOX（要件定義v2 要求2）
-- code は QR の URL（/b/[code]）に入るので、推測されにくいランダムな英数字8文字にする。
CREATE TABLE boxes (
  id         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code       text    NOT NULL UNIQUE CHECK (code ~ '^[A-Za-z0-9]{8}$'),
  name       text    NOT NULL,
  area       text    NOT NULL,
  sort_order integer NOT NULL UNIQUE
);
