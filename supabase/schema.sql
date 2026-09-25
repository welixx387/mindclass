-- =====================================================================
--  MindClass — схема базы данных Supabase
-- =====================================================================
--  Как применить:
--    1. Откройте проект на supabase.com → SQL Editor → New query.
--    2. Вставьте этот файл целиком и нажмите Run.
--  Скрипт можно запускать повторно — он ничего не удаляет из данных.
--
--  Что создаётся:
--    profiles          — публичные профили читателей (ник, класс, аватар, роль)
--    chapters          — главы томов (текст, порядок, публикация)
--    comments          — комментарии к томам и главам (с ответами)
--    comment_likes     — отметки «нравится»
--    bookmarks         — закладки читателей
--    reading_progress  — прогресс чтения по главам
--    illustrations     — публичное хранилище иллюстраций (Storage)
--
--  Первый администратор назначается вручную (после регистрации на сайте):
--    update public.profiles set role = 'admin' where username = 'ВашНик';
-- =====================================================================


-- ---------------------------------------------------------------------
--  Профили
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  class_letter text not null default 'D',
  avatar_piece text not null default 'pawn',
  avatar_color text not null default 'crimson',
  bio text not null default '',
  role text not null default 'reader',
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[A-Za-zА-Яа-яЁё0-9_.-]{3,24}$'),
  constraint profiles_class_letter check (class_letter in ('A', 'B', 'C', 'D')),
  constraint profiles_avatar_piece check (avatar_piece in ('pawn', 'knight', 'bishop', 'rook', 'queen', 'king')),
  constraint profiles_avatar_color check (avatar_color ~ '^[a-z]{3,16}$'),
  constraint profiles_bio_length check (char_length(bio) <= 280),
  constraint profiles_role check (role in ('reader', 'moderator', 'admin'))
);

create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));

alter table public.profiles enable row level security;

drop policy if exists "Profiles are public" on public.profiles;
create policy "Profiles are public"
  on public.profiles for select
  using (true);

drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Менять можно только «косметические» поля. Роль — только через set_user_role.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (username, class_letter, avatar_piece, avatar_color, bio) on public.profiles to authenticated;
grant select on public.profiles to anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator'));
$$;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_staff() to anon, authenticated;

-- Профиль создаётся автоматически при регистрации из данных формы.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  base_name text := trim(coalesce(meta ->> 'username', ''));
  final_name text;
  cls text := upper(coalesce(meta ->> 'class_letter', 'D'));
  piece text := coalesce(meta ->> 'avatar_piece', 'pawn');
  color text := coalesce(meta ->> 'avatar_color', 'crimson');
  attempt int := 0;
begin
  if base_name !~ '^[A-Za-zА-Яа-яЁё0-9_.-]{3,24}$' then
    base_name := 'reader';
  end if;
  final_name := base_name;
  while exists (select 1 from public.profiles where lower(username) = lower(final_name)) loop
    attempt := attempt + 1;
    final_name := left(base_name, 19) || '_' || lpad((floor(random() * 10000))::int::text, 4, '0');
    exit when attempt > 50;
  end loop;

  if cls not in ('A', 'B', 'C', 'D') then cls := 'D'; end if;
  if piece not in ('pawn', 'knight', 'bishop', 'rook', 'queen', 'king') then piece := 'pawn'; end if;
  if color !~ '^[a-z]{3,16}$' then color := 'crimson'; end if;

  insert into public.profiles (id, username, class_letter, avatar_piece, avatar_color)
  values (new.id, final_name, cls, piece, color)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Профили для пользователей, зарегистрированных до установки схемы.
insert into public.profiles (id, username)
select u.id, 'reader_' || left(replace(u.id::text, '-', ''), 10)
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict do nothing;

-- Проверка ника на странице регистрации.
create or replace function public.username_available(name text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select name ~ '^[A-Za-zА-Яа-яЁё0-9_.-]{3,24}$'
     and not exists (select 1 from public.profiles where lower(username) = lower(name));
$$;

grant execute on function public.username_available(text) to anon, authenticated;

-- Назначение ролей из админ-панели.
create or replace function public.set_user_role(target uuid, new_role text)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Только администратор может менять роли' using errcode = '42501';
  end if;
  if new_role not in ('reader', 'moderator', 'admin') then
    raise exception 'Неизвестная роль: %', new_role;
  end if;
  if target = auth.uid() and new_role <> 'admin' then
    raise exception 'Нельзя снять права администратора с самого себя';
  end if;
  update public.profiles set role = new_role where id = target;
end;
$$;

revoke execute on function public.set_user_role(uuid, text) from anon;
grant execute on function public.set_user_role(uuid, text) to authenticated;


-- ---------------------------------------------------------------------
--  Главы
-- ---------------------------------------------------------------------

create table if not exists public.chapters (
  id bigint generated always as identity primary key,
  volume_slug text not null,
  position integer not null default 0,
  title text not null,
  content text not null default '',
  word_count integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    to_tsvector('russian', coalesce(title, '') || ' ' || left(coalesce(content, ''), 400000))
  ) stored,
  constraint chapters_volume_slug check (volume_slug ~ '^y[0-9]+-v[0-9]+(\.[0-9]+)?$'),
  constraint chapters_title_length check (char_length(title) between 1 and 200)
);

