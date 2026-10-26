-- PikaStudy backend: run in Supabase SQL Editor (Postgres).
-- After running: Auth > Users > create your admin user, then:
--   update public.profiles set role='admin' where id='<that-user-uuid>';
-- There is NO public admin signup: new users get role 'user' only.

create extension if not exists pgcrypto;

create table public.profiles(
  id uuid primary key references auth.users on delete cascade,
  full_name text, role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz default now());

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id) values(new.id); return new; end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='admin') $$;

create table public.classes(id smallint primary key, name text not null, intro text);
create table public.streams(id serial primary key, name text unique not null);
create table public.subjects(id serial primary key, name text unique not null);
create table public.class_subjects(
  class_id smallint references classes on delete cascade,
  stream_id int references streams on delete set null,
  subject_id int references subjects on delete cascade,
  primary key(class_id, subject_id, stream_id));
create table public.categories(id serial primary key, name text unique not null, slug text unique not null);

create table public.books(
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 200),
  class_id smallint references classes, stream_id int references streams,
  subject_id int references subjects, category_id int references categories,
  author text, publication text, edition text, session text, language text default 'English',
  description text, cover_path text, pdf_path text, external_url text,
  file_format text, file_size_kb int,
  featured boolean default false, published boolean default false,
  download_count int default 0, created_at timestamptz default now());
create table public.book_requests(
  id uuid primary key default gen_random_uuid(),
  ref_id text unique not null default 'PS-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  book_name text not null check (char_length(book_name) between 2 and 200),
  class_id smallint references classes, subject text check (char_length(subject)<=100),
  author_or_publication text check (char_length(author_or_publication)<=200),
  info text check (char_length(info)<=1000),
  status text not null default 'pending' check (status in ('pending','in_progress','completed','rejected')),
  created_at timestamptz default now());
create table public.downloads(
  id bigserial primary key, book_id uuid references books on delete cascade,
  created_at timestamptz default now());

create index on books(class_id); create index on books(subject_id);
create index on books(category_id); create index on books(published, featured);
create index on books(created_at desc);
create index on books using gin(to_tsvector('english', title||' '||coalesce(author,'')||' '||coalesce(publication,'')));
create index on book_requests(status); create index on downloads(book_id);

-- Row Level Security
alter table profiles enable row level security; alter table classes enable row level security;
alter table streams enable row level security; alter table subjects enable row level security;
alter table class_subjects enable row level security; alter table categories enable row level security;
alter table books enable row level security; alter table book_requests enable row level security;
alter table downloads enable row level security;

create policy "own profile" on profiles for select using (id=auth.uid() or is_admin());
-- (no update/insert policy: roles can only be changed by service role / SQL editor)

do $$ declare t text; begin
 foreach t in array array['classes','streams','subjects','class_subjects','categories'] loop
  execute format('create policy "public read" on %I for select using (true)', t);
  execute format('create policy "admin write" on %I for all using (is_admin()) with check (is_admin())', t);
 end loop; end $$;

create policy "read published" on books for select using (published or is_admin());
create policy "admin write books" on books for all using (is_admin()) with check (is_admin());

create policy "anyone can request" on book_requests for insert with check (status='pending');
create policy "admin reads requests" on book_requests for select using (is_admin());
create policy "admin updates requests" on book_requests for update using (is_admin());
create policy "admin deletes requests" on book_requests for delete using (is_admin());

create policy "log download" on downloads for insert with check (true);
create policy "admin reads downloads" on downloads for select using (is_admin());

-- Count a download safely (callable by anyone, only increments)
create or replace function public.record_download(b uuid) returns void
language sql security definer set search_path=public as $$
  insert into downloads(book_id) select id from books where id=b and published;
  update books set download_count=download_count+1 where id=b and published $$;

-- Storage: covers are public, PDFs are public-read only for published books
insert into storage.buckets(id,name,public) values('covers','covers',true) on conflict do nothing;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('pdfs','pdfs',false,52428800,array['application/pdf']) on conflict do nothing;
create policy "covers read" on storage.objects for select using (bucket_id='covers');
create policy "covers admin write" on storage.objects for all
  using (bucket_id='covers' and public.is_admin()) with check (bucket_id='covers' and public.is_admin());
create policy "pdf read published" on storage.objects for select using (
  bucket_id='pdfs' and (public.is_admin() or exists(select 1 from public.books b where b.pdf_path=name and b.published)));
create policy "pdf admin write" on storage.objects for all
  using (bucket_id='pdfs' and public.is_admin()) with check (bucket_id='pdfs' and public.is_admin());

-- Seed data
insert into classes values (10,'Class 10','Board-year foundation'),(11,'Class 11','Choose your stream'),(12,'Class 12','Board and entrance prep');
insert into streams(name) values ('Science'),('Commerce'),('Arts / Humanities');
insert into categories(name,slug) values ('NCERT','ncert'),('Reference Books','reference'),('Notes','notes'),
 ('Question Banks','question-banks'),('Sample Papers','sample-papers'),('PYQs','pyqs'),('Practical Resources','practical');
insert into subjects(name) values ('Mathematics'),('Science'),('English'),('Hindi'),('Social Science'),('Information Technology'),
 ('Physics'),('Chemistry'),('Biology'),('Computer Science'),('Informatics Practices'),('Accountancy'),('Business Studies'),
 ('Economics'),('Statistics'),('History'),('Political Science'),('Geography'),('Sociology'),('Psychology');
