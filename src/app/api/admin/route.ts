import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthorizedAdmin } from '@/lib/api-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { slugify } from '@/lib/utils'

export async function GET() {
  const auth = await getAuthorizedAdmin()
  if ('error' in auth) return auth.error
  const admin = createAdminClient()
  const [courses, pdfs, questions] = await Promise.all([
    admin.from('courses').select('*').order('title'),
    admin.from('course_pdfs').select('*').order('course_id').order('week_number'),
    admin.from('questions').select('*').order('course_id').order('week_number'),
  ])
  if (courses.error || pdfs.error || questions.error) return NextResponse.json({ error: 'Could not load administrator data.' }, { status: 500 })
  return NextResponse.json({ courses: courses.data, pdfs: pdfs.data, questions: questions.data })
}

const courseInput = z.object({ id: z.string().uuid().optional(), title: z.string().trim().min(2).max(120), slug: z.string().trim().min(2).max(120).optional(), description: z.string().max(1000).default(''), active: z.boolean().default(true) })
const questionInput = z.object({ id: z.string().uuid().optional(), course_id: z.string().uuid(), week_number: z.number().int().min(1).max(12), question: z.string().trim().min(3).max(5000), options: z.array(z.string().trim().min(1).max(500)).min(2).max(8), correct_answer: z.string().trim().min(1), explanation: z.string().max(5000).nullable().optional() }).refine((value) => value.options.includes(value.correct_answer), { message: 'Correct answer must match one of the options.', path: ['correct_answer'] })

export async function POST(request: Request) {
  const auth = await getAuthorizedAdmin()
  if ('error' in auth) return auth.error
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }) }
  const object = z.object({ action: z.string() }).safeParse(body)
  if (!object.success) return NextResponse.json({ error: 'An action is required.' }, { status: 400 })
  const admin = createAdminClient()

  if (object.data.action === 'save_course') {
    const parsed = courseInput.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Enter a valid course title and description.' }, { status: 400 })
    const values = { title: parsed.data.title, slug: slugify(parsed.data.slug || parsed.data.title), description: parsed.data.description, active: parsed.data.active }
    const query = parsed.data.id ? admin.from('courses').update(values).eq('id', parsed.data.id) : admin.from('courses').insert(values)
    const { error } = await query
    if (error) return NextResponse.json({ error: error.code === '23505' ? 'A course already uses that URL slug.' : error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  if (object.data.action === 'import_questions') {
    const inputs = z.array(questionInput.omit({ id: true })).min(1).max(500).safeParse((body as { rows?: unknown }).rows)
    if (!inputs.success) return NextResponse.json({ error: `Invalid question data: ${inputs.error.issues.slice(0, 5).map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}` }, { status: 400 })
    const { error } = await admin.from('questions').insert(inputs.data.map((item) => ({ ...item, explanation: item.explanation || null })))
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  if (object.data.action === 'save_question') {
    const parsed = questionInput.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid question. The correct answer must match one of the provided options.' }, { status: 400 })
    const value = parsed.data
    const row = { course_id: value.course_id, week_number: value.week_number, question: value.question, options: value.options, correct_answer: value.correct_answer, explanation: value.explanation || null }
    const query = value.id ? admin.from('questions').update(row).eq('id', value.id) : admin.from('questions').insert(row)
    const { error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  if (object.data.action === 'delete_question') {
    const parsed = z.object({ id: z.string().uuid() }).safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'A valid question id is required.' }, { status: 400 })
    const { error } = await admin.from('questions').delete().eq('id', parsed.data.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown administrator action.' }, { status: 400 })
}