create index if not exists chapters_volume_idx on public.chapters (volume_slug, position);
create index if not exists chapters_created_idx on public.chapters (created_at desc);
create index if not exists chapters_search_idx on public.chapters using gin (search);

alter table public.chapters enable row level security;
-- Права выдаются явно, не полагаясь на настройки по умолчанию; строки
-- дополнительно защищены политиками ниже.
grant select on public.chapters to anon, authenticated;
grant insert, update, delete on public.chapters to authenticated;

drop policy if exists "Published chapters are public" on public.chapters;
create policy "Published chapters are public"
  on public.chapters for select
  using (is_published or public.is_admin());

drop policy if exists "Admins insert chapters" on public.chapters;
create policy "Admins insert chapters"
  on public.chapters for insert to authenticated
  with check (public.is_admin());

drop policy if exists "Admins update chapters" on public.chapters;
create policy "Admins update chapters"
  on public.chapters for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins delete chapters" on public.chapters;
create policy "Admins delete chapters"
  on public.chapters for delete to authenticated
  using (public.is_admin());

create or replace function public.chapters_before_write()
returns trigger
language plpgsql
as $$
begin
  new.word_count := coalesce(array_length(regexp_split_to_array(nullif(trim(new.content), ''), '\s+'), 1), 0);
  if tg_op = 'UPDATE' then
    new.updated_at := now();
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists chapters_before_write on public.chapters;
create trigger chapters_before_write
  before insert or update on public.chapters
  for each row execute function public.chapters_before_write();

-- Статистика по томам для каталога (учитываются только опубликованные главы).
create or replace view public.volume_stats with (security_invoker = on) as
  select volume_slug,
         count(*)::int as chapters,
         coalesce(sum(word_count), 0)::int as words,
         max(created_at) as last_added_at
  from public.chapters
  where is_published
  group by volume_slug;

grant select on public.volume_stats to anon, authenticated;

-- Порядок глав одним запросом (перетаскивание в админке).
create or replace function public.reorder_chapters(p_volume text, p_ids bigint[])
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Только администратор может менять порядок глав' using errcode = '42501';
  end if;
  update public.chapters c
     set position = x.ord
    from unnest(p_ids) with ordinality as x(id, ord)
   where c.id = x.id and c.volume_slug = p_volume;
end;
$$;

revoke execute on function public.reorder_chapters(text, bigint[]) from anon;
grant execute on function public.reorder_chapters(text, bigint[]) to authenticated;

-- Полнотекстовый поиск по тексту глав. Сначала ищутся все слова сразу,
-- с match_any = true — любое из слов (клиент делает это, если точных совпадений нет).
drop function if exists public.search_chapters(text, int);
create or replace function public.search_chapters(q text, max_results int default 20, match_any boolean default false)
returns table (id bigint, title text, volume_slug text, "position" int, snippet text, rank real)
language sql stable
set search_path = public
as $$
  with query as (
    select case
      when match_any then nullif(replace(plainto_tsquery('russian', q)::text, ' & ', ' | '), '')::tsquery
      else websearch_to_tsquery('russian', q)
    end as tsq
  )
  select c.id,
         c.title,
         c.volume_slug,
         c.position,
         ts_headline(
           'russian',
           left(c.content, 400000),
           query.tsq,
           'StartSel=⟦, StopSel=⟧, MaxWords=28, MinWords=12, MaxFragments=1, ShortWord=2'
         ) as snippet,
         ts_rank(c.search, query.tsq) as rank
  from public.chapters c, query
  where c.search @@ query.tsq
    and (c.is_published or public.is_admin())
  order by rank desc, c.volume_slug, c.position
  limit least(greatest(coalesce(max_results, 20), 1), 50);
$$;

