-- 行レベルセキュリティの確認（受け入れ基準14：他人の作品・シーズンは読めない・書けない）
--
-- 使い方: Supabase の SQL Editor に全文を貼って、そのまま Run する。書き換える所は無い。
-- 前提: アカウントが1人分以上あること（Authentication > Users に1行以上）。
--
-- 何をするか:
--   1. 仮の「他人」アカウントと、その人の作品・シーズンを作る
--   2. 1人目のアカウントとして振る舞い、他人の行を読む・書き換える・シーズンを足す、を試す
--   3. すべて取り消す（仮のアカウントも作品も残らない）
--   4. 最後に結果を1行で出す
--
-- 期待する結果（1行）:
--   others_works_visible = 0 / others_seasons_visible = 0 / others_rows_updated = 0 / insert_into_others_work = blocked
--   verdict = OK

do $$
declare
  v_me uuid;
  v_other uuid := gen_random_uuid();
  v_other_work uuid;
  v_works int;
  v_seasons int;
  v_updated int;
  v_insert text := 'not run';
  v_error text := null;
begin
  select id into v_me from auth.users order by created_at limit 1;
  if v_me is null then
    raise exception 'アカウントが1人分もありません。アプリでサインインするか、Authentication > Users で作ってから実行してください';
  end if;

  -- ここから下は最後に必ず取り消す（例外で抜けて、この begin ブロックの中の変更を捨てる）
  begin
    -- 1. 仮の他人と、その人の作品・シーズン（postgres として作るので RLS を通らない）
    insert into auth.users (id, aud, role, email)
    values (v_other, 'authenticated', 'authenticated', 'rls-check-' || v_other || '@example.invalid');

    insert into public.works (id, user_id, title, type)
    values (gen_random_uuid(), v_other, 'rls_check の仮の作品', 'anime')
    returning id into v_other_work;

    insert into public.seasons (work_id, user_id, name, position)
    values (v_other_work, v_other, 'シーズン1', 1);

    -- 2. 1人目のアカウントとして振る舞う
    perform set_config('request.jwt.claims', json_build_object('sub', v_me, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';

    select count(*) into v_works from public.works where user_id <> v_me;
    select count(*) into v_seasons from public.seasons where user_id <> v_me;

    update public.works set title = title where id = v_other_work;
    get diagnostics v_updated = row_count;

    begin
      insert into public.seasons (work_id, name, position) values (v_other_work, 'rls_check', 9999);
      v_insert := 'INSERTED';
    exception
      when insufficient_privilege then v_insert := 'blocked';
      when others then v_insert := 'error: ' || sqlerrm;
    end;

    execute 'reset role';
    raise exception 'rls_check_rollback';
  exception
    when others then
      if sqlerrm <> 'rls_check_rollback' then
        v_error := sqlerrm;
      end if;
  end;

  -- 結果は取り消しの後も残るよう、セッションの設定に入れて下の select で出す
  perform set_config('rls_check.others_works_visible', coalesce(v_works::text, ''), false);
  perform set_config('rls_check.others_seasons_visible', coalesce(v_seasons::text, ''), false);
  perform set_config('rls_check.others_rows_updated', coalesce(v_updated::text, ''), false);
  perform set_config('rls_check.insert_into_others_work', v_insert, false);
  perform set_config('rls_check.error', coalesce(v_error, ''), false);
end $$;

select
  current_setting('rls_check.others_works_visible') as others_works_visible,
  current_setting('rls_check.others_seasons_visible') as others_seasons_visible,
  current_setting('rls_check.others_rows_updated') as others_rows_updated,
  current_setting('rls_check.insert_into_others_work') as insert_into_others_work,
  nullif(current_setting('rls_check.error'), '') as setup_error,
  case
    when current_setting('rls_check.error') <> '' then 'ERROR（setup_error を見る）'
    when current_setting('rls_check.others_works_visible') = '0'
     and current_setting('rls_check.others_seasons_visible') = '0'
     and current_setting('rls_check.others_rows_updated') = '0'
     and current_setting('rls_check.insert_into_others_work') = 'blocked' then 'OK'
    else 'NG（他人の行に触れられている）'
  end as verdict;
