create extension if not exists pgcrypto;

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  weeks_count smallint not null default 12 check (weeks_count between 1 and 12),
  question_target integer not null default 120 check (question_target > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.course_pdfs (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  week_number smallint not null check (week_number between 1 and 12),
  storage_path text not null unique,
  filename text not null,
  file_size bigint not null check (file_size > 0),
  created_at timestamptz not null default now(),
  unique (course_id, week_number)
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  week_number smallint not null check (week_number between 1 and 12),
  question text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) >= 2),
  correct_answer text not null,
  explanation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

revoke select on public.questions from anon, authenticated;
grant select (id, course_id, week_number, question, options) on public.questions to anon, authenticated;

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  student_name text not null,
  course_id uuid not null references public.courses(id) on delete restrict,
  selected_weeks smallint[] not null,
  mode text not null check (mode in ('quick', 'standard', 'full')),
  question_ids uuid[] not null,
  access_token_hash text not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  time_taken_seconds integer,
  correct_count integer,
  attempted_count integer
);

create table public.quiz_responses (
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete restrict,
  selected_answer text,
  is_correct boolean not null default false,
  primary key (attempt_id, question_id)
);

insert into public.courses (slug, title, description) values
  ('conservation-economics', 'Conservation Economics', 'Explore economic perspectives on conservation, natural resources, and sustainability.'),
  ('forests-and-their-management', 'Forests and their Management', 'Study forest ecology, management practices, and sustainable use.')
on conflict (slug) do nothing;

create index questions_course_week_idx on public.questions(course_id, week_number);
create index course_pdfs_course_week_idx on public.course_pdfs(course_id, week_number);
create index attempts_course_started_idx on public.quiz_attempts(course_id, started_at desc);

create or replace function public.is_course_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.admin_users where user_id = auth.uid()); $$;

alter table public.admin_users enable row level security;
alter table public.courses enable row level security;
alter table public.course_pdfs enable row level security;
alter table public.questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_responses enable row level security;

create policy "Admins can read their own role" on public.admin_users for select to authenticated using (user_id = auth.uid());

create policy "Students can read active courses" on public.courses for select to anon, authenticated using (active or public.is_course_admin());
create policy "Admins manage courses" on public.courses for all to authenticated using (public.is_course_admin()) with check (public.is_course_admin());

create policy "Students can read PDFs for active courses" on public.course_pdfs for select to anon, authenticated using (exists (select 1 from public.courses c where c.id = course_id and c.active) or public.is_course_admin());
create policy "Admins manage PDFs" on public.course_pdfs for all to authenticated using (public.is_course_admin()) with check (public.is_course_admin());

create policy "Students can read questions for active courses" on public.questions for select to anon, authenticated using (exists (select 1 from public.courses c where c.id = course_id and c.active) or public.is_course_admin());
create policy "Admins manage questions" on public.questions for all to authenticated using (public.is_course_admin()) with check (public.is_course_admin());

create policy "Admins read attempts" on public.quiz_attempts for select to authenticated using (public.is_course_admin());
create policy "Admins manage attempts" on public.quiz_attempts for all to authenticated using (public.is_course_admin()) with check (public.is_course_admin());
create policy "Admins read responses" on public.quiz_responses for select to authenticated using (public.is_course_admin());
create policy "Admins manage responses" on public.quiz_responses for all to authenticated using (public.is_course_admin()) with check (public.is_course_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('course-pdfs', 'course-pdfs', true, 26214400, array['application/pdf'])
on conflict (id) do update set public = true, file_size_limit = 26214400, allowed_mime_types = array['application/pdf'];

create policy "Students read published course PDFs" on storage.objects for select to anon, authenticated
using (bucket_id = 'course-pdfs' and exists (
  select 1 from public.course_pdfs p join public.courses c on c.id = p.course_id
  where p.storage_path = name and c.active
));
create policy "Admins upload course PDFs" on storage.objects for insert to authenticated
with check (bucket_id = 'course-pdfs' and public.is_course_admin());
create policy "Admins replace course PDFs" on storage.objects for update to authenticated
using (bucket_id = 'course-pdfs' and public.is_course_admin())
with check (bucket_id = 'course-pdfs' and public.is_course_admin());
create policy "Admins delete course PDFs" on storage.objects for delete to authenticated
using (bucket_id = 'course-pdfs' and public.is_course_admin());
