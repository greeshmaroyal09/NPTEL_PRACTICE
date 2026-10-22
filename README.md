# NPTEL Exam Practice

Next.js App Router, TypeScript, Tailwind CSS, and Supabase application for course selection, weekly study PDFs, MCQ practice, and private course administration.

## Local setup

1. Install Node.js 20.9 or later.
2. Create a Supabase project.
3. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server only; never expose this value to a browser)
   - `MAX_PDF_SIZE_MB` (optional, defaults to 25; storage bucket limit is 25 MB)
4. Run `supabase/migrations/202610100001_initial_schema.sql` in the Supabase SQL Editor. This creates the tables, access policies, public PDF bucket and two example course records. It deliberately inserts no sample exam questions.
5. Create an administrator in Supabase Authentication. Then, in the SQL Editor, grant that existing user's UUID:

   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'your-admin-email@example.com';
   ```

   Only users explicitly added to `admin_users` may enter the dashboard or call admin APIs. Do not put passwords or service-role keys in source code.
6. Install and run:

   ```sh
   npm install
   npm run dev
   ```

   Open `http://localhost:3000`. Use `npm run build` for a production build and `npm start` to serve it.

## Application areas

- `/` lists active courses from Supabase.
- `/courses/[slug]` lists the 12 weekly PDF slots for study and download.
- `/courses/[slug]/setup` validates student name, selected weeks, quiz mode, and available bank count.
- `/quiz/[id]` runs the timed quiz. The API picks distinct questions exclusively from the selected course and weeks and persists attempts/responses.
- `/results/[id]` shows score and question-by-question correct answers.
- `/admin` is the Supabase Auth sign-in page. `/admin/dashboard` and every `/api/admin` operation validate both the signed-in user and `admin_users` role on the server.

## Course PDFs

Administrators upload PDFs from the dashboard. Files are stored in Supabase Storage in the `course-pdfs` bucket and metadata is linked to a course and week. A PDF upload never creates quiz questions; the bank must be added separately.

The upload endpoint checks the administrator role, `.pdf` filename, MIME type, PDF magic header, and configured size limit. Set `MAX_PDF_SIZE_MB` no higher than the 25 MB storage bucket limit defined in the migration.

## Question bank and CSV

Add questions from the administrator dashboard or import the downloadable `public/question-import-template.csv`. CSV headings are `course_id,week_number,question,options,correct_answer,explanation`; separate answer choices with `|`. The course UUID is available from the admin course list/API or Supabase table editor. Every row is validated, and the specified correct answer must exactly match one option.

The database migration does not invent NPTEL questions or correct answers. Add only question data verified from the supplied course source.

## Persistence and security

Course data, PDFs, questions, and attempt results use Supabase Postgres and Storage. Quiz interaction state is also saved in local storage so an in-progress attempt can be resumed on the same browser/device. Student attempt tokens are random, stored as hashes in Postgres, and required by the server API to view or submit an attempt. Admin operations use the server-only service-role key only after checking Supabase Auth and the administrator role. Row-level security is enabled by the migration.

## Setup status

The application code, migration and seed course records are provided. A real Supabase project, environment values and administrator account must be configured before database, upload, Auth or end-to-end flows can be exercised. These hosted workflows are not claimed as verified until tested against that project.