grant execute on function public.search_chapters(text, int, boolean) to anon, authenticated;


-- ---------------------------------------------------------------------
--  Комментарии и лайки
-- ---------------------------------------------------------------------

create table if not exists public.comments (
  id bigint generated always as identity primary key,
  target text not null,
  user_id uuid not null default auth.uid()
    constraint comments_user_id_fkey references public.profiles (id) on delete cascade,
  parent_id bigint references public.comments (id) on delete cascade,
  body text not null,
  like_count integer not null default 0,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  constraint comments_target_format check (target ~ '^(volume:y[0-9]+-v[0-9]+(\.[0-9]+)?|chapter:[0-9]+)$'),
  constraint comments_body_length check (char_length(btrim(body)) between 1 and 4000)
);

create index if not exists comments_target_idx on public.comments (target, created_at desc);
create index if not exists comments_parent_idx on public.comments (parent_id);
create index if not exists comments_user_idx on public.comments (user_id, created_at desc);
create index if not exists comments_created_idx on public.comments (created_at desc);

alter table public.comments enable row level security;

drop policy if exists "Comments are public" on public.comments;
create policy "Comments are public"
  on public.comments for select
  using (true);

drop policy if exists "Signed-in users post comments" on public.comments;
create policy "Signed-in users post comments"
  on public.comments for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Authors edit their comments" on public.comments;
create policy "Authors edit their comments"
  on public.comments for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Authors and moderators delete comments" on public.comments;
create policy "Authors and moderators delete comments"
  on public.comments for delete to authenticated
  using (user_id = auth.uid() or public.is_staff());

-- Клиент задаёт только адрес, текст и родителя; остальное — сервер.
revoke insert, update on public.comments from anon, authenticated;
grant insert (target, parent_id, body) on public.comments to authenticated;
grant update (body) on public.comments to authenticated;
grant select on public.comments to anon, authenticated;
grant delete on public.comments to authenticated;

create or replace function public.comments_before_insert()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  parent record;
  recent int;
begin
  new.user_id := auth.uid();
  new.like_count := 0;
  new.created_at := now();
  new.edited_at := null;
  new.body := btrim(new.body);

  if new.user_id is null then
    raise exception 'Войдите, чтобы оставлять комментарии' using errcode = '42501';
  end if;

  select count(*) into recent
  from public.comments
  where user_id = new.user_id and created_at > now() - interval '1 minute';
  if recent >= 6 then
    raise exception 'Слишком часто. Подождите немного перед следующим комментарием.' using errcode = 'P0001';
  end if;

  -- Ответы всегда привязываются к корневому комментарию той же ветки.
  if new.parent_id is not null then
    select id, target, parent_id into parent from public.comments where id = new.parent_id;
    if not found then
      raise exception 'Комментарий, на который вы отвечаете, удалён';
    end if;
    if parent.target <> new.target then
      raise exception 'Ответ должен быть в том же обсуждении';
    end if;
    if parent.parent_id is not null then
      new.parent_id := parent.parent_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists comments_before_insert on public.comments;
create trigger comments_before_insert
  before insert on public.comments
  for each row execute function public.comments_before_insert();

create or replace function public.comments_before_update()
returns trigger
language plpgsql
as $$
begin
  new.body := btrim(new.body);
  if new.body is distinct from old.body then
    new.edited_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists comments_before_update on public.comments;
create trigger comments_before_update
  before update on public.comments
  for each row execute function public.comments_before_update();

-- Комментарии удалённой главы удаляются вместе с ней.
create or replace function public.chapters_after_delete()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  delete from public.comments where target = 'chapter:' || old.id;
  return old;
end;
$$;

drop trigger if exists chapters_after_delete on public.chapters;
create trigger chapters_after_delete
  after delete on public.chapters
  for each row execute function public.chapters_after_delete();

create or replace view public.comment_counts with (security_invoker = on) as
  select target, count(*)::int as count
  from public.comments
  group by target;

grant select on public.comment_counts to anon, authenticated;

