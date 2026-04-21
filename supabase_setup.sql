-- ══════════════════════════════════════
--  카페 도장쿠폰 Supabase 테이블 생성
--  Supabase 대시보드 > SQL Editor 에서 실행하세요
-- ══════════════════════════════════════

-- 손님 테이블
create table if not exists customers (
  id           text primary key,
  name         text not null,
  phone        text default '',
  stamps       integer default 0,
  visits       integer default 0,
  coupons_used integer default 0,
  created_at   timestamptz default now(),
  last_visit   timestamptz
);

-- 도장/쿠폰 내역 테이블 (손님 삭제 시 자동 삭제)
create table if not exists activity (
  id          text primary key,
  customer_id text references customers(id) on delete cascade,
  type        text not null,   -- 'stamp' or 'coupon'
  stamps      integer default 0,
  date        text,
  created_at  timestamptz default now()
);

-- 설정 테이블
create table if not exists settings (
  key   text primary key,
  value text not null
);

-- RLS 비활성화 (PIN으로 보호되는 프라이빗 앱)
alter table customers disable row level security;
alter table activity  disable row level security;
alter table settings  disable row level security;

-- 기본 설정값 삽입
insert into settings (key, value) values
  ('cafeName',       '내 카페'),
  ('stampsRequired', '12'),
  ('reward',         '아메리카노 1잔 무료'),
  ('password',       '1234'),
  ('registerUrl',    '')
on conflict (key) do nothing;
