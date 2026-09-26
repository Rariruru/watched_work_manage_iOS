-- 行レベルセキュリティの確認（受け入れ基準14：他人の作品・シーズンは読めない）
-- Supabase の SQL Editor で、上から順に実行する。すべて rollback するのでデータは残らない。
--
-- 準備: アプリで2人分サインインして作品を1件ずつ作り、Authentication > Users から2人の UUID を控える。
--       下の USER_A_UUID / USER_B_UUID / USER_B_WORK_UUID（B の作品の id）を実際の値に置き換える。

begin;

-- A として振る舞う
select set_config('request.jwt.claims', '{"sub":"USER_A_UUID","role":"authenticated"}', true);
set local role authenticated;

-- 期待: A の作品だけが出る（user_id がすべて USER_A_UUID）
select id, user_id, title from public.works;

-- 期待: 0 行（B の作品は見えない）
select count(*) as b_works_seen_by_a from public.works where user_id = 'USER_B_UUID';
select count(*) as b_seasons_seen_by_a from public.seasons where user_id = 'USER_B_UUID';

-- 期待: 0 行が更新される（B の作品は書き換えられない）
update public.works set title = 'hijacked' where user_id = 'USER_B_UUID';

-- 期待: エラー（new row violates row-level security policy）
-- B の作品に A のシーズンを足そうとする。エラーでトランザクションが止まるので、最後に実行する
insert into public.seasons (work_id, name, position) values ('USER_B_WORK_UUID', 'x', 99);

rollback;
