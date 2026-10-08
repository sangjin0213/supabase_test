/* =========================================
   바이브 카페 주문 DB (Supabase / PostgreSQL)
   - Supabase 대시보드 > SQL Editor 에 붙여넣고 Run
   ========================================= */

-- 1. 주문 테이블
create table if not exists public.orders (
  id             bigint generated always as identity primary key,  -- 주문 번호 (자동 증가)
  customer_name  text        not null check (length(trim(customer_name)) > 0),  -- 이름 (필수)
  phone          text,                                               -- 전화번호 (선택)
  drink          text        not null check (drink in (
                   '아메리카노', '카페라떼', '카페모카', '바닐라라떼',
                   '녹차라떼', '에스프레소', '블루베리 스무디'
                 )),
  drink_price    int         not null check (drink_price >= 0),      -- 음료 기본 가격 (원)
  size           text        not null default 'M' check (size in ('S', 'M', 'L')),
  options        text[]      not null default '{}'                    -- 예: {"샷 추가","시럽 추가"}
                 check (options <@ array['샷 추가', '크림 추가', '시럽 추가', '디카페인']),
  quantity       int         not null default 1 check (quantity between 1 and 10),
  request        text,                                               -- 요청사항 (선택)
  total_price    int         not null check (total_price >= 0),      -- 총 금액 (원)
  created_at     timestamptz not null default now()                  -- 주문 시각
);

-- 최신 주문 순으로 조회할 때 빠르게
create index if not exists orders_created_at_idx on public.orders (created_at desc);


-- 2. RLS (행 수준 보안)
-- - 웹페이지(anon 키)에서는 주문 "등록"만 가능
-- - 다른 손님의 이름·전화번호가 보이지 않도록 조회/수정/삭제는 막음
--   (주문 확인은 Supabase 대시보드 Table Editor에서 하면 됩니다)
alter table public.orders enable row level security;

drop policy if exists "누구나 주문 등록 가능" on public.orders;
create policy "누구나 주문 등록 가능"
  on public.orders
  for insert
  to anon, authenticated
  with check (true);