create table if not exists public.comment_likes (
  comment_id bigint not null references public.comments (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index if not exists comment_likes_user_idx on public.comment_likes (user_id);

alter table public.comment_likes enable row level security;

drop policy if exists "Users see their own likes" on public.comment_likes;
create policy "Users see their own likes"
  on public.comment_likes for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users like others' comments" on public.comment_likes;
create policy "Users like others' comments"
  on public.comment_likes for insert to authenticated
  with check (
    user_id = auth.uid()
    and not exists (select 1 from public.comments c where c.id = comment_id and c.user_id = auth.uid())
  );

drop policy if exists "Users remove their likes" on public.comment_likes;
create policy "Users remove their likes"
  on public.comment_likes for delete to authenticated
  using (user_id = auth.uid());

revoke update on public.comment_likes from anon, authenticated;
grant select, insert, delete on public.comment_likes to authenticated;

create or replace function public.sync_comment_like_count()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.comments set like_count = like_count + 1 where id = new.comment_id;
  elsif tg_op = 'DELETE' then
    update public.comments set like_count = greatest(like_count - 1, 0) where id = old.comment_id;
  end if;
  return null;
end;
$$;

drop trigger if exists comment_likes_count on public.comment_likes;
create trigger comment_likes_count
  after insert or delete on public.comment_likes
  for each row execute function public.sync_comment_like_count();


-- ---------------------------------------------------------------------
--  Закладки и прогресс чтения
-- ---------------------------------------------------------------------

create table if not exists public.bookmarks (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  chapter_id bigint not null references public.chapters (id) on delete cascade,
  paragraph integer not null,
  excerpt text not null default '',
  note text not null default '',
  created_at timestamptz not null default now(),
  constraint bookmarks_unique unique (user_id, chapter_id, paragraph),
  constraint bookmarks_paragraph check (paragraph >= 0),
  constraint bookmarks_excerpt_length check (char_length(excerpt) <= 400),
  constraint bookmarks_note_length check (char_length(note) <= 1000)
);

create index if not exists bookmarks_user_idx on public.bookmarks (user_id, created_at desc);

alter table public.bookmarks enable row level security;
grant select, insert, update, delete on public.bookmarks to authenticated;

drop policy if exists "Users manage their bookmarks" on public.bookmarks;
create policy "Users manage their bookmarks"
  on public.bookmarks for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table if not exists public.reading_progress (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  chapter_id bigint not null references public.chapters (id) on delete cascade,
  volume_slug text not null,
  paragraph integer not null default 0,
  percent real not null default 0,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, chapter_id),
  constraint reading_progress_percent check (percent >= 0 and percent <= 100)
);

create index if not exists reading_progress_recent_idx on public.reading_progress (user_id, updated_at desc);

alter table public.reading_progress enable row level security;
grant select, insert, update, delete on public.reading_progress to authenticated;

drop policy if exists "Users manage their progress" on public.reading_progress;
create policy "Users manage their progress"
  on public.reading_progress for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Однажды дочитанная глава остаётся прочитанной, даже если вернуться к началу.
create or replace function public.reading_progress_before_write()
returns trigger
language plpgsql
as $$
begin
  new.completed := coalesce(new.completed, false) or new.percent >= 90;
  if tg_op = 'UPDATE' then
    new.completed := new.completed or old.completed;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists reading_progress_before_write on public.reading_progress;
create trigger reading_progress_before_write
  before insert or update on public.reading_progress
  for each row execute function public.reading_progress_before_write();


-- ---------------------------------------------------------------------
--  Статистика профиля (публичные счётчики, без приватных данных)
-- ---------------------------------------------------------------------

create or replace function public.profile_stats(p_user uuid)
returns table (comments int, likes int, chapters_read int)
language sql stable security definer
set search_path = public
as $$
  select
    (select count(*)::int from public.comments where user_id = p_user),
    (select coalesce(sum(like_count), 0)::int from public.comments where user_id = p_user),
    (select count(*)::int from public.reading_progress where user_id = p_user and completed);
$$;

grant execute on function public.profile_stats(uuid) to anon, authenticated;


-- ---------------------------------------------------------------------
--  Хранилище иллюстраций (Storage)
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('illustrations', 'illustrations', true)
on conflict (id) do nothing;

drop policy if exists "Illustrations are public" on storage.objects;
create policy "Illustrations are public"
  on storage.objects for select
  using (bucket_id = 'illustrations');

drop policy if exists "Admins upload illustrations" on storage.objects;
create policy "Admins upload illustrations"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'illustrations' and public.is_admin());

drop policy if exists "Admins update illustrations" on storage.objects;
create policy "Admins update illustrations"
  on storage.objects for update to authenticated
  using (bucket_id = 'illustrations' and public.is_admin());

drop policy if exists "Admins delete illustrations" on storage.objects;
create policy "Admins delete illustrations"
  on storage.objects for delete to authenticated
  using (bucket_id = 'illustrations' and public.is_admin());


-- Обновить кэш схемы API, чтобы новые таблицы были видны сразу.
notify pgrst, 'reload schema';
